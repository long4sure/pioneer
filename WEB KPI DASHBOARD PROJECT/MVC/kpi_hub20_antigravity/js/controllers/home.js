/* ============================================================
   js/controllers/home.js — Home Dashboard KPI Aggregator
   ============================================================ */

function updateHomeKPIs() {
    const { year: y, month: m } = getGlobalPeriod();

    // Finance
    const fd = typeof finDB !== 'undefined' ? finDB[y]?.[m] : null;
    let ta = 0;
    if (fd) ta = (+fd.op.actual || 0) + (+fd.cap.actual || 0) + (+fd.other.actual || 0);
    setText('home-fin-kpi', fmtC(ta));

    // Planning
    const pd = typeof plDB !== 'undefined' ? plDB[y]?.[m] : null;
    if (pd) {
        const plVals = ['fcGma','fcNorth','fcSouth','fcVis','fcMind','fcMT','fcPsbsi','fcIndo','fcIndia','fcDirect']
            .map(k => parseFloat(pd[k]) || 0)
            .filter(v => v > 0);
        setText('home-pl-kpi', plVals.length ? (plVals.reduce((a, b) => a + b, 0) / plVals.length).toFixed(2) + '%' : '0%');
    } else {
        setText('home-pl-kpi', '0%');
    }

    // Procurement
    const prd = typeof procDB !== 'undefined' ? procDB[y]?.[m] : null;
    if (prd) {
        const pa2 = +prd.actual || 0;
        const pt2 = +prd.target || 0;
        setText('home-proc-kpi', pt2 > 0 ? (pa2 / pt2 * 100).toFixed(2) + '%' : '0%');
    } else {
        setText('home-proc-kpi', '0%');
    }

    // Production - Utilization
    let ou = 0;
    const udb = typeof utilDB !== 'undefined' ? utilDB[y]?.[m] : null;
    if (udb && typeof utilLines !== 'undefined') {
        let tProd = 0, tTime = 0;
        utilLines.forEach(l => {
            const d = udb[l];
            if (d) {
                tProd += +d.productive || 0;
                tTime += typeof utilKeys2 !== 'undefined' ? utilKeys2.reduce((s, k) => s + (+d[k] || 0), 0) : 0;
            }
        });
        ou = tTime > 0 ? tProd / tTime * 100 : 0;
    }
    setText('home-prod-kpi', ou.toFixed(2) + '%');

    // Warehouse - SC Fill Rate
    const wd = typeof whDB !== 'undefined' ? whDB[y]?.[m] : null;
    if (wd && wd.fr && wd.fr.sc) {
        const fdv = +wd.fr.sc.del || 0;
        const fo = +wd.fr.sc.ord || 0;
        setText('home-wh-kpi', fo > 0 ? (fdv / fo * 100).toFixed(2) + '%' : '0%');
    } else {
        setText('home-wh-kpi', '0%');
    }
}
