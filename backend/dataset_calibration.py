"""
dataset_calibration.py
──────────────────────
Loads the real flood.csv dataset (50k rows, FloodProbability 0–1)
and tide_data_cleaned.xlsx to:
  1. Compute a per-district baseline flood probability offset from the
     dataset's factor scores (MonsoonIntensity, CoastalVulnerability, etc.)
  2. Map real tide gauge readings (Chennai, Nagapattinam, Tuticorin) to
     all 38 Tamil Nadu coastal/non-coastal districts
  3. Export calibration constants used by app.py for accurate predictions
"""
import os
import sys
import pandas as pd
import numpy as np

BASE = os.path.dirname(__file__)
DATA = os.path.join(BASE, '..', 'dataset')

# ── Tamil Nadu 38 Districts with coastal/geographic properties ────────
TN_DISTRICT_META = {
    # name → (coastal, region, nearby_tide_station)
    "Chennai":          (True,  "north_coast",  "Chennai"),
    "Tiruvallur":       (True,  "north_coast",  "Chennai"),
    "Kancheepuram":     (True,  "north_coast",  "Chennai"),
    "Chengalpattu":     (False, "north_coast",  "Chennai"),
    "Vellore":          (False, "north",        None),
    "Ranipet":          (False, "north",        None),
    "Tirupattur":       (False, "north",        None),
    "Krishnagiri":      (False, "north",        None),
    "Dharmapuri":       (False, "west",         None),
    "Salem":            (False, "west",         None),
    "Namakkal":         (False, "west",         None),
    "Erode":            (False, "west",         None),
    "Nilgiris":         (False, "west",         None),
    "Coimbatore":       (False, "west",         None),
    "Tiruppur":         (False, "west",         None),
    "Karur":            (False, "central",      None),
    "Tiruchirappalli":  (False, "central",      None),
    "Perambalur":       (False, "central",      None),
    "Ariyalur":         (False, "central",      None),
    "Cuddalore":        (True,  "east_coast",   "Nagapattinam"),
    "Villupuram":       (True,  "east_coast",   "Nagapattinam"),
    "Kallakurichi":     (False, "east_coast",   None),
    "Tiruvannamalai":   (False, "east_coast",   None),
    "Thanjavur":        (True,  "delta",        "Nagapattinam"),
    "Tiruvarur":        (True,  "delta",        "Nagapattinam"),
    "Nagapattinam":     (True,  "delta",        "Nagapattinam"),
    "Mayiladuthurai":   (True,  "delta",        "Nagapattinam"),
    "Pudukkottai":      (True,  "south_coast",  "Tuticorin"),
    "Sivaganga":        (False, "south",        None),
    "Madurai":          (False, "south",        None),
    "Dindigul":         (False, "south",        None),
    "Theni":            (False, "south",        None),
    "Virudhunagar":     (False, "south",        None),
    "Ramanathapuram":   (True,  "south_coast",  "Tuticorin"),
    "Thoothukudi":      (True,  "south_coast",  "Tuticorin"),
    "Tirunelveli":      (True,  "south_coast",  "Tuticorin"),
    "Tenkasi":          (False, "south",        None),
    "Kanyakumari":      (True,  "tip",          "Tuticorin"),
}

# Regional base risk factors from domain knowledge + dataset statistics
# flood.csv factors rated 0–10, mean ~5.0 across all.
# These reflect each region's monsoon exposure and drainage vulnerability.
REGION_FACTORS = {
    "north_coast":  {"monsoon": 7.5, "drainage": 4.5, "coastal_vuln": 8.0},
    "east_coast":   {"monsoon": 7.0, "drainage": 5.0, "coastal_vuln": 7.5},
    "delta":        {"monsoon": 8.0, "drainage": 4.0, "coastal_vuln": 8.5},  # Cauvery delta = highest
    "south_coast":  {"monsoon": 6.5, "drainage": 5.5, "coastal_vuln": 7.0},
    "tip":          {"monsoon": 5.5, "drainage": 6.0, "coastal_vuln": 6.5},
    "west":         {"monsoon": 5.5, "drainage": 6.0, "coastal_vuln": 1.0},
    "central":      {"monsoon": 6.0, "drainage": 5.0, "coastal_vuln": 2.0},
    "north":        {"monsoon": 6.0, "drainage": 5.5, "coastal_vuln": 2.5},
    "south":        {"monsoon": 5.5, "drainage": 5.5, "coastal_vuln": 1.5},
}


