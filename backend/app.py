import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from flask import Flask, jsonify, request
from flask_cors import CORS
import joblib
import numpy as np
import requests
import datetime
import time
import os
import json
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from districts_data import TN_DISTRICTS
from dataset_calibration import get_calibration

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── Load ML artefacts ─────────────────────────────────────────────────
BASE   = os.path.dirname(__file__)
model  = joblib.load(os.path.join(BASE, 'flood_model.pkl'))
scaler = joblib.load(os.path.join(BASE, 'scaler.pkl'))

# ── Load Dataset Calibration (flood.csv + tide_data_cleaned.xlsx) ─────
print("[APP] Loading dataset calibration...")
DISTRICT_CALIB, TIDE_TABLE = get_calibration()
print(f"[APP] Calibration loaded for {len(DISTRICT_CALIB)} districts.")

COASTAL_DISTRICTS = {
    "Chennai","Nagapattinam","Kancheepuram","Tiruvallur","Cuddalore",
    "Tirunelveli","Thoothukudi","Pudukkottai","Ramanathapuram","Villupuram",
    "Thanjavur","Tiruvarur","Mayiladuthurai","Kanyakumari","Chengalpattu"
}

# ── Government Dataset ────────────────────────────────────────────────
try:
    with open(os.path.join(BASE, 'latest_district_data.json'), 'r') as f:
        LATEST_DATA = json.load(f)
    with open(os.path.join(BASE, 'district_history.json'), 'r') as f:
        FLOOD_HISTORY = json.load(f)
except Exception as e:
    print(f"Warning: {e}. Run prepare_dataset_json.py first.")
    LATEST_DATA   = {}
    FLOOD_HISTORY = []

# ── Open-Meteo Weather Cache ──────────────────────────────────────────
_CACHE     = {}   # "lat,lon" -> (weather_dict, fetched_at_timestamp)
_CACHE_TTL = 600  # 10 minutes

WMO = {
    0:"Clear Sky", 1:"Mainly Clear", 2:"Partly Cloudy", 3:"Overcast",
    45:"Fog", 48:"Freezing Fog",
    51:"Drizzle", 53:"Drizzle", 55:"Heavy Drizzle",
    56:"Freezing Drizzle", 57:"Heavy Freezing Drizzle",
    61:"Light Rain", 63:"Rain", 65:"Heavy Rain",
    66:"Freezing Rain", 67:"Heavy Freezing Rain",
    71:"Light Snow", 73:"Snow", 75:"Heavy Snow", 77:"Snow Grains",
    80:"Light Showers", 81:"Showers", 82:"Heavy Showers",
    85:"Snow Showers", 86:"Heavy Snow Showers",
    95:"Thunderstorm", 96:"Thunderstorm w/ Hail", 99:"Thunderstorm w/ Hail",
}
def wmo_label(code):
    return WMO.get(int(code), "Unknown")

# ── Per-Minute Interpolation State ───────────────────────────────────
# Stores the last two full prediction snapshots for smooth interpolation
_INTERP = {
    'T0':        None,   # older snapshot (dict: name -> data)
    'T1':        None,   # newer snapshot
    'T0_time':   None,   # epoch time of T0
    'T1_time':   None,   # epoch time of T1
    'lock':      threading.Lock(),
}
_SNAPSHOT_INTERVAL = 600   # 10 minutes between full API fetches

# ── Sensor Data State (Local Hardware) ──────────────────────────────
_SENSOR_DATA = {'status': 'waiting', 'data': None, 'last_updated': None}
_SENSOR_LOCK = threading.Lock()

# ── Firebase Data State (Hardware via Cloud) ─────────────────────────
_FIREBASE_DATA = {'status': 'waiting', 'data': None, 'last_updated': None}
_FIREBASE_LOCK = threading.Lock()

