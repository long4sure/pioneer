/* ============================================================
   js/core/search.js — Global Search Bar
   Searches: KPI names, modules, nav items, data values
   ============================================================ */

let searchOpen = false;

// ── SVG icon helpers (match sidebar nav style) ────────────────
const SEARCH_ICONS = {
    home:       `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h4a1 1 0 001-1v-3h2v3a1 1 0 001 1h4a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>`,
    finance:    `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>`,
    planning:   `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM3 8a1 1 0 000 2h14a1 1 0 000-2H3zM3 13a1 1 0 000 2h10a1 1 0 000-2H3z"/></svg>`,
    procurement:`<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"/></svg>`,
    production: `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>`,
    warehouse:  `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/></svg>`,
    analytics:  `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/></svg>`,
    kpi:        `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>`,
    line:       `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>`,
};

function getSearchIcon(type, mod) {
    if (type === 'Module') return SEARCH_ICONS[mod?.toLowerCase()] || SEARCH_ICONS.home;
    if (type === 'KPI')    return SEARCH_ICONS.kpi;
    return SEARCH_ICONS.line;
}

// ── Search index ──────────────────────────────────────────────
// Built lazily after all modules are loaded
function buildSearchIndex() {
    const index = [];

    // Nav / modules
    const navItems = [
        { label: 'Home',                  mod: 'home',        type: 'Module' },
        { label: 'Finance',               mod: 'finance',     type: 'Module' },
        { label: 'SC Planning',           mod: 'planning',    type: 'Module' },
        { label: 'Procurement',           mod: 'procurement', type: 'Module' },
        { label: 'Production',            mod: 'production',  type: 'Module' },
        { label: 'Warehouse & Logistics', mod: 'warehouse',   type: 'Module' },
        { label: 'Analytics Dashboard',   mod: 'analytics',   type: 'Module' },
    ];
    navItems.forEach(n => index.push({ ...n, searchKey: n.label.toLowerCase(), action: () => switchModule(n.mod, null) }));

    // KPIs from registry
    KPI_REGISTRY.forEach(kpi => {
        index.push({
            label:     kpi.label,
            mod:       kpi.module,
            type:      'KPI',
            searchKey: (kpi.label + ' ' + kpi.module).toLowerCase(),
            action: () => {
                switchModule('analytics', null);
                anState.activeModules.add(kpi.module);
                setTimeout(() => {
                    anRender();
                    const card = document.querySelector(`[data-kpi-id="${kpi.id}"]`);
                    if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.style.outline = '3px solid var(--pioneer-blue)'; setTimeout(() => card.style.outline = '', 2000); }
                }, 100);
            }
        });
    });

    // Production lines
    Object.entries(utilLineNames).forEach(([key, name]) => {
        index.push({
            label: name, mod: 'Production', type: 'Production Line',
            searchKey: name.toLowerCase(),
            action: () => { switchModule('production', null); switchSubMod('util', null); setTimeout(() => { document.getElementById('util-lineSelect').value = key; utilLoadLine(); switchTab('util', 'input', null); }, 100); }
        });
    });

    return index;
}

let _searchIndex = null;
function getSearchIndex() {
    if (!_searchIndex) _searchIndex = buildSearchIndex();
    return _searchIndex;
}

// ── DOM helpers ───────────────────────────────────────────────
function getSearchEl()     { return document.getElementById('global-search-input'); }
function getSearchDrop()   { return document.getElementById('search-results-dropdown'); }

function openSearchDrop()  { getSearchDrop()?.classList.add('open'); searchOpen = true; }
function closeSearchDrop() { getSearchDrop()?.classList.remove('open'); searchOpen = false; }

// ── Search logic ──────────────────────────────────────────────
function runSearch(query) {
    const drop = getSearchDrop();
    if (!drop) return;
    const q = query.trim().toLowerCase();

    if (!q) { closeSearchDrop(); return; }

    const idx = getSearchIndex();
    const results = idx.filter(item => item.searchKey.includes(q)).slice(0, 12);

    if (!results.length) {
        drop.innerHTML = `<div class="search-no-results">No results for "<strong>${escapeHTML(query)}</strong>"</div>`;
        openSearchDrop();
        return;
    }

    // Group by type
    const groups = {};
    results.forEach(r => { (groups[r.type] = groups[r.type] || []).push(r); });

    let html = '';
    Object.entries(groups).forEach(([type, items]) => {
        html += `<div class="search-result-group-label">${type}</div>`;
        items.forEach((item) => {
            const tagCol  = MODULE_TAG_COLORS[item.mod] || { bg: '#eef2f9', fg: '#3d5070' };
            const iconSvg = getSearchIcon(item.type, item.mod);
            html += `<div class="search-result-item" tabindex="0" data-idx="${results.indexOf(item)}" onclick="searchSelect(${results.indexOf(item)})">
                <div class="search-result-icon">${iconSvg}</div>
                <div style="flex:1;min-width:0;">
                    <div class="search-result-name">${highlightMatch(item.label, q)}</div>
                    <div class="search-result-meta">${item.mod || ''}</div>
                </div>
                <span class="badge search-result-badge" style="background:${tagCol.bg};color:${tagCol.fg};font-size:9px;">${item.type}</span>
            </div>`;
        });
    });

    drop.innerHTML = html;
    drop.dataset.results = JSON.stringify(results.map(r => r.label)); // store for keyboard nav
    openSearchDrop();
}

let _searchResults = [];
function searchSelect(idx) {
    const item = getSearchIndex().filter(i => i.searchKey.includes(getSearchEl()?.value.trim().toLowerCase() || ''))[idx];
    if (item) { item.action(); closeSearchDrop(); if (getSearchEl()) getSearchEl().value = ''; }
}

function highlightMatch(text, query) {
    const i = text.toLowerCase().indexOf(query);
    if (i < 0) return escapeHTML(text);
    return escapeHTML(text.slice(0, i)) + `<mark style="background:var(--pioneer-gold-light);color:var(--text-primary);border-radius:2px;">${escapeHTML(text.slice(i, i + query.length))}</mark>` + escapeHTML(text.slice(i + query.length));
}

function escapeHTML(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Keyboard navigation ───────────────────────────────────────
let searchActiveIdx = -1;
function searchKeyDown(e) {
    const drop = getSearchDrop();
    const items = drop?.querySelectorAll('.search-result-item');
    if (!items?.length) { if (e.key === 'Escape') closeSearchDrop(); return; }

    if (e.key === 'ArrowDown')  { e.preventDefault(); searchActiveIdx = Math.min(searchActiveIdx + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); searchActiveIdx = Math.max(searchActiveIdx - 1, 0); }
    else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchActiveIdx >= 0) items[searchActiveIdx].click();
    }
    else if (e.key === 'Escape') { closeSearchDrop(); getSearchEl()?.blur(); }
    else return;

    items.forEach((el, i) => el.classList.toggle('active', i === searchActiveIdx));
    if (items[searchActiveIdx]) items[searchActiveIdx].scrollIntoView({ block: 'nearest' });
}

// Close on outside click
document.addEventListener('click', e => {
    if (searchOpen && !e.target.closest('.search-bar-wrap')) { closeSearchDrop(); searchActiveIdx = -1; }
});
