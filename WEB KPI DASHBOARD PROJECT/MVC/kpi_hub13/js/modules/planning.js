/* ============================================================
   js/modules/planning.js — SC Planning Module
   ============================================================ */

// ── Model ────────────────────────────────────────────────────
const plFields = [
    'fgA','fgB','fgC','fgAllIn','rmA','rmB','rmC','pmCore','pmM7','pmOthers',
    'fgKgsFG','fgKgsFN','fgKgsSL','fgKgsEX','fgKgsDays',
    'fgPhpFG','fgPhpFN','fgPhpSL','fgPhpEX',
    'rmKgsFG','rmKgsFN','rmKgsSL','rmKgsEX','rmKgsDays',
    'rmPhpFG','rmPhpFN','rmPhpSL','rmPhpEX',
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
    safety:    { title: 'Safety Stocks (Days)',                   fields: [['FG Core','fgA','Days'],['FG M7','fgB','Days'],['FG Others','fgC','Days'],['FG All In','fgAllIn','Days'],['RM Core','rmA','Days'],['RM M7','rmB','Days'],['RM Others','rmC','Days'],['PM Core','pmCore','Days'],['PM M7','pmM7','Days'],['PM Others','pmOthers','Days']] },
    fgKgs:     { title: 'FG Inventory — Weight (KGS)',            fields: [['Core','fgKgsFG','kgs'],['M7','fgKgsFN','kgs'],['Others','fgKgsSL','kgs'],['Expired Stocks','fgKgsEX','kgs'],['Inventory Days','fgKgsDays','days']] },
    fgPhp:     { title: 'FG Inventory — Value (PHP)',             fields: [['Core','fgPhpFG','₱'],['M7','fgPhpFN','₱'],['Others','fgPhpSL','₱'],['Expired Stocks','fgPhpEX','₱']] },
    rmKgs:     { title: 'RM/PM Inventory — Weight (KGS)',         fields: [['Core','rmKgsFG','kgs'],['M7','rmKgsFN','kgs'],['Others','rmKgsSL','kgs'],['Expired Stocks','rmKgsEX','kgs'],['Inventory Days','rmKgsDays','days']] },
    rmPhp:     { title: 'RM/PM Inventory — Value (PHP)',          fields: [['Core','rmPhpFG','₱'],['M7','rmPhpFN','₱'],['Others','rmPhpSL','₱'],['Expired Stocks','rmPhpEX','₱']] },
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
    const d = plGetDB();
    plCatDefs[cat].fields.forEach(([, key]) => {
        const visible = document.getElementById('plc-' + key);
        const hidden  = document.getElementById('pl-i-' + key);
        if (visible && hidden) {
            hidden.value = visible.value;
            d[key] = visible.value; // ← persist to DB
        }
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
async function plClear() {
    if (!await confirmDialog({title:"Clear Data",message:"Clear current SC Planning input values?",confirmLabel:"Clear"})) return;
    plFields.forEach(k => { const el = document.getElementById('pl-i-' + k); if (el) el.value = ''; });
}
async function plClearAll() {
    if (!await confirmDialog({title:"Clear All Planning Data",message:"Clear ALL SC Planning data for ALL periods? This cannot be undone.",confirmLabel:"Clear All",danger:true})) return;
    if (!confirm('Clear all SC Planning data for this month?')) return;
    const d = plGetDB();
    plFields.forEach(k => d[k] = '');
    plLoadInputs(); plLoadCat(); plRender();
}
function plUpdate() { plRender(); }

// ── Render ────────────────────────────────────────────────────
function plRender() {
    const g  = k => { const el = document.getElementById('pl-i-' + k); return el && el.value !== '' ? parseFloat(el.value) || 0 : null; };
    const gv = k => { const v = g(k); return v !== null ? v : 0; }; // 0 fallback for sums
    const fmt0 = v => v !== null ? v.toFixed(1) : '—';
    const fmtPct = vals => {
        const filled = vals.filter(v => v !== null);
        if (!filled.length) return '—';
        return (filled.reduce((a, b) => a + b, 0) / filled.length).toFixed(2) + '%';
    };

    // Safety stocks
    const fgA = g('fgA'), fgB = g('fgB'), fgC = g('fgC'), fgAllIn = g('fgAllIn');
    const rmA = g('rmA'), rmB = g('rmB'), rmC = g('rmC');
    const pmCore = g('pmCore'), pmM7 = g('pmM7'), pmOthers = g('pmOthers');

    const fgVals = [fgA,fgB,fgC,fgAllIn].filter(v=>v!==null);
    const rmVals = [rmA,rmB,rmC].filter(v=>v!==null);
    const pmVals = [pmCore,pmM7,pmOthers].filter(v=>v!==null);

    setText('pl-fgA', fmt0(fgA)); setText('pl-fgB', fmt0(fgB)); setText('pl-fgC', fmt0(fgC)); setText('pl-fgAllIn', fmt0(fgAllIn));
    const fgTotal = fgVals.reduce((a,b)=>a+b,0);
    setText('pl-fgGT', fgVals.length ? fgTotal.toFixed(1) : '—'); setText('pl-fgTotal', fgVals.length ? fgTotal.toFixed(1) : '—');

    setText('pl-rmA', fmt0(rmA)); setText('pl-rmB', fmt0(rmB)); setText('pl-rmC', fmt0(rmC));
    const rmTotal = rmVals.reduce((a,b)=>a+b,0);
    setText('pl-rmGT', rmVals.length ? rmTotal.toFixed(1) : '—'); setText('pl-rmTotal', rmVals.length ? rmTotal.toFixed(1) : '—');

    setText('pl-pmCore', fmt0(pmCore)); setText('pl-pmM7', fmt0(pmM7)); setText('pl-pmOthers', fmt0(pmOthers));
    const pmTotal = pmVals.reduce((a,b)=>a+b,0);
    setText('pl-pmGT', pmVals.length ? pmTotal.toFixed(1) : '—'); setText('pl-pmTotal', pmVals.length ? pmTotal.toFixed(1) : '—');

    // FG inventory KGS
    const fkFG=gv('fgKgsFG'),fkFN=gv('fgKgsFN'),fkSL=gv('fgKgsSL'),fkEX=gv('fgKgsEX'),fkDays=g('fgKgsDays');
    const fkTot=fkFG+fkFN+fkSL+fkEX;
    const hasKgs = [g('fgKgsFG'),g('fgKgsFN'),g('fgKgsSL'),g('fgKgsEX')].some(v=>v!==null);
    setText('pl-fgKgsFG',fmtN(fkFG));setText('pl-fgKgsFN',fmtN(fkFN));setText('pl-fgKgsSL',fmtN(fkSL));setText('pl-fgKgsEX',fmtN(fkEX));
    setText('pl-fgKgsTot', hasKgs ? fmtN(fkTot) : '—'); setText('pl-fgKgsDays', fkDays !== null ? fkDays.toFixed(1) : '—'); setText('pl-fgKgs', hasKgs ? fmtN(fkTot) : '—');

    // FG inventory PHP
    const fpFG=gv('fgPhpFG'),fpFN=gv('fgPhpFN'),fpSL=gv('fgPhpSL'),fpEX=gv('fgPhpEX');
    const fpTot=fpFG+fpFN+fpSL+fpEX;
    const hasPhp = [g('fgPhpFG'),g('fgPhpFN'),g('fgPhpSL'),g('fgPhpEX')].some(v=>v!==null);
    setText('pl-fgPhpFG',fmtC(fpFG));setText('pl-fgPhpFN',fmtC(fpFN));setText('pl-fgPhpSL',fmtC(fpSL));setText('pl-fgPhpEX',fmtC(fpEX));
    setText('pl-fgPhpTot', hasPhp ? fmtC(fpTot) : '—'); setText('pl-fgPhpDays', fkDays !== null ? fkDays.toFixed(1) : '—'); setText('pl-fgPhp', hasPhp ? fmtC(fpTot) : '—');

    // RM/PM KGS
    const rkFG=gv('rmKgsFG'),rkFN=gv('rmKgsFN'),rkSL=gv('rmKgsSL'),rkEX=gv('rmKgsEX'),rkDays=g('rmKgsDays');
    const rkTot=rkFG+rkFN+rkSL+rkEX;
    const hasRkgs = [g('rmKgsFG'),g('rmKgsFN'),g('rmKgsSL'),g('rmKgsEX')].some(v=>v!==null);
    setText('pl-rmKgsFG',fmtN(rkFG));setText('pl-rmKgsFN',fmtN(rkFN));setText('pl-rmKgsSL',fmtN(rkSL));setText('pl-rmKgsEX',fmtN(rkEX));
    setText('pl-rmKgsTot', hasRkgs ? fmtN(rkTot) : '—'); setText('pl-rmKgsDays', rkDays !== null ? rkDays.toFixed(1) : '—'); setText('pl-rmKgs', hasRkgs ? fmtN(rkTot) : '—');

    // RM/PM PHP
    const rpFG=gv('rmPhpFG'),rpFN=gv('rmPhpFN'),rpSL=gv('rmPhpSL'),rpEX=gv('rmPhpEX');
    const rpTot=rpFG+rpFN+rpSL+rpEX;
    const hasRphp = [g('rmPhpFG'),g('rmPhpFN'),g('rmPhpSL'),g('rmPhpEX')].some(v=>v!==null);
    setText('pl-rmPhpFG',fmtC(rpFG));setText('pl-rmPhpFN',fmtC(rpFN));setText('pl-rmPhpSL',fmtC(rpSL));setText('pl-rmPhpEX',fmtC(rpEX));
    setText('pl-rmPhpTot', hasRphp ? fmtC(rpTot) : '—'); setText('pl-rmPhpDays', rkDays !== null ? rkDays.toFixed(1) : '—'); setText('pl-rmPhp', hasRphp ? fmtC(rpTot) : '—');

    // Accuracy
    const fgCnt=g('fgCnt'), fgMiss=g('fgMiss'), rmCnt=g('rmCnt'), rmMiss=g('rmMiss');
    const fgAcc = (fgCnt !== null && fgCnt > 0) ? (fgCnt - (fgMiss||0)) / fgCnt * 100 : null;
    const rmAcc = (rmCnt !== null && rmCnt > 0) ? (rmCnt - (rmMiss||0)) / rmCnt * 100 : null;
    setText('pl-fgCnt',   fgCnt  !== null ? fmtN(fgCnt)  : '—');
    setText('pl-fgMiss',  fgMiss !== null ? fmtN(fgMiss) : '—');
    setText('pl-fgAccDet', fgAcc !== null ? fgAcc.toFixed(2) + '%' : '—');
    setText('pl-fgAcc',    fgAcc !== null ? fgAcc.toFixed(2) + '%' : '—');
    setText('pl-rmCnt',   rmCnt  !== null ? fmtN(rmCnt)  : '—');
    setText('pl-rmMiss',  rmMiss !== null ? fmtN(rmMiss) : '—');
    setText('pl-rmAccDet', rmAcc !== null ? rmAcc.toFixed(2) + '%' : '—');
    setText('pl-rmAcc',    rmAcc !== null ? rmAcc.toFixed(2) + '%' : '—');

    // Forecast — local
    const localIds = ['fcGma','fcNorth','fcSouth','fcVis','fcMind','fcMT','fcPsbsi'];
    const localVals = localIds.map(id => g(id));
    localIds.forEach((id, i) => setText('pl-' + id, localVals[i] !== null ? localVals[i].toFixed(2) + '%' : '—'));
    const localAvg = fmtPct(localVals);
    setText('pl-fcLocalAvg', localAvg); setText('pl-fcLocal', localAvg);

    // Forecast — export
    const expIds = ['fcIndo','fcIndia','fcDirect'];
    const expVals = expIds.map(id => g(id));
    expIds.forEach((id, i) => setText('pl-' + id, expVals[i] !== null ? expVals[i].toFixed(2) + '%' : '—'));
    const expAvg = fmtPct(expVals);
    setText('pl-fcExportAvg', expAvg); setText('pl-fcExport', expAvg);

    // Forecast — product
    const prodIds = ['pEpoxy','pElasto','pMighty','pProEpoxy','pBuilders','pCoating','pTransport','pOther','pSealant','pWaterproof','pPainting','pAdhesives','pMining','pOthers'];
    const prodVals = prodIds.map(id => g(id));
    prodIds.forEach((id, i) => setText('pl-' + id, prodVals[i] !== null ? prodVals[i].toFixed(2) + '%' : '—'));
    const prodAvg = fmtPct(prodVals);
    setText('pl-fcProd', prodAvg); setText('pl-fcProdAvg', prodAvg);

    // Overall
    const localFilled = localVals.filter(v => v !== null);
    const expFilled   = expVals.filter(v => v !== null);
    const allFilled   = [...localFilled, ...expFilled];
    setText('pl-fcOverall', allFilled.length ? (allFilled.reduce((a,b)=>a+b,0) / allFilled.length).toFixed(2) + '%' : '—');
}

// Live listeners for inline inputs
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#pl-inputSections input[type=number]').forEach(i => i.addEventListener('input', plRender));
});
