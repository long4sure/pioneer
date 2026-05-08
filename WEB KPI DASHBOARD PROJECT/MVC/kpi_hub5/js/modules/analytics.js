/* ============================================================
   js/modules/analytics.js
   Customizable Analytics Dashboard
   - KPI card registry (pulls from all module DBs)
   - Month-range & year-range comparison
   - Card filter chips by module
   - Pin/unpin cards
   - Mini bar-chart trend per card
   - Search integration (see search.js)
   ============================================================ */

// ── KPI Registry ─────────────────────────────────────────────
// Each entry describes one measurable KPI across periods.
// resolver(year, month) → { value, formatted, unit }
const KPI_REGISTRY = [

    // ── Finance ──────────────────────────────────────────────
    {
        id: 'fin-prod-vol',    module: 'Finance',    color: 'col-blue',
        label: 'Production Volume', unit: 'MT',
        thresholds: { good: 95, warn: 80, higherIsBetter: true },
        resolver: (y, m) => {
            const d = finDB[y]?.[m]; if (!d) return null;
            const a = +d.prod.actual || 0, t = +d.prod.target || 0;
            if (!a && !t) return null;                       // ← no data entered
            const pct = t > 0 ? a / t * 100 : null;
            return { value: pct, raw: a, formatted: pct !== null ? pct.toFixed(1) + '%' : '—', sub: fmtN(a, 2) + ' MT', isPercent: true };
        }
    },
    {
        id: 'fin-op-cost',     module: 'Finance',    color: 'col-gold',
        label: 'Operational Cost vs Budget', unit: '%',
        thresholds: { good: 100, warn: 115, higherIsBetter: false },
        resolver: (y, m) => {
            const d = finDB[y]?.[m]; if (!d) return null;
            const a = +d.op.actual || 0, b = +d.op.budget || 0;
            if (!a && !b) return null;
            const pct = b > 0 ? a / b * 100 : null;
            return { value: pct, raw: a, formatted: pct !== null ? pct.toFixed(1) + '%' : '—', sub: fmtC(a), isPercent: true };
        }
    },
    {
        id: 'fin-cap-cost',    module: 'Finance',    color: 'col-gold',
        label: 'Capital Expenditure vs Budget', unit: '%',
        thresholds: { good: 100, warn: 115, higherIsBetter: false },
        resolver: (y, m) => {
            const d = finDB[y]?.[m]; if (!d) return null;
            const a = +d.cap.actual || 0, b = +d.cap.budget || 0;
            if (!a && !b) return null;
            const pct = b > 0 ? a / b * 100 : null;
            return { value: pct, raw: a, formatted: pct !== null ? pct.toFixed(1) + '%' : '—', sub: fmtC(a), isPercent: true };
        }
    },
    {
        id: 'fin-total-cost',  module: 'Finance',    color: 'col-gold',
        label: 'Total Costs', unit: '₱',
        thresholds: null,  // informational only — no good/bad threshold
        resolver: (y, m) => {
            const d = finDB[y]?.[m]; if (!d) return null;
            const a = (+d.op.actual || 0) + (+d.cap.actual || 0) + (+d.other.actual || 0);
            if (!a) return null;
            return { value: a, raw: a, formatted: fmtC(a), sub: '', isPercent: false };
        }
    },
    {
        id: 'fin-ot-rate',     module: 'Finance',    color: 'col-red',
        label: 'Overtime Rate', unit: '%',
        thresholds: { good: 25, warn: 35, higherIsBetter: false },
        resolver: (y, m) => {
            const d = finDB[y]?.[m]; if (!d) return null;
            const dlr = +d.labor.dl.reg||0, dlot = +d.labor.dl.ot||0, ilr = +d.labor.il.reg||0, ilot = +d.labor.il.ot||0;
            const th = dlr + ilr + dlot + ilot, tot = dlot + ilot;
            if (!th) return null;
            const pct = tot / th * 100;
            return { value: pct, raw: tot, formatted: pct.toFixed(1) + '%', sub: fmtN(tot) + ' OT hrs', isPercent: true };
        }
    },

    // ── SC Planning ──────────────────────────────────────────
    {
        id: 'pl-fc-local',     module: 'SC Planning', color: 'col-blue',
        label: 'Forecast Accuracy (Local PH)', unit: '%',
        thresholds: { good: 85, warn: 70, higherIsBetter: true },
        resolver: (y, m) => {
            const d = plDB[y]?.[m]; if (!d) return null;
            const ids = ['fcGma','fcNorth','fcSouth','fcVis','fcMind','fcMT','fcPsbsi'];
            const vals = ids.map(k => parseFloat(d[k]) || 0).filter(v => v > 0);
            if (!vals.length) return null;
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            return { value: avg, raw: avg, formatted: avg.toFixed(1) + '%', sub: vals.length + ' regions', isPercent: true };
        }
    },
    {
        id: 'pl-fc-export',    module: 'SC Planning', color: 'col-blue',
        label: 'Forecast Accuracy (Export)', unit: '%',
        thresholds: { good: 85, warn: 70, higherIsBetter: true },
        resolver: (y, m) => {
            const d = plDB[y]?.[m]; if (!d) return null;
            const ids = ['fcIndo','fcIndia','fcDirect'];
            const vals = ids.map(k => parseFloat(d[k]) || 0).filter(v => v > 0);
            if (!vals.length) return null;
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            return { value: avg, raw: avg, formatted: avg.toFixed(1) + '%', sub: 'Indonesia, India, Direct', isPercent: true };
        }
    },
    {
        id: 'pl-fg-kgs',       module: 'SC Planning', color: 'col-green',
        label: 'FG Inventory (KGS)', unit: 'kg',
        thresholds: null,  // informational — no good/bad level
        resolver: (y, m) => {
            const d = plDB[y]?.[m]; if (!d) return null;
            const tot = ['fgKgsFG','fgKgsFN','fgKgsSL','fgKgsNM','fgKgsEX'].reduce((s, k) => s + (parseFloat(d[k]) || 0), 0);
            if (!tot) return null;
            return { value: tot, raw: tot, formatted: fmtN(tot) + ' kg', sub: parseFloat(d.fgKgsDays).toFixed(1) + ' inv. days', isPercent: false };
        }
    },
    {
        id: 'pl-fg-acc',       module: 'SC Planning', color: 'col-green',
        label: 'Inventory Accuracy (FG)', unit: '%',
        thresholds: { good: 98, warn: 95, higherIsBetter: true },
        resolver: (y, m) => {
            const d = plDB[y]?.[m]; if (!d) return null;
            const cnt = parseFloat(d.fgCnt) || 0, miss = parseFloat(d.fgMiss) || 0;
            if (!cnt) return null;
            const acc = (cnt - miss) / cnt * 100;
            return { value: acc, raw: acc, formatted: acc.toFixed(1) + '%', sub: fmtN(cnt, 0) + ' counted', isPercent: true };
        }
    },

    // ── Procurement ──────────────────────────────────────────
    {
        id: 'proc-savings',    module: 'Procurement', color: 'col-green',
        label: 'Savings Achievement', unit: '%',
        thresholds: { good: 100, warn: 70, higherIsBetter: true },
        resolver: (y, m) => {
            const d = procDB[y]?.[m]; if (!d) return null;
            const a = parseFloat(d.actual) || 0, t = parseFloat(d.target) || 0;
            if (!t) return null;
            const pct = a / t * 100;
            return { value: pct, raw: a, formatted: pct.toFixed(1) + '%', sub: fmtC(a) + ' saved', isPercent: true };
        }
    },

    // ── Production — Utilization ─────────────────────────────
    {
        id: 'prod-util',       module: 'Production',  color: 'col-blue',
        label: 'Overall Machine Utilization', unit: '%',
        thresholds: { good: 70, warn: 40, higherIsBetter: true },
        resolver: (y, m) => {
            const db = utilDB[y]?.[m]; if (!db) return null;
            let tp = 0, tt = 0;
            utilLines.forEach(l => { const d = db[l]; const tot = utilKeys2.reduce((s, k) => s + (+d[k]||0), 0); tp += +d.productive||0; tt += tot; });
            if (!tt) return null;
            const pct = tp / tt * 100;
            return { value: pct, raw: pct, formatted: pct.toFixed(1) + '%', sub: fmtN(tp) + ' productive hrs', isPercent: true };
        }
    },
    {
        id: 'prod-waste-pct',  module: 'Production',  color: 'col-red',
        label: 'Waste Rate', unit: '%',
        thresholds: { good: 1, warn: 5, higherIsBetter: false },
        resolver: (y, m) => {
            const db = wasteDB[y]?.[m]; if (!db) return null;
            let tFg = 0, tW = 0;
            wasteLines.forEach(l => { const d = db[l]; tFg += +d.fg||0; tW += +d.waste||0; });
            if (!tFg && !tW) return null;
            const pct = (tFg + tW) > 0 ? tW / (tFg + tW) * 100 : 0;
            return { value: pct, raw: tW, formatted: pct.toFixed(2) + '%', sub: fmtN(tW) + ' kg waste', isPercent: true };
        }
    },
    {
        id: 'prod-sched',      module: 'Production',  color: 'col-blue',
        label: 'Scheduling Attainment', unit: '%',
        thresholds: { good: 95, warn: 75, higherIsBetter: true },
        resolver: (y, m) => {
            const db = schedDB[y]?.[m]; if (!db) return null;
            let ta = 0, tp = 0;
            schedLines.forEach(l => { ta += +db[l].actual||0; tp += +db[l].planned||0; });
            if (!tp) return null;
            const pct = ta / tp * 100;
            return { value: pct, raw: ta, formatted: pct.toFixed(1) + '%', sub: fmtN(ta) + ' kg actual', isPercent: true };
        }
    },
    {
        id: 'prod-output',     module: 'Production',  color: 'col-green',
        label: 'Total FG Output', unit: 'kg',
        thresholds: { good: 0, warn: 0, higherIsBetter: true },
        resolver: (y, m) => {
            const db = wasteDB[y]?.[m]; if (!db) return null;
            const tot = wasteLines.reduce((s, l) => s + (+db[l].fg||0), 0);
            if (!tot) return null;
            return { value: tot, raw: tot, formatted: fmtN(tot) + ' kg', sub: '', isPercent: false };
        }
    },

    // ── Warehouse & Logistics ────────────────────────────────
    {
        id: 'wh-otif',         module: 'Warehouse',   color: 'col-blue',
        label: 'OTIF Rate', unit: '%',
        thresholds: { good: 99.01, warn: 95, higherIsBetter: true },
        resolver: (y, m) => {
            const d = whDB[y]?.[m]; if (!d) return null;
            const sv = +d.otif.served||0, tot = +d.otif.total||0;
            if (!tot) return null;
            const pct = sv / tot * 100;
            return { value: pct, raw: pct, formatted: pct.toFixed(1) + '%', sub: fmtN(sv) + ' / ' + fmtN(tot), isPercent: true };
        }
    },
    {
        id: 'wh-vol-fill',     module: 'Warehouse',   color: 'col-blue',
        label: 'Volume Fill Rate', unit: '%',
        thresholds: { good: 99.01, warn: 95, higherIsBetter: true },
        resolver: (y, m) => {
            const d = whDB[y]?.[m]; if (!d) return null;
            const del = +d.vol.del||0, ord = +d.vol.ord||0;
            if (!ord) return null;
            const pct = del / ord * 100;
            return { value: pct, raw: pct, formatted: pct.toFixed(1) + '%', sub: fmtC(del) + ' delivered', isPercent: true };
        }
    },
    {
        id: 'wh-util',         module: 'Warehouse',   color: 'col-gold',
        label: 'Warehouse Utilization', unit: '%',
        thresholds: { good: 75, warn: 60, higherIsBetter: true },
        resolver: (y, m) => {
            const d = whDB[y]?.[m]; if (!d) return null;
            const wh = d.wh;
            const tot = (+wh.rmTot||0)+(+wh.fgTot||0)+(+wh.extTot||0);
            const used = (+wh.rmUsed||0)+(+wh.fgUsed||0)+(+wh.extUsed||0);
            if (!tot) return null;
            const pct = used / tot * 100;
            return { value: pct, raw: pct, formatted: pct.toFixed(1) + '%', sub: fmtN(used) + ' / ' + fmtN(tot) + ' pallets', isPercent: true };
        }
    },
    {
        id: 'wh-non-otif',     module: 'Warehouse',   color: 'col-red',
        label: 'Non-OTIF Issues', unit: 'count',
        thresholds: { good: 0, warn: 5, higherIsBetter: false },
        resolver: (y, m) => {
            const d = whDB[y]?.[m]; if (!d) return null;
            const tot = Object.values(d.nonOtif).reduce((s, v) => s + (+v||0), 0);
            if (!tot) return null;
            return { value: tot, raw: tot, formatted: fmtN(tot, 0), sub: 'issues logged', isPercent: false };
        }
    },
    {
        id: 'wh-stockout-val', module: 'Warehouse',   color: 'col-red',
        label: 'Stock-Out Value', unit: '₱',
        thresholds: { good: 0, warn: 0, higherIsBetter: false },
        resolver: (y, m) => {
            const d = whDB[y]?.[m]; if (!d) return null;
            const tot = Object.values(d.soVal).reduce((s, v) => s + (+v||0), 0);
            if (!tot) return null;
            return { value: tot, raw: tot, formatted: fmtC(tot), sub: '', isPercent: false };
        }
    },
    {
        id: 'wh-attrition',    module: 'Warehouse',   color: 'col-red',
        label: 'WH Attrition Rate', unit: '%',
        thresholds: { good: 2, warn: 5, higherIsBetter: false },
        resolver: (y, m) => {
            const d = whDB[y]?.[m]; if (!d) return null;
            const reg = +d.mp.reg||0, agy = +d.mp.agy||0, res = +d.mp.res||0;
            const totHC = reg + agy;
            if (!totHC) return null;
            const avgHC = (totHC + (totHC - res)) / 2;
            const attr = avgHC > 0 ? res / avgHC * 100 : 0;
            return { value: attr, raw: res, formatted: attr.toFixed(2) + '%', sub: fmtN(res, 0) + ' resigned', isPercent: true };
        }
    },
    {
        id: 'wh-ot-rate',      module: 'Warehouse',   color: 'col-red',
        label: 'WH Overtime Rate', unit: '%',
        thresholds: { good: 25, warn: 35, higherIsBetter: false },
        resolver: (y, m) => {
            const d = whDB[y]?.[m]; if (!d) return null;
            const regH = +d.mp.regH||0, agyH = +d.mp.agyH||0, otH = +d.mp.otH||0;
            const tot = regH + agyH; if (!tot) return null;
            const pct = otH / tot * 100;
            return { value: pct, raw: otH, formatted: pct.toFixed(1) + '%', sub: fmtN(otH) + ' OT hrs', isPercent: true };
        }
    },
    {
        id: 'wh-corp-fill',    module: 'Warehouse',   color: 'col-blue',
        label: 'Corporate Fill Rate', unit: '%',
        thresholds: { good: 99.01, warn: 95, higherIsBetter: true },
        resolver: (y, m) => {
            const d = whDB[y]?.[m]; if (!d) return null;
            const del = +d.fr.corp.del||0, ord = +d.fr.corp.ord||0;
            if (!ord) return null;
            const pct = del / ord * 100;
            return { value: pct, raw: pct, formatted: pct.toFixed(1) + '%', sub: fmtC(del) + ' delivered', isPercent: true };
        }
    },
    {
        id: 'wh-m7-fill',      module: 'Warehouse',   color: 'col-blue',
        label: 'M7 & Others Fill Rate', unit: '%',
        thresholds: { good: 99.01, warn: 95, higherIsBetter: true },
        resolver: (y, m) => {
            const d = whDB[y]?.[m]; if (!d) return null;
            const del = +d.fr.m7?.del||0, ord = +d.fr.m7?.ord||0;
            if (!ord) return null;
            const pct = del / ord * 100;
            return { value: pct, raw: pct, formatted: pct.toFixed(1) + '%', sub: fmtC(del) + ' delivered', isPercent: true };
        }
    },
];

