/* ============================================================
   js/core/db.js  –  Database bridge
   ============================================================
   Connects the existing in-memory JS modules to the PHP/MySQL
   backend when XAMPP is running. Falls back to localStorage
   (the existing behaviour) when offline.

   What it does:
     1. On load: check if backend is up
     2. If online: restore session token from storage, load all
        KPI data for current period from MySQL into the in-memory
        DBs so all modules render correctly
     3. Patch every save function so it writes to MySQL after
        updating the in-memory DB
     4. Patch globalFilterChange so switching periods reloads
        from MySQL
     5. Patch auth login/logout/register to go through MySQL
        when online
     6. Show a status badge in the topbar (MySQL / Offline)
   ============================================================ */

let DB_MODE = 'offline'; // 'online' | 'offline'

// ── Boot ──────────────────────────────────────────────────────
// Called 150ms after page load. Checks if the PHP backend is up.
// Works from any device on the same network as the XAMPP machine —
// no configuration needed; the URL is derived from window.location.
async function dbBoot() {
    // First attempt
    let online = await API.checkOnline();

    // If first ping failed, wait 1 second and try once more.
    // This handles the case where the page loads before XAMPP is fully ready.
    if (!online) {
        await new Promise(r => setTimeout(r, 1000));
        online = await API.checkOnline();
    }

    DB_MODE = online ? 'online' : 'offline';
    _dbBadge(DB_MODE);

    if (DB_MODE === 'online') {
        console.log('[DB] MySQL connected via:', API.base);

        // Restore existing DB session if the user was previously logged in
        // (important for page refresh and multi-device scenarios)
        await _dbRestoreSession();

        _dbPatchAuth();
        _dbPatchSaves();
        _dbPatchFilter();
        _dbPatchSysadmin();

        // Load current period data into in-memory DBs
        await dbLoadPeriod();

        // Start heartbeat (keeps session alive, updates online count)
        _dbStartHeartbeat();

        // Start sync polling (detects changes by other users and reloads)
        _dbStartSyncPoll();

    } else {
        console.log('[DB] Offline — using localStorage fallback');
    }
}

// ── Heartbeat loop ─────────────────────────────────────────────
// Fires every 30 seconds. Keeps the session alive on the server
// and updates the online user count badge.
let _heartbeatTimer = null;
function _dbStartHeartbeat() {
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    const tick = async () => {
        const res = await API.heartbeat();
        if (res?.online !== undefined) {
            _dbUpdateOnlineCount(res.online);
        }
        // Refresh pending registrations badge from MySQL (multi-device aware)
        if (authSession?.role === 'superadmin') {
            const pending = await API.usersPending();
            if (Array.isArray(pending)) {
                const cnt = pending.length;
                const nb  = document.getElementById('nav-pending-badge');
                if (nb) { nb.textContent = cnt || ''; nb.style.display = cnt ? '' : 'none'; }
            }
        }
    };
    tick(); // immediate first tick
    _heartbeatTimer = setInterval(tick, 30_000);
}

// ── Sync poll loop ─────────────────────────────────────────────
// Fires every 15 seconds. Asks the server if any module data
// changed for the current period since this client last loaded.
// If yes, silently reloads the period and refreshes the UI.
let _syncTimer      = null;
let _lastFetch      = new Date().toISOString().slice(0,19).replace('T',' ');

