// ─── App State ───────────────────────────────────────────────────────────────
let areas = [];           // [{ id, name, block, level, nodes: [...] }]
let chartInstance = null;
let dataInterval = null;
let currentAreaId = null; // for zone-detail view

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Auth: check if returning from login via hash
    const hash = window.location.hash.replace('#', '');
    const auth = sessionStorage.getItem('ventra_auth');
    if (hash && ['dashboard', 'alerts', 'profile'].includes(hash)) {
        if (auth) {
            history.replaceState(null, '', window.location.pathname);
            navigateTo(hash);
        } else {
            history.replaceState(null, '', window.location.pathname);
        }
    }

    updateNavAuth();

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(e.currentTarget.getAttribute('data-target'));
        });
    });

    // Setup form (inside modal)
    const form = document.getElementById('setup-form');
    if (form) form.addEventListener('submit', handleSetupSubmit);

    // Add Zone button → open modal
    const addBtn = document.getElementById('add-zone-btn');
    if (addBtn) addBtn.addEventListener('click', openAddZoneModal);

    // Modal close
    const closeBtn = document.getElementById('modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeAddZoneModal);
    const overlay = document.getElementById('zone-modal-overlay');
    if (overlay) overlay.addEventListener('click', e => {
        if (e.target === overlay) closeAddZoneModal();
    });

    const simBtn = document.getElementById('simulate-alert-btn');
    if (simBtn) simBtn.addEventListener('click', simulateHardwareFailure);

    addLogEntry('System Initialized', 'Edge AI Core', 'OK');
    addLogEntry('CSI Module Online', 'Wi-Fi Sensor', 'OK');

    // Dashboard starts on zone overview
    seedDemoData();
    renderZoneGrid();
    updateKPIs();
    generateAIRecommendations();
});

