/* ============================================================
   js/modules/production-util.js — Machine Utilization
   ============================================================ */

// ── Config ───────────────────────────────────────────────────
const utilLines = [
    'L06_FILLING','L06_MIXER','L04_FILLING','L04_MIXING','L03_ITALY','L03_KOREA',
    'L01_MIXER','L01_MILLING','L07_TUBE','L09_EPS','L10_BOND',
    'L11_SILICONE','L12_EPOXY','L13_WATER','L14_FILLING','L14_MIXING'
];
const utilLineNames = {
    L06_FILLING:'LINE 6 - EPOXY (FILLING)', L06_MIXER:'LINE 6 - EPOXY (MIXER)',
    L04_FILLING:'LINE 4 - ELASTO FILLING',  L04_MIXING:'LINE 4 - ELASTO MIXING',
    L03_ITALY:'LINE 3 - ITALY MACHINE',     L03_KOREA:'LINE 3 - KOREA MACHINE',
    L01_MIXER:'L01 - COATINGS (MIXER)',     L01_MILLING:'L01 - COATINGS (MILLING)',
    L07_TUBE:'LINE 7 - EPOXY TUBE',         L09_EPS:'LINE 9 - EPS',
    L10_BOND:'LINE 10 - CONTACT BOND',      L11_SILICONE:'LINE 11 - SILICONE NEW',
    L12_EPOXY:'LINE 12 - EPOXY BASED',      L13_WATER:'LINE 13 - WATER BASED',
    L14_FILLING:'LINE 14 - FILLING',         L14_MIXING:'LINE 14 - MIXING'
};
const utilCats = [
    'Actual Productive Time','No Production Plan','No Head Count Allocation','Change Over Time',
    'Meeting','Sanitation Time','Start-up/Setup','Shutdown/cooldown','Testing Time','Breaktime',
    'Preventive Maintenance','Force Majeure','Electrical Breakdown','Mechanical Breakdown',
    'Materials Supply','Sorting/Reworking','Technical Downtime','No Manpower','UDT-Meeting',
    'No OT','No Bulkmix','Transfer','Idle time'
];
const utilKeys2 = [
    'productive','noPlan','noHc','changeOver','meeting','sanitation','startup','shutdown',
    'testing','breaktime','pm','force','elec','mech','material','sorting','tech',
    'noManpower','udt','noOt','noBulk','transfer','idle'
];

// ── Model ────────────────────────────────────────────────────
const utilDB = {};
YEARS.forEach(y => {
    utilDB[y] = {};
    MONTHS.forEach(m => {
        utilDB[y][m] = {};
        utilLines.forEach(l => {
            utilDB[y][m][l] = { ...Object.fromEntries(utilKeys2.map(k => [k, ''])), mAvail: '', mUsed: '', days: '' };
        });
    });
});

function utilGetDB() {
    const { year: y, month: m } = getGlobalPeriod();
    return utilDB[y][m];
}
function utilTotal(d) { return utilKeys2.reduce((s, k) => s + (+d[k] || 0), 0); }

// ── Controller: Calc ─────────────────────────────────────────
function utilCalcAll() {
    const db = utilGetDB();
    let tProd = 0, tTime = 0, tAvail = 0, tUsed = 0, linesData = 0, utilArr = [], downt = {}, tbl = '';

    utilLines.forEach(l => {
        const d   = db[l], tot = utilTotal(d), prod = +d.productive || 0;
        if (tot > 0) { linesData++; utilArr.push(prod / tot * 100); }
        tProd += prod; tTime += tot; tAvail += +d.mAvail || 0; tUsed += +d.mUsed || 0;
        utilKeys2.forEach((k, i) => { if (k !== 'productive') { const v = +d[k] || 0; if (v > 0) downt[utilCats[i]] = (downt[utilCats[i]] || 0) + v; } });
        const u = tot > 0 ? prod / tot * 100 : 0;
        let sc = 'badge-neutral', st = 'No Data';
        if (tot > 0) { if (u >= 70) { sc = 'badge-excellent'; st = 'Excellent'; } else if (u >= 50) { sc = 'badge-good'; st = 'Good'; } else if (u >= 30) { sc = 'badge-warning'; st = 'Warning'; } else { sc = 'badge-critical'; st = 'Critical'; } }
        tbl += `<tr><td><strong>${utilLineNames[l]}</strong></td><td>${fmtN(prod)}</td><td>${fmtN(tot)}</td><td>${u.toFixed(2)}%</td><td>${d.mAvail || 0}/${d.mUsed || 0}</td><td><span class="badge ${sc}">${st}</span></td></tr>`;
    });

    const ou  = tTime > 0 ? tProd / tTime * 100 : 0;
    const avg = utilArr.length > 0 ? utilArr.reduce((a, b) => a + b, 0) / utilArr.length : 0;

    setText('util-overall', ou.toFixed(2) + '%');
    setText('util-prod',    fmtN(tProd) + ' hrs');
    setText('util-avail',   fmtN(tTime) + ' hrs');
    setW('util-bar', ou);
    setText('util-mach',   fmtN(tAvail, 0));
    setText('util-mAvail', fmtN(tAvail, 0));
    setText('util-mUsed',  fmtN(tUsed, 0));
    setText('util-linesData', linesData);
    setText('util-avgUtil', avg.toFixed(2) + '%');

    // Prod days: total across lines with data
    let totalProdDays = 0, linesWithDays = 0;
    utilLines.forEach(l => { const v = +db[l].days || 0; if (v > 0) { totalProdDays += v; linesWithDays++; } });
    setText('util-days', linesWithDays > 0 ? totalProdDays.toFixed(0) : '—');

    // Top 5 downtime causes
    const top5 = Object.entries(downt).sort((a, b) => b[1] - a[1]).slice(0, 5);
    setHTML('util-downtime', top5.length
        ? top5.map(([n, v]) => `<div class="card-row"><span>${n}</span><span class="card-row-val">${fmtN(v)} hrs</span></div>`).join('')
        : '<div class="card-row"><span>No downtime</span></div>');

    setHTML('util-tbl', tbl);
    setText('util-totalTime', 'Total: ' + fmtN(tTime) + ' hrs');
    setCardStatus('card-util-overall', ou, { good: 70, warn: 40, higherIsBetter: true });
}