# ── Fetch one district's weather ──────────────────────────────────────
def fetch_district_weather(district):
    lat, lon = district['lat'], district['lon']
    name     = district['name']
    key      = f"{lat:.4f},{lon:.4f}"
    now      = time.time()

    if key in _CACHE:
        cached, ts = _CACHE[key]
        if now - ts < _CACHE_TTL:
            return name, cached

    try:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,relative_humidity_2m,"
            "precipitation,wind_speed_10m,wind_direction_10m,"
            "wind_gusts_10m,surface_pressure,weather_code"
            "&daily=precipitation_sum,precipitation_hours"
            "&forecast_days=1"
            "&timezone=Asia%2FKolkata"
        )
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        j   = resp.json()
        cur = j.get('current', {})
        day = j.get('daily', {})

        rain_today = 0.0
        if day.get('precipitation_sum'):
            rain_today = float(day['precipitation_sum'][0] or 0)

        weather = {
            'temperature_c':   round(float(cur.get('temperature_2m',        32)),  1),
            'humidity_pct':    round(float(cur.get('relative_humidity_2m',   70)),  1),
            'wind_speed_kmh':  round(float(cur.get('wind_speed_10m',         15)),  1),
            'wind_gust_kmh':   round(float(cur.get('wind_gusts_10m',         20)),  1),
            'wind_dir_deg':    round(float(cur.get('wind_direction_10m',      0)),  0),
            'pressure_hpa':    round(float(cur.get('surface_pressure',     1010)),  1),
            'rain_1h_mm':      round(float(cur.get('precipitation',           0)),  2),
            'rain_today_mm':   round(rain_today, 2),
            'weather_code':    int(cur.get('weather_code', 0)),
            'condition':       wmo_label(cur.get('weather_code', 0)),
            'live':            True,
            'fetched_at':      datetime.datetime.now().strftime('%H:%M:%S'),
        }
        _CACHE[key] = (weather, now)
        return name, weather

    except Exception as e:
        print(f"  [WEATHER ERROR] {name}: {e}")
        if key in _CACHE:
            return name, _CACHE[key][0]
        return name, {'live': False}


def fetch_all_districts_weather():
    results = {}
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(fetch_district_weather, d): d for d in TN_DISTRICTS}
        for fut in as_completed(futures):
            name, weather = fut.result()
            results[name] = weather
    return results


# ── Risk Thresholds: Moderate ≥ 45%, High ≥ 65% ──────────────────────
def classify_risk(flood_prob_pct):
    """
    New thresholds per user requirement:
      High     ≥ 65%
      Moderate ≥ 45%
      Low      < 45%
    """
    if flood_prob_pct >= 65.0:
        return 'High'
    elif flood_prob_pct >= 45.0:
        return 'Moderate'
    return 'Low'


# ── ML Prediction ─────────────────────────────────────────────────────
def predict_risk(f, district_name=None):
    """
    Run ML model + blend with dataset-derived calibration.
    Returns risk_level based on new thresholds (45%=Moderate, 65%=High).
    """
    month = datetime.datetime.now().month
    rain  = f.get('rainfall_mm',      0)
    wl    = f.get('water_level_m',    2)
    hum   = f.get('humidity_pct',    70)
    tidal = f.get('tidal_height_m',   0)
    coast = f.get('is_coastal',        0)
    flow  = f.get('river_flow_cumec', 30)
    press = f.get('pressure_hpa',   1010)

    arr = np.array([[
        rain, f.get('temperature_c', 32), hum, wl, tidal,
        f.get('wind_speed_kmh', 15), flow, press, coast, month,
        rain * wl,            # rain_x_wl
        coast * tidal,        # coastal_tidal
        rain * hum / 100,     # rain_humidity
        flow / max(press, 1), # flow_pressure
    ]])
    scaled    = scaler.transform(arr)
    proba     = model.predict_proba(scaled)[0]
    pm        = dict(zip(model.classes_, proba))
    high_p, mod_p, low_p = pm.get('High', 0), pm.get('Moderate', 0), pm.get('Low', 0)

    # Raw ML flood probability (weighted sum of probabilities)
    ml_prob_pct = min(high_p * 100 + mod_p * 40, 99.9)

    # ── Blend with dataset calibration ───────────────────────────────
    if district_name and district_name in DISTRICT_CALIB:
        calib = DISTRICT_CALIB[district_name]
        base_prob_pct = calib['baseline_flood_prob'] * 100  # e.g. 55.1 for Thanjavur

        # Weight: 60% ML (live weather) + 40% dataset calibration (structural risk)
        blended_prob = 0.60 * ml_prob_pct + 0.40 * base_prob_pct

        # Additional modifiers from live weather
        if rain > 100:
            blended_prob = min(blended_prob + 8.0, 99.9)   # heavy rain surge
        if rain > 50:
            blended_prob = min(blended_prob + 4.0, 99.9)
        if wl > 8:
            blended_prob = min(blended_prob + 6.0, 99.9)   # high water level
        if tidal > 1.0 and coast:
            blended_prob = min(blended_prob + 4.0, 99.9)   # high tide coastal
        if hum > 88:
            blended_prob = min(blended_prob + 2.0, 99.9)   # extreme humidity

        flood_prob_pct = round(min(blended_prob, 99.9), 1)
    else:
        flood_prob_pct = round(ml_prob_pct, 1)

    risk = classify_risk(flood_prob_pct)

    return {
        'risk_level':     risk,
        'flood_prob_pct': flood_prob_pct,
        'prob_high':      round(high_p * 100, 1),
        'prob_moderate':  round(mod_p  * 100, 1),
        'prob_low':       round(low_p  * 100, 1),
    }


