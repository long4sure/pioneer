/* ============================================================
   js/modules/warehouse.js — Warehouse & Logistics Module
   ============================================================ */

// ── Config ───────────────────────────────────────────────────
const whNonOtifIssues = [
    {c:'PL',i:'Material constraint'},{c:'PL',i:'Planning error'},{c:'PL',i:'Capacity Constraint'},{c:'PL',i:'Acumatica Inventory Issue'},
    {c:'FG',i:'Warehouse Constraint'},{c:'FG',i:'Truck unavailability'},{c:'FG',i:'Dispatch Issue'},{c:'FG',i:'Custom Issue'},{c:'FG',i:'Permits'},
    {c:'PR',i:'Machine downtime'},{c:'PR',i:'Production Under run'},{c:'PR',i:'Manpower constraint'},{c:'PR',i:'Production delay'},{c:'PR',i:'Acumatica Confirmation delay'},{c:'PR',i:'Subcon delay'},
    {c:'TE',i:'Developmental Issue'},{c:'TE',i:'Quality Issue'},
    {c:'SA',i:'Cancelled Order'},{c:'SA',i:'Demand Shift'},{c:'SA',i:'CS Issue'},
    {c:'FI',i:'Pricing Issue'}
];
const whSOIssues = [
    {c:'PL',i:'Material constraint'},{c:'PL',i:'Planning error'},{c:'PL',i:'Capacity Constraint'},{c:'PL',i:'Acumatica Inventory Issue'},
    {c:'FG',i:'Warehouse Constraint'},{c:'FG',i:'Truck unavailability'},{c:'FG',i:'Dispatch Issue'},{c:'FG',i:'Custom Issue'},{c:'FG',i:'Permits'},
    {c:'PR',i:'Machine downtime'},{c:'PR',i:'Production Under run'},{c:'PR',i:'Manpower constraint'},{c:'PR',i:'Production delay'},{c:'PR',i:'Acumatica Confirmation delay'},{c:'PR',i:'Subcon delay'},
    {c:'TE',i:'Developmental Issue'},{c:'TE',i:'Quality Issue'},
    {c:'SA',i:'Cancelled Order'},{c:'SA',i:'Demand Shift'},{c:'SA',i:'CS Issue'},{c:'SA',i:'Beyond forecast'},
    {c:'FI',i:'Pricing Issue'}
];
const catNames = { PL:'Planning', FG:'Finished Goods', PR:'Production', TE:'Technical', SA:'Sales', FI:'Finance' };

// ── Model ────────────────────────────────────────────────────
const whDB = {};
function whInitDB() {
    return {
        otif:    { served: '', total: '' },
        vol:     { del: '', ord: '' },
        fr:      { corp: { del:'', ord:'' }, sc: { del:'', ord:'' }, core: { del:'', ord:'' }, m7: { del:'', ord:'' } },
        nonOtif: Object.fromEntries(whNonOtifIssues.map((_, i) => ['no' + i, ''])),
        soVal:   Object.fromEntries(whSOIssues.map((_, i) => ['sv' + i, ''])),
        soWt:    Object.fromEntries(whSOIssues.map((_, i) => ['sw' + i, ''])),
        wh:      { rmTot:'', rmUsed:'', fgTot:'', fgUsed:'', extTot:'', extUsed:'' },
        otdl:    { gma:'', north:'', central:'', south:'', vis:'', mind:'', mt:'', pai:'' },
        trucks:  { t10:'', auv:'', t6:'', t4:'', c20:'' },
        mp:      { reg:'', agy:'', res:'', regH:'', agyH:'', otH:'', abs:'', days:'' }
    };
}
YEARS.forEach(y => { whDB[y] = {}; MONTHS.forEach(m => { whDB[y][m] = whInitDB(); }); });

function whGetDB() { const { year: y, month: m } = getGlobalPeriod(); return whDB[y][m]; }

// ── Helpers ───────────────────────────────────────────────────
function setBadge(id, cls, txt) { const el = document.getElementById(id); if (el) { el.className = 'badge ' + cls; el.textContent = txt; } }

// Fill Rate status: ≤95 = critical, 95.01-99 = good, ≥99.01 = excellent
function whFillStatus(r) {
    if (r > 99)    return ['badge-excellent', 'Excellent'];
    if (r >= 95.01) return ['badge-good',      'Good'];
    return               ['badge-critical',  'Critical'];
}

