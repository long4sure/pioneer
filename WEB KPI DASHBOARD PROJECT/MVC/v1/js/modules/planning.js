/* ============================================================
   js/modules/planning.js — SC Planning Module
   ============================================================ */

// ── Model ────────────────────────────────────────────────────
const plFields = [
    'fgA','fgB','fgC','fgAllIn','rmA','rmB','rmC','pmCore','pmM7','pmOthers',
    'fgKgsFG','fgKgsFN','fgKgsSL','fgKgsNM','fgKgsEX','fgKgsDays',
    'fgPhpFG','fgPhpFN','fgPhpSL','fgPhpNM','fgPhpEX',
    'rmKgsFG','rmKgsFN','rmKgsSL','rmKgsNM','rmKgsEX','rmKgsDays',
    'rmPhpFG','rmPhpFN','rmPhpSL','rmPhpNM','rmPhpEX',
    'fgCnt','fgMiss','rmCnt','rmMiss',
    'fcGma','fcNorth','fcSouth','fcVis','fcMind','fcMT','fcPsbsi',
    'fcIndo','fcIndia','fcDirect',
    'pEpoxy','pElasto','pMighty','pProEpoxy','pBuilders','pCoating','pTransport','pOther',
    'pSealant','pWaterproof','pPainting','pAdhesives','pMining','pOthers'
];

const plDB = {};
YEARS.forEach(y => {
    plDB[y] = {};
    MONTHS.forEach(m => { plDB[y][m] = Object.fromEntries(plFields.map(k => [k, ''])); });
});

function plGetDB() {
    const { year: y, month: m } = getGlobalPeriod();
    return plDB[y][m];
}
function plLoadInputs() {
    const d = plGetDB();
    plFields.forEach(k => { const el = document.getElementById('pl-i-' + k); if (el) el.value = d[k] || ''; });
    if (document.getElementById('pl-catSections')?.innerHTML) plLoadCat();
}

// ── Category dropdown definitions ────────────────────────────
const plCatDefs = {
    safety:    { title: 'Safety Stocks (Days)',                   fields: [['FG Class A','fgA','Days'],['FG Class B','fgB','Days'],['FG Class C','fgC','Days'],['FG All In','fgAllIn','Days'],['RM Class A','rmA','Days'],['RM Class B','rmB','Days'],['RM Class C','rmC','Days'],['PM Core','pmCore','Days'],['PM M7','pmM7','Days'],['PM Others','pmOthers','Days']] },
    fgKgs:     { title: 'FG Inventory — Weight (KGS)',            fields: [['Fast Moving Good A&B','fgKgsFG','kgs'],['Fast Moving NTE A&B','fgKgsFN','kgs'],['Slow/NTE Class C','fgKgsSL','kgs'],['No Movement Class C','fgKgsNM','kgs'],['Expired Stocks','fgKgsEX','kgs'],['Inventory Days','fgKgsDays','days']] },
    fgPhp:     { title: 'FG Inventory — Value (PHP)',             fields: [['Fast Moving Good A&B','fgPhpFG','₱'],['Fast Moving NTE A&B','fgPhpFN','₱'],['Slow/NTE Class C','fgPhpSL','₱'],['No Movement Class C','fgPhpNM','₱'],['Expired Stocks','fgPhpEX','₱']] },
    rmKgs:     { title: 'RM/PM Inventory — Weight (KGS)',         fields: [['Fast Moving Good A&B','rmKgsFG','kgs'],['Fast Moving NTE A&B','rmKgsFN','kgs'],['Slow/NTE Class C','rmKgsSL','kgs'],['No Movement Class C','rmKgsNM','kgs'],['Expired Stocks','rmKgsEX','kgs'],['Inventory Days','rmKgsDays','days']] },
    rmPhp:     { title: 'RM/PM Inventory — Value (PHP)',          fields: [['Fast Moving Good A&B','rmPhpFG','₱'],['Fast Moving NTE A&B','rmPhpFN','₱'],['Slow/NTE Class C','rmPhpSL','₱'],['No Movement Class C','rmPhpNM','₱'],['Expired Stocks','rmPhpEX','₱']] },
    accuracy:  { title: 'Inventory Accuracy',                     fields: [['FG Total Count','fgCnt','count'],['FG Missed','fgMiss','count'],['RM/PM Total Count','rmCnt','count'],['RM/PM Missed','rmMiss','count']] },
    fcLocal:   { title: 'Forecast Accuracy — Local Philippines (%)', fields: [['GMA','fcGma','%'],['North Luzon','fcNorth','%'],['South Luzon','fcSouth','%'],['Visayas','fcVis','%'],['Mindanao','fcMind','%'],['Modern Trade','fcMT','%'],['PSBSI','fcPsbsi','%']] },
    fcExport:  { title: 'Forecast Accuracy — Export (%)',         fields: [['Indonesia','fcIndo','%'],['India','fcIndia','%'],['Direct Export','fcDirect','%']] },
    fcProduct: { title: 'Forecast Accuracy — By Product (%)',     fields: [['Epoxy (Marine + Construction)','pEpoxy','%'],['Elastoseal','pElasto','%'],['Mighty Bond','pMighty','%'],['Pro-Epoxy','pProEpoxy','%'],['Builders Bond','pBuilders','%'],['Coating Marine','pCoating','%'],['Transportation','pTransport','%'],['Other Consumer','pOther','%'],['Pro-Sealant','pSealant','%'],['Pro-Waterproofing','pWaterproof','%'],['Pro-Painting','pPainting','%'],['Pro-Adhesives','pAdhesives','%'],['Mining','pMining','%'],['Others','pOthers','%']] }
};