// ─── Demo Seed Data ───────────────────────────────────────────────────────────
function seedDemoData() {
    const demoAreas = [
        {
            id: 'area-demo-1', name: 'Conference Room BKT4',
            block: 'Block P16', level: 'Level 3',
            nodes: [
                { id:'area-demo-1-node-1', nodeNum:1, occupancy:true,  fanSpeed:72, damperAngle:55, status:'active',
                  co2:820,  nodeHealth:'online',  lastSeenMin:2,  trend:'up',   prediction:'Peak expected at 14:00',
                  // CSI
                  csiConfidence:94, motionState:'moving', csiSignalStrength:'strong', csiStable:true,
                  // BME280 + DS18B20
                  temperature:24.2, humidity:65, pressure:1012, airflowTemp:16.8, comfortLevel:'good',
                  // Edge AI
                  decisionSource:'Edge AI', modelStatus:'running', responseLatency:38,
                  // Node identity
                  nodeRole:'controller', wifiStatus:'connected', mqttStatus:'connected', uptime:'6h 12m',
                  // HVAC actuation
                  controlMode:'AI', recFanSpeed:75, recVavPct:63,
                  traceability:'CSI detected occupancy (94% conf.) → Edge AI set fan 72%, VAV 61% → Comfort: Good'
                },
                { id:'area-demo-1-node-2', nodeNum:2, occupancy:true,  fanSpeed:68, damperAngle:50, status:'active',
                  co2:790,  nodeHealth:'online',  lastSeenMin:1,  trend:'up',   prediction:'Peak expected at 14:00',
                  csiConfidence:88, motionState:'still',  csiSignalStrength:'strong', csiStable:true,
                  temperature:24.8, humidity:67, pressure:1012, airflowTemp:17.1, comfortLevel:'good',
                  decisionSource:'Edge AI', modelStatus:'running', responseLatency:42,
                  nodeRole:'csi_node', wifiStatus:'connected', mqttStatus:'connected', uptime:'6h 11m',
                  controlMode:'AI', recFanSpeed:70, recVavPct:58,
                  traceability:'CSI detected still occupancy (88%) → Edge AI maintained fan 68%, VAV 56% → Stable'
                },
                { id:'area-demo-1-node-3', nodeNum:3, occupancy:false, fanSpeed:18, damperAngle:12, status:'active',
                  co2:430,  nodeHealth:'online',  lastSeenMin:14, trend:'down', prediction:'Likely empty in 20 min',
                  csiConfidence:97, motionState:'empty',  csiSignalStrength:'strong', csiStable:true,
                  temperature:23.5, humidity:60, pressure:1013, airflowTemp:22.0, comfortLevel:'good',
                  decisionSource:'Edge AI', modelStatus:'running', responseLatency:35,
                  nodeRole:'sensor_node', wifiStatus:'connected', mqttStatus:'connected', uptime:'6h 10m',
                  controlMode:'AI', recFanSpeed:0, recVavPct:15,
                  traceability:'CSI detected empty (97% conf.) → Edge AI reduced fan 18%, VAV 13% → Energy saved'
                },
            ]
        },
        {
            id: 'area-demo-2', name: 'Staff Office N28',
            block: 'Block N28a', level: 'Level 2',
            nodes: [
                { id:'area-demo-2-node-1', nodeNum:1, occupancy:false, fanSpeed:22, damperAngle:15, status:'active',
                  co2:510,  nodeHealth:'fallback', lastSeenMin:38, trend:'down', prediction:'Likely empty in 20 min',
                  csiConfidence:51, motionState:'empty',  csiSignalStrength:'weak',   csiStable:false,
                  temperature:26.1, humidity:72, pressure:1011, airflowTemp:19.5, comfortLevel:'warm',
                  decisionSource:'Fallback', modelStatus:'fallback', responseLatency:null,
                  nodeRole:'csi_node', wifiStatus:'weak', mqttStatus:'disconnected', uptime:'2h 04m',
                  controlMode:'fallback', recFanSpeed:0, recVavPct:10,
                  traceability:'CSI unstable (51%) → Fallback timer control → Fan 22% (not reduced due to signal loss)'
                },
                { id:'area-demo-2-node-2', nodeNum:2, occupancy:false, fanSpeed:20, damperAngle:10, status:'active',
                  co2:480,  nodeHealth:'online',  lastSeenMin:41, trend:'stable', prediction:'Shut down recommended',
                  csiConfidence:96, motionState:'empty',  csiSignalStrength:'moderate', csiStable:true,
                  temperature:25.8, humidity:70, pressure:1011, airflowTemp:20.2, comfortLevel:'warm',
                  decisionSource:'Edge AI', modelStatus:'running', responseLatency:44,
                  nodeRole:'sensor_node', wifiStatus:'connected', mqttStatus:'connected', uptime:'6h 08m',
                  controlMode:'AI', recFanSpeed:0, recVavPct:10,
                  traceability:'CSI detected empty (96%) → Edge AI recommends shutdown → Awaiting operator confirm'
                },
            ]
        },
        {
            id: 'area-demo-3', name: 'Seminar Hall P8',
            block: 'Block P8', level: 'Level 1',
            nodes: [
                { id:'area-demo-3-node-1', nodeNum:1, occupancy:true,  fanSpeed:85, damperAngle:70, status:'active',
                  co2:950,  nodeHealth:'online',  lastSeenMin:3,  trend:'up',   prediction:'Peak expected at 14:00',
                  csiConfidence:99, motionState:'moving', csiSignalStrength:'strong', csiStable:true,
                  temperature:27.3, humidity:74, pressure:1010, airflowTemp:14.5, comfortLevel:'warm',
                  decisionSource:'Edge AI', modelStatus:'running', responseLatency:31,
                  nodeRole:'controller', wifiStatus:'connected', mqttStatus:'connected', uptime:'6h 15m',
                  controlMode:'AI', recFanSpeed:90, recVavPct:82,
                  traceability:'CSI high activity (99%) + CO₂ 950ppm → Edge AI max airflow → VAV 78%, Fan 85%'
                },
                { id:'area-demo-3-node-2', nodeNum:2, occupancy:true,  fanSpeed:80, damperAngle:65, status:'active',
                  co2:910,  nodeHealth:'online',  lastSeenMin:5,  trend:'up',   prediction:'Peak expected at 14:00',
                  csiConfidence:95, motionState:'moving', csiSignalStrength:'strong', csiStable:true,
                  temperature:27.1, humidity:73, pressure:1010, airflowTemp:15.0, comfortLevel:'warm',
                  decisionSource:'Edge AI', modelStatus:'running', responseLatency:33,
                  nodeRole:'csi_node', wifiStatus:'connected', mqttStatus:'connected', uptime:'6h 14m',
                  controlMode:'AI', recFanSpeed:85, recVavPct:78,
                  traceability:'CSI motion detected (95%) → Edge AI boosted fan to 80%, VAV 72%'
                },
                { id:'area-demo-3-node-3', nodeNum:3, occupancy:true,  fanSpeed:78, damperAngle:60, status:'active',
                  co2:890,  nodeHealth:'online',  lastSeenMin:4,  trend:'stable', prediction:'Peak expected at 14:00',
                  csiConfidence:91, motionState:'still',  csiSignalStrength:'strong', csiStable:true,
                  temperature:26.9, humidity:72, pressure:1010, airflowTemp:15.5, comfortLevel:'warm',
                  decisionSource:'Edge AI', modelStatus:'running', responseLatency:36,
                  nodeRole:'sensor_node', wifiStatus:'connected', mqttStatus:'connected', uptime:'6h 13m',
                  controlMode:'AI', recFanSpeed:80, recVavPct:72,
                  traceability:'CSI still occupancy (91%) → Edge AI sustained fan 78%, VAV 67%'
                },
                { id:'area-demo-3-node-4', nodeNum:4, occupancy:false, fanSpeed:15, damperAngle:8,  status:'critical',
                  co2:400,  nodeHealth:'offline', lastSeenMin:62, trend:'down', prediction:'Node offline',
                  csiConfidence:0,  motionState:'unknown', csiSignalStrength:'none',   csiStable:false,
                  temperature:null, humidity:null, pressure:null, airflowTemp:null, comfortLevel:'unknown',
                  decisionSource:'Fallback', modelStatus:'fallback', responseLatency:null,
                  nodeRole:'csi_node', wifiStatus:'disconnected', mqttStatus:'disconnected', uptime:'Offline',
                  controlMode:'fallback', recFanSpeed:0, recVavPct:0,
                  traceability:'Node offline — VAV actuator fault → Fallback bypass active → Manual inspection required'
                },
            ]
        }
    ];
    areas.push(...demoAreas);

    // Pre-fill status log
    const logEntries = [
        ['VAV Damper Fault — Node 4',           'Seminar Hall P8',      'CRITICAL'],
        ['CSI Occupancy Detected (94% conf.)',   'Conference Room BKT4', 'OK'],
        ['Edge AI: Fan → 72%, VAV → 61%',        'Conference Room BKT4', 'OK'],
        ['Edge Model OTA Update v2.1.4',          'Edge AI Core',         'OK'],
        ['CSI Signal Degraded — Fallback Active', 'Staff Office N28',     'CRITICAL'],
        ['MQTT Reconnected',                       'Edge AI Core',         'OK'],
        ['BME280: Temp 27.3°C, Humid 74%',        'Seminar Hall P8',      'OK'],
        ['DS18B20: Airflow 14.5°C at vent',        'Seminar Hall P8',      'OK'],
        ['HVAC Ramping Down (empty zone)',          'Staff Office N28',     'OK'],
    ];
    logEntries.forEach(([event, component, status]) => addLogEntry(event, component, status));

    // Start live simulation and chart
    initChart();
    dataInterval = setInterval(updateLiveMockData, 15000);
    seedDemoAlerts();
}


// ─── Protected Routes ─────────────────────────────────────────────────────────
const PROTECTED = ['dashboard', 'alerts', 'profile'];
function isLoggedIn() { return !!sessionStorage.getItem('ventra_auth'); }

function navigateTo(id) {
    if (PROTECTED.includes(id) && !isLoggedIn()) {
        window.location.href = `login.html?redirect=${id}`;
        return;
    }
    document.querySelectorAll('.nav-link').forEach(l =>
        l.classList.toggle('active', l.getAttribute('data-target') === id));
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (id === 'dashboard' && areas.length > 0 && !chartInstance) initChart();
}

