/* ============================================================
   js/controllers/home.js — Home Dashboard KPI Aggregator
   ============================================================ */

function updateHomeKPIs() {
    // Finance
    const fd = finData();
    const ta = (+fd.op.actual || 0) + (+fd.cap.actual || 0) + (+fd.other.actual || 0);
    setText('home-fin-kpi', fmtC(ta));
    const pa = +fd.prod.actual || 0, pt = +fd.prod.target || 0;
    const pp  = pt > 0 ? (pa / pt * 100).toFixed(1) + '%' : '0%';
    const tb  = (+fd.op.budget || 0) + (+fd.cap.budget || 0) + (+fd.other.budget || 0);
    const cpct = tb > 0 ? (ta / tb * 100).toFixed(1) + '%' : '—';
    setText('home-s-prod',    pa ? fmtN(pa, 1) + ' MT' : '0 MT');
    setText('home-s-prodpct', pp);
    setText('home-s-costs',   fmtC(ta));
    setText('home-s-costpct', cpct);

    // Planning — overall forecast accuracy (all 10 local+export channels)
    const plVals = ['fcGma','fcNorth','fcSouth','fcVis','fcMind','fcMT','fcPsbsi','fcIndo','fcIndia','fcDirect']
        .map(k => parseFloat(document.getElementById('pl-i-' + k)?.value) || 0);
    const plAvg = plVals.reduce((a, b) => a + b, 0) / 10;
    setText('home-pl-kpi', plAvg > 0 ? plAvg.toFixed(1) + '%' : '0%');

    // Procurement
    const pa2 = parseFloat(document.getElementById('proc-i-actual')?.value) || 0;
    const pt2 = parseFloat(document.getElementById('proc-i-target')?.value) || 0;
    const pr  = pt2 > 0 ? (pa2 / pt2 * 100).toFixed(1) + '%' : '0%';
    setText('home-proc-kpi', pr);

    // Production — machine utilization
    const uEl = document.getElementById('util-overall');
    setText('home-prod-kpi', uEl ? uEl.textContent : '0%');

    // Warehouse — OTIF
    const wEl = document.getElementById('wh-otif');
    setText('home-wh-kpi', wEl ? wEl.textContent : '0%');

    // Scheduling summary
    const saEl = document.getElementById('sched-overall'), skEl = document.getElementById('sched-actual');
    setText('home-s-sched',   saEl ? saEl.textContent : '0%');
    setText('home-s-schedkg', skEl ? skEl.textContent : '0 kg');

    // OTIF summary
    const oEl = document.getElementById('wh-otif'), osEl = document.getElementById('wh-otifServed'), otEl = document.getElementById('wh-otifTotal');
    setText('home-s-otif',   oEl ? oEl.textContent : '0%');
    setText('home-s-otifdet', (osEl ? osEl.textContent : '0') + ' / ' + (otEl ? otEl.textContent : '0'));
}