// ── Module color map ─────────────────────────────────────────
const MODULE_TAG_COLORS = {
    'Finance':    { bg: '#dbeafe', fg: '#1a2744' },
    'SC Planning':{ bg: '#dcfce7', fg: '#15803d' },
    'Procurement':{ bg: '#fef9e0', fg: '#7a5800' },
    'Production': { bg: '#fde8e9', fg: '#a01820' },
    'Warehouse':  { bg: '#e8f0fd', fg: '#1e5fc8' },
};

// ── State ─────────────────────────────────────────────────────
let anState = {
    activeModules: new Set(['Finance','SC Planning','Procurement','Production','Warehouse']),
    pinnedCards:   new Set(),
    viewMode:      'grid',   // grid | compact | list
    rangeMode:     'month',  // month | year
    fromYear:  '2026', fromMonth: 'January',
    toYear:    '2026', toMonth:   'October',
};

// ── Helpers: build period list ────────────────────────────────
function anGetPeriods() {
    const { fromYear, fromMonth, toYear, toMonth, rangeMode } = anState;
    const periods = [];

    if (rangeMode === 'month') {
        const fyIdx = YEARS.indexOf(fromYear),  tyIdx = YEARS.indexOf(toYear);
        const fmIdx = MONTHS.indexOf(fromMonth), tmIdx = MONTHS.indexOf(toMonth);
        for (let yi = fyIdx; yi <= tyIdx; yi++) {
            const y = YEARS[yi];
            const mStart = (yi === fyIdx) ? fmIdx : 0;
            const mEnd   = (yi === tyIdx) ? tmIdx : 11;
            for (let mi = mStart; mi <= mEnd; mi++) {
                periods.push({ year: y, month: MONTHS[mi], label: MONTHS[mi].slice(0, 3) + ' ' + y.slice(2) });
            }
        }
    } else {
        // Year mode — each year is one "period" averaged over all months with data
        const fyIdx = YEARS.indexOf(fromYear), tyIdx = YEARS.indexOf(toYear);
        for (let yi = fyIdx; yi <= tyIdx; yi++) {
            periods.push({ year: YEARS[yi], month: null, label: YEARS[yi] });
        }
    }
    return periods.slice(0, 36); // cap at 36 periods for readability
}

