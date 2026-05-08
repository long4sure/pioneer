/* ============================================================
   js/core/ui-utils.js
   Shared UI utilities:
     - confirmDialog()   — branded async confirmation modal
     - csvExport()       — export any module data as CSV
     - csvImportBtn()    — render import UI + parse incoming file
     - printModuleOverview() — print current module KPIs
   ============================================================ */

// ── Confirmation Dialog ───────────────────────────────────────
// Usage: const yes = await confirmDialog({ title, message, confirmLabel, danger })
// Returns true if user clicked Confirm, false if cancelled.
function confirmDialog({ title = 'Confirm', message = 'Are you sure?', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
    return new Promise(resolve => {
        const overlay = document.getElementById('confirm-overlay');
        if (!overlay) { resolve(window.confirm(message)); return; }

        document.getElementById('confirm-title').textContent   = title;
        document.getElementById('confirm-message').textContent = message;

        const btnOk  = document.getElementById('confirm-ok');
        const btnCxl = document.getElementById('confirm-cancel');
        btnOk.textContent  = confirmLabel;
        btnCxl.textContent = cancelLabel;
        btnOk.className    = danger ? 'btn btn-danger' : 'btn btn-primary';

        overlay.classList.add('open');

        const cleanup = (val) => {
            overlay.classList.remove('open');
            btnOk.onclick  = null;
            btnCxl.onclick = null;
            resolve(val);
        };
        btnOk.onclick  = () => cleanup(true);
        btnCxl.onclick = () => cleanup(false);
        // Click outside = cancel
        overlay.onclick = (e) => { if (e.target === overlay) cleanup(false); };
    });
}

// ── CSV Export ────────────────────────────────────────────────
// csvExport(headers, rows, filename)
//   headers: string[] column names
//   rows:    array of string[] rows
function csvExport(headers, rows, filename = 'export.csv') {
    const esc = v => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };
    const lines = [
        headers.map(esc).join(','),
        ...rows.map(r => r.map(esc).join(','))
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
}

// ── CSV Import ────────────────────────────────────────────────
// csvImport(file) → Promise<{headers:string[], rows:string[][]}>
function csvImport(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.onload  = (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (!lines.length) { reject(new Error('Empty file')); return; }

            const parseRow = (line) => {
                const cells = []; let cur = ''; let inQ = false;
                for (let i = 0; i < line.length; i++) {
                    const ch = line[i];
                    if (ch === '"') {
                        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
                        else inQ = !inQ;
                    } else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
                    else cur += ch;
                }
                cells.push(cur.trim());
                return cells;
            };

            const headers = parseRow(lines[0]);
            const rows    = lines.slice(1).map(parseRow);
            resolve({ headers, rows });
        };
        reader.readAsText(file);
    });
}

// ── Module CSV Export (reads current period data from in-memory DB) ──────────
async function moduleExportCSV(module) {
    const { year, month } = getGlobalPeriod();
    const MONTHS_ARR = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];

    const filename = `${module}_${month}_${year}.csv`;

    // Use sysadmin's data extractor if available
    if (typeof saGetAllData === 'function' && typeof saGetSchema === 'function') {
        const headers = saGetSchema(module);
        const rows    = saGetAllData(module);
        if (!rows.length) { showToast('No data to export for this period.'); return; }
        csvExport(headers, rows, filename);
        showToast(`Exported ${rows.length} record(s) to ${filename}`);
        return;
    }
    showToast('Export not available.');
}

// ── Module CSV Import ─────────────────────────────────────────
// Opens a file picker, parses CSV, maps columns back to module fields, saves.
async function moduleImportCSV(module, fileInputId) {
    const input = document.getElementById(fileInputId);
    if (!input?.files?.[0]) { showToast('No file selected.'); return; }

    const ok = await confirmDialog({
        title:  'Import CSV',
        message: `This will overwrite existing data for the matching periods in ${module}. Continue?`,
        confirmLabel: 'Import',
        danger: true,
    });
    if (!ok) return;

    try {
        const { headers, rows } = await csvImport(input.files[0]);
        let imported = 0;

        // Map rows back to in-memory DB using Year + Month columns
        const yIdx = headers.findIndex(h => h.toLowerCase() === 'year');
        const mIdx = headers.findIndex(h => h.toLowerCase() === 'month');
        if (yIdx < 0 || mIdx < 0) {
            showToast('CSV must have "Year" and "Month" columns.'); return;
        }

        const MONTHS_ARR = ['January','February','March','April','May','June',
                            'July','August','September','October','November','December'];

        for (const row of rows) {
            const year  = row[yIdx]?.trim();
            const month = row[mIdx]?.trim();
            if (!year || !month || !MONTHS_ARR.includes(month)) continue;

            // Dispatch to module-specific importer
            const handled = _importRowToModule(module, headers, row, year, month);
            if (handled) imported++;
        }

        if (imported > 0) {
            // Trigger save and re-render
            globalFilterChange();
            showToast(`✅ Imported ${imported} record(s) into ${module}`);
        } else {
            showToast('No valid rows found in CSV.');
        }
    } catch(e) {
        showToast('Import error: ' + e.message);
    }
    // Reset file input
    if (input) input.value = '';
}