// ─── Nav Auth ─────────────────────────────────────────────────────────────────
function updateNavAuth() {
    const auth = sessionStorage.getItem('ventra_auth');
    const navBtn = document.getElementById('nav-auth-btn');
    const heroCards = document.getElementById('hero-cards');
    const navEl = document.querySelector('.nav-links');

    const existing = document.getElementById('nav-user-pill');
    if (existing) existing.remove();

    if (auth) {
        const user = JSON.parse(auth);
        if (navBtn) navBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Sign Out`;
        if (heroCards) heroCards.style.display = 'flex';

        const greetEl = document.getElementById('hero-greeting');
        const greetText = document.getElementById('greeting-text');
        if (greetEl && greetText) {
            const hour = new Date().getHours();
            const salute = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
            greetText.textContent = `${salute}, ${user.name} 👋`;
            greetEl.style.display = 'inline-flex';
        }

        const li = document.createElement('li');
        li.id = 'nav-user-pill';
        li.innerHTML = `<span style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;color:#1e293b;padding:0 0.25rem">
            <span style="background:#2563EB;color:#fff;font-size:0.7rem;font-weight:700;padding:0.2rem 0.6rem;border-radius:20px">${user.name}</span>
        </span>`;
        if (navEl) navEl.appendChild(li);
    } else {
        if (navBtn) navBtn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In`;
        if (heroCards) heroCards.style.display = 'none';
        const greetEl = document.getElementById('hero-greeting');
        if (greetEl) greetEl.style.display = 'none';
        const badge = document.getElementById('alert-badge');
        if (badge) badge.style.display = 'none';
    }
}

function navAuthAction() {
    isLoggedIn() ? signOut() : (window.location.href = 'login.html?redirect=dashboard');
}

function signOut() {
    sessionStorage.removeItem('ventra_auth');
    navigateTo('home');
    updateNavAuth();
}