function plLoadCat() {
    const cat = document.getElementById('pl-inputCat')?.value;
    if (!cat || !plCatDefs[cat]) return;
    const def = plCatDefs[cat];
    let html = `<div class="input-section" style="grid-column:1/-1"><div class="input-section-title">${def.title}</div><div class="input-fields-grid">`;
    def.fields.forEach(([lbl, key, ph]) => {
        const val = document.getElementById('pl-i-' + key)?.value || '';
        html += `<div class="input-field-wrap"><label class="input-field-label">${lbl}</label><input class="input-field" type="number" inputmode="decimal" id="plc-${key}" value="${val}" placeholder="${ph}"></div>`;
    });
    html += `</div></div>`;
    document.getElementById('pl-catSections').innerHTML = html;
}

function plSaveCat() {
    const cat = document.getElementById('pl-inputCat')?.value;
    if (!cat || !plCatDefs[cat]) return;
    plCatDefs[cat].fields.forEach(([, key]) => {
        const visible = document.getElementById('plc-' + key);
        const hidden  = document.getElementById('pl-i-' + key);
        if (visible && hidden) hidden.value = visible.value;
    });
    showToast('SC Planning data saved!');
    plRender();
}

function plClearCat() {
    const cat = document.getElementById('pl-inputCat')?.value;
    if (!cat || !plCatDefs[cat]) return;
    plCatDefs[cat].fields.forEach(([, key]) => {
        const visible = document.getElementById('plc-' + key);
        const hidden  = document.getElementById('pl-i-' + key);
        if (visible) visible.value = '';
        if (hidden)  hidden.value  = '';
    });
    plRender();
}

function plSave() {
    const d = plGetDB();
    plFields.forEach(k => { const el = document.getElementById('pl-i-' + k); if (el) d[k] = el.value; });
    showToast('SC Planning data saved!');
    plRender();
}
function plClear() {
    plFields.forEach(k => { const el = document.getElementById('pl-i-' + k); if (el) el.value = ''; });
}
function plClearAll() {
    if (!confirm('Clear all SC Planning data for this month?')) return;
    const d = plGetDB();
    plFields.forEach(k => d[k] = '');
    plLoadInputs(); plLoadCat(); plRender();
}
function plUpdate() { plRender(); }

