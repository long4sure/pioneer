/* ============================================================
   js/modules/production-waste.js — Output & Waste
   ============================================================ */

const wasteLines = ['L06_EPOXY','L04B_ELASTO','L03_CYANO','L01_COATINGS','L07_TUBE','L09_EPS','L10_BOND','L11_SILICONE','L12_EPOXY','L13_WATER','L14','L05_CLAY','L02_BOTTLE','LABELING'];
const wasteLineNames = {
    L06_EPOXY:'L06 - EPOXY', L04B_ELASTO:'L04B - ELASTO', L03_CYANO:'L03 - CYANO TUBE',
    L01_COATINGS:'L01 - COATINGS', L07_TUBE:'L07 - EPOXY TUBE', L09_EPS:'LINE 9 - EPS',
    L10_BOND:'L10 - CONTACT BOND', L11_SILICONE:'L11 - SILICONE', L12_EPOXY:'L12 - SPECIAL EPOXY',
    L13_WATER:'L13 - SPECIAL WATER', L14:'LINE 14', L05_CLAY:'L05 - EPOXY CLAY',
    L02_BOTTLE:'L02 - CYNO BOTTLE', LABELING:'LABELING LINE'
};

const wasteDB = {};
YEARS.forEach(y => {
    wasteDB[y] = {};
    MONTHS.forEach(m => {
        wasteDB[y][m] = {};
        wasteLines.forEach(l => { wasteDB[y][m][l] = { fg: '', rep: '', rej: '', waste: '' }; });
    });
});

function wasteGetDB() { const { year: y, month: m } = getGlobalPeriod(); return wasteDB[y][m]; }

function wasteCalcAll() {
    const db = wasteGetDB();
    let tFg = 0, tRep = 0, tRej = 0, tW = 0, lData = 0, lWaste = 0, tbl = '';

    wasteLines.forEach(l => {
        const d = db[l], fg = +d.fg || 0, rep = +d.rep || 0, rej = +d.rej || 0, w = +d.waste || 0;
        const net = fg + rep - rej, wp = (fg + w) > 0 ? w / (fg + w) * 100 : 0;
        if (fg > 0) lData++; if (w > 0) lWaste++;
        tFg += fg; tRep += rep; tRej += rej; tW += w;
        let sc = 'badge-neutral', st = 'No Data';
        if (fg > 0) { if (wp <= 1) { sc = 'badge-excellent'; st = 'Excellent'; } else if (wp <= 3) { sc = 'badge-good'; st = 'Good'; } else if (wp <= 5) { sc = 'badge-warning'; st = 'Warning'; } else { sc = 'badge-critical'; st = 'Critical'; } }
        tbl += `<tr><td><strong>${wasteLineNames[l]}</strong></td><td>${fmtN(fg)}</td><td>${fmtN(rep)}</td><td>${fmtN(rej)}</td><td>${fmtN(net)}</td><td>${fmtN(w)}</td><td>${wp.toFixed(2)}%</td><td><span class="badge ${sc}">${st}</span></td></tr>`;
    });

    const tNet = tFg + tRep - tRej, tWp = (tFg + tW) > 0 ? tW / (tFg + tW) * 100 : 0;
    setText('waste-total',     fmtN(tFg) + ' kg');
    setText('waste-fg',        fmtN(tFg) + ' kg');
    setText('waste-rep',       fmtN(tRep) + ' kg');
    setText('waste-rej',       fmtN(tRej) + ' kg');
    setText('waste-net',       fmtN(tNet) + ' kg');
    setText('waste-wasteKg',   fmtN(tW) + ' kg');
    setText('waste-wastePct',  tWp.toFixed(2) + '%');
    setW('waste-bar', tWp);
    setText('waste-linesData',  lData);
    setText('waste-linesWaste', lWaste);
    setHTML('waste-tbl', tbl);
    setText('waste-totalDisp', 'Total: ' + fmtN(tFg) + ' kg');
}