// ─── Add Zone Modal ───────────────────────────────────────────────────────────
function openAddZoneModal() {
    const overlay = document.getElementById('zone-modal-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeAddZoneModal() {
    const overlay = document.getElementById('zone-modal-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        document.body.style.overflow = '';
        document.getElementById('setup-form').reset();
    }
}

// ─── Register Zone ────────────────────────────────────────────────────────────
function handleSetupSubmit(e) {
    e.preventDefault();
    const name  = document.getElementById('room-name').value.trim();
    const level = document.getElementById('room-level').value.trim();
    const block = document.getElementById('room-block').value.trim();
    const count = parseInt(document.getElementById('node-count').value);

    const areaId = `area-${Date.now()}`;
    const nodes = [];
    for (let i = 1; i <= count; i++) {
        nodes.push({
            id: `${areaId}-node-${i}`,
            nodeNum: i,
            occupancy: Math.random() > 0.5,
            fanSpeed: Math.floor(Math.random() * 55) + 20,
            damperAngle: Math.floor(Math.random() * 50) + 10,
            status: 'active'
        });
    }

    areas.push({ id: areaId, name, block, level, nodes });

    closeAddZoneModal();
    renderZoneGrid();
    updateKPIs();
    if (!chartInstance) initChart();
    if (!dataInterval) dataInterval = setInterval(updateLiveMockData, 15000);
    addLogEntry(`Registered ${count} Node(s) — ${name} (${block})`, 'Setup Wizard', 'OK');

    // Update total nodes KPI
    const totalEl = document.getElementById('total-nodes');
    if (totalEl) totalEl.textContent = areas.reduce((s, a) => s + a.nodes.length, 0);
}

// ─── Zone Grid (one bubble per area) ─────────────────────────────────────────
function renderZoneGrid() {
    const container = document.getElementById('room-cards-container');
    if (!container) return;
    container.innerHTML = '';

    if (areas.length === 0) {
        container.innerHTML = `<div class="zone-empty-state"><i class="fa-solid fa-layer-group"></i><p>No zones registered yet.</p><p class="zone-empty-sub">Click <strong>+ Add Zone</strong> to register your first location.</p></div>`;
        return;
    }

    areas.forEach(area => {
        const totalNodes = area.nodes.length;
        const occupied   = area.nodes.filter(n => n.occupancy && n.status !== 'critical').length;
        const critCount  = area.nodes.filter(n => n.status === 'critical').length;
        const avgFan     = Math.round(area.nodes.reduce((s, n) => s + n.fanSpeed, 0) / totalNodes);
        const hasCrit    = critCount > 0;
        const tileClass  = hasCrit ? 'critical' : (occupied > 0 ? 'occupied' : 'empty');
        const badgeClass = hasCrit ? 'crit' : (occupied > 0 ? 'occ' : 'empty');
        const statusLabel= hasCrit ? `⚠ ${critCount} Alert(s)` : (occupied > 0 ? `${occupied} Occupied` : 'All Empty');

        // Pick most notable trend and prediction from nodes
        const trends = area.nodes.map(n => n.trend || 'stable');
        const areaTrend = trends.includes('up') ? 'up' : trends.includes('down') ? 'down' : 'stable';
        const trendIcon = areaTrend === 'up' ? '↑ Increasing' : areaTrend === 'down' ? '↓ Decreasing' : '→ Stable';
        const maxLastSeen = Math.max(...area.nodes.map(n => n.lastSeenMin || 0));
        const prediction  = area.nodes.find(n => n.prediction)?.prediction || '';

        // Hardware strip vars
        const validNodes      = area.nodes.filter(n => n.temperature != null);
        const avgTemp         = validNodes.length ? (validNodes.reduce((s,n)=>s+n.temperature,0)/validNodes.length).toFixed(1) : null;
        const avgHum          = validNodes.length ? Math.round(validNodes.reduce((s,n)=>s+n.humidity,0)/validNodes.length) : null;
        const avgCSI          = Math.round(area.nodes.reduce((s,n)=>s+(n.csiConfidence||0),0)/totalNodes);
        const comforts        = area.nodes.map(n=>n.comfortLevel||'good');
        const dominantComfort = comforts.includes('warm') ? 'warm' : comforts.includes('cold') ? 'cold' : 'good';
        const hasFallback     = area.nodes.some(n => n.controlMode==='fallback' || n.csiStable===false);

        container.insertAdjacentHTML('beforeend', `
            <div class="zone-tile ${tileClass}" onclick="openZoneDetail('${area.id}')" style="cursor:pointer">
                <div class="zone-tile-top">
                    <div>
                        <div class="zone-name">${area.name}</div>
                        <div class="zone-loc"><i class="fa-solid fa-location-dot"></i> ${area.block}, ${area.level}</div>
                    </div>
                    <span class="zone-occ-badge ${badgeClass}">${statusLabel}</span>
                </div>
                <div class="zone-metrics">
                    <div class="zone-metric"><span class="zone-metric-label">Nodes</span><span class="zone-metric-val">${totalNodes}</span></div>
                    <div class="zone-metric"><span class="zone-metric-label">Avg Fan</span><span class="zone-metric-val" id="areafan-${area.id}">${avgFan}%</span></div>
                </div>
                <div class="zone-bar-wrap">
                    <div class="zone-bar ${hasCrit ? 'crit' : occupied > 0 ? 'occ' : 'empty'}" id="areabar-${area.id}" style="width:${avgFan}%"></div>
                </div>
                <div class="zone-intel">
                    <span class="trend-badge ${areaTrend}">${trendIcon}</span>
                    <span class="occ-hint">${prediction}</span>
                </div>
                <div class="last-seen"><i class="fa-regular fa-clock"></i> Last movement ${maxLastSeen} min ago</div>
                <!-- Hardware strip: env + CSI -->
                <div class="zone-hw-strip">
                    ${avgTemp ? `<span class="hw-chip"><i class="fa-solid fa-temperature-half"></i> ${avgTemp}°C</span>` : ''}
                    ${avgHum  ? `<span class="hw-chip"><i class="fa-solid fa-droplet"></i> ${avgHum}%</span>` : ''}
                    <span class="comfort-badge ${dominantComfort}">${{good:'Comfortable',warm:'Warm',cold:'Cold',unknown:'—'}[dominantComfort]||'—'}</span>
                    <span class="csi-conf-chip" title="CSI Confidence">CSI ${avgCSI}%</span>
                    ${hasFallback ? `<span class="fallback-chip"><i class="fa-solid fa-triangle-exclamation"></i> Fallback</span>` : ''}
                </div>
                <div class="zone-tile-footer"><i class="fa-solid fa-arrow-right"></i> View node details</div>
            </div>`);
    });
}

// ─── Zone Detail View ─────────────────────────────────────────────────────────
function openZoneDetail(areaId) {
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    currentAreaId = areaId;

    document.getElementById('detail-area-name').textContent = area.name;
    document.getElementById('detail-area-loc').textContent = `${area.block} · ${area.level}`;
    document.getElementById('detail-node-count').textContent = area.nodes.length;

    const tbody = document.getElementById('detail-nodes-tbody');
    tbody.innerHTML = '';
    area.nodes.forEach(node => {
        const occ   = node.occupancy;
        const crit  = node.status === 'critical';
        const vavPct     = crit ? 'ERR' : Math.round(node.damperAngle / 90 * 100) + '%';
        const recFanDisp = node.recFanSpeed != null ? node.recFanSpeed + '%' : (occ ? Math.min(100, node.fanSpeed+10)+'%' : '0%');
        const recVavDisp = node.recVavPct   != null ? node.recVavPct   + '%' : vavPct;
        const cooling    = crit ? 'offline' : (occ && node.fanSpeed > 50 ? 'active' : occ ? 'reduced' : 'off');
        const coolingLabel = { active:'Active', reduced:'Reduced', off:'Off', offline:'ERR' }[cooling];
        const health  = node.nodeHealth || (crit ? 'offline' : 'online');
        const syncOk  = health !== 'offline';
        const ctrlMode= node.controlMode || 'AI';
        const ctrlClass= { AI:'ctrl-ai', manual:'ctrl-manual', fallback:'ctrl-fallback' }[ctrlMode] || 'ctrl-ai';
        const csiConf = node.csiConfidence != null ? node.csiConfidence + '%' : '—';
        const csiSig  = node.csiSignalStrength || '—';
        const motion  = node.motionState || '—';
        const aiSrc   = node.decisionSource || 'Edge AI';
        const latency = node.responseLatency ? node.responseLatency + 'ms' : 'N/A';
        const sigClass= {strong:'sig-strong',moderate:'sig-moderate',weak:'sig-weak',none:'sig-none'}[csiSig]||'';

        tbody.insertAdjacentHTML('beforeend', `
            <tr class="${crit ? 'row-crit' : ''}">
                <td>
                    <strong>Node ${node.nodeNum}</strong>
                    <div style="font-size:0.65rem;color:#94a3b8">${{controller:'🔵 Controller',csi_node:'📡 CSI Node',sensor_node:'🌡 Sensor'}[node.nodeRole]||''}</div>
                    ${node.co2 ? `<div style="font-size:0.7rem;color:#94a3b8">CO₂ ${node.co2}ppm</div>` : ''}
                </td>
                <td>
                    <span class="zone-occ-badge ${crit?'crit':occ?'occ':'empty'}">
                        <i class="fa-solid ${crit?'fa-triangle-exclamation':occ?'fa-user':'fa-user-slash'}"></i>
                        ${crit?'FAILURE':occ?'Occupied':'Empty'}
                    </span>
                    <div style="font-size:0.65rem;color:#94a3b8;margin-top:3px">
                        ${motion} &bull; CSI <span class="${sigClass}" style="font-weight:700">${csiConf}</span>
                        ${!node.csiStable ? '<span style="color:#1D4ED8"> ⚠ Unstable</span>' : ''}
                    </div>
                </td>
                <td>
                    <div class="node-bar-wrap">
                        <div class="node-bar-fill" style="width:${crit?100:node.fanSpeed}%;background:${crit?'#ef4444':'#2563EB'}"></div>
                    </div>
                    <span class="node-bar-label">${crit?'ERR':node.fanSpeed+'%'}</span>
                    <span class="fan-rec">&rarr; rec. ${crit?'ERR':recFanDisp}</span>
                </td>
                <td>
                    <strong>${vavPct}</strong>
                    <div style="font-size:0.7rem;color:#94a3b8">${crit?'':node.damperAngle+'° → rec '+recVavDisp}</div>
                </td>
                <td><span class="cooling-badge ${cooling}">${coolingLabel}</span></td>
                <td>
                    <div style="font-size:0.72rem;font-weight:700;color:${aiSrc==='Edge AI'?'#16a34a':aiSrc==='Fallback'?'#1D4ED8':'#2563eb'}">${aiSrc}</div>
                    <div style="font-size:0.65rem;color:#94a3b8"><span class="${ctrlClass} ctrl-badge">${ctrlMode}</span> &bull; ${latency}</div>
                </td>
                <td>
                    <span class="health-badge ${health}">${health.charAt(0).toUpperCase()+health.slice(1)}</span>
                    <div style="font-size:0.65rem;color:#94a3b8;margin-top:2px">
                        WiFi: ${node.wifiStatus||'—'} &bull; MQTT: ${node.mqttStatus||'—'}
                    </div>
                    <div style="font-size:0.63rem;color:#94a3b8">↑ ${node.uptime||'—'}</div>
                </td>
            </tr>`);
    });

    // ── Environmental Sensors Card ────────────────────────────────────────────
    let envCard = document.getElementById('detail-env-card');
    if (!envCard) {
        const detailPage = document.querySelector('#zone-detail .inner-page');
        detailPage.insertAdjacentHTML('beforeend', `
            <div class="card" id="detail-env-card" style="margin-top:1.25rem">
                <h3 style="margin-bottom:1rem"><i class="fa-solid fa-temperature-half" style="color:#3b82f6"></i> Environmental Sensors <span style="font-size:0.75rem;color:#94a3b8;font-weight:400">(BME280 + DS18B20)</span></h3>
                <div id="detail-env-body" class="env-grid"></div>
            </div>
            <div class="card" id="detail-trace-card" style="margin-top:1.25rem">
                <h3 style="margin-bottom:1rem"><i class="fa-solid fa-arrow-right-arrow-left" style="color:#8b5cf6"></i> Sensor → Action Traceability</h3>
                <div id="detail-trace-body"></div>
            </div>`);
        envCard = document.getElementById('detail-env-card');
    }

    const envBody = document.getElementById('detail-env-body');
    const traceBody = document.getElementById('detail-trace-body');
    if (envBody) {
        envBody.innerHTML = area.nodes.map(n => {
            if (n.temperature == null) return `<div class="env-node-card"><strong>Node ${n.nodeNum}</strong><div class="env-offline">Offline — No data</div></div>`;
            const comfClass = {good:'comfort-good',warm:'comfort-warm',cold:'comfort-cold',unknown:''}[n.comfortLevel||'good'];
            return `<div class="env-node-card">
                <div class="env-node-title">Node ${n.nodeNum} <span class="comfort-mini ${comfClass}">${n.comfortLevel||'—'}</span></div>
                <div class="env-row"><i class="fa-solid fa-temperature-half"></i> Temp<span>${n.temperature}°C</span></div>
                <div class="env-row"><i class="fa-solid fa-droplet"></i> Humidity<span>${n.humidity}%</span></div>
                <div class="env-row"><i class="fa-solid fa-gauge"></i> Pressure<span>${n.pressure} hPa</span></div>
                <div class="env-row"><i class="fa-solid fa-wind"></i> Airflow Temp<span>${n.airflowTemp}°C</span></div>
            </div>`;
        }).join('');
    }
    if (traceBody) {
        traceBody.innerHTML = area.nodes.map(n => `
            <div class="trace-row">
                <span class="trace-node">Node ${n.nodeNum}</span>
                <span class="trace-chain">${n.traceability || 'No traceability data'}</span>
            </div>`).join('');
    }

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById('zone-detail').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToDashboard() {
    navigateTo('dashboard');
}

// ─── KPI Bar + Hardware Status ────────────────────────────────────────────────
function updateKPIs() {
    const allNodes    = areas.flatMap(a => a.nodes);
    const occupied    = allNodes.filter(n => n.occupancy && n.status !== 'critical').length;
    const empty       = allNodes.filter(n => !n.occupancy && n.status !== 'critical').length;
    const alerts      = allNodes.filter(n => n.status === 'critical').length;
    const active      = allNodes.filter(n => n.status !== 'critical');
    const avgFan      = active.length ? Math.round(active.reduce((s,n)=>s+n.fanSpeed,0)/active.length) : 0;
    const wasteNodes  = allNodes.filter(n => !n.occupancy && n.status !== 'critical' && n.fanSpeed > 15);
    const wasteKWh    = parseFloat((wasteNodes.reduce((s,n)=>s+n.fanSpeed/100*0.5,0)).toFixed(2));
    const wasteRM     = (wasteKWh * 0.55).toFixed(2);
    const onlineCount = allNodes.filter(n => (n.nodeHealth||'online') === 'online').length;
    const fallbackCnt = allNodes.filter(n => (n.nodeHealth||'online') === 'fallback').length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('total-nodes',       allNodes.length);
    set('kpi-occupied',      occupied);
    set('kpi-empty',         empty);
    set('kpi-avgfan',        avgFan + '%');
    set('kpi-alerts',        alerts);
    set('kpi-waste',         wasteKWh.toFixed(1));
    set('kpi-waste-rm',      'RM ' + wasteRM);
    set('stat-nodes-online', `${onlineCount}/${allNodes.length}`);
    set('stat-fallback',     fallbackCnt > 0 ? `⚠ ${fallbackCnt} node(s)` : '✔ None');

    // ── Edge AI Status ────────────────────────────────────────────────────────
    const fbNodes     = allNodes.filter(n => n.modelStatus === 'fallback');
    const latencies   = allNodes.filter(n => n.responseLatency).map(n => n.responseLatency);
    const avgLatency  = latencies.length ? Math.round(latencies.reduce((s,v)=>s+v,0)/latencies.length) : null;
    const anyFallback = fbNodes.length > 0;

    set('edge-ctrl-count',   allNodes.filter(n=>n.nodeRole==='controller').length);
    set('edge-csi-count',    allNodes.filter(n=>n.nodeRole==='csi_node').length);
    set('edge-sensor-count', allNodes.filter(n=>n.nodeRole==='sensor_node').length);
    if (avgLatency) set('edge-latency', avgLatency + 'ms');

    const modeEl = document.getElementById('edge-model-status');
    if (modeEl) modeEl.innerHTML = anyFallback
        ? `<i class="fa-solid fa-circle" style="color:#1D4ED8;font-size:0.5rem"></i> Partial Fallback`
        : `<i class="fa-solid fa-circle" style="color:#16a34a;font-size:0.5rem"></i> Running`;
    const modeB = document.getElementById('edge-ai-mode-badge');
    if (modeB) { modeB.className = `mode-badge ${anyFallback?'fallback':'autonomous'}`; modeB.innerHTML = anyFallback ? `<i class="fa-solid fa-triangle-exclamation"></i> Partial Fallback` : `<i class="fa-solid fa-robot"></i> Autonomous`; }

    // ── Network Status ────────────────────────────────────────────────────────
    const wifiOk    = allNodes.filter(n => n.wifiStatus === 'connected').length;
    const offlineCnt= allNodes.filter(n => n.wifiStatus === 'disconnected').length;
    const mqttOk    = allNodes.some(n => n.mqttStatus === 'connected');

    set('net-wifi-up',        `${wifiOk}/${allNodes.length}`);
    set('net-offline',        offlineCnt > 0 ? `${offlineCnt} node(s)` : '✔ None');
    set('net-fallback-nodes', fallbackCnt > 0 ? `${fallbackCnt} node(s)` : '✔ None');
    const mqttEl = document.getElementById('net-mqtt');
    if (mqttEl) mqttEl.innerHTML = mqttOk
        ? `<i class="fa-solid fa-circle" style="color:#16a34a;font-size:0.5rem"></i> Connected`
        : `<i class="fa-solid fa-circle" style="color:#dc2626;font-size:0.5rem"></i> Disconnected`;

    renderFlowTrace();
}

// ─── System Flow Trace ────────────────────────────────────────────────────────
function renderFlowTrace() {
    const body = document.getElementById('flow-trace-body');
    if (!body) return;
    const rows = [];
    areas.forEach(area => {
        let reprNode = null;
        let priority = -1;
        
        // Pick one representative node per zone to reduce clutter
        area.nodes.forEach(node => {
            let p = 0; // normal
            if (node.fanSpeed < 40 && !node.occupancy) p = 1; // energy-saving
            if (node.controlMode === 'fallback') p = 2; // fallback
            if (node.status === 'critical') p = 3; // fault
            if (p > priority) {
                priority = p;
                reprNode = node;
            }
        });

        if (reprNode) {
            let badge = 'ok';
            let label = '✔ Comfort Maintained';
            
            if (priority === 3) { badge = 'fault'; label = '⚠ Fault Detected'; }
            else if (priority === 2) { badge = 'fb'; label = '⚡ Fallback Active'; }
            else if (priority === 1) { badge = 'saving'; label = '🌱 Energy Saved'; }

            // Zone header
            rows.push(`<div class="flow-zone-header" style="font-size:0.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;margin-top:0.75rem;margin-bottom:0.4rem;letter-spacing:0.5px;">${area.name}</div>`);
            
            const highlightClass = (priority >= 2) ? 'abnormal' : '';
            rows.push(`<div class="flow-trace-row ${highlightClass}">
                <span class="flow-zone">Node ${reprNode.nodeNum}</span>
                <div class="flow-chain">
                    <span class="flow-step sensor"><i class="fa-solid fa-wifi"></i> CSI ${reprNode.csiConfidence!=null?reprNode.csiConfidence+'%':'—'} <em>${reprNode.motionState||'—'}</em></span>
                    <span class="flow-arrow">→</span>
                    <span class="flow-step ai"><i class="fa-solid fa-microchip"></i> ${reprNode.decisionSource||'Edge AI'} ${reprNode.responseLatency?'<em>'+reprNode.responseLatency+'ms</em>':''}</span>
                    <span class="flow-arrow">→</span>
                    <span class="flow-step act"><i class="fa-solid fa-wind"></i> Fan ${reprNode.fanSpeed}% · VAV ${Math.round(reprNode.damperAngle/90*100)}%</span>
                    <span class="flow-badge ${badge}">${label}</span>
                </div>
            </div>`);
        }
    });
    body.innerHTML = rows.length ? rows.join('') : '<p style="color:#94a3b8;font-size:0.8rem">No trace data yet.</p>';
}


// ─── Live Mock Data ───────────────────────────────────────────────────────────
function updateLiveMockData() {
    areas.forEach(area => {
        area.nodes.forEach(node => {
            if (node.status === 'critical') return;
            if (Math.random() < 0.1) node.occupancy = !node.occupancy;
            if (node.occupancy) {
                node.fanSpeed    = Math.min(100, node.fanSpeed + Math.floor(Math.random() * 8));
                node.damperAngle = Math.min(90,  node.damperAngle + Math.floor(Math.random() * 5));
            } else {
                node.fanSpeed    = Math.max(10, node.fanSpeed - Math.floor(Math.random() * 8));
                node.damperAngle = Math.max(5,  node.damperAngle - Math.floor(Math.random() * 5));
            }
        });

        // Update area bubble
        const avgFan = Math.round(area.nodes.reduce((s, n) => s + n.fanSpeed, 0) / area.nodes.length);
        const fanEl  = document.getElementById(`areafan-${area.id}`);
        const barEl  = document.getElementById(`areabar-${area.id}`);
        if (fanEl) fanEl.textContent = avgFan + '%';
        if (barEl) barEl.style.width = avgFan + '%';
    });

    // Refresh detail view if open
    if (currentAreaId && document.getElementById('zone-detail').classList.contains('active')) {
        openZoneDetail(currentAreaId);
    }
    updateKPIs();
}

// ─── Chart ────────────────────────────────────────────────────────────────────
function initChart() {
    const ctx = document.getElementById('impactChart');
    if (!ctx || chartInstance) return;
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
            datasets: [
                { label: 'Traditional Timer System', data: [15,15,15,15,15,15],
                  borderColor: '#cbd5e1', borderDash: [5,5], tension: 0.1, fill: false, pointRadius: 3 },
                { label: 'Ventra Edge Model', data: [5,8,12,14,9,3],
                  borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)',
                  tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#2563EB' }
            ]
        },
        options: {
            responsive: false, animation: false,
            plugins: { legend: { labels: { color: '#1e293b', font: { family: 'Inter' } } } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#64748b' } },
                x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#64748b' } }
            }
        }
    });
}