// ── Controller: Calc ─────────────────────────────────────────
function whCalc() {
    const d = whGetDB();

    // OTIF
    const sv = +d.otif.served || 0, tot = +d.otif.total || 0, or = tot > 0 ? sv / tot * 100 : 0;
    setText('wh-otif', or.toFixed(1) + '%'); setText('wh-otifServed', fmtN(sv)); setText('wh-otifTotal', fmtN(tot)); setW('wh-otifBar', or);
    // OTIF card status (same thresholds as fill)
    let ob = 'badge-neutral', ot = 'No Data';
    if (tot > 0) [ob, ot] = whFillStatus(or);
    setBadge('wh-otifStatus', ob, ot);

    // Volume Fill
    const vd = +d.vol.del || 0, vo = +d.vol.ord || 0, vr = vo > 0 ? vd / vo * 100 : 0;
    setText('wh-volFill', vr.toFixed(1) + '%'); setText('wh-volDel', fmtC(vd)); setText('wh-volOrd', fmtC(vo)); setW('wh-volBar', vr);
    let vb = 'badge-neutral', vt = 'No Data';
    if (vo > 0) [vb, vt] = whFillStatus(vr);
    setBadge('wh-volStatus', vb, vt);

    // WH Utilization
    const rm  = { tot: +d.wh.rmTot  || 0, used: +d.wh.rmUsed  || 0 };
    const fg  = { tot: +d.wh.fgTot  || 0, used: +d.wh.fgUsed  || 0 };
    const ex  = { tot: +d.wh.extTot || 0, used: +d.wh.extUsed || 0 };
    const wTot = rm.tot + fg.tot + ex.tot, wUsed = rm.used + fg.used + ex.used;
    const wu = wTot > 0 ? wUsed / wTot * 100 : 0;
    setText('wh-whUtil', wu.toFixed(1) + '%'); setText('wh-whUsed', fmtN(wUsed)); setText('wh-whTotal', fmtN(wTot)); setW('wh-whBar', wu);
    let wb = 'badge-neutral', wt = 'No Data';
    if (wTot > 0) { if (wu >= 100) { wb = 'badge-critical'; wt = 'At Capacity'; } else if (wu >= 90) { wb = 'badge-warning'; wt = 'Near Capacity'; } else if (wu >= 70) { wb = 'badge-excellent'; wt = 'Optimal'; } else if (wu >= 50) { wb = 'badge-good'; wt = 'Good'; } else { wb = 'badge-warning'; wt = 'Under-Utilized'; } }
    setBadge('wh-whStatus', wb, wt);

    // Fill Rates helper — SC Fill first, then Corporate, Core, M7 & Others
    const updateFR = (key, rId, dId, oId, stId) => {
        const fd = d.fr[key], fdv = +fd.del || 0, fo = +fd.ord || 0, fr = fo > 0 ? fdv / fo * 100 : 0;
        setText(rId, fr.toFixed(1) + '%'); setText(dId, fmtC(fdv)); setText(oId, fmtC(fo));
        let [bc, bt] = ['badge-neutral', 'No Data'];
        if (fo > 0) [bc, bt] = whFillStatus(fr);
        setBadge(stId, bc, bt);
        return { r: fr, del: fdv, ord: fo, bc, bt };
    };
    const sc    = updateFR('sc',    'wh-scRate',    'wh-scDel',    'wh-scOrd',    'wh-scStatus');
    const corp  = updateFR('corp',  'wh-corpRate',  'wh-corpDel',  'wh-corpOrd',  'wh-corpStatus');
    const core  = updateFR('core',  'wh-coreRate',  'wh-coreDel',  'wh-coreOrd',  'wh-coreStatus');
    const m7    = updateFR('m7',    'wh-m7Rate',    'wh-m7Del',    'wh-m7Ord',    'wh-m7Status');
    // Fill-rate tab duplicates
    updateFR('sc',   'fr-sc',   'fr-scDel',   'fr-scOrd',   'fr-scSt');
    updateFR('corp', 'fr-corp', 'fr-corpDel', 'fr-corpOrd', 'fr-corpSt');
    updateFR('core', 'fr-core', 'fr-coreDel', 'fr-coreOrd', 'fr-coreSt');
    updateFR('m7',   'fr-m7',   'fr-m7Del',   'fr-m7Ord',   'fr-m7St');

    // Non-OTIF issues
    let nonTotal = 0; const catCnt = {}, issueCnt = {};
    const nonTbl = whNonOtifIssues.map((item, i) => {
        const v = +d.nonOtif['no' + i] || 0; nonTotal += v;
        if (v > 0) { catCnt[item.c] = (catCnt[item.c] || 0) + v; issueCnt[item.i] = issueCnt[item.i] || { cnt: 0 }; issueCnt[item.i].cnt += v; }
        return `<tr><td><span class="cat-badge">${item.c}</span>${catNames[item.c]}</td><td>${item.i}</td><td>${v}</td></tr>`;
    }).join('');
    setHTML('wh-nonOtifTbl', nonTbl); setText('wh-nonOtifTot', 'Total: ' + nonTotal); setText('wh-nonOtifTotal', nonTotal);
    let topCat = '—', topCnt = 0;
    for (let c in catCnt) { if (catCnt[c] > topCnt) { topCnt = catCnt[c]; topCat = catNames[c] + ' (' + topCnt + ')'; } }
    let topIssue = '—', topIssueCnt = 0;
    for (let i in issueCnt) { if (issueCnt[i].cnt > topIssueCnt) { topIssueCnt = issueCnt[i].cnt; topIssue = i + ' (' + topIssueCnt + ')'; } }
    setText('wh-nonOtifTop', topCat); setText('wh-nonOtifTopIssue', topIssue);

    // Stock Outs
    let soValTot = 0, soWtTot = 0;
    const soValTbl = whSOIssues.map((item, i) => { const v = +d.soVal['sv' + i] || 0; soValTot += v; return `<tr><td><span class="cat-badge">${item.c}</span>${catNames[item.c]}</td><td>${item.i}</td><td>${fmtC(v)}</td></tr>`; }).join('');
    const soWtTbl  = whSOIssues.map((item, i) => { const w = +d.soWt['sw'  + i] || 0; soWtTot += w;  return `<tr><td><span class="cat-badge">${item.c}</span>${catNames[item.c]}</td><td>${item.i}</td><td>${fmtN(w)} KGS</td></tr>`; }).join('');
    setHTML('wh-soValTbl', soValTbl); setHTML('wh-soWtTbl', soWtTbl);
    setText('wh-soValTot', '₱' + fmtN(soValTot)); setText('wh-soWtTot', fmtN(soWtTot) + ' KGS');
    setText('wh-stockVal', fmtC(soValTot)); setText('wh-stockWt', fmtN(soWtTot) + ' KGS');

    // WH details
    const rmUtil = rm.tot > 0 ? rm.used / rm.tot * 100 : 0;
    const fgUtil = fg.tot > 0 ? fg.used / fg.tot * 100 : 0;
    const extUtil = ex.tot > 0 ? ex.used / ex.tot * 100 : 0;
    setText('wh-rmTot', fmtN(rm.tot)); setText('wh-rmUsed', fmtN(rm.used)); setText('wh-rmUtil', rmUtil.toFixed(1) + '%');
    setText('wh-fgTot', fmtN(fg.tot)); setText('wh-fgUsed', fmtN(fg.used)); setText('wh-fgUtil', fgUtil.toFixed(1) + '%');
    setText('wh-extTot', fmtN(ex.tot)); setText('wh-extUsed', fmtN(ex.used)); setText('wh-extUtil', extUtil.toFixed(1) + '%');

    // OTDL
    const otdlKeys  = ['gma','north','central','south','vis','mind','mt','pai'];
    let otdlTot = 0, otdlCnt = 0;
    otdlKeys.forEach(k => { const v = +d.otdl[k] || 0; if (v > 0) { otdlTot += v; otdlCnt++; } });
    const otdlAvg = otdlCnt > 0 ? otdlTot / otdlCnt : 0;
    setText('wh-otdlAvg', otdlAvg.toFixed(1) + ' days'); setText('wh-otdlReg', otdlCnt);

    // Trucks
    const truckVals = [+d.trucks.t10||0,+d.trucks.auv||0,+d.trucks.t6||0,+d.trucks.t4||0,+d.trucks.c20||0];
    const truckTot  = truckVals.reduce((a, b) => a + b, 0), truckTypes = truckVals.filter(v => v > 0).length;
    setText('wh-truckVol', fmtN(truckTot) + ' cbm'); setText('wh-truckTypes', truckTypes);

    // Manpower
    const reg = +d.mp.reg||0, agy = +d.mp.agy||0, res = +d.mp.res||0;
    const regH = +d.mp.regH||0, agyH = +d.mp.agyH||0, otH = +d.mp.otH||0, abs = +d.mp.abs||0, days = +d.mp.days||0;
    const totHC = reg + agy, avgHC = totHC > 0 ? (totHC + (totHC - res)) / 2 : totHC;
    const attr = avgHC > 0 ? res / avgHC * 100 : 0;
    const totMH = regH + agyH, otR = totMH > 0 ? otH / totMH * 100 : 0, absR = days > 0 ? abs / days * 100 : 0;
    ['hcTotal','hcReg','hcAgy','hcAttr','mhTotal','mhReg','mhAgy','mhOT','absRate','absCnt','absReq'].forEach((id, i) => {
        const vals = [fmtN(totHC,0),fmtN(reg,0),fmtN(agy,0),attr.toFixed(1)+'%',fmtN(totMH,0),fmtN(regH,0),fmtN(agyH,0),otR.toFixed(1)+'%',absR.toFixed(1)+'%',fmtN(abs,0),days.toFixed(2)];
        setText('wh-' + id, vals[i]);
    });
    setText('wh-mp-reg',  fmtN(reg, 0)); setText('wh-mp-agy',  fmtN(agy, 0)); setText('wh-mp-res', fmtN(res, 0)); setText('wh-mp-attr', attr.toFixed(2) + '%');
    setText('wh-mp-regH', fmtN(regH) + ' hrs'); setText('wh-mp-agyH', fmtN(agyH) + ' hrs'); setText('wh-mp-otH', fmtN(otH) + ' hrs'); setText('wh-mp-otR', otR.toFixed(1) + '%');
    setText('wh-mp-absC', fmtN(abs, 0)); setText('wh-mp-absD', days.toFixed(2)); setText('wh-mp-absR', absR.toFixed(2) + '%');

    // Card status borders — unified fill thresholds (>99 excellent, 95.01-99 good, ≤95 critical)
    setCardStatus('card-wh-otif',  or,     { good: 99.01, warn: 95, higherIsBetter: true });
    setCardStatus('card-wh-vol',   vr,     { good: 99.01, warn: 95, higherIsBetter: true });
    setCardStatus('card-wh-util',  wu,     { good: 75,    warn: 60, higherIsBetter: true });
    setCardStatus('card-wh-sc',    sc.r,   { good: 99.01, warn: 95, higherIsBetter: true });
    setCardStatus('card-wh-corp',  corp.r, { good: 99.01, warn: 95, higherIsBetter: true });
    setCardStatus('card-wh-core',  core.r, { good: 99.01, warn: 95, higherIsBetter: true });
    setCardStatus('card-wh-m7',    m7.r,   { good: 99.01, warn: 95, higherIsBetter: true });
}

