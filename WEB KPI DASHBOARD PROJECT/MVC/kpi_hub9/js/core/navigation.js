/* ============================================================
   js/core/navigation.js — Sidebar, Tabs, Module Switching
   ============================================================ */

const moduleNames = {
    home:       'Home',
    finance:    'Finance',
    planning:   'SC Planning',
    procurement:'Procurement',
    production: 'Production',
    warehouse:  'Warehouse & Logistics',
    analytics:  'Analytics Dashboard',
    sysadmin:   'System Database',
};
const moduleSubs = {
    home:       'SC Operations Hub',
    finance:    'Financial KPIs',
    planning:   'Supply Chain Planning',
    procurement:'Procurement Analytics',
    production: 'Production KPIs',
    warehouse:  'Warehouse & Logistics KPIs',
    analytics:  'Cross-module KPI trends & comparison',
    sysadmin:   'System Admin — Data, Users & Audit Log',
};

// ── Sidebar collapse (desktop) — double-click any nav item ───
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const mn = document.querySelector('.main');
    sb.classList.toggle('collapsed');
    mn.classList.toggle('expanded');
}

// ── Sidebar open/close (mobile) ───────────────────────────────
function toggleMobileSidebar() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebarBackdrop');
    sb.classList.toggle('mobile-open');
    bd.classList.toggle('active');
    document.body.style.overflow = sb.classList.contains('mobile-open') ? 'hidden' : '';
}
function closeMobileSidebar() {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('sidebarBackdrop');
    sb.classList.remove('mobile-open');
    bd.classList.remove('active');
    document.body.style.overflow = '';
}

// ── Module switching ──────────────────────────────────────────
function switchModule(mod, el) {
    // Nav active state
    document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
    if (el) {
        el.classList.add('active');
    } else {
        const found = [...document.querySelectorAll('.nav-item')].find(e =>
            (e.getAttribute('onclick') || '').includes("'" + mod + "'")
        );
        if (found) found.classList.add('active');
    }

    // Show module page
    document.querySelectorAll('.module-page').forEach(e => e.classList.remove('active'));
    const pg = document.getElementById('mod-' + mod);
    if (pg) pg.classList.add('active');

    // Topbar
    setText('topbarTitle',      moduleNames[mod] || mod);
    setText('topbarBreadcrumb', moduleSubs[mod]  || '');

    closeMobileSidebar();
    syncBottomNav(mod);

    if (mod === 'home') updateHomeKPIs();
    else if (mod === 'analytics') { setTimeout(anInit, 30); }
    else if (mod === 'sysadmin') { setTimeout(saInit, 30); }
    else globalFilterChange();
}

// ── Bottom nav sync ───────────────────────────────────────────
function bnSwitch(mod, el) {
    document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    const sidebarItem = [...document.querySelectorAll('.nav-item')].find(e =>
        (e.getAttribute('onclick') || '').includes("'" + mod + "'")
    );
    switchModule(mod, sidebarItem);
}
function syncBottomNav(mod) {
    const bn = document.getElementById('bottomNav');
    if (!bn) return;
    const map = { home:'home', finance:'finance', planning:'planning', procurement:'finance', production:'production', warehouse:'warehouse' };
    const target = map[mod] || mod;
    document.querySelectorAll('.bottom-nav-item').forEach(b => {
        b.classList.toggle('active', (b.getAttribute('onclick') || '').includes("'" + target + "'"));
    });
}

// ── Tab switching ─────────────────────────────────────────────
function switchTab(scope, tab, el) {
    const container = el ? (el.closest('.module-page, .sub-module') || document.body) : document.body;
    const tabBar    = el ? el.closest('.tab-bar') : null;
    if (tabBar) tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');

    const prefix = scope + '-';
    container.querySelectorAll('.tab-content').forEach(c => {
        if (c.id && c.id.startsWith(prefix)) c.classList.remove('active');
    });
    const tc = document.getElementById(scope + '-' + tab);
    if (tc) tc.classList.add('active');

    // Trigger data entry load when switching to input tab
    if (tab === 'input') {
        if      (scope === 'finance')  finLoadInput();
        else if (scope === 'planning') plLoadCat();
        else if (scope === 'wh')       whLoadInput();
        else if (scope === 'util')     utilLoadLine();
        else if (scope === 'waste')    wasteLoadLine();
        else if (scope === 'sched')    schedLoadLine();
    }
}

// ── Sub-module switching (Production) ────────────────────────
function switchSubMod(mod, el) {
    document.querySelectorAll('.mod-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    document.querySelectorAll('.sub-module').forEach(m => m.classList.remove('active'));
    const sm = document.getElementById('prod-' + mod);
    if (sm) sm.classList.add('active');
}

// ── Global period filter ──────────────────────────────────────
function globalFilterChange() {
    const { year: y, month: m } = getGlobalPeriod();
    setText('topbarPeriod',  m + ' ' + y);
    setText('home-period',   m + ' ' + y);
    setText('lastUpdate',    new Date().toLocaleString() + ` (${m} ${y})`);

    finCalc();
    procLoadInputs(); procCalc();
    plLoadInputs();   plRender();
    utilCalcAll();
    wasteCalcAll();
    schedCalcAll();
    whCalc();
    updateHomeKPIs();
}