// ─── Alert State ──────────────────────────────────────────────────────────────
let alertIncidents = []; // master list of all incidents
let alertIdCounter  = 0;

// ─── Priority Groups ──────────────────────────────────────────────────────────
function toggleGroup(groupId) {
    const body  = document.getElementById('body-' + groupId.replace('group-', ''));
    const chev  = document.getElementById('chev-' + groupId);
    if (!body) return;
    body.classList.toggle('collapsed');
    if (chev) chev.style.transform = body.classList.contains('collapsed') ? 'rotate(-90deg)' : '';
}

// ─── Render All Incidents ─────────────────────────────────────────────────────
function renderIncidents() {
    const sevEl = document.getElementById('filter-severity')?.value || '';
    const stEl  = document.getElementById('filter-status')?.value  || '';
    const znEl  = document.getElementById('filter-zone')?.value    || '';

    const filtered = alertIncidents.filter(i => {
        if (sevEl && i.severity.toLowerCase() !== sevEl.toLowerCase()) return false;
        if (stEl  && i.incStatus !== stEl) return false;
        if (znEl  && i.zone !== znEl) return false;
        return true;
    });

    ['critical','warning','info'].forEach(sev => {
        const body  = document.getElementById(`body-${sev}`);
        const count = document.getElementById(`count-${sev}`);
        if (!body) return;
        const items = filtered.filter(i => i.severity === sev);
        if (count) count.textContent = items.length;
        if (items.length === 0) {
            body.innerHTML = `<div class="empty-state"><i class="fa-solid fa-circle-check"></i><p>No ${sev} incidents.</p></div>`;
            return;
        }
        body.innerHTML = items.map(inc => buildIncCard(inc)).join('');
    });

    // Update summary counts
    const active = alertIncidents.filter(i => i.incStatus === 'Active');
    const s = id => document.getElementById(id);
    if (s('inc-total'))    s('inc-total').textContent    = active.length;
    if (s('inc-critical')) s('inc-critical').textContent = active.filter(i=>i.severity==='critical').length;
    if (s('inc-warning'))  s('inc-warning').textContent  = active.filter(i=>i.severity==='warning').length;

    // Update nav badge
    const badge = document.getElementById('alert-badge');
    if (badge) {
        const hasCritical = active.filter(i=>i.severity==='critical').length > 0;
        badge.style.display = (hasCritical && isLoggedIn()) ? 'inline-flex' : 'none';
    }
}

