/* ============================================================
   js/modules/finance.js — Finance Module (Model + Controller)
   ============================================================ */

// ── Model: per-period DB ──────────────────────────────────────
const finDB = {};
YEARS.forEach(y => {
    finDB[y] = {};
    MONTHS.forEach(mo => {
        finDB[y][mo] = {
            prod:  { actual: '', target: '' },
            op:    { actual: '', budget: '' },
            cap:   { actual: '', budget: '' },
            other: { actual: '', budget: '' },
            labor: { dl: { reg: '', ot: '' }, il: { reg: '', ot: '' } }
        };
    });
});

function finData() {
    const { year: y, month: m } = getGlobalPeriod();
    return finDB[y][m];
}

// ── Controller: Calc / Render ─────────────────────────────────
function finCalc() {
    const d = finData();
    const pa = +d.prod.actual || 0, pt = +d.prod.target || 0, pp = pt > 0 ? pa / pt * 100 : 0;
    setText('fin-prodVal',    pa ? fmtN(pa, 2) + ' MT' : '0 MT');
    setText('fin-prodTarget', pt ? fmtN(pt, 2) + ' MT' : '0 MT');
    setW('fin-prodBar', pp); setText('fin-prodPct', pp.toFixed(2) + '%');

    const oa = +d.op.actual || 0,    ob = +d.op.budget || 0,    op  = ob > 0 ? oa / ob * 100 : 0;
    const ca = +d.cap.actual || 0,   cb = +d.cap.budget || 0,   cp  = cb > 0 ? ca / cb * 100 : 0;
    const oa2 = +d.other.actual || 0, ob2 = +d.other.budget || 0, op2 = ob2 > 0 ? oa2 / ob2 * 100 : 0;

    setText('fin-opVal',    fmtC(oa)); setText('fin-opBudget',    fmtC(ob)); setW('fin-opBar',    op);  setText('fin-opPct',    op.toFixed(2) + '%');
    setText('fin-capVal',   fmtC(ca)); setText('fin-capBudget',   fmtC(cb)); setW('fin-capBar',   cp);  setText('fin-capPct',   cp.toFixed(2) + '%');
    setText('fin-otherVal', fmtC(oa2));setText('fin-otherBudget', fmtC(ob2));setW('fin-otherBar', op2); setText('fin-otherPct', op2.toFixed(2) + '%');

    const ta = oa + ca + oa2, tb = ob + cb + ob2, tv = ta - tb, tp = tb > 0 ? ta / tb * 100 : 0;
    setText('fin-totalAct',    fmtC(ta));
    setText('fin-totalBudget', fmtC(tb));
    setText('fin-totalVar',    (tv >= 0 ? '+' : '') + fmtC(tv));
    setText('fin-totalPct',    tp.toFixed(2) + '%');

    let u = 0, o = 0;
    if (ob > 0) oa <= ob ? u++ : o++;
    if (cb > 0) ca <= cb ? u++ : o++;
    if (ob2 > 0) oa2 <= ob2 ? u++ : o++;
    setText('fin-under', u); setText('fin-over', o);

    const dlr = +d.labor.dl.reg || 0, dlot = +d.labor.dl.ot || 0;
    const ilr = +d.labor.il.reg || 0, ilot = +d.labor.il.ot || 0;
    const tr = dlr + ilr, tot = dlot + ilot, th = tr + tot;
    const otr = th > 0 ? tot / th * 100 : 0;
    const dlOtP = dlr > 0 ? dlot / dlr * 100 : 0, ilOtP = ilr > 0 ? ilot / ilr * 100 : 0;

    setText('fin-totalHrs', fmtN(th) + ' hrs');
    setText('fin-regHrs',   fmtN(tr) + ' hrs');
    setText('fin-otHrs',    fmtN(tot) + ' hrs');
    setText('fin-wfTotal',  fmtN(th, 0));
    setText('fin-otRate',   otr.toFixed(2) + '%');
    setText('fin-dlOt',     dlOtP.toFixed(2) + '%');
    setText('fin-ilOt',     ilOtP.toFixed(2) + '%');

    // Cost table
    const costs = [{ n: 'Operational', a: oa, b: ob }, { n: 'Capital', a: ca, b: cb }, { n: 'Other', a: oa2, b: ob2 }];
    let ctbl = '';
    costs.forEach(c => {
        const v = c.a - c.b, p = c.b > 0 ? c.a / c.b * 100 : 0;
        let sc = 'badge-neutral', st = 'No Budget';
        if (c.b > 0) { st = c.a <= c.b ? 'Under' : 'Over'; sc = c.a <= c.b ? 'badge-good' : 'badge-warning'; }
        ctbl += `<tr><td>${c.n}</td><td>${fmtC(c.a)}</td><td>${fmtC(c.b)}</td><td>${(v >= 0 ? '+' : '') + fmtC(v)}</td><td>${p.toFixed(2)}%</td><td><span class="badge ${sc}">${st}</span></td></tr>`;
    });
    setHTML('fin-costTbl',    ctbl); setText('fin-costTotal', 'Total: ' + fmtC(ta));

    // Labor table
    const labs = [{ n: 'Direct Labor', r: dlr, o: dlot }, { n: 'Indirect Labor', r: ilr, o: ilot }];
    let ltbl = '';
    labs.forEach(l => {
        const t = l.r + l.o, p = l.r > 0 ? l.o / l.r * 100 : 0;
        let sc = 'badge-neutral', st = 'No Data';
        if (l.r > 0) { if (p <= 25) { sc = 'badge-good'; st = 'Normal'; } else if (p <= 35) { sc = 'badge-neutral'; st = 'High'; } else { sc = 'badge-warning'; st = 'Critical'; } }
        ltbl += `<tr><td>${l.n}</td><td>${fmtN(l.r, 0)}</td><td>${fmtN(l.o, 0)}</td><td>${fmtN(t, 0)}</td><td>${p.toFixed(2)}%</td><td><span class="badge ${sc}">${st}</span></td></tr>`;
    });
    ltbl += `<tr style="font-weight:700;background:var(--bg)"><td>TOTAL</td><td>${fmtN(tr, 0)}</td><td>${fmtN(tot, 0)}</td><td>${fmtN(th, 0)}</td><td>${otr.toFixed(2)}%</td><td><span class="badge ${th === 0 ? 'badge-neutral' : otr <= 25 ? 'badge-good' : otr <= 35 ? 'badge-neutral' : 'badge-warning'}">${th === 0 ? 'No Data' : otr <= 25 ? 'Normal' : otr <= 35 ? 'High' : 'Critical'}</span></td></tr>`;
    setHTML('fin-laborTbl', ltbl); setText('fin-laborTotal', 'Total Hours: ' + fmtN(th));

    // Cost details tab
    setText('fc-totalAct', fmtC(ta)); setText('fc-totalBudget', fmtC(tb));
    setText('fc-opAct',    fmtC(oa)); setText('fc-opBudget',    fmtC(ob));  setText('fc-opVar',    (oa - ob >= 0 ? '+' : '') + fmtC(oa - ob));
    setText('fc-capAct',   fmtC(ca)); setText('fc-capBudget',   fmtC(cb));  setText('fc-capVar',   (ca - cb >= 0 ? '+' : '') + fmtC(ca - cb));
    setText('fc-otherAct', fmtC(oa2));setText('fc-otherBudget', fmtC(ob2)); setText('fc-otherVar', (oa2 - ob2 >= 0 ? '+' : '') + fmtC(oa2 - ob2));
    setHTML('fc-detailTbl',  ctbl); setText('fc-detailTotal', 'Total: ' + fmtC(ta));

    // Labor details tab
    setText('fl-totalHrs', fmtN(th) + ' hrs'); setText('fl-reg', fmtN(tr)); setText('fl-ot', fmtN(tot));
    setText('fl-dlTotal',  fmtN(dlr + dlot) + ' hrs'); setText('fl-dlReg', fmtN(dlr)); setText('fl-dlOT', fmtN(dlot)); setText('fl-dlRate', dlOtP.toFixed(2) + '%');
    setText('fl-ilTotal',  fmtN(ilr + ilot) + ' hrs'); setText('fl-ilReg', fmtN(ilr)); setText('fl-ilOT', fmtN(ilot)); setText('fl-ilRate', ilOtP.toFixed(2) + '%');
    setText('fl-otRate',   otr.toFixed(2) + '%'); setText('fl-dlOTp', dlOtP.toFixed(2) + '%'); setText('fl-ilOTp', ilOtP.toFixed(2) + '%');
    setHTML('fl-tbl', ltbl); setText('fl-total', 'Total: ' + fmtN(th));

    // Card status borders
    setCardStatus('card-fin-prod',  pp,  { good: 95,  warn: 80,  higherIsBetter: true  });
    setCardStatus('card-fin-op',    op,  { good: 100, warn: 115, higherIsBetter: false });
    setCardStatus('card-fin-cap',   cp,  { good: 100, warn: 115, higherIsBetter: false });
    setCardStatus('card-fin-other', op2, { good: 100, warn: 115, higherIsBetter: false });
}

