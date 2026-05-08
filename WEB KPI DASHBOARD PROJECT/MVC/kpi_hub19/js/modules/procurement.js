/* ============================================================
   js/modules/procurement.js — Procurement Module
   ============================================================ */

// ── Model ────────────────────────────────────────────────────
const procDB = {};
YEARS.forEach(y => {
    procDB[y] = {};
    MONTHS.forEach(m => { procDB[y][m] = { actual: '', target: '' }; });
});

function procGetDB() {
    const { year: y, month: m } = getGlobalPeriod();
    return procDB[y][m];
}

// ── Controller ───────────────────────────────────────────────
function procLoadInputs() {
    const d  = procGetDB();
    const ea = document.getElementById('proc-i-actual');
    const et = document.getElementById('proc-i-target');
    if (ea) ea.value = d.actual || '';
    if (et) et.value = d.target || '';
}

function procCalc() {
    const actual = parseFloat(document.getElementById('proc-i-actual')?.value) || 0;
    const target = parseFloat(document.getElementById('proc-i-target')?.value) || 0;
    const rate   = target > 0 ? actual / target * 100 : 0;

    setText('proc-actual',  fmtC(actual));
    setText('proc-target',  fmtC(target));
    setText('proc-rate',    rate.toFixed(2) + '%');
    setText('proc-var',     (actual - target >= 0 ? '+' : '') + fmtC(actual - target));
    setW('proc-bar', rate);

    let sc = 'badge-neutral', st = 'No Data';
    if (target > 0) {
        if      (rate >= 100) { sc = 'badge-excellent'; st = 'Target Met'; }
        else if (rate >= 85)  { sc = 'badge-good';      st = 'On Track'; }
        else if (rate >= 70)  { sc = 'badge-warning';   st = 'Below Target'; }
        else                  { sc = 'badge-critical';  st = 'Critical'; }
    }
    const statusEl = document.getElementById('proc-status');
    if (statusEl) { statusEl.className = 'badge ' + sc; statusEl.textContent = st; }

    setCardStatus('card-proc-main', rate, { good: 100, warn: 70, higherIsBetter: true });
}

function procSave() {
    const d  = procGetDB();
    d.actual = document.getElementById('proc-i-actual')?.value || '';
    d.target = document.getElementById('proc-i-target')?.value || '';
    showToast('Procurement data saved!');
    procCalc();
}

async function procClear() {
    if (!await appConfirm('Clear Current Input', 'Clear the Procurement inputs for this period?', 'Clear', false)) return;
    const ea = document.getElementById('proc-i-actual');
    const et = document.getElementById('proc-i-target');
    if (ea) ea.value = '';
    if (et) et.value = '';
    procSave();
}

async function procClearAll() {
    if (!await appConfirm('Clear ALL Procurement Data', 'This will erase all Procurement data. This cannot be undone.', 'Clear All', true)) return;
    if (!confirm('Clear all procurement data for this month?')) return;
    const d  = procGetDB();
    d.actual = ''; d.target = '';
    procLoadInputs(); procCalc();
}