function buildIncCard(inc) {
    const t = inc.detectedAt;
    const aiTime = new Date(t.getTime() + 1200).toLocaleTimeString();
    return `
    <div class="inc-card sev-${inc.severity} ${inc.incStatus==='Acknowledged'?'is-acked':''}" id="inc-card-${inc.id}">
        <div class="inc-card-top">
            <div>
                <div class="inc-card-title"><i class="fa-solid fa-triangle-exclamation"></i> ${inc.title}</div>
                <div class="inc-card-zone"><i class="fa-solid fa-location-dot"></i> ${inc.zone} &middot; ${inc.component} &middot; <em>${inc.incStatus}</em></div>
            </div>
            <span class="inc-sev-badge ${inc.severity}">${inc.severity}</span>
        </div>

        <!-- AI Analysis -->
        <div class="inc-ai">
            <div class="inc-ai-row"><span class="inc-ai-label"><i class="fa-solid fa-magnifying-glass"></i> Root Cause</span><span class="inc-ai-val">${inc.rootCause}</span></div>
            <div class="inc-ai-row"><span class="inc-ai-label"><i class="fa-solid fa-bolt"></i> System Impact</span><span class="inc-ai-val">${inc.impact}</span></div>
            <div class="inc-ai-row"><span class="inc-ai-label"><i class="fa-solid fa-lightbulb"></i> Suggested Action</span><span class="inc-ai-val">${inc.suggestion}</span></div>
        </div>

        <!-- System Response -->
        <div class="inc-sys-response"><i class="fa-solid fa-shield-halved"></i> System Response: <strong>${inc.sysResponse}</strong></div>

        <!-- Timeline -->
        <div class="inc-timeline">
            <div class="inc-tl-step">
                <div class="inc-tl-dot done"><i class="fa-solid fa-check"></i></div>
                <div class="inc-tl-label">Detected</div>
                <div class="inc-tl-time">${t.toLocaleTimeString()}</div>
            </div>
            <div class="inc-tl-step">
                <div class="inc-tl-dot done"><i class="fa-solid fa-robot"></i></div>
                <div class="inc-tl-label">AI Response</div>
                <div class="inc-tl-time">${aiTime}</div>
            </div>
            <div class="inc-tl-step">
                <div class="inc-tl-dot ${inc.incStatus==='Resolved'?'done':'active'}"></div>
                <div class="inc-tl-label">${inc.incStatus==='Resolved'?'Resolved':'Monitoring'}</div>
                <div class="inc-tl-time">Live</div>
            </div>
        </div>

        <!-- Related Events -->
        ${inc.related ? `<div class="inc-related"><strong><i class="fa-solid fa-link"></i> Related:</strong> ${inc.related}</div>` : ''}

        <!-- Action Buttons -->
        <div class="inc-actions">
            <button class="inc-btn primary" onclick="incAction('fix',${inc.id})"><i class="fa-solid fa-wand-magic-sparkles"></i> Apply AI Fix</button>
            <button class="inc-btn" onclick="incAction('ack',${inc.id})"><i class="fa-solid fa-check"></i> Acknowledge</button>
            <button class="inc-btn danger" onclick="incAction('escalate',${inc.id})"><i class="fa-solid fa-arrow-up-right-from-square"></i> Escalate</button>
            <button class="inc-btn" onclick="incAction('details',${inc.id})"><i class="fa-solid fa-info-circle"></i> Details</button>
        </div>
    </div>`;
}