function anResolveYearValue(kpi, year) {
    // Average / aggregate all months with data for a given year
    const results = MONTHS.map(m => kpi.resolver(year, m)).filter(Boolean);
    if (!results.length) return null;
    const avg = results.reduce((s, r) => s + (r.value || 0), 0) / results.length;
    return { value: avg, raw: avg, formatted: avg.toFixed(1) + (kpi.unit === '%' ? '%' : ''), sub: results.length + ' months avg', isPercent: kpi.unit === '%' };
}

// ── Trend helpers ─────────────────────────────────────────────
function anTrend(vals) {
    const valid = vals.filter(v => v !== null && v.value !== null);
    if (valid.length < 2) return { dir: 'flat', pct: null };
    const last = valid[valid.length - 1].value, prev = valid[valid.length - 2].value;
    if (prev === 0) return { dir: 'flat', pct: null };
    const change = ((last - prev) / Math.abs(prev)) * 100;
    return { dir: change > 1 ? 'up' : change < -1 ? 'down' : 'flat', pct: change };
}

function anBarColor(kpi, val) {
    if (!val || val.value === null) return 'col-neutral';
    if (!kpi.thresholds) return kpi.color;          // no threshold = use card color
    if (!kpi.thresholds.good && kpi.thresholds.good !== 0) return kpi.color;
    const { cls } = statusBadge(val.value, kpi.thresholds);
    if (cls === 'badge-excellent' || cls === 'badge-good') return 'col-green';
    if (cls === 'badge-warning')   return 'col-gold';
    if (cls === 'badge-critical')  return 'col-red';
    return kpi.color;
}