function _dbStartSyncPoll() {
    if (_syncTimer) clearInterval(_syncTimer);
    _syncTimer = setInterval(async () => {
        const { year, month } = getGlobalPeriod();
        const MONTHS = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
        const m = MONTHS.indexOf(month) + 1;
        if (m < 1) return;

        const res = await API.checkSync(year, m, _lastFetch);
        if (!res?.changed) return;

        // Another user saved data — reload silently
        console.log('[DB] Remote change detected — reloading period:', res.modules);
        const prevFetch = _lastFetch;
        _lastFetch = res.time || new Date().toISOString().slice(0,19).replace('T',' ');

        await dbLoadPeriod();

        // Refresh the currently visible module UI
        if (typeof globalFilterChange === 'function') {
            // Call the original globalFilterChange, not the patched one
            // (which would trigger another DB load loop)
            const mod = document.querySelector('.module-page.active')?.id?.replace('mod-','');
            if (mod && mod !== 'home' && mod !== 'analytics' && mod !== 'sysadmin') {
                // Re-trigger render for the active module
                window.dispatchEvent(new CustomEvent('db-sync-reload', { detail: { modules: res.modules } }));
            }
        }

        // Show a subtle non-blocking badge (not a toast popup)
        _dbShowSyncBadge();
    }, 15_000);
}

// ── Online count badge ─────────────────────────────────────────
function _dbUpdateOnlineCount(count) {
    const el = document.getElementById('db-online-count');
    if (!el) return;
    el.textContent = count;
    el.title = count === 1 ? '1 user online' : `${count} users online`;
    el.style.display = count > 0 ? '' : 'none';
}

// ── Restore session from DB after page refresh ────────────────
// When a user refreshes the page, sessionStorage still has their token.
// We verify it against the DB and restore their auth state.
async function _dbRestoreSession() {
    try {
        const stored = JSON.parse(sessionStorage.getItem('sc_hub_session') || 'null');
        if (!stored?.dbToken || !stored?.loggedIn) return;

        // Verify token is still valid with the server
        const res = await fetch(`${API.base}/auth.php?action=me`, {
            headers: { 'X-Token': stored.dbToken, 'Content-Type': 'application/json' },
            cache: 'no-store',
        });
        if (!res.ok) {
            // Token expired — clear session and show login
            sessionStorage.removeItem('sc_hub_session');
            return;
        }
        const data = await res.json();
        if (data?.data) {
            // Token valid — update session with fresh data from server
            const u = data.data;
            authSession = {
                loggedIn:    true,
                username:    u.username,
                role:        u.role,
                displayName: u.displayName,
                dbToken:     stored.dbToken,
            };
            sessionStorage.setItem('sc_hub_session', JSON.stringify(authSession));
            // Apply the restored role to the UI
            if (typeof _applyRole === 'function')   _applyRole(u.role);
            if (typeof _updateTopbar === 'function') _updateTopbar();
            // Hide login screen since session is valid
            const screen = document.getElementById('login-screen');
            if (screen) screen.classList.add('hidden');
            console.log('[DB] Session restored for @' + u.username);
        }
    } catch(e) {
        console.warn('[DB] Session restore failed:', e.message);
    }
}