function incAction(action, id) {
    const inc = alertIncidents.find(i => i.id === id);
    if (!inc) return;
    if (action === 'fix') {
        inc.sysResponse = 'AI Fix Applied — Fallback airflow control activated';
        inc.incStatus = 'Acknowledged';
        addLogEntry('AI Fix Applied — Fallback active', inc.component, 'OK');
    } else if (action === 'ack') {
        inc.incStatus = 'Acknowledged';
        addLogEntry(`Incident Acknowledged: ${inc.title}`, 'Operator', 'OK');
    } else if (action === 'escalate') {
        inc.incStatus = 'Escalated';
        const toast = document.getElementById('gmail-toast');
        if (toast) { toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 5000); }
        addLogEntry(`Escalated: ${inc.title}`, 'Operator', 'OK');
    } else if (action === 'details') {
        alert(`Incident #${inc.id}\n\nZone: ${inc.zone}\nComponent: ${inc.component}\nDetected: ${inc.detectedAt.toLocaleTimeString()}\nStatus: ${inc.incStatus}\n\nRoot Cause: ${inc.rootCause}`);
        return;
    }
    renderIncidents();
}

// ─── Filters ──────────────────────────────────────────────────────────────────
function applyAlertFilters() { renderIncidents(); }
function clearAlertFilters() {
    ['filter-severity','filter-status','filter-zone','filter-component'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    renderIncidents();
}

// ─── Simulate Hardware Failure ────────────────────────────────────────────────
function simulateHardwareFailure() {
    const allNodes = areas.flatMap(a => a.nodes);
    if (allNodes.length > 0) {
        const failedNode = allNodes[Math.floor(Math.random() * allNodes.length)];
        if (failedNode.status !== 'critical') { failedNode.status = 'critical'; renderZoneGrid(); }
    }
    addSmartIncident({
        severity: 'critical', title: 'VAV Damper Actuator Unresponsive',
        zone: 'Block P16', component: 'VAV Damper',
        rootCause: 'Inconsistent response signal from actuator motor. Likely mechanical jam or wiring fault.',
        impact: 'Airflow control fully degraded. Zone may overheat without intervention.',
        suggestion: 'Switch to manual override or schedule maintenance within 2 hours.',
        sysResponse: 'Predictive bypass engaged. Fallback airflow control active.',
        related: 'Abnormal fan speed spike detected 3 min before actuator failure.'
    });
    const toast = document.getElementById('gmail-toast');
    if (toast) { toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 5000); }
    addLogEntry('VAV Damper Actuator Unresponsive', 'Hardware Controller', 'CRITICAL');
}