# ── Build single full prediction snapshot ─────────────────────────────
def build_predictions_snapshot(live_weather):
    """Compute full predictions for all 38 districts from live weather."""
    results = []
    MONTH_NAMES = {
        1:'January',2:'February',3:'March',4:'April',5:'May',6:'June',
        7:'July',8:'August',9:'September',10:'October',11:'November',12:'December'
    }
    current_month_name = MONTH_NAMES[datetime.datetime.now().month]

    for d in TN_DISTRICTS:
        name       = d['name']
        is_coastal = 1 if name in COASTAL_DISTRICTS else 0
        govt       = LATEST_DATA.get(name, {})
        wx         = live_weather.get(name, {})

        # Live weather values
        temp  = wx.get('temperature_c',  govt.get('temperature_c',   32.0))
        hum   = wx.get('humidity_pct',   govt.get('humidity_pct',    70.0))
        wind  = wx.get('wind_speed_kmh', govt.get('wind_speed_kmh',  15.0))
        press = wx.get('pressure_hpa',   1010.0)
        cond  = wx.get('condition',      'N/A')
        is_live = wx.get('live', False)
        rain  = wx.get('rain_today_mm',  govt.get('rainfall_mm', 0))

        # Water level from government dataset
        wl = govt.get('water_level_m', 2.0)

        # ── Firebase Override for Tirunelveli ────────────────────────
        if name == "Tirunelveli":
            with _FIREBASE_LOCK:
                if _FIREBASE_DATA['status'] == 'online' and _FIREBASE_DATA['data']:
                    fb = _FIREBASE_DATA['data']
                    # Firebase stores data under 'flood_monitor.live', NOT 'sensorData.live'
                    fb_live = fb.get('flood_monitor', {}).get('live', {})
                    fb_rt   = fb.get('realtime', {})

                    # waterLevel in flood_monitor.live is in MILLIMETRES → convert to metres
                    wl_mm = fb_live.get('waterLevel', 0)
                    wl_rt_cm = fb_rt.get('water_level_cm', 0)

                    if wl_mm > 0:
                        wl = wl_mm / 1000.0   # mm → m  (e.g. 2411 mm = 2.411 m)
                    elif wl_rt_cm > 0:
                        wl = wl_rt_cm / 100.0  # cm → m

                    # Alert boost: if overflow or danger status
                    if fb_live.get('overflow') or fb_rt.get('status') == 'DANGER':
                        wl = max(wl, 8.5)  # Force high risk

                    # Use flowRate as rainfall proxy (L/min → mm approx)
                    fb_flow = fb_live.get('flowRate', 0)
                    if fb_flow > 0:
                        rain = max(rain, round(fb_flow * 0.5, 2))

                    is_live = True
                    cond = fb_rt.get('message', 'Firebase Live')

        # ── Real tidal height from tide gauge data ─────────────────
        calib = DISTRICT_CALIB.get(name, {})
        if is_coastal:
            tide_station = calib.get('tide_station')
            if tide_station and tide_station in TIDE_TABLE:
                tidal = TIDE_TABLE[tide_station].get(
                    current_month_name,
                    TIDE_TABLE[tide_station].get('_avg', 0.80)
                )
            elif calib.get('tide_height_m', 0) > 0:
                tidal = calib['tide_height_m']
            else:
                # Fallback: average of all gauge stations
                avgs = [v.get('_avg', 0.75) for v in TIDE_TABLE.values()]
                tidal = round(float(np.mean(avgs)), 3) if avgs else 0.75
        else:
            tidal = 0.0

        river_flow = max(wl * 95 + rain * 0.8, 0)

        pred = predict_risk({
            'rainfall_mm':      rain,
            'temperature_c':    temp,
            'humidity_pct':     hum,
            'water_level_m':    wl,
            'tidal_height_m':   tidal, 
            'wind_speed_kmh':   wind,
            'river_flow_cumec': river_flow,
            'pressure_hpa':     press,
            'is_coastal':       is_coastal,
        }, district_name=name)

        results.append({
            'id':              d['id'],
            'name':            name,
            'lat':             d['lat'],
            'lon':             d['lon'],
            'coastal':         bool(is_coastal),
            'river':           d['river'],
            'temperature_c':   temp,
            'humidity_pct':    hum,
            'rainfall_mm':     round(rain, 2),
            'wind_speed_kmh':  wind,
            'wind_gust_kmh':   wx.get('wind_gust_kmh', round(wind * 1.3, 1)),
            'wind_dir_deg':    wx.get('wind_dir_deg', 0),
            'pressure_hpa':    press,
            'water_level_m':   round(wl, 2),
            'tidal_height_m':  round(float(tidal), 3),
            'river_flow_cumec':round(river_flow, 1),
            'condition':       cond,
            'weather_code':    wx.get('weather_code', 0),
            'data_source':     'live' if is_live else 'govt',
            'fetched_at':      wx.get('fetched_at', ''),
            'baseline_prob':   round(calib.get('baseline_flood_prob', 0.5) * 100, 1),
            **pred,
        })

    return results