function wasteLoadLine() {
    const l = document.getElementById('waste-lineSelect').value;
    if (!l) {
        document.getElementById('waste-inputSections').innerHTML =
            '<div class="input-section" style="grid-column:1/-1;text-align:center;padding:24px;"><div class="input-section-title">Select a production line</div></div>';
        return;
    }
    const d = wasteGetDB()[l];
    const h = `<div class="input-section" style="grid-column:1/-1"><div class="input-section-title">${wasteLineNames[l]} — Output & Waste (KGS)</div><div class="input-fields-grid">
        <div class="input-field-wrap"><label class="input-field-label">FG Output</label><input class="input-field" type="number" inputmode="decimal" id="waste_in_fg"    value="${d.fg    || ''}" placeholder="kg"></div>
        <div class="input-field-wrap"><label class="input-field-label">Reprocess</label> <input class="input-field" type="number" inputmode="decimal" id="waste_in_rep"   value="${d.rep   || ''}" placeholder="kg"></div>
        <div class="input-field-wrap"><label class="input-field-label">Rejection</label> <input class="input-field" type="number" inputmode="decimal" id="waste_in_rej"   value="${d.rej   || ''}" placeholder="kg"></div>
        <div class="input-field-wrap"><label class="input-field-label">Waste</label>     <input class="input-field" type="number" inputmode="decimal" id="waste_in_waste" value="${d.waste || ''}" placeholder="kg"></div>
    </div></div>`;
    document.getElementById('waste-inputSections').innerHTML = h;
}

function wasteSave() {
    const l = document.getElementById('waste-lineSelect').value; if (!l) return;
    const d = wasteGetDB()[l];
    ['fg','rep','rej','waste'].forEach(k => { const el = document.getElementById('waste_in_' + k); if (el) d[k] = el.value; });
    showToast(); wasteCalcAll();
}
async function wasteClearLine() {
    if (!await confirmDialog({title:"Clear Data",message:"Clear this line's data?",confirmLabel:"Clear",danger:false}) ) return;
    const l = document.getElementById('waste-lineSelect').value; if (!l) return;
    const d = wasteGetDB()[l];
    ['fg','rep','rej','waste'].forEach(k => d[k] = '');
    wasteLoadLine(); wasteCalcAll();
}
async function wasteClearAll() {
    if (!await confirmDialog({title:"Clear Data",message:"Clear ALL Waste data? This cannot be undone.",confirmLabel:"Clear",danger:true}) ) return;
    if (!confirm('Clear all waste data?')) return;
    const db = wasteGetDB();
    wasteLines.forEach(l => ['fg','rep','rej','waste'].forEach(k => db[l][k] = ''));
    wasteLoadLine(); wasteCalcAll();
}


/* ============================================================
   production-sched.js — Scheduling Attainment (appended here)
   ============================================================ */

const schedLines = ['L06_EPOXY','L04B_ELASTO','L03_CYANO','L01_COATINGS','L07_TUBE','L09_EPS','L10_BOND','L11_SILICONE','L12_EPOXY','L13_WATER','L14','L05_CLAY','L02_BOTTLE'];
const schedLineNames = {
    L06_EPOXY:'L06 - EPOXY', L04B_ELASTO:'L04B - ELASTO', L03_CYANO:'L03 - CYANO TUBE',
    L01_COATINGS:'L01 - COATINGS', L07_TUBE:'L07 - EPOXY TUBE', L09_EPS:'LINE 9 - EPS',
    L10_BOND:'L10 - CONTACT BOND', L11_SILICONE:'L11 - SILICONE', L12_EPOXY:'L12 - SPECIAL EPOXY',
    L13_WATER:'L13 - SPECIAL', L14:'LINE 14', L05_CLAY:'L05 - EPOXY CLAY', L02_BOTTLE:'L02 - CYNO BOTTLE'
};

const schedDB = {};
YEARS.forEach(y => {
    schedDB[y] = {};
    MONTHS.forEach(m => {
        schedDB[y][m] = {};
        schedLines.forEach(l => { schedDB[y][m][l] = { actual: '', planned: '' }; });
    });
});

function schedGetDB() { const { year: y, month: m } = getGlobalPeriod(); return schedDB[y][m]; }