def load_flood_dataset_stats():
    """Load flood.csv and extract calibration statistics."""
    fpath = os.path.join(DATA, 'flood.csv')
    df = pd.read_csv(fpath)

    # Normalize all factor columns to 0–1 scale (they're 0–10+ integer scores)
    factor_cols = [
        'MonsoonIntensity', 'TopographyDrainage', 'RiverManagement',
        'Deforestation', 'Urbanization', 'ClimateChange', 'DamsQuality',
        'Siltation', 'AgriculturalPractices', 'Encroachments',
        'IneffectiveDisasterPreparedness', 'DrainageSystems',
        'CoastalVulnerability', 'Landslides', 'Watersheds',
        'DeterioratingInfrastructure', 'PopulationScore', 'WetlandLoss',
        'InadequatePlanning', 'PoliticalFactors'
    ]

    stats = {}
    for col in factor_cols:
        col_max = df[col].max()
        if col_max > 0:
            stats[col] = {
                'mean': df[col].mean() / col_max,
                'std':  df[col].std()  / col_max,
                'p75':  df[col].quantile(0.75) / col_max,
                'p90':  df[col].quantile(0.90) / col_max,
            }

    # Compute dataset-derived probability calibration model
    # FloodProbability in dataset: 0.285 – 0.725, mean ~0.50
    # We use the weighted sum of normalized factors as a base
    df_norm = df.copy()
    for col in factor_cols:
        col_max = df[col].max()
        if col_max > 0:
            df_norm[col] = df[col] / col_max

    # Key predictors of FloodProbability in this dataset
    key_factors = [
        ('MonsoonIntensity',             0.20),
        ('DrainageSystems',              0.15),  # poor drainage ↑ risk
        ('CoastalVulnerability',         0.12),
        ('TopographyDrainage',           0.10),
        ('RiverManagement',              0.08),
        ('Deforestation',                0.07),
        ('Siltation',                    0.06),
        ('IneffectiveDisasterPreparedness', 0.06),
        ('Urbanization',                 0.05),
        ('DeterioratingInfrastructure',  0.05),
        ('WetlandLoss',                  0.04),
        ('Landslides',                   0.02),
    ]

    # Validate correlation with actual FloodProbability
    score = sum(df_norm[col] * w for col, w in key_factors)
    corr = np.corrcoef(score, df['FloodProbability'])[0, 1]
    print(f"  [CALIB] Factor score vs FloodProbability correlation: {corr:.3f}")

    return stats, key_factors


def load_tide_data():
    """
    Load tide_data_cleaned.xlsx and compute:
    - Station average high-tide height
    - Current month's average high tide (for seasonal accuracy)
    Returns dict: {station_name -> {month -> avg_high_tide_m}}
    """
    tpath = os.path.join(DATA, 'tide_data_cleaned.xlsx')
    td = pd.read_excel(tpath)

    # Only use High tide events
    high = td[td['Tide_Type'] == 'High'].copy()

    # Build monthly averages per station
    tide_table = {}
    for loc in high['Location'].unique():
        loc_data = high[high['Location'] == loc]
        tide_table[loc] = {}
        for month in loc_data['Month'].unique():
            m_data = loc_data[loc_data['Month'] == month]
            tide_table[loc][month] = round(m_data['Tide_Height_m'].mean(), 3)

        # Overall average (fallback for months not in dataset)
        tide_table[loc]['_avg'] = round(loc_data['Tide_Height_m'].mean(), 3)
        tide_table[loc]['_max'] = round(loc_data['Tide_Height_m'].max(), 3)

    return tide_table