# ── Background thread: refresh snapshot every 10 min ─────────────────
def _background_refresh():
    """Runs forever — fetches fresh data every 10 min, advances T0/T1."""
    global _INTERP
    while True:
        try:
            print(f"[REFRESH] Fetching all 38 districts weather...")
            t_start = time.time()
            live_wx = fetch_all_districts_weather()
            snapshot = build_predictions_snapshot(live_wx)
            snap_dict = {r['name']: r for r in snapshot}
            elapsed = round(time.time() - t_start, 2)
            print(f"[REFRESH] Done in {elapsed}s")

            with _INTERP['lock']:
                now = time.time()
                if _INTERP['T1'] is None:
                    # First run — set both T0 and T1 to same data
                    _INTERP['T0']      = snap_dict
                    _INTERP['T1']      = snap_dict
                    _INTERP['T0_time'] = now
                    _INTERP['T1_time'] = now
                else:
                    # Advance window: old T1 becomes T0, new snapshot is T1
                    _INTERP['T0']      = _INTERP['T1']
                    _INTERP['T0_time'] = _INTERP['T1_time']
                    _INTERP['T1']      = snap_dict
                    _INTERP['T1_time'] = now

        except Exception as e:
            print(f"[REFRESH ERROR] {e}")

        time.sleep(_SNAPSHOT_INTERVAL)


# ── Background thread: fetch sensor data from 172.16.48.13 ────────────
def _sensor_fetch_loop():
    global _SENSOR_DATA
    url = "http://172.16.48.13/data"
    while True:
        try:
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                with _SENSOR_LOCK:
                    _SENSOR_DATA = {
                        'status': 'online',
                        'data': data,
                        'last_updated': datetime.datetime.now().strftime('%H:%M:%S')
                    }
            else:
                with _SENSOR_LOCK:
                    _SENSOR_DATA['status'] = 'offline'
        except Exception as e:
            with _SENSOR_LOCK:
                _SENSOR_DATA['status'] = 'error'
                _SENSOR_DATA['error'] = str(e)
