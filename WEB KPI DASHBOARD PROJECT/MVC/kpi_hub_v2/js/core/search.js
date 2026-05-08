/* ============================================================
   js/core/search.js — Global Search Bar
   Searches: KPI names, modules, nav items, data values
   ============================================================ */

let searchOpen = false;

// ── Search index ──────────────────────────────────────────────
// Built lazily after all modules are loaded
function buildSearchIndex() {
    const index = [];

    // Nav / modules
    const navItems = [
        { label: 'Home',                  mod: 'home',        icon: '🏠', type: 'Module' },
        { label: 'Finance',               mod: 'finance',     icon: '💰', type: 'Module' },
        { label: 'SC Planning',           mod: 'planning',    icon: '📋', type: 'Module' },
        { label: 'Procurement',           mod: 'procurement', icon: '🛒', type: 'Module' },
        { label: 'Production',            mod: 'production',  icon: '⚙️', type: 'Module' },
        { label: 'Warehouse & Logistics', mod: 'warehouse',   icon: '🚚', type: 'Module' },
        { label: 'Analytics Dashboard',   mod: 'analytics',   icon: '📊', type: 'Module' },
    ];
    navItems.forEach(n => index.push({ ...n, searchKey: n.label.toLowerCase(), action: () => switchModule(n.mod, null) }));

    // KPIs from registry
    KPI_REGISTRY.forEach(kpi => {
        index.push({
            label:     kpi.label,
            mod:       kpi.module,
            icon:      '📈',
            type:      'KPI',
            searchKey: (kpi.label + ' ' + kpi.module).toLowerCase(),
            action: () => {
                // Navigate to analytics and highlight the card
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
            label: name, mod: 'Production', icon: '🔧', type: 'Production Line',
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
        items.forEach((item, i) => {
            const tagCol = MODULE_TAG_COLORS[item.mod] || { bg: '#eef2f9', fg: '#3d5070' };
            html += `<div class="search-result-item" tabindex="0" data-idx="${results.indexOf(item)}" onclick="searchSelect(${results.indexOf(item)})">
                <div class="search-result-icon">${item.icon}</div>
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