// ── Input panel ───────────────────────────────────────────────
function utilLoadLine() {
    const l = document.getElementById('util-lineSelect').value;
    if (!l) {
        document.getElementById('util-inputSections').innerHTML =
            '<div class="input-section" style="grid-column:1/-1;text-align:center;padding:24px;"><div class="input-section-title">Select a production line to enter data</div></div>';
        return;
    }
    const d = utilGetDB()[l];
    let h = `<div class="input-section" style="grid-column:1/-1"><div class="input-section-title">${utilLineNames[l]} — 23 Utilization Categories (hrs)</div><div class="input-fields-grid-4">`;
    utilKeys2.forEach((k, i) => {
        h += `<div class="input-field-wrap"><label class="input-field-label">${i + 1}. ${utilCats[i]}</label><input class="input-field" type="number" inputmode="decimal" id="util_in_${k}" value="${d[k] || ''}" step="0.01" placeholder="hrs"></div>`;
    });
    h += `</div></div><div class="input-section"><div class="input-section-title">Machine Summary</div><div class="input-fields-grid">`;
    h += `<div class="input-field-wrap"><label class="input-field-label">Machines Available</label><input class="input-field" type="number" inputmode="decimal" id="util_in_mAvail" value="${d.mAvail || ''}" placeholder="count"></div>`;
    h += `<div class="input-field-wrap"><label class="input-field-label">Machines Used</label><input class="input-field" type="number" inputmode="decimal" id="util_in_mUsed" value="${d.mUsed || ''}" placeholder="count"></div>`;
    h += `<div class="input-field-wrap"><label class="input-field-label">Production Days</label><input class="input-field" type="number" inputmode="decimal" id="util_in_days" value="${d.days || ''}" placeholder="days"></div>`;
    h += `</div></div>`;
    document.getElementById('util-inputSections').innerHTML = h;
}

function utilSave() {
    const l = document.getElementById('util-lineSelect').value;
    if (!l) return;
    const d = utilGetDB()[l];
    utilKeys2.forEach(k => { const el = document.getElementById('util_in_' + k); if (el) d[k] = el.value; });
    ['mAvail', 'mUsed', 'days'].forEach(k => { const el = document.getElementById('util_in_' + k); if (el) d[k] = el.value; });
    showToast(); utilCalcAll();
}

async function utilClearLine() {
    if (!await confirmDialog({title:"Clear Line",message:"Clear all hours for this production line?",confirmLabel:"Clear",danger:false})) return;
    const l = document.getElementById('util-lineSelect').value;
    if (!l) return;
    const d = utilGetDB()[l];
    utilKeys2.forEach(k => d[k] = '');
    d.mAvail = ''; d.mUsed = ''; d.days = '';
    utilLoadLine(); utilCalcAll();
}

async function utilClearAll() {
    if (!await confirmDialog({title:"Clear All",message:"Clear ALL utilization data? This cannot be undone.",confirmLabel:"Clear All",danger:true})) return;
    if (!confirm('Clear all utilization data?')) return;
    const db = utilGetDB();
    utilLines.forEach(l => { utilKeys2.forEach(k => db[l][k] = ''); db[l].mAvail = ''; db[l].mUsed = ''; db[l].days = ''; });
    utilLoadLine(); utilCalcAll();
}