function addSmartIncident(data) {
    alertIdCounter++;
    const inc = { id: alertIdCounter, incStatus: 'Active', detectedAt: new Date(), ...data };
    alertIncidents.unshift(inc);
    renderIncidents();
}

// ─── Enhanced Log Entry ───────────────────────────────────────────────────────
const LOG_TYPE_MAP = {
    'Edge AI Core': 'ai', 'Wi-Fi Sensor': 'sensor', 'Hardware Controller': 'fault',
    'Setup Wizard': 'hvac', 'Operator': 'ai', 'Seminar Hall P8': 'hvac',
    'Conference Room BKT4': 'hvac', 'Staff Office N28': 'hvac',
};
const LOG_DETAIL_MAP = {
    'CRITICAL': 'Fault detected by hardware controller. Edge AI fallback protocol initiated.',
    'OK': 'Event logged and acknowledged by system.',
};

function addLogEntry(event, component, status) {
    const tbody = document.getElementById('status-log-body');
    if (!tbody) return;
    const time   = new Date().toLocaleTimeString();
    const type   = LOG_TYPE_MAP[component] || (status === 'CRITICAL' ? 'fault' : 'hvac');
    const detail = status === 'CRITICAL' ? LOG_DETAIL_MAP['CRITICAL'] : `${event} — processed by ${component}.`;
    const rowId  = `log-row-${Date.now()}`;
    const detId  = `log-det-${Date.now()}`;

    const tr = document.createElement('tr');
    tr.className = 'log-expandable';
    tr.id = rowId;
    tr.setAttribute('onclick', `toggleLogDetail('${detId}')`);
    tr.innerHTML = `
        <td>${time}</td>
        <td><span class="log-tag ${type}">${type.toUpperCase()}</span></td>
        <td>${component}</td>
        <td>${event}</td>
        <td class="${status === 'CRITICAL' ? 'status-error' : 'status-ok'}">
            <i class="fa-solid ${status === 'CRITICAL' ? 'fa-xmark' : 'fa-check'}"></i> ${status}
        </td>`;
    tbody.insertBefore(tr, tbody.firstChild);

    const detTr = document.createElement('tr');
    detTr.className = 'log-detail-row';
    detTr.id = detId;
    detTr.style.display = 'none';
    detTr.innerHTML = `<td colspan="5"><i class="fa-solid fa-info-circle" style="color:#3b82f6"></i> ${detail}</td>`;
    tbody.insertBefore(detTr, tr.nextSibling);

    while (tbody.children.length > 24) tbody.removeChild(tbody.lastChild);
}

function toggleLogDetail(detId) {
    const el = document.getElementById(detId);
    if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}

// ─── Seed Demo Alerts ─────────────────────────────────────────────────────────
function seedDemoAlerts() {
    const demoAlerts = [
        {
            severity: 'critical', title: 'VAV Damper Actuator Unresponsive',
            zone: 'Seminar Hall P8', component: 'VAV Damper',
            rootCause: 'Inconsistent actuator response signal detected. Likely mechanical jam or wiring fault at Node 4.',
            impact: 'Airflow control fully degraded in Seminar Hall P8. Zone temperature rising.',
            suggestion: 'Switch to manual override or schedule maintenance within 2 hours.',
            sysResponse: 'Predictive bypass engaged. Fallback airflow control active.',
            related: 'Abnormal fan speed spike (Node 4) detected 3 min prior to actuator failure.'
        },
        {
            severity: 'warning', title: 'HVAC Active in Empty Zone',
            zone: 'Staff Office N28', component: 'Fan (VFD)',
            rootCause: 'Fan running at 22% despite no occupancy detected for 41 minutes.',
            impact: 'Unnecessary energy consumption estimated at 0.2 kWh/hr.',
            suggestion: 'Apply AI recommendation to ramp down fan speed to 0%.',
            sysResponse: 'Edge AI monitoring. Awaiting operator confirmation to reduce.',
            related: 'Zone has been idle since 09:00 with no CSI events logged.'
        },
        {
            severity: 'warning', title: 'CSI Signal Unstable — Fallback Mode',
            zone: 'Staff Office N28', component: 'CSI Sensor',
            rootCause: 'Wi-Fi CSI signal degraded on Node 1. Interference from nearby AP channel overlap.',
            impact: 'Occupancy detection accuracy reduced. System running on timer-based fallback.',
            suggestion: 'Reposition Node 1 or change AP channel to 1, 6, or 11.',
            sysResponse: 'Fallback mode active. Timer-based control engaged for this node.',
            related: null
        },
        {
            severity: 'info', title: 'Edge AI Model OTA Update v2.1.4',
            zone: 'All Zones', component: 'Edge Node',
            rootCause: 'Scheduled firmware update received from Ventra Edge cloud.',
            impact: 'Improved CSI occupancy accuracy (+8%). No downtime expected.',
            suggestion: 'No action required. Update will apply during next idle window.',
            sysResponse: 'Update staged. Deployment pending off-peak window.',
            related: null
        }
    ];
    demoAlerts.forEach(d => addSmartIncident(d));
}