// ── Load all modules for current period ───────────────────────
async function dbLoadPeriod() {
    const { year, month } = getGlobalPeriod();
    const all = await API.loadAll(year, month);
    if (!all) return;

    // ── Finance ──────────────────────────────────────────────
    if (all.finance?.prod) {
        const d = all.finance;
        finDB[year][month] = {
            prod:  { actual: d.prod?.actual  ?? '', target: d.prod?.target  ?? '' },
            op:    { actual: d.op?.actual    ?? '', budget: d.op?.budget    ?? '' },
            cap:   { actual: d.cap?.actual   ?? '', budget: d.cap?.budget   ?? '' },
            other: { actual: d.other?.actual ?? '', budget: d.other?.budget ?? '' },
            labor: {
                dl: { reg: d.labor?.dl?.reg ?? '', ot: d.labor?.dl?.ot ?? '' },
                il: { reg: d.labor?.il?.reg ?? '', ot: d.labor?.il?.ot ?? '' },
            },
        };
    }

    // ── SC Planning ───────────────────────────────────────────
    if (all.planning && Object.keys(all.planning).length) {
        Object.assign(plDB[year][month], all.planning);
        plLoadInputs?.();
    }

    // ── Procurement ───────────────────────────────────────────
    if (all.procurement) {
        procDB[year][month].actual = all.procurement.actual ?? '';
        procDB[year][month].target = all.procurement.target ?? '';
        procLoadInputs?.();
    }

    // ── Production – Util ─────────────────────────────────────
    if (all.prod_util) {
        for (const [line, d] of Object.entries(all.prod_util)) {
            if (utilDB[year]?.[month]?.[line]) Object.assign(utilDB[year][month][line], d);
        }
    }

    // ── Production – Waste ────────────────────────────────────
    if (all.prod_waste) {
        for (const [line, d] of Object.entries(all.prod_waste)) {
            if (wasteDB[year]?.[month]?.[line]) Object.assign(wasteDB[year][month][line], d);
        }
    }

    // ── Production – Sched ────────────────────────────────────
    if (all.prod_sched) {
        for (const [line, d] of Object.entries(all.prod_sched)) {
            if (schedDB[year]?.[month]?.[line]) Object.assign(schedDB[year][month][line], d);
        }
    }

    // ── Warehouse ─────────────────────────────────────────────
    if (all.warehouse) {
        const w = all.warehouse, e = whDB[year][month];
        if (w.otif)    Object.assign(e.otif,    w.otif);
        if (w.vol)     Object.assign(e.vol,     w.vol);
        if (w.fr)      Object.assign(e.fr,      w.fr);
        if (w.wh)      Object.assign(e.wh,      w.wh);
        if (w.otdl)    Object.assign(e.otdl,    w.otdl);
        if (w.trucks)  Object.assign(e.trucks,  w.trucks);
        if (w.mp)      Object.assign(e.mp,      w.mp);
        if (w.nonOtif) Object.assign(e.nonOtif, w.nonOtif);
        if (w.soVal)   Object.assign(e.soVal,   w.soVal);
        if (w.soWt)    Object.assign(e.soWt,    w.soWt);
    }

    console.log(`[DB] Loaded period ${month} ${year} from MySQL`);
    if (typeof anClearCache === "function") anClearCache(); // invalidate analytics cache
    // Update last fetch time so sync poll doesn't re-trigger on our own save
    _lastFetch = new Date().toISOString().slice(0,19).replace('T',' ');

    // Trigger re-render for currently visible module
    setTimeout(() => {
        if (typeof globalFilterChange === 'function') {
            // Lightweight re-render — just recalc displayed values
            const activeModule = document.querySelector('.module-page.active')?.id?.replace('mod-','');
            if      (activeModule === 'finance')    finCalc?.();
            else if (activeModule === 'planning')   plRender?.();
            else if (activeModule === 'procurement') procCalc?.();
            else if (activeModule === 'production') utilRender?.();
            else if (activeModule === 'warehouse')  whCalc?.();
            if (activeModule === 'home') updateHomeKPIs?.();
        }
    }, 50);
}

// ── Sync one module's current data to MySQL ───────────────────
async function dbSync(module, extra = {}) {
    // Update our own last-fetch time so the sync poll doesn't 
    // immediately re-trigger a reload after our own save
    _lastFetch = new Date().toISOString().slice(0,19).replace('T',' ');
    const { year, month } = getGlobalPeriod();
    let payload = extra;
    switch (module) {
        case 'finance':     payload = finDB[year][month];   break;
        case 'planning':    payload = { fields: plDB[year][month] }; break;
        case 'procurement': payload = procDB[year][month];  break;
        case 'warehouse':   payload = whDB[year][month];    break;
        // prod_util/waste/sched pass extra directly (line + data)
    }
    const res = await API.save(module, year, month, payload);
    if (res?.error) console.warn(`[DB] sync error (${module}):`, res.error);
    else console.log(`[DB] ${module} synced to MySQL`);
}