// ── Input panel ───────────────────────────────────────────────
function finLoadInput() {
    const cat = document.getElementById('fin-inputCat').value;
    const d   = finData();
    const fieldMap = {
        production:  [['Volume Produced (MT)', 'prod',       'actual', 'MT'],  ['Volume Target (MT)', 'prod',       'target', 'MT']],
        operational: [['Actual (₱)',            'op',         'actual', '₱'],   ['Budget (₱)',          'op',         'budget', '₱']],
        capital:     [['Actual (₱)',            'cap',        'actual', '₱'],   ['Budget (₱)',          'cap',        'budget', '₱']],
        other:       [['Actual (₱)',            'other',      'actual', '₱'],   ['Budget (₱)',          'other',      'budget', '₱']],
        'labor-dl':  [['Regular Hours',         'labor.dl',   'reg',    'hrs'], ['Overtime Hours',      'labor.dl',   'ot',     'hrs']],
        'labor-il':  [['Regular Hours',         'labor.il',   'reg',    'hrs'], ['Overtime Hours',      'labor.il',   'ot',     'hrs']]
    };
    const titleMap = {
        production: 'PRODUCTION VOLUME', operational: 'OPERATIONAL COST',
        capital: 'CAPITAL EXPENDITURE',  other: 'OTHER EXPENSES',
        'labor-dl': 'DIRECT LABOR',      'labor-il': 'INDIRECT LABOR'
    };
    const fields = fieldMap[cat] || [];
    UIC.renderInputGrid('fin-inputSections', titleMap[cat], fields, d, 'fin_i');
}

