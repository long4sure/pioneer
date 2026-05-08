/* ============================================================
   js/controllers/home.js — Home Dashboard KPI Aggregator
   ============================================================ */

function updateHomeKPIs() {
    // Finance
    const fd = finData();
    const ta = (+fd.op.actual || 0) + (+fd.cap.actual || 0) + (+fd.other.actual || 0);
    setText('home-fin-kpi', fmtC(ta));

    // Planning — overall forecast accuracy (all 10 local+export channels)
    const plVals = ['fcGma','fcNorth','fcSouth','fcVis','fcMind','fcMT','fcPsbsi','fcIndo','fcIndia','fcDirect']
        .map(k => parseFloat(document.getElementById('pl-i-' + k)?.value) || 0)
        .filter(v => v > 0);
    setText('home-pl-kpi', plVals.length ? (plVals.reduce((a, b) => a + b, 0) / plVals.length).toFixed(2) + '%' : '0%');

    // Procurement
    const pa2 = parseFloat(document.getElementById('proc-i-actual')?.value) || 0;
    const pt2 = parseFloat(document.getElementById('proc-i-target')?.value) || 0;
    setText('home-proc-kpi', pt2 > 0 ? (pa2 / pt2 * 100).toFixed(2) + '%' : '0%');

    // Production — machine utilization
    const uEl = document.getElementById('util-overall');
    setText('home-prod-kpi', uEl ? uEl.textContent : '0%');

    // Warehouse — SC Fill Rate
    const scEl = document.getElementById('wh-scRate');
    setText('home-wh-kpi', scEl ? scEl.textContent : '0%');
}