// ── Render ────────────────────────────────────────────────────
function plRender() {
    const g = k => { const el = document.getElementById('pl-i-' + k); return el ? parseFloat(el.value) || 0 : 0; };

    // Safety stocks
    const fgA = g('fgA'), fgB = g('fgB'), fgC = g('fgC'), fgAllIn = g('fgAllIn');
    const rmA = g('rmA'), rmB = g('rmB'), rmC = g('rmC');
    const pmCore = g('pmCore'), pmM7 = g('pmM7'), pmOthers = g('pmOthers');
    const fgTotal = fgA + fgB + fgC + fgAllIn, rmTotal = rmA + rmB + rmC, pmTotal = pmCore + pmM7 + pmOthers;
    setText('pl-fgA', fgA.toFixed(1)); setText('pl-fgB', fgB.toFixed(1)); setText('pl-fgC', fgC.toFixed(1)); setText('pl-fgAllIn', fgAllIn.toFixed(1)); setText('pl-fgGT', fgTotal.toFixed(1)); setText('pl-fgTotal', fgTotal.toFixed(1));
    setText('pl-rmA', rmA.toFixed(1)); setText('pl-rmB', rmB.toFixed(1)); setText('pl-rmC', rmC.toFixed(1)); setText('pl-rmGT', rmTotal.toFixed(1)); setText('pl-rmTotal', rmTotal.toFixed(1));
    setText('pl-pmCore', pmCore.toFixed(1)); setText('pl-pmM7', pmM7.toFixed(1)); setText('pl-pmOthers', pmOthers.toFixed(1)); setText('pl-pmGT', pmTotal.toFixed(1)); setText('pl-pmTotal', pmTotal.toFixed(1));

    // FG inventory KGS
    const fkFG = g('fgKgsFG'), fkFN = g('fgKgsFN'), fkSL = g('fgKgsSL'), fkNM = g('fgKgsNM'), fkEX = g('fgKgsEX'), fkDays = g('fgKgsDays');
    const fkTot = fkFG + fkFN + fkSL + fkNM + fkEX;
    setText('pl-fgKgsFG', fmtN(fkFG)); setText('pl-fgKgsFN', fmtN(fkFN)); setText('pl-fgKgsSL', fmtN(fkSL)); setText('pl-fgKgsNM', fmtN(fkNM)); setText('pl-fgKgsEX', fmtN(fkEX)); setText('pl-fgKgsTot', fmtN(fkTot)); setText('pl-fgKgsDays', fkDays.toFixed(1)); setText('pl-fgKgs', fmtN(fkTot));

    // FG inventory PHP
    const fpFG = g('fgPhpFG'), fpFN = g('fgPhpFN'), fpSL = g('fgPhpSL'), fpNM = g('fgPhpNM'), fpEX = g('fgPhpEX');
    const fpTot = fpFG + fpFN + fpSL + fpNM + fpEX;
    setText('pl-fgPhpFG', fmtC(fpFG)); setText('pl-fgPhpFN', fmtC(fpFN)); setText('pl-fgPhpSL', fmtC(fpSL)); setText('pl-fgPhpNM', fmtC(fpNM)); setText('pl-fgPhpEX', fmtC(fpEX)); setText('pl-fgPhpTot', fmtC(fpTot)); setText('pl-fgPhpDays', fkDays.toFixed(1)); setText('pl-fgPhp', fmtC(fpTot));

    // RM/PM KGS
    const rkFG = g('rmKgsFG'), rkFN = g('rmKgsFN'), rkSL = g('rmKgsSL'), rkNM = g('rmKgsNM'), rkEX = g('rmKgsEX'), rkDays = g('rmKgsDays');
    const rkTot = rkFG + rkFN + rkSL + rkNM + rkEX;
    setText('pl-rmKgsFG', fmtN(rkFG)); setText('pl-rmKgsFN', fmtN(rkFN)); setText('pl-rmKgsSL', fmtN(rkSL)); setText('pl-rmKgsNM', fmtN(rkNM)); setText('pl-rmKgsEX', fmtN(rkEX)); setText('pl-rmKgsTot', fmtN(rkTot)); setText('pl-rmKgsDays', rkDays.toFixed(1)); setText('pl-rmKgs', fmtN(rkTot));

    // RM/PM PHP
    const rpFG = g('rmPhpFG'), rpFN = g('rmPhpFN'), rpSL = g('rmPhpSL'), rpNM = g('rmPhpNM'), rpEX = g('rmPhpEX');
    const rpTot = rpFG + rpFN + rpSL + rpNM + rpEX;
    setText('pl-rmPhpFG', fmtC(rpFG)); setText('pl-rmPhpFN', fmtC(rpFN)); setText('pl-rmPhpSL', fmtC(rpSL)); setText('pl-rmPhpNM', fmtC(rpNM)); setText('pl-rmPhpEX', fmtC(rpEX)); setText('pl-rmPhpTot', fmtC(rpTot)); setText('pl-rmPhpDays', rkDays.toFixed(1)); setText('pl-rmPhp', fmtC(rpTot));

    // Accuracy
    const fgCnt = g('fgCnt'), fgMiss = g('fgMiss'), rmCnt = g('rmCnt'), rmMiss = g('rmMiss');
    const fgAcc = fgCnt > 0 ? (fgCnt - fgMiss) / fgCnt * 100 : 0, rmAcc = rmCnt > 0 ? (rmCnt - rmMiss) / rmCnt * 100 : 0;
    setText('pl-fgCnt', fmtN(fgCnt)); setText('pl-fgMiss', fmtN(fgMiss)); setText('pl-fgAccDet', fgAcc.toFixed(1) + '%'); setText('pl-fgAcc', fgAcc.toFixed(1) + '%');
    setText('pl-rmCnt', fmtN(rmCnt)); setText('pl-rmMiss', fmtN(rmMiss)); setText('pl-rmAccDet', rmAcc.toFixed(1) + '%'); setText('pl-rmAcc', rmAcc.toFixed(1) + '%');

    // Forecast — local
    const localIds = ['fcGma','fcNorth','fcSouth','fcVis','fcMind','fcMT','fcPsbsi'];
    const localVals = localIds.map(id => g(id));
    localIds.forEach((id, i) => setText('pl-' + id, fmtP(localVals[i])));
    const localAvg = localVals.reduce((a, b) => a + b, 0) / 7;
    setText('pl-fcLocalAvg', fmtP(localAvg)); setText('pl-fcLocal', fmtP(localAvg));

    // Forecast — export
    const expIds = ['fcIndo','fcIndia','fcDirect'];
    const expVals = expIds.map(id => g(id));
    expIds.forEach((id, i) => setText('pl-' + id, fmtP(expVals[i])));
    const expAvg = expVals.reduce((a, b) => a + b, 0) / 3;
    setText('pl-fcExportAvg', fmtP(expAvg)); setText('pl-fcExport', fmtP(expAvg));

    // Forecast — product
    const prodIds = ['pEpoxy','pElasto','pMighty','pProEpoxy','pBuilders','pCoating','pTransport','pOther','pSealant','pWaterproof','pPainting','pAdhesives','pMining','pOthers'];
    const prodVals = prodIds.map(id => g(id));
    const prodAvg = prodVals.reduce((a, b) => a + b, 0) / 14;
    setText('pl-fcProd', fmtP(prodAvg));
    prodIds.forEach((id, i) => setText('pl-' + id, fmtP(prodVals[i])));
    setText('pl-fcProdAvg', fmtP(prodAvg));
    setText('pl-fcOverall', fmtP((localAvg + expAvg) / 2));
}

// Live listeners for inline inputs
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#pl-inputSections input[type=number]').forEach(i => i.addEventListener('input', plRender));
});