function finSave() {
    const cat = document.getElementById('fin-inputCat').value;
    const d   = finData();
    const fieldMap = {
        production:  [['Volume Produced (MT)', 'prod',       'actual', 'MT'],  ['Volume Target (MT)', 'prod',       'target', 'MT']],
        operational: [['Actual (₱)',            'op',         'actual', '₱'],   ['Budget (₱)',          'op',         'budget', '₱']],
        capital:     [['Actual (₱)',            'cap',        'actual', '₱'],   ['Budget (₱)',          'cap',        'budget', '₱']],
        other:       [['Actual (₱)',            'other',      'actual', '₱'],   ['Budget (₱)',          'other',      'budget', '₱']],
        'labor-dl':  [['Regular Hours',         'labor.dl',   'reg',    'hrs'], ['Overtime Hours',      'labor.dl',   'ot',     'hrs']],
        'labor-il':  [['Regular Hours',         'labor.il',   'reg',    'hrs'], ['Overtime Hours',      'labor.il',   'ot',     'hrs']]
    };
    
    if (fieldMap[cat]) {
        UIC.extractInputGrid(fieldMap[cat], d, 'fin_i');
    }
    
    showToast(); finCalc();
}

async function finClear() {
    if (!await appConfirm('Clear Current Input', 'Clear the current input fields? Saved data is not changed.', 'Clear', false)) return;
    document.querySelectorAll('#fin-inputSections input').forEach(e => e.value = '');
    finSave();
}
async function finClearAll() {
    if (!await appConfirm('Clear ALL Finance Data', 'This will erase Finance data for every period. This cannot be undone.', 'Clear All', true)) return;
    if (!confirm('Clear all finance data for this month?')) return;
    const d = finData();
    d.prod  = { actual: '', target: '' };
    d.op    = { actual: '', budget: '' };
    d.cap   = { actual: '', budget: '' };
    d.other = { actual: '', budget: '' };
    d.labor = { dl: { reg: '', ot: '' }, il: { reg: '', ot: '' } };
    finLoadInput(); finCalc();
}
