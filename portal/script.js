// Initialize GSAP
gsap.registerPlugin(ScrollTrigger);

// Intro Animations
window.addEventListener('DOMContentLoaded', () => {
    const tl = gsap.timeline();

    tl.from('.navbar', { y: -50, opacity: 0, duration: 1, ease: 'power3.out' })
      .from('#hero-title', { x: -50, opacity: 0, duration: 1, ease: 'power3.out' }, '-=0.5')
      .from('#hero-subtitle', { x: -50, opacity: 0, duration: 1, ease: 'power3.out' }, '-=0.8')
      .from('#hero-stats .stat-item', { y: 20, opacity: 0, duration: 0.8, stagger: 0.2, ease: 'power3.out' }, '-=0.5')
      .from('.login-card', { y: 20, duration: 1, ease: 'power2.out' }, '-=0.5');

    // Start fetching data
    startDataFetching();
    // Initialize scroll reveal
    initScrollReveal();
});

// Switch Toggle Logic
const loginContainer = document.querySelector('.login-container');
const userToggle = document.getElementById('user-toggle');
const adminToggle = document.getElementById('admin-toggle');
const userForm = document.getElementById('user-form');
const adminForm = document.getElementById('admin-form');
const accessBadge = document.getElementById('access-badge');

userToggle.addEventListener('click', () => {
    loginContainer.classList.remove('admin-active');
    userToggle.classList.add('active');
    adminToggle.classList.remove('active');
    userForm.classList.add('active');
    adminForm.classList.remove('active');
    accessBadge.textContent = 'USER ACCESS';
    gsap.fromTo(accessBadge, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3 });
});

adminToggle.addEventListener('click', () => {
    loginContainer.classList.add('admin-active');
    userToggle.classList.remove('active');
    adminToggle.classList.add('active');
    userForm.classList.remove('active');
    adminForm.classList.add('active');
    accessBadge.textContent = 'ADMINISTRATOR';
    gsap.fromTo(accessBadge, { opacity: 0, x: 10 }, { opacity: 1, x: 0, duration: 0.3 });
});

// Login Handlers
function navigateToDashboard(type, event) {
    const btn = event.currentTarget;
    btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Connecting...';
    lucide.createIcons();
    setTimeout(() => {
        if (type === 'user') window.location.href = 'http://localhost:5173';
    }, 800);
}

function handleAdminLogin(event) {
    const pass = document.getElementById('admin-pass').value;
    const btn = event.currentTarget;
    if (pass === 'admin123') {
        btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Authenticating...';
        lucide.createIcons();
        setTimeout(() => window.location.href = 'http://localhost:5174', 1000);
    } else {
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 500);
        alert('Invalid Admin Password. Please try again.');
    }
}

// Data Fetching
function startDataFetching() {
    fetchStats();
    fetchSensorData();
    setInterval(fetchStats, 60000);
    setInterval(fetchSensorData, 5000);
}

async function fetchStats() {
    try {
        const response = await fetch('http://localhost:5000/api/stats');
        const result = await response.json();
        if (result.status === 'ok') {
            const risk = result.data.high_risk_count > 0 ? 'High' : (result.data.moderate_risk_count > 0 ? 'Moderate' : 'Low');
            document.getElementById('live-risk-stat').textContent = risk;
            document.getElementById('live-risk-stat').style.color = risk === 'High' ? '#ef4444' : (risk === 'Moderate' ? '#eab308' : '#22c55e');
        }
    } catch (e) { console.error('Stats fetch failed:', e); }
}

async function fetchSensorData() {
    try {
        const response = await fetch('http://localhost:5000/api/sensor-data');
        const result = await response.json();
        const dot = document.getElementById('sensor-status-dot');
        const text = document.getElementById('sensor-status-text');
        const time = document.getElementById('last-update-time');

        if (result.status === 'online' && result.data) {
            dot.className = result.data.alert ? 'status-indicator online alert-pulse' : 'status-indicator online';
            text.textContent = result.data.source || 'Sensor Node Online';
            time.textContent = result.last_updated;
            animateValue('sensor-water-level', result.data.water_level || 0);
            animateValue('sensor-rainfall', result.data.rainfall || 0);
            animateValue('sensor-temp', result.data.temperature || 32);
        } else {
            dot.className = 'status-indicator offline';
            text.textContent = 'Sensor Node Offline';
            time.textContent = 'N/A';
        }
    } catch (e) { console.error('Sensor data fetch failed:', e); }
}

function animateValue(id, value) {
    const el = document.getElementById(id);
    const startValue = parseFloat(el.textContent) || 0;
    gsap.to({ val: startValue }, {
        val: value, duration: 1,
        onUpdate: function() { el.textContent = this.targets()[0].val.toFixed(2); }
    });
}

// Scroll Reveal
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });
    reveals.forEach(el => observer.observe(el));
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});