// ── Render ────────────────────────────────────────────────────
function anRender() {
    const periods  = anGetPeriods();
    const container = document.getElementById('analytics-grid');
    if (!container) return;

    // Build visible KPI list
    let kpis = KPI_REGISTRY.filter(k => anState.activeModules.has(k.module));

    // Sort: pinned first
    kpis = [
        ...kpis.filter(k => anState.pinnedCards.has(k.id)),
        ...kpis.filter(k => !anState.pinnedCards.has(k.id))
    ];

    if (!kpis.length) {
        container.innerHTML = `<div class="analytics-empty"><div class="analytics-empty-icon">📊</div><div class="analytics-empty-title">No KPIs selected</div><div class="analytics-empty-sub">Enable one or more modules using the filter chips above.</div></div>`;
        anUpdateSummary(0, 0, 0);
        return;
    }

    // Gather all resolved data
    const cardData = kpis.map(kpi => {
        const vals = periods.map(p => {
            if (anState.rangeMode === 'year' && !p.month) {
                return anResolveYearValue(kpi, p.year);
            }
            return kpi.resolver(p.year, p.month);
        });
        const latest = [...vals].reverse().find(v => v !== null);
        const trend  = anTrend(vals);
        return { kpi, vals, latest, trend };
    });

    // Summary counts — only cards with actual resolved data
    const withData = cardData.filter(d => d.latest !== undefined && d.latest !== null).length;
    const goodCnt  = cardData.filter(d => {
        if (!d.latest) return false;
        if (!d.kpi.thresholds.good && d.kpi.thresholds.good !== 0) return false;
        const { cls } = statusBadge(d.latest.value, d.kpi.thresholds);
        return cls !== 'badge-critical' && cls !== 'badge-neutral';
    }).length;
    const badCnt   = cardData.filter(d => {
        if (!d.latest) return false;
        if (!d.kpi.thresholds.good && d.kpi.thresholds.good !== 0) return false;
        const { cls } = statusBadge(d.latest.value, d.kpi.thresholds);
        return cls === 'badge-critical';
    }).length;
    anUpdateSummary(withData, goodCnt, badCnt);

    container.innerHTML = cardData.map(({ kpi, vals, latest, trend }) => anCardHTML(kpi, vals, latest, trend, periods)).join('');
}