function schedCalcAll() {
    const db = schedGetDB();
    let tAct = 0, tPlan = 0, lData = 0, comps = [], top = [], needs = [], tbl = '';

    schedLines.forEach(l => {
        const d = db[l], a = +d.actual || 0, p = +d.planned || 0, c = p > 0 ? a / p * 100 : 0;
        if (a > 0 || p > 0) { lData++; comps.push(c); if (c >= 90) top.push({ n: schedLineNames[l], c }); else if (c < 75 && c > 0) needs.push({ n: schedLineNames[l], c }); }
        tAct += a; tPlan += p;
        let sc = 'badge-neutral', st = 'No Data';
        if (p > 0) { if (c >= 95) { sc = 'badge-excellent'; st = 'Excellent'; } else if (c >= 85) { sc = 'badge-good'; st = 'Good'; } else if (c >= 75) { sc = 'badge-warning'; st = 'Warning'; } else { sc = 'badge-critical'; st = 'Critical'; } }
        tbl += `<tr><td><strong>${schedLineNames[l]}</strong></td><td>${fmtN(a)}</td><td>${fmtN(p)}</td><td>${c.toFixed(2)}%</td><td><span class="badge ${sc}">${st}</span></td></tr>`;
    });

    const oc  = tPlan > 0 ? tAct / tPlan * 100 : 0;
    const avg = comps.length ? comps.reduce((a, b) => a + b, 0) / comps.length : 0;

    setText('sched-overall', oc.toFixed(2) + '%');
    setText('sched-actual',  fmtN(tAct) + ' kg');
    setText('sched-planned', fmtN(tPlan) + ' kg');
    setW('sched-bar', oc);
    setText('sched-linesData', lData);
    setText('sched-avgComp',   avg.toFixed(2) + '%');

    top.sort((a, b) => b.c - a.c); needs.sort((a, b) => a.c - b.c);
    setHTML('sched-topPerf',  top.length   ? top.slice(0, 3).map(p => `<div class="card-row"><span>${p.n}</span><span class="card-row-val">${p.c.toFixed(2)}%</span></div>`).join('')   : '<div class="card-row"><span>No top performers</span></div>');
    setHTML('sched-needsImp', needs.length ? needs.slice(0, 3).map(p => `<div class="card-row"><span>${p.n}</span><span class="card-row-val">${p.c.toFixed(2)}%</span></div>`).join('') : '<div class="card-row"><span>All lines performing well</span></div>');
    setHTML('sched-tbl', tbl);
    setText('sched-totalDisp', 'Total Actual: ' + fmtN(tAct) + ' kg');
    setCardStatus('card-sched-overall', oc, { good: 95, warn: 75, higherIsBetter: true });
}

function schedLoadLine() {
    const l = document.getElementById('sched-lineSelect').value;
    if (!l) {
        document.getElementById('sched-inputSections').innerHTML =
            '<div class="input-section" style="grid-column:1/-1;text-align:center;padding:24px;"><div class="input-section-title">Select a production line</div></div>';
        return;
    }
    const d = schedGetDB()[l];
    const h = `<div class="input-section" style="grid-column:1/-1"><div class="input-section-title">${schedLineNames[l]} — Scheduling Attainment (KGS)</div><div class="input-fields-grid">
        <div class="input-field-wrap"><label class="input-field-label">Actual Output</label>  <input class="input-field" type="number" inputmode="decimal" id="sched_in_actual"  value="${d.actual  || ''}" placeholder="kg"></div>
        <div class="input-field-wrap"><label class="input-field-label">Planned Output</label> <input class="input-field" type="number" inputmode="decimal" id="sched_in_planned" value="${d.planned || ''}" placeholder="kg"></div>
    </div></div>`;
    document.getElementById('sched-inputSections').innerHTML = h;
}

function schedSave() {
    const l = document.getElementById('sched-lineSelect').value; if (!l) return;
    const d = schedGetDB()[l];
    ['actual','planned'].forEach(k => { const el = document.getElementById('sched_in_' + k); if (el) d[k] = el.value; });
    showToast(); schedCalcAll();
}
async function schedClearLine() {
    if (!await confirmDialog({title:"Clear Data",message:"Clear this line's data?",confirmLabel:"Clear",danger:false}) ) return;
    const l = document.getElementById('sched-lineSelect').value; if (!l) return;
    const d = schedGetDB()[l]; d.actual = ''; d.planned = '';
    schedLoadLine(); schedCalcAll();
}
async function schedClearAll() {
    if (!await confirmDialog({title:"Clear Data",message:"Clear ALL Scheduling data? This cannot be undone.",confirmLabel:"Clear",danger:true}) ) return;
    if (!confirm('Clear all scheduling data?')) return;
    const db = schedGetDB();
    schedLines.forEach(l => { db[l].actual = ''; db[l].planned = ''; });
    schedLoadLine(); schedCalcAll();
}