def compute_district_calibration():
    """
    Main function: computes per-district calibration dict with:
      - baseline_flood_prob: dataset-derived base probability offset (0–1)
      - tide_height_m: real tidal height from gauge data
      - coastal_vuln_score: 0–1 coastal vulnerability index
    Returns dict: {district_name -> calibration_dict}
    """
    print("[CALIB] Loading flood.csv dataset statistics...")
    stats, key_factors = load_flood_dataset_stats()

    print("[CALIB] Loading tide gauge data...")
    tide_table = load_tide_data()

    # Month-name mapping (for tide lookup)
    MONTH_NAMES = {
        1:'January', 2:'February', 3:'March', 4:'April', 5:'May', 6:'June',
        7:'July', 8:'August', 9:'September', 10:'October', 11:'November', 12:'December'
    }

    import datetime
    current_month = MONTH_NAMES[datetime.datetime.now().month]

    calibration = {}

    for district, (is_coastal, region, tide_station) in TN_DISTRICT_META.items():
        rf = REGION_FACTORS[region]

        # ── Compute baseline flood probability from dataset factors ──
        # Map regional characteristics onto dataset factor scores (normalized 0–1)
        factor_scores = {
            'MonsoonIntensity':             rf['monsoon'] / 10.0,
            'DrainageSystems':              (10 - rf['drainage']) / 10.0,  # worse drainage = higher risk
            'CoastalVulnerability':         rf['coastal_vuln'] / 10.0,
            'TopographyDrainage':           rf['drainage'] / 10.0,
            'RiverManagement':              0.5,   # uniform (no per-district data)
            'Deforestation':                0.48,
            'Siltation':                    0.52 if region in ['delta','east_coast'] else 0.45,
            'IneffectiveDisasterPreparedness': 0.50,
            'Urbanization':                 0.70 if district in ['Chennai','Coimbatore','Madurai'] else 0.45,
            'DeterioratingInfrastructure':  0.48,
            'WetlandLoss':                  0.55 if is_coastal else 0.42,
            'Landslides':                   0.65 if region == 'west' else 0.30,
        }

        # Weighted sum → baseline flood probability in [0, 1]
        base_prob = sum(factor_scores.get(col, 0.5) * w for col, w in key_factors)

        # Scale to realistic range: dataset FloodProbability is 0.285–0.725
        # We map 0–1 factor score → 0.25–0.75 probability range
        base_prob_scaled = 0.25 + base_prob * 0.50

        # ── Get real tide height from gauge data ──────────────────────
        tide_h = 0.0
        if is_coastal and tide_station:
            station_tides = tide_table.get(tide_station, {})
            # Try current month first, fall back to overall average
            tide_h = station_tides.get(current_month,
                     station_tides.get('_avg', 0.80))
        elif is_coastal:
            # Coastal district near multiple stations — interpolate
            # Use average of closest stations
            all_avgs = [v['_avg'] for v in tide_table.values()]
            tide_h = round(float(np.mean(all_avgs)), 3) if all_avgs else 0.70
        else:
            tide_h = 0.0  # inland district

        calibration[district] = {
            'baseline_flood_prob': round(float(base_prob_scaled), 4),
            'tide_height_m':       round(float(tide_h), 3),
            'coastal_vuln_score':  round(rf['coastal_vuln'] / 10.0, 3),
            'region':              region,
            'is_coastal':          is_coastal,
            'tide_station':        tide_station,
        }

    print(f"[CALIB] Calibration complete for {len(calibration)} districts.")
    return calibration


# ── Tide interpolation helpers ─────────────────────────────────────────
def get_live_tide_height(district_name, tide_table, month_name):
    """
    Get the best available tide height for a district.
    Falls back gracefully if district not in gauge coverage.
    """
    meta = TN_DISTRICT_META.get(district_name, (False, 'central', None))
    is_coastal, region, station = meta

    if not is_coastal:
        return 0.0

    if station and station in tide_table:
        return tide_table[station].get(month_name,
               tide_table[station].get('_avg', 0.80))

    # Fallback: average of all gauge stations
    all_avgs = [v.get('_avg', 0.75) for v in tide_table.values()]
    return round(float(np.mean(all_avgs)), 3) if all_avgs else 0.75


# ── Module-level precomputed calibration ──────────────────────────────
_CALIBRATION = None
_TIDE_TABLE   = None

def get_calibration():
    """Lazy-load and cache calibration (called once at startup)."""
    global _CALIBRATION, _TIDE_TABLE
    if _CALIBRATION is None:
        _CALIBRATION = compute_district_calibration()
        _TIDE_TABLE  = load_tide_data()
    return _CALIBRATION, _TIDE_TABLE


if __name__ == '__main__':
    calib, tides = get_calibration()
    print("\n=== District Calibration Summary ===")
    for name, c in sorted(calib.items(), key=lambda x: -x[1]['baseline_flood_prob']):
        tide_str = f"  tide={c['tide_height_m']:.2f}m" if c['is_coastal'] else ""
        print(f"  {name:<22} base_prob={c['baseline_flood_prob']:.3f}{tide_str}  region={c['region']}")