# ── Background thread: fetch sensor data from Firebase ────────────────
def _firebase_fetch_loop():
    global _FIREBASE_DATA
    url = "https://predictionflood-f64bb-default-rtdb.asia-southeast1.firebasedatabase.app/.json"
    while True:
        try:
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                with _FIREBASE_LOCK:
                    _FIREBASE_DATA = {
                        'status': 'online',
                        'data': data,
                        'last_updated': datetime.datetime.now().strftime('%H:%M:%S')
                    }
            else:
                with _FIREBASE_LOCK:
                    _FIREBASE_DATA['status'] = 'offline'
        except Exception as e:
            with _FIREBASE_LOCK:
                _FIREBASE_DATA['status'] = 'error'
                _FIREBASE_DATA['error'] = str(e)
        time.sleep(5)

# Start background threads
_refresh_thread = threading.Thread(target=_background_refresh, daemon=True)
_refresh_thread.start()

_sensor_thread = threading.Thread(target=_sensor_fetch_loop, daemon=True)
_sensor_thread.start()

_firebase_thread = threading.Thread(target=_firebase_fetch_loop, daemon=True)
_firebase_thread.start()


# ── Interpolation helper ──────────────────────────────────────────────
def _lerp(a, b, alpha):
    """Linear interpolation between a and b."""
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return round(a + alpha * (b - a), 3)
    return b  # non-numeric: return newer value

def _interpolate_district(d0, d1, alpha):
    """Interpolate all numeric fields between two district snapshots."""
    NUMERIC_FIELDS = [
        'temperature_c', 'humidity_pct', 'rainfall_mm', 'wind_speed_kmh',
        'wind_gust_kmh', 'pressure_hpa', 'water_level_m', 'tidal_height_m',
        'river_flow_cumec', 'flood_prob_pct', 'prob_high', 'prob_moderate',
        'prob_low', 'baseline_prob',
    ]
    out = dict(d1)  # start from newer, override numerics
    for field in NUMERIC_FIELDS:
        if field in d0 and field in d1:
            out[field] = _lerp(d0[field], d1[field], alpha)

    # Round display values
    out['flood_prob_pct'] = round(out['flood_prob_pct'], 1)
    out['temperature_c']  = round(out['temperature_c'],  1)
    out['rainfall_mm']    = round(out['rainfall_mm'],    2)
    out['humidity_pct']   = round(out['humidity_pct'],   1)

    # Reclassify risk from interpolated probability (use new thresholds)
    out['risk_level'] = classify_risk(out['flood_prob_pct'])

    return out


def get_interpolated_snapshot():
    """
    Returns current interpolated snapshot based on elapsed time since T1.
    α = 0 → pure T0 values, α = 1 → pure T1 values
    Between fetches, values smoothly drift from T0 toward T1.
    """
    with _INTERP['lock']:
        T0 = _INTERP['T0']
        T1 = _INTERP['T1']
        T0_t = _INTERP['T0_time']
        T1_t = _INTERP['T1_time']

    if T1 is None:
        return None, 0, 0   # not ready yet

    now = time.time()
    elapsed_since_T1 = now - T1_t
    next_refresh_in  = max(0, _SNAPSHOT_INTERVAL - elapsed_since_T1)

    if T0 is T1 or T0_t == T1_t:
        # First snapshot — no interpolation
        alpha = 1.0
    else:
        # How far between T0 and T1 are we?
        # We extrapolate slightly beyond T1 until next fetch arrives
        interval = T1_t - T0_t
        if interval <= 0:
            alpha = 1.0
        else:
            alpha = min((now - T0_t) / interval, 1.2)  # allow slight extrapolation

    results = []
    for d in TN_DISTRICTS:
        name = d['name']
        d0 = T0.get(name)
        d1 = T1.get(name)
        if d0 and d1:
            results.append(_interpolate_district(d0, d1, alpha))
        elif d1:
            results.append(d1)

    return results, round(elapsed_since_T1, 1), round(next_refresh_in, 1)


# ── ROUTES ────────────────────────────────────────────────────────────