// ── Patch save functions ──────────────────────────────────────
function _dbPatchSaves() {
    const _orig = (name) => window[name];

    // Finance
    const _fin = _orig('finSave');
    window.finSave = (...a) => { const r = _fin?.(...a); dbSync('finance'); return r; };

    // Procurement
    const _proc = _orig('procSave');
    window.procSave = (...a) => { const r = _proc?.(...a); dbSync('procurement'); return r; };

    // SC Planning
    const _pl = _orig('plSaveCat');
    window.plSaveCat = (...a) => { const r = _pl?.(...a); dbSync('planning'); return r; };

    // Production – Util
    const _util = _orig('utilSave');
    window.utilSave = (...a) => {
        const r = _util?.(...a);
        const line = document.getElementById('util-lineSelect')?.value;
        const { year, month } = getGlobalPeriod();
        if (line) dbSync('prod_util', { line, ...utilDB[year][month][line] });
        return r;
    };

    // Production – Waste
    const _waste = _orig('wasteSave');
    window.wasteSave = (...a) => {
        const r = _waste?.(...a);
        const line = document.getElementById('waste-lineSelect')?.value;
        const { year, month } = getGlobalPeriod();
        if (line) dbSync('prod_waste', { line, ...wasteDB[year][month][line] });
        return r;
    };

    // Production – Scheduling
    const _sched = _orig('schedSave');
    window.schedSave = (...a) => {
        const r = _sched?.(...a);
        const line = document.getElementById('sched-lineSelect')?.value;
        const { year, month } = getGlobalPeriod();
        if (line) dbSync('prod_sched', { line, ...schedDB[year][month][line] });
        return r;
    };

    // Warehouse
    const _wh = _orig('whSave');
    window.whSave = (...a) => { const r = _wh?.(...a); dbSync('warehouse'); return r; };
}

// ── Patch period filter change to reload from MySQL ───────────
function _dbPatchFilter() {
    const _orig = window.globalFilterChange;
    window.globalFilterChange = (...a) => {
        const r = _orig?.(...a);
        dbLoadPeriod(); // async — non-blocking
        return r;
    };
}