function _importRowToModule(module, headers, row, year, month) {
    const get = (colName) => {
        const i = headers.findIndex(h => h.toLowerCase() === colName.toLowerCase());
        return i >= 0 ? row[i]?.trim() || '' : '';
    };
    const num = (colName) => { const v = get(colName); return v !== '' ? v : ''; };

    // Ensure DBs exist for this year/month
    if (module === 'finance') {
        if (!finDB[year]) finDB[year] = {};
        if (!finDB[year][month]) finDB[year][month] = { prod:{actual:'',target:''}, op:{actual:'',budget:''}, cap:{actual:'',budget:''}, other:{actual:'',budget:''}, labor:{dl:{reg:'',ot:''},il:{reg:'',ot:''}} };
        const d = finDB[year][month];
        d.prod.actual   = num('Prod Actual (MT)');
        d.prod.target   = num('Prod Target (MT)');
        d.op.actual     = num('Op Actual'); d.op.budget     = num('Op Budget');
        d.cap.actual    = num('Cap Actual'); d.cap.budget    = num('Cap Budget');
        d.other.actual  = num('Other Actual'); d.other.budget  = num('Other Budget');
        d.labor.dl.reg  = num('DL Reg Hrs'); d.labor.dl.ot   = num('DL OT Hrs');
        d.labor.il.reg  = num('IL Reg Hrs'); d.labor.il.ot   = num('IL OT Hrs');
        return true;
    }
    if (module === 'procurement') {
        if (!procDB[year]) procDB[year] = {};
        if (!procDB[year][month]) procDB[year][month] = { actual:'', target:'' };
        procDB[year][month].actual = num('Actual Savings (₱)');
        procDB[year][month].target = num('Target Savings (₱)');
        return true;
    }
    return false; // other modules not supported via simple CSV mapping
}

// ── Print Module Overview ─────────────────────────────────────
function printModuleOverview(moduleId, title) {
    const panel = document.querySelector(`#${moduleId} .tab-content.active`);
    if (!panel) { showToast('Nothing to print.'); return; }

    const { year, month } = getGlobalPeriod();
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) { showToast('Allow pop-ups to use print.'); return; }

    // Clone panel content
    const clone = panel.cloneNode(true);
    // Remove input panels and action buttons from print view
    clone.querySelectorAll('.input-panel, .input-panel-actions, .tab-bar, .btn, button').forEach(el => el.remove());

    const css = [...document.styleSheets]
        .map(ss => { try { return [...ss.cssRules].map(r => r.cssText).join('\n'); } catch(e) { return ''; } })
        .join('\n');

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title} — ${month} ${year}</title>
<style>
${css}
@page { margin: 1.5cm; size: A4 landscape; }
body { background: white !important; font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #0a0f1e; }
.card { break-inside: avoid; border: 1px solid #dde4f0; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
.card-title { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #3d5070; margin-bottom: 4px; }
.card-value { font-size: 20px; font-weight: 700; color: #0a0f1e; }
.kpi-grid, .kpi-grid-3, .kpi-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.kpi-grid-3 { grid-template-columns: repeat(3, 1fr); }
.section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0a0f1e; border-bottom: 2px solid #c8202a; padding-bottom: 4px; margin: 12px 0 8px; }
table { width: 100%; border-collapse: collapse; font-size: 10px; }
th { background: #f5f7fc; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #dde4f0; font-size: 8px; text-transform: uppercase; }
td { padding: 5px 8px; border: 1px solid #eef2f9; }
.badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; }
.badge-excellent { background: #dcfce7; color: #15803d; }
.badge-good { background: #dbeafe; color: #1e5fc8; }
.badge-warning { background: #fef9e0; color: #7a5800; }
.badge-critical { background: #fde8e9; color: #c8202a; }
.progress-track, .progress-bar { display: none; }
.print-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; border-bottom: 3px solid #c8202a; padding-bottom: 8px; }
.print-title { font-size: 18px; font-weight: 800; color: #0a0f1e; }
.print-meta { font-size: 10px; color: #3d5070; text-align: right; }
</style>
</head>
<body>
<div class="print-header">
    <div>
        <div class="print-title">PIONEER SC Operations Hub</div>
        <div style="font-size:13px;font-weight:600;color:#3d5070;margin-top:2px;">${title}</div>
    </div>
    <div class="print-meta">
        Period: <strong>${month} ${year}</strong><br>
        Printed: ${new Date().toLocaleString('en-PH')}
    </div>
</div>
${clone.innerHTML}
<script>window.onload=()=>{window.print();}<\/script>
</body>
</html>`);
    printWin.document.close();
}