@app.route('/api/interpolated-predictions', methods=['GET'])
def interpolated_predictions():
    """
    Per-minute endpoint: returns smoothly interpolated predictions.
    Clients should call this every 60 seconds.
    """
    results, elapsed, next_in = get_interpolated_snapshot()

    if results is None:
        # Background thread not ready yet — wait briefly
        time.sleep(2)
        results, elapsed, next_in = get_interpolated_snapshot()
        if results is None:
            return jsonify({'status': 'loading', 'message': 'Fetching initial data...'}), 202

    h = sum(1 for r in results if r['risk_level'] == 'High')
    m = sum(1 for r in results if r['risk_level'] == 'Moderate')
    l = sum(1 for r in results if r['risk_level'] == 'Low')

    return jsonify({
        'status':             'ok',
        'data':               results,
        'timestamp':          datetime.datetime.now().isoformat(),
        'interpolated':       True,
        'elapsed_since_fetch': elapsed,
        'next_refresh_in':    next_in,
        'total_districts':    len(results),
        'risk_summary':       {'high': h, 'moderate': m, 'low': l},
        'thresholds':         {'moderate_pct': 45, 'high_pct': 65},
        'live':               True,
    })


@app.route('/api/live-predictions', methods=['GET'])
def live_predictions():
    """
    Legacy endpoint — now delegates to interpolated data.
    """
    results, elapsed, next_in = get_interpolated_snapshot()

    if results is None:
        # Fall back to direct fetch
        live_weather = fetch_all_districts_weather()
        results = build_predictions_snapshot(live_weather)
        elapsed = 0
        next_in = _SNAPSHOT_INTERVAL

    return jsonify({
        'status':     'ok',
        'data':       results,
        'timestamp':  datetime.datetime.now().isoformat(),
        'live':       True,
        'thresholds': {'moderate_pct': 45, 'high_pct': 65},
    })


@app.route('/api/weather/<float:lat>/<float:lon>', methods=['GET'])
def weather_by_coords(lat, lon):
    d    = {'name': f'{lat},{lon}', 'lat': lat, 'lon': lon}
    _, w = fetch_district_weather(d)
    return jsonify({'status': 'ok', 'data': w})


@app.route('/api/predict', methods=['POST'])
def predict():
    body = request.get_json(force=True)
    district_name = body.get('district')
    return jsonify({'status': 'ok', 'data': predict_risk(body, district_name)})


@app.route('/api/districts', methods=['GET'])
def districts():
    return jsonify({'status': 'ok', 'data': TN_DISTRICTS})


@app.route('/api/history', methods=['GET'])
def history():
    district = request.args.get('district')
    data = FLOOD_HISTORY
    if district:
        data = [r for r in data if r['district'].lower() == district.lower()]
    return jsonify({'status': 'ok', 'data': data})