// ── Patch auth to use MySQL when online ──────────────────────
function _dbPatchAuth() {
    // Login
    const _origLogin = window.authLogin;
    window.authLogin = async function() {
        const uEl = document.getElementById('login-username');
        const pEl = document.getElementById('login-password');
        const bEl = document.getElementById('login-submit');
        if (!uEl || !pEl) return;

        const username = uEl.value.trim().toLowerCase();
        const password = pEl.value;
        if (!username || !password) { _loginErr('Please enter your username and password.'); return; }

        if (bEl) { bEl.disabled = true; bEl.textContent = 'Signing in…'; }
        const res = await API.login(username, password);
        if (bEl) { bEl.disabled = false; bEl.textContent = 'Sign In'; }

        if (!res || res.error) {
            const code = res?.status;
            const msg  = code === 403
                ? (res.error?.includes('pending') ? 'Your account is pending approval by an administrator.' : res.error)
                : 'Invalid username or password.';
            _loginErr(msg);
            document.querySelector('.login-card')?.classList.add('shake');
            setTimeout(() => document.querySelector('.login-card')?.classList.remove('shake'), 500);
            return;
        }

        // Success — merge into local session
        authSession = { loggedIn: true, username: res.username, role: res.role, displayName: res.displayName, dbToken: res.token };
        try { sessionStorage.setItem('sc_hub_session', JSON.stringify(authSession)); } catch(e) {}
        _applyRole(res.role);
        _updateTopbar();
        const screen = document.getElementById('login-screen');
        if (screen) { screen.style.transition = 'opacity 0.3s'; screen.style.opacity = '0'; setTimeout(() => { screen.classList.add('hidden'); screen.style.opacity = ''; }, 300); }
        dbLoadPeriod();
        saLog?.('login', 'Auth', `@${res.username} signed in via MySQL`);
    };

    // Logout
    const _origLogout = window.authLogout;
    window.authLogout = async function() {
        saLog?.('logout', 'Auth', `@${authSession?.username} signed out`);
        await API.logout();
        return _origLogout?.();
    };

    // Register
    const _origReg = window.authRegister;
    window.authRegister = async function() {
        const uname = document.getElementById('reg-username')?.value.trim().toLowerCase();
        const dname = document.getElementById('reg-displayname')?.value.trim();
        const pwd   = document.getElementById('reg-password')?.value;
        const pwd2  = document.getElementById('reg-password2')?.value;
        const role  = document.getElementById('reg-role')?.value;

        _clearRegError?.();
        if (!uname || !dname || !pwd)                 { _regErr?.('All fields required.'); return; }
        if (uname.length < 3)                         { _regErr?.('Username min 3 characters.'); return; }
        if (!/^[a-z0-9_]+$/.test(uname))              { _regErr?.('Username: letters, numbers, underscores only.'); return; }
        if (pwd.length < 8)                           { _regErr?.('Password min 8 characters.'); return; }
        if (pwd !== pwd2)                             { _regErr?.('Passwords do not match.'); return; }

        const res = await API.register(uname, dname, pwd, role);
        if (!res || res.error) { _regErr?.(res?.error || 'Registration failed.'); return; }

        document.getElementById('reg-panel').innerHTML = `
          <div style="text-align:center;padding:24px 0 8px">
            <div style="font-size:44px;margin-bottom:14px">✅</div>
            <div class="login-heading" style="font-size:18px">Request Submitted!</div>
            <div class="login-subheading">Your request for <strong>@${uname}</strong> is awaiting admin approval.</div>
            <button class="login-btn" onclick="authShowLogin()" style="margin-top:20px;">Back to Sign In</button>
          </div>`;
    };

    // Approve / Reject / Delete / Change role — delegate to MySQL
    const _origApprove = window.approveUser;
    window.approveUser = async function(idx) {
        const pending = pendingGet();
        const req = pending[idx]; if (!req) return;
        const res = await API.usersApprove(req.username);
        if (res?.error) { showToast('Error: ' + res.error); return; }
        // Also update local cache
        return _origApprove?.(idx);
    };

    const _origReject = window.rejectUser;
    window.rejectUser = async function(idx) {
        const pending = pendingGet();
        const req = pending[idx]; if (!req) return;
        if (!confirm(`Reject registration for @${req.username}?`)) return;
        const res = await API.usersReject(req.username);
        if (res?.error) { showToast('Error: ' + res.error); return; }
        return _origReject?.(idx);
    };

    const _origDelete = window.deleteUser;
    window.deleteUser = async function(username) {
        if (!confirm(`Permanently delete @${username}?`)) return;
        const res = await API.usersDelete(username);
        if (res?.error) { showToast('Error: ' + res.error); return; }
        return _origDelete?.(username);
    };

    const _origRole = window.changeUserRole;
    window.changeUserRole = async function(username, newRole) {
        const res = await API.usersRole(username, newRole);
        if (res?.error) { showToast('Error: ' + res.error); return; }
        return _origRole?.(username, newRole);
    };
}

// ── Patch sysadmin.js to pull users from MySQL when online ────
function _dbPatchSysadmin() {
    // Wrap saOpenCreateUser to use MySQL
    const _origCreate = window.saSaveUser;
    window.saSaveUser = async function() {
        const modal = document.getElementById('sa-user-modal');
        if (!modal) return;
        const mode     = modal.dataset.mode;
        const username = document.getElementById('sa-edit-username')?.value.trim().toLowerCase();
        const display  = document.getElementById('sa-edit-display')?.value.trim();
        const password = document.getElementById('sa-edit-password')?.value;
        const role     = document.getElementById('sa-edit-role')?.value;

        if (mode === 'create') {
            const res = await API.usersCreate(username, display, password, role);
            if (res?.error) {
                const e = document.getElementById('sa-edit-form-error');
                if (e) { e.textContent = res.error; e.classList.add('show'); }
                return;
            }
        } else {
            const res = await API.usersEdit(username, display, password, role);
            if (res?.error) {
                const e = document.getElementById('sa-edit-form-error');
                if (e) { e.textContent = res.error; e.classList.add('show'); }
                return;
            }
        }
        // Fall through to local update
        return _origCreate?.();
    };
}