// ── Input panel ───────────────────────────────────────────────
function whLoadInput() {
    const cat = document.getElementById('wh-inputCat').value;
    const d   = whGetDB();
    let h = '';

    if (cat === 'otif') {
        h = `<div class="input-section" style="grid-column:1/-1"><div class="input-section-title">OTIF Rate</div><div class="input-fields-grid">
            <div class="input-field-wrap"><label class="input-field-label">Served per Line Item</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_otif_served" value="${d.otif.served}" placeholder="Count"></div>
            <div class="input-field-wrap"><label class="input-field-label">Total Line Items</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_otif_total" value="${d.otif.total}" placeholder="Count"></div>
        </div></div>`;
    } else if (cat === 'volume') {
        h = `<div class="input-section" style="grid-column:1/-1"><div class="input-section-title">Volume Fill Rate</div><div class="input-fields-grid">
            <div class="input-field-wrap"><label class="input-field-label">Delivered (₱)</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_vol_del" value="${d.vol.del}" placeholder="₱"></div>
            <div class="input-field-wrap"><label class="input-field-label">Orders (₱)</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_vol_ord" value="${d.vol.ord}" placeholder="₱"></div>
        </div></div>`;
    } else if (cat === 'fillrates') {
        const keys  = ['sc','corp','core','m7'];
        const names = ['SC Fill','Corporate','Core Products','M7 & Others'];
        h = keys.map((k, i) => `<div class="input-section"><div class="input-section-title">${names[i]}</div><div class="input-fields-grid">
            <div class="input-field-wrap"><label class="input-field-label">Delivered (₱)</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_fr_${k}_del" value="${d.fr[k].del}" placeholder="₱"></div>
            <div class="input-field-wrap"><label class="input-field-label">Orders (₱)</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_fr_${k}_ord" value="${d.fr[k].ord}" placeholder="₱"></div>
        </div></div>`).join('');
    } else if (cat === 'nonotif') {
        h = `<div class="input-section" style="grid-column:1/-1"><div class="input-section-title">Non-OTIF Issues (Count)</div><div class="input-fields-grid-4">` +
            whNonOtifIssues.map((it, i) => `<div class="input-field-wrap"><label class="input-field-label">${it.c} - ${it.i}</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_no_${i}" value="${d.nonOtif['no' + i] || ''}" placeholder="Count"></div>`).join('') + `</div></div>`;
    } else if (cat === 'stockouts') {
        h = `<div class="input-section" style="grid-column:1/-1"><div class="input-section-title">Stock Outs — Value (₱)</div><div class="input-fields-grid-4">` +
            whSOIssues.map((it, i) => `<div class="input-field-wrap"><label class="input-field-label">${it.c} - ${it.i}</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_sv_${i}" value="${d.soVal['sv' + i] || ''}" placeholder="₱"></div>`).join('') +
            `</div></div><div class="input-section" style="grid-column:1/-1"><div class="input-section-title">Stock Outs — Weight (KGS)</div><div class="input-fields-grid-4">` +
            whSOIssues.map((it, i) => `<div class="input-field-wrap"><label class="input-field-label">${it.c} - ${it.i}</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_sw_${i}" value="${d.soWt['sw' + i] || ''}" placeholder="KGS"></div>`).join('') + `</div></div>`;
    } else if (cat === 'warehouse') {
        h = ['RM/PM Warehouse','FG Warehouse','External Warehouse'].map((title, idx) => {
            const prefixes = [['rm','rm'],['fg','fg'],['ext','ext']];
            const [pk, sk] = prefixes[idx];
            return `<div class="input-section"><div class="input-section-title">${title}</div><div class="input-fields-grid">
                <div class="input-field-wrap"><label class="input-field-label">Pallet Positions</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_${pk}_tot"  value="${d.wh[sk + 'Tot']  || ''}"></div>
                <div class="input-field-wrap"><label class="input-field-label">Pallet Used</label>     <input class="input-field" type="number" inputmode="decimal" id="wh_i_${pk}_used" value="${d.wh[sk + 'Used'] || ''}"></div>
            </div></div>`;
        }).join('');
    } else if (cat === 'otdl') {
        h = `<div class="input-section" style="grid-column:1/-1"><div class="input-section-title">OTDL Days</div><div class="input-fields-grid-4">` +
            [['gma','GMA'],['north','North Luzon'],['central','Central Luzon'],['south','South Luzon'],['vis','Visayas'],['mind','Mindanao'],['mt','Modern Trade'],['pai','PAI OTDL']]
            .map(([k, l]) => `<div class="input-field-wrap"><label class="input-field-label">${l}</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_otdl_${k}" value="${d.otdl[k] || ''}"></div>`).join('') + `</div></div>`;
    } else if (cat === 'trucks') {
        h = `<div class="input-section" style="grid-column:1/-1"><div class="input-section-title">Truck Utilization (CBM)</div><div class="input-fields-grid">` +
            [['t10','10-wheeler'],['auv','AUV'],['t6','6-wheeler'],['t4','4-wheeler'],['c20','20-ft container']]
            .map(([k, l]) => `<div class="input-field-wrap"><label class="input-field-label">${l}</label><input class="input-field" type="number" inputmode="decimal" id="wh_i_tr_${k}" value="${d.trucks[k] || ''}"></div>`).join('') + `</div></div>`;
    } else if (cat === 'manpower') {
        h = `<div class="input-section"><div class="input-section-title">Headcount</div><div class="input-fields-grid">
            <div class="input-field-wrap"><label class="input-field-label">Regular</label>  <input class="input-field" type="number" inputmode="decimal" id="wh_i_mp_reg" value="${d.mp.reg}"></div>
            <div class="input-field-wrap"><label class="input-field-label">Agency</label>   <input class="input-field" type="number" inputmode="decimal" id="wh_i_mp_agy" value="${d.mp.agy}"></div>
            <div class="input-field-wrap"><label class="input-field-label">Resigned</label> <input class="input-field" type="number" inputmode="decimal" id="wh_i_mp_res" value="${d.mp.res}"></div>
        </div></div>
        <div class="input-section"><div class="input-section-title">Manhours</div><div class="input-fields-grid">
            <div class="input-field-wrap"><label class="input-field-label">Regular Hours</label>  <input class="input-field" type="number" inputmode="decimal" id="wh_i_mp_regH" value="${d.mp.regH}"></div>
            <div class="input-field-wrap"><label class="input-field-label">Agency Hours</label>   <input class="input-field" type="number" inputmode="decimal" id="wh_i_mp_agyH" value="${d.mp.agyH}"></div>
            <div class="input-field-wrap"><label class="input-field-label">Overtime Hours</label> <input class="input-field" type="number" inputmode="decimal" id="wh_i_mp_otH"  value="${d.mp.otH}"></div>
        </div></div>
        <div class="input-section"><div class="input-section-title">Absences</div><div class="input-fields-grid">
            <div class="input-field-wrap"><label class="input-field-label">Absences Count</label> <input class="input-field" type="number" inputmode="decimal" id="wh_i_mp_abs"  value="${d.mp.abs}"></div>
            <div class="input-field-wrap"><label class="input-field-label">Required Days</label>  <input class="input-field" type="number" inputmode="decimal" id="wh_i_mp_days" value="${d.mp.days}"></div>
        </div></div>`;
    }

    document.getElementById('wh-inputSections').innerHTML = h;
}

