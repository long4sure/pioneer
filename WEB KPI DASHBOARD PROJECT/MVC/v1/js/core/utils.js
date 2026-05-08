/* ============================================================
   js/core/utils.js — Shared Utility Functions
   All modules import from here via script tag (global scope).
   ============================================================ */

// ── DOM helpers ──────────────────────────────────────────────
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
function setHTML(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = val;
}
function setW(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.min(100, Math.max(0, pct)) + '%';
}

// ── Formatting ───────────────────────────────────────────────
function fmtN(n, dec = 0) {
    const v = parseFloat(n) || 0;
    return v.toLocaleString('en-PH', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtC(n) {
    const v = parseFloat(n) || 0;
    if (Math.abs(v) >= 1e6) return '₱' + (v / 1e6).toFixed(2) + 'M';
    if (Math.abs(v) >= 1e3) return '₱' + (v / 1e3).toFixed(1) + 'K';
    return '₱' + fmtN(v, 2);
}
function fmtP(n) {
    const v = parseFloat(n) || 0;
    return v.toFixed(1) + '%';
}

// ── Badge helpers ─────────────────────────────────────────────
function statusBadge(val, { good, warn, higherIsBetter = true }) {
    if (val === 0 || isNaN(val)) return { cls: 'badge-neutral', label: 'No Data' };
    if (higherIsBetter) {
        if (val >= good)  return { cls: 'badge-excellent', label: 'Excellent' };
        if (val >= warn)  return { cls: 'badge-good',      label: 'Good' };
        return               { cls: 'badge-critical',  label: 'Critical' };
    } else {
        if (val <= good)  return { cls: 'badge-excellent', label: 'Under Budget' };
        if (val <= warn)  return { cls: 'badge-warning',   label: 'Caution' };
        return               { cls: 'badge-critical',  label: 'Over Budget' };
    }
}

function setCardStatus(cardId, val, opts) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.remove('card-ok', 'card-warn', 'card-bad');
    if (!val || val === 0) return;
    const { cls } = statusBadge(val, opts);
    if (cls === 'badge-excellent' || cls === 'badge-good') card.classList.add('card-ok');
    else if (cls === 'badge-warning')                      card.classList.add('card-warn');
    else if (cls === 'badge-critical')                     card.classList.add('card-bad');
}

function setBadgeEl(id, val, opts) {
    const el = document.getElementById(id);
    if (!el) return;
    const { cls, label } = statusBadge(val, opts);
    el.className = 'badge ' + cls;
    el.textContent = label;
}

// ── Period helpers ────────────────────────────────────────────
const YEARS  = ['2020','2021','2022','2023','2024','2025','2026','2027','2028','2029','2030'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getGlobalPeriod() {
    return {
        year:  document.getElementById('globalYear').value,
        month: document.getElementById('globalMonth').value
    };
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg = 'Data saved!') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.querySelector('.toast-msg').textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