@app.route('/api/retrain', methods=['POST'])
def retrain():
    import subprocess
    try:
        script = os.path.join(BASE, 'train_model.py')
        subprocess.Popen(['python', '-X', 'utf8', script], cwd=BASE)
        return jsonify({'status': 'ok', 'message': 'Retraining started'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def stats():
    results, _, _ = get_interpolated_snapshot()
    if not results:
        results = []
    total   = len(TN_DISTRICTS)
    total_h = max(len(FLOOD_HISTORY), 1)
    h = sum(1 for r in results if r.get('risk_level') == 'High')
    m = sum(1 for r in results if r.get('risk_level') == 'Moderate')
    l = sum(1 for r in results if r.get('risk_level') == 'Low')
    return jsonify({'status': 'ok', 'data': {
        'total_districts':   total,
        'history_records':   total_h,
        'high_risk_count':   h,
        'moderate_risk_count': m,
        'low_risk_count':    l,
        'high_risk_pct':     round(h / max(total, 1) * 100, 1),
        'moderate_risk_pct': round(m / max(total, 1) * 100, 1),
        'low_risk_pct':      round(l / max(total, 1) * 100, 1),
        'current_month':     datetime.datetime.now().month,
        'thresholds':        {'moderate_pct': 45, 'high_pct': 65},
    }})


@app.route('/api/tide-data', methods=['GET'])
def tide_data():
    """Return processed tide heights from tide_data_cleaned.xlsx."""
    district = request.args.get('district')
    calib_out = {}
    for name, c in DISTRICT_CALIB.items():
        if district and name.lower() != district.lower():
            continue
        calib_out[name] = {
            'tide_height_m':       c['tide_height_m'],
            'tide_station':        c.get('tide_station'),
            'coastal_vuln_score':  c['coastal_vuln_score'],
            'baseline_flood_prob': c['baseline_flood_prob'],
            'region':              c['region'],
            'is_coastal':          c['is_coastal'],
        }
    return jsonify({'status': 'ok', 'data': calib_out,
                    'thresholds': {'moderate_pct': 45, 'high_pct': 65}})


@app.route('/api/sensor-data', methods=['GET'])
def sensor_data():
    with _SENSOR_LOCK:
        local_data = dict(_SENSOR_DATA) if _SENSOR_DATA else {}

    with _FIREBASE_LOCK:
        fb_data = dict(_FIREBASE_DATA) if _FIREBASE_DATA else {}

    # Merge for portal view — Firebase is the primary live source
    try:
        if fb_data.get('status') == 'online' and fb_data.get('data'):
            fb   = fb_data['data']
            fm   = fb.get('flood_monitor') or {}
            live = fm.get('live') or {}
            rt   = fb.get('realtime') or {}

            # ── Fallback: if live node is empty, use latest history entry ──
            if not live:
                history = fm.get('history') or {}
                if history:
                    # Pick the entry with the highest timestamp
                    latest = max(history.values(), key=lambda e: int(e.get('timestamp', 0)))
                    live = latest
                    print(f"[SENSOR-DATA] Using history fallback: ts={live.get('timestamp')} wl={live.get('waterLevel')}")

            # waterLevel in flood_monitor data is MILLIMETRES → convert to metres
            wl_mm    = int(live.get('waterLevel') or 0)
            wl_rt_cm = float(rt.get('water_level_cm') or 0)
            if wl_mm > 0:
                water_level_m = round(wl_mm / 1000.0, 3)   # mm → m
            elif wl_rt_cm > 0:
                water_level_m = round(wl_rt_cm / 100.0, 3)  # cm → m
            else:
                water_level_m = 0.0

            fb_flow  = float(live.get('flowRate') or 0)
            overflow = bool(live.get('overflow') or False)
            # safe access to local sensor data (may be None when offline)
            local_d  = local_data.get('data') or {}
            if not isinstance(local_d, dict):
                local_d = {}
            rainfall = float(local_d.get('rainfall') or (round(fb_flow * 0.5, 2) if fb_flow else 0))
            temp     = float(local_d.get('temperature') or 32)

            return jsonify({
                'status':       'online',
                'last_updated': fb_data.get('last_updated', ''),
                'data': {
                    'water_level':    water_level_m,
                    'water_level_mm': wl_mm,
                    'flow_rate':      fb_flow,
                    'overflow':       overflow,
                    'rainfall':       rainfall,
                    'temperature':    temp,
                    'source':         'Firebase (Tirunelveli)',
                    'alert':          rt.get('status') == 'DANGER' or overflow,
                    'rt_status':      str(rt.get('status') or 'SAFE'),
                    'rt_message':     str(rt.get('message') or 'Live sensor data'),
                }
            })
    except Exception as ex:
        print(f"[SENSOR-DATA] Merge error: {ex}")

    return jsonify(local_data)


@app.route('/api/health', methods=['GET'])
def health():
    results, elapsed, next_in = get_interpolated_snapshot()
    ready = results is not None
    return jsonify({
        'status':            'ok',
        'message':           'Flood Prediction API running',
        'live_weather':      True,
        'interpolation':     True,
        'data_ready':        ready,
        'districts':         38,
        'elapsed_since_fetch': elapsed,
        'next_refresh_in':   next_in,
        'thresholds':        {'moderate_pct': 45, 'high_pct': 65},
    })


if __name__ == '__main__':
    print("\n" + "="*60)
    print("  FLOOD GUARD TN — API SERVER")
    print("  Thresholds: Moderate ≥ 45% | High ≥ 65%")
    print("  Tide data: Chennai, Nagapattinam, Tuticorin gauges")
    print("  Interpolation: every-minute smooth updates")
    print("="*60 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