function whSave() {
    const cat = document.getElementById('wh-inputCat').value;
    const d   = whGetDB();
    const g   = id => document.getElementById(id)?.value || '';

    if      (cat === 'otif')       { d.otif.served = g('wh_i_otif_served'); d.otif.total = g('wh_i_otif_total'); }
    else if (cat === 'volume')     { d.vol.del = g('wh_i_vol_del'); d.vol.ord = g('wh_i_vol_ord'); }
    else if (cat === 'fillrates')  { ['sc','corp','core','m7'].forEach(k => { d.fr[k].del = g('wh_i_fr_' + k + '_del'); d.fr[k].ord = g('wh_i_fr_' + k + '_ord'); }); }
    else if (cat === 'nonotif')    { whNonOtifIssues.forEach((_, i) => d.nonOtif['no' + i] = g('wh_i_no_' + i)); }
    else if (cat === 'stockouts')  { whSOIssues.forEach((_, i) => { d.soVal['sv' + i] = g('wh_i_sv_' + i); d.soWt['sw' + i] = g('wh_i_sw_' + i); }); }
    else if (cat === 'warehouse')  { d.wh.rmTot = g('wh_i_rm_tot'); d.wh.rmUsed = g('wh_i_rm_used'); d.wh.fgTot = g('wh_i_fg_tot'); d.wh.fgUsed = g('wh_i_fg_used'); d.wh.extTot = g('wh_i_ext_tot'); d.wh.extUsed = g('wh_i_ext_used'); }
    else if (cat === 'otdl')       { ['gma','north','central','south','vis','mind','mt','pai'].forEach(k => d.otdl[k] = g('wh_i_otdl_' + k)); }
    else if (cat === 'trucks')     { ['t10','auv','t6','t4','c20'].forEach(k => d.trucks[k] = g('wh_i_tr_' + k)); }
    else if (cat === 'manpower')   { ['reg','agy','res','regH','agyH','otH','abs','days'].forEach(k => d.mp[k] = g('wh_i_mp_' + k)); }

    showToast(); whCalc();
}

function whClearCat() { document.querySelectorAll('#wh-inputSections input').forEach(e => e.value = ''); whSave(); }
function whClearAll() {
    if (!confirm('Clear all warehouse data for this month?')) return;
    const { year: y, month: m } = getGlobalPeriod();
    whDB[y][m] = whInitDB();
    whLoadInput(); whCalc();
}