// ── Sync refresh badge (non-intrusive indicator) ─────────────
// Appears on the DB status badge briefly when remote data arrives.
// No popup, no interruption.
let _syncBadgeTimer = null;
function _dbShowSyncBadge() {
    const el = document.getElementById('db-status-badge');
    if (!el) return;
    const orig = el.innerHTML;
    el.style.background = 'rgba(30,95,200,0.15)';
    el.style.color       = 'var(--pioneer-blue)';
    el.innerHTML = `<svg viewBox="0 0 16 16" fill="currentColor" width="9"><path d="M11.534 7h3.932a.25.25 0 01.192.41l-1.966 2.36a.25.25 0 01-.384 0l-1.966-2.36a.25.25 0 01.192-.41zm-11 2h3.932a.25.25 0 00.192-.41L2.692 6.23a.25.25 0 00-.384 0L.342 8.59A.25.25 0 00.534 9z"/><path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 11-.771-.636A6.002 6.002 0 0113.917 7H12.9A5.002 5.002 0 008 3zM3.1 9a5.002 5.002 0 008.757 2.182.5.5 0 11.771.636A6.002 6.002 0 012.083 9H3.1z" clip-rule="evenodd"/></svg> Synced`;
    if (_syncBadgeTimer) clearTimeout(_syncBadgeTimer);
    _syncBadgeTimer = setTimeout(() => {
        _dbBadge(DB_MODE); // restore original
    }, 2500);
}

// ── Status badge ──────────────────────────────────────────────
function _dbBadge(mode) {
    const DB_ICON = `<svg viewBox="0 0 16 16" fill="currentColor" width="9"><path d="M8 0C5.24 0 3 .9 3 2v12c0 1.1 2.24 2 5 2s5-.9 5-2V2c0-1.1-2.24-2-5-2zm3 14c0 .55-1.34 1-3 1s-3-.45-3-1v-2.09c.85.38 1.9.59 3 .59s2.15-.21 3-.59V14zm0-4c0 .55-1.34 1-3 1s-3-.45-3-1V7.91c.85.38 1.9.59 3 .59s2.15-.21 3-.59V10zm0-4c0 .55-1.34 1-3 1s-3-.45-3-1V3.91c.85.38 1.9.59 3 .59s2.15-.21 3-.59V6z"/></svg>`;

    // Topbar badge
    const el = document.getElementById('db-status-badge');
    if (el) {
        if (mode === 'online') {
            el.style.background = 'rgba(21,128,61,0.12)';
            el.style.color      = 'var(--green)';
            el.title            = 'Connected to MySQL';
            el.innerHTML        = DB_ICON + ' MySQL';
        } else {
            el.style.background = 'rgba(200,32,42,0.08)';
            el.style.color      = 'var(--pioneer-red)';
            el.title            = 'Offline — data stored locally';
            el.innerHTML        = DB_ICON + ' Offline';
        }
    }

    // Sidebar footer badge (shown on mobile)
    const sf = document.getElementById('sf-db-badge');
    if (sf) {
        if (mode === 'online') {
            sf.className   = 'sidebar-footer-db online';
            sf.textContent = '● MySQL';
        } else {
            sf.className   = 'sidebar-footer-db';
            sf.textContent = '● Offline';
        }
    }

    // Sidebar footer period label
    const sfPeriod = document.getElementById('sf-period');
    const tbPeriod = document.getElementById('topbarPeriod');
    if (sfPeriod && tbPeriod) sfPeriod.textContent = tbPeriod.textContent;
}