function anCardHTML(kpi, vals, latest, trend, periods) {
    const pinned  = anState.pinnedCards.has(kpi.id);
    const tagCol  = MODULE_TAG_COLORS[kpi.module] || { bg: '#eef2f9', fg: '#3d5070' };
    const maxVal  = Math.max(...vals.filter(Boolean).map(v => Math.abs(v.value || 0)), 1);

    // Mini bar chart
    const barHTML = vals.map((v, i) => {
        const p    = periods[i];
        const h    = v ? Math.max(4, Math.round((Math.abs(v.value) / maxVal) * 52)) : 4;
        const col  = anBarColor(kpi, v);
        const isCurrent = anState.rangeMode === 'month'
            ? (p.year === anState.toYear && p.month === anState.toMonth)
            : (p.year === anState.toYear);
        const tip  = v ? `${p.label}: ${v.formatted}` : `${p.label}: No data`;
        return `<div class="a-chart-bar-wrap">
            <div class="a-chart-bar ${col}${isCurrent ? ' is-current' : ''}" style="height:${h}px" data-tip="${tip}"></div>
        </div>`;
    }).join('');

    const lblHTML = periods.map(p => `<div class="a-chart-lbl">${p.label}</div>`).join('');

    // Trend badge
    let trendHTML = '';
    if (trend.pct !== null) {
        const sign = trend.pct >= 0 ? '+' : '';
        trendHTML = `<span class="a-card-trend ${trend.dir}">${trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '→'} ${sign}${trend.pct.toFixed(1)}%</span>`;
    }

    // Period count label
    const periodsWithData = vals.filter(Boolean).length;
    const rangeSummary = `${periodsWithData} of ${periods.length} periods`;

    // Status badge for latest
    let statusHTML = '';
    if (latest && kpi.thresholds && (kpi.thresholds.good || kpi.thresholds.good === 0)) {
        const { cls, label } = statusBadge(latest.value, kpi.thresholds);
        if (cls !== 'badge-neutral') {
            statusHTML = `<span class="badge ${cls}" style="font-size:10px;">${label}</span>`;
        }
    }

    // Multi-period rows for list view
    const periodsRowsHTML = periods.slice(-8).map((p, i) => {
        const idx = periods.length - Math.min(8, periods.length) + i;
        const v   = vals[idx];
        if (!v) return `<div class="a-period-row"><span class="a-period-label">${p.label}</span><span class="a-period-val">—</span></div>`;
        let bc = '', bl = '';
        if (kpi.thresholds && (kpi.thresholds.good || kpi.thresholds.good === 0)) {
            const s = statusBadge(v.value, kpi.thresholds);
            if (s.cls !== 'badge-neutral') { bc = s.cls; bl = s.label; }
        }
        return `<div class="a-period-row">
            <span class="a-period-label">${p.label}</span>
            <span class="a-period-val">${v.formatted}</span>
            ${bc ? `<span class="badge ${bc} a-period-badge" style="font-size:9px;">${bl}</span>` : ''}
        </div>`;
    }).join('');

    return `
    <div class="a-card" data-kpi-id="${kpi.id}" data-module="${kpi.module}">
        <div class="a-card-header">
            <div style="flex:1;min-width:0;">
                <span class="a-card-module-tag" style="background:${tagCol.bg};color:${tagCol.fg};">${kpi.module}</span>
                <div class="a-card-title">${kpi.label}</div>
            </div>
            <button class="a-card-pin-btn${pinned ? ' pinned' : ''}" onclick="anTogglePin('${kpi.id}')" title="${pinned ? 'Unpin' : 'Pin to top'}">
                ${pinned ? '📌' : '📍'}
            </button>
        </div>

        <div class="a-card-chart">
            <div class="a-chart-bars">${barHTML}</div>
            <div class="a-chart-labels">${lblHTML}</div>
        </div>

        <div class="a-card-footer">
            <div class="a-card-value-row">
                <span class="a-card-value">${latest ? latest.formatted : '—'}</span>
                ${trendHTML}
            </div>
            ${latest?.sub ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${latest.sub}</div>` : ''}
            <div class="a-card-period-label">
                ${statusHTML}
                <span class="a-card-range-summary">${rangeSummary}</span>
            </div>

            ${anState.viewMode === 'list' ? `<div class="a-card-periods">${periodsRowsHTML}</div>` : ''}
        </div>
    </div>`;
}

function anUpdateSummary(withData, good, bad) {
    const total = KPI_REGISTRY.filter(k => anState.activeModules.has(k.module)).length;
    setHTML('an-summary-bar', `
        <div class="analytics-summary-pill"><span class="pill-count">${total}</span> KPIs tracked</div>
        <div class="analytics-summary-pill"><span class="pill-count">${withData}</span> with data</div>
        ${good  ? `<div class="analytics-summary-pill" style="border-color:var(--green-mid)"><span class="pill-count" style="color:var(--green)">${good}</span> on track</div>` : ''}
        ${bad   ? `<div class="analytics-summary-pill" style="border-color:var(--pioneer-red)"><span class="pill-count" style="color:var(--pioneer-red)">${bad}</span> critical</div>` : ''}
    `);
}

// ── Actions ───────────────────────────────────────────────────
function anTogglePin(id) {
    if (anState.pinnedCards.has(id)) anState.pinnedCards.delete(id);
    else anState.pinnedCards.add(id);
    anRender();
}

function anToggleModule(mod, el) {
    if (anState.activeModules.has(mod)) {
        if (anState.activeModules.size <= 1) return; // keep at least one
        anState.activeModules.delete(mod);
        el?.classList.remove('active');
    } else {
        anState.activeModules.add(mod);
        el?.classList.add('active');
    }
    anRender();
}

function anSetView(mode, btn) {
    anState.viewMode = mode;
    document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
    btn?.classList.add('active');
    const grid = document.getElementById('analytics-grid');
    if (grid) { grid.className = 'analytics-grid'; if (mode !== 'grid') grid.classList.add('view-' + mode); }
    anRender();
}

function anReadRangeControls() {
    anState.fromYear  = document.getElementById('an-from-year')?.value  || anState.fromYear;
    anState.fromMonth = document.getElementById('an-from-month')?.value || anState.fromMonth;
    anState.toYear    = document.getElementById('an-to-year')?.value    || anState.toYear;
    anState.toMonth   = document.getElementById('an-to-month')?.value   || anState.toMonth;
    // Show/hide month selectors based on mode
    const isYear = anState.rangeMode === 'year';
    ['an-from-month','an-to-month'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.parentElement.style.display = isYear ? 'none' : '';
    });
}

function anSetRangeMode(mode) {
    anState.rangeMode = mode;
    const mBtn = document.getElementById('an-mode-month');
    const yBtn = document.getElementById('an-mode-year');
    if (mBtn) mBtn.classList.toggle('active', mode === 'month');
    if (yBtn) yBtn.classList.toggle('active', mode === 'year');
    anReadRangeControls();
    anRender();
}

function anApplyRange() {
    anReadRangeControls();
    anRender();
}

// Sync range from/to with global filter on init
function anSyncFromGlobal() {
    const { year, month } = getGlobalPeriod();
    anState.toYear  = year;
    anState.toMonth = month;
    const el1 = document.getElementById('an-to-year');
    const el2 = document.getElementById('an-to-month');
    if (el1) el1.value = year;
    if (el2) el2.value = month;
}

// Called when analytics module becomes visible
function anInit() {
    anSyncFromGlobal();
    anReadRangeControls();
    anRender();
}
