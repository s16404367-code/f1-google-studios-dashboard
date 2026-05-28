import { OpenF1 } from './api.js';

const TEAM_COLORS = {
    'Red Bull Racing': '#3671C6', 'Mercedes': '#27F4D2', 'Ferrari': '#E80020',
    'McLaren': '#FF8000', 'Aston Martin': '#229971', 'Alpine': '#0093CC',
    'Williams': '#64C4FF', 'RB': '#6692FF', 'Sauber': '#52E252', 'Haas': '#B6BABD'
};

const state = { 
    session: null, drivers: {}, locations: {}, 
    selectedDriver: null, 
    bounds: { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
};

async function init() {
    state.session = await OpenF1.getSession();
    if (!state.session) return;
    
    document.getElementById('session-name').innerText = state.session.session_name;
    document.getElementById('track-name').innerText = state.session.location.toUpperCase();

    const drvs = await OpenF1.getDrivers(state.session.session_key);
    drvs.forEach(d => {
        state.drivers[d.driver_number] = { ...d, color: TEAM_COLORS[d.team_name] || '#FFF' };
    });

    setInterval(updateData, 2000);
    requestAnimationFrame(renderLoop);
}

async function updateData() {
    const time = new Date(Date.now() - 15000).toISOString();
    const [locs, ints, rc] = await Promise.all([
        OpenF1.getLocations(state.session.session_key, time),
        OpenF1.getIntervals(state.session.session_key),
        OpenF1.getRaceControl(state.session.session_key)
    ]);

    locs.forEach(l => {
        state.locations[l.driver_number] = l;
        state.bounds.minX = Math.min(state.bounds.minX, l.x);
        state.bounds.maxX = Math.max(state.bounds.maxX, l.x);
        state.bounds.minY = Math.min(state.bounds.minY, l.y);
        state.bounds.maxY = Math.max(state.bounds.maxY, l.y);
    });

    if (rc.length) document.getElementById('msg-content').innerText = rc[rc.length-1].message;
    updateTower(ints);
}

function updateTower(ints) {
    const list = document.getElementById('tower-list');
    const sorted = Object.values(state.drivers).sort((a,b) => {
        const gA = ints.find(i => i.driver_number === a.driver_number)?.gap_to_leader || 999;
        const gB = ints.find(i => i.driver_number === b.driver_number)?.gap_to_leader || 999;
        return gA - gB;
    });

    list.innerHTML = sorted.map((d, i) => `
        <div class="tower-item flex items-center px-4 cursor-pointer ${state.selectedDriver === d.driver_number ? 'active-row' : ''}" onclick="window.focusDriver('${d.driver_number}')">
            <div class="w-1 h-8 mr-3" style="background:${d.color}"></div>
            <div class="text-[10px] font-bold w-4">${i+1}</div>
            <div class="flex-1 ml-2 font-black uppercase text-xs">${d.last_name}</div>
            <div class="font-mono text-[10px] text-zinc-400">${ints.find(i => i.driver_number === d.driver_number)?.gap_to_leader || '--'}</div>
        </div>
    `).join('');
}

function renderLoop() {
    const svg = document.getElementById('track-canvas');
    const layer = document.getElementById('driver-layer');
    layer.innerHTML = '';

    const pad = 2000;
    const w = (state.bounds.maxX - state.bounds.minX) + pad*2;
    const h = (state.bounds.maxY - state.bounds.minY) + pad*2;
    if (w > 0) svg.setAttribute('viewBox', `${state.bounds.minX - pad} ${-state.bounds.maxY - pad} ${w} ${h}`);

    Object.keys(state.locations).forEach(num => {
        const l = state.locations[num];
        const d = state.drivers[num];
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", l.x); c.setAttribute("cy", -l.y); c.setAttribute("r", state.selectedDriver === num ? "300" : "180");
        c.setAttribute("fill", d.color); c.setAttribute("class", "driver-dot");
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", l.x); t.setAttribute("y", -l.y + 500); t.setAttribute("text-anchor", "middle");
        t.setAttribute("class", "driver-label"); t.textContent = d.name_acronym;
        g.appendChild(c); g.appendChild(t); layer.appendChild(g);
    });
    document.getElementById('current-timestamp').innerText = new Date().toLocaleTimeString();
    requestAnimationFrame(renderLoop);
}

window.focusDriver = (num) => {
    state.selectedDriver = num;
    const d = state.drivers[num];
    document.getElementById('driver-panel').classList.remove('hidden');
    document.getElementById('driver-full-name').innerText = d.full_name;
    document.getElementById('driver-team-name').innerText = d.team_name;
    document.getElementById('driver-number').innerText = d.driver_number;
};

window.closePanel = () => {
    state.selectedDriver = null;
    document.getElementById('driver-panel').classList.add('hidden');
};

init();