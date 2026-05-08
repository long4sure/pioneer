/* ============================================================
   js/core/db.js — Database Integration Bridge
   Patches existing save/load functions to sync with MySQL.
   Falls back to localStorage when backend is unavailable.

   How it works:
   - On period change: loads all module data from DB → populates in-memory DBs
   - On save: writes to in-memory DB AND syncs to MySQL
   - Offline mode: works exactly as before (in-memory only)
   ============================================================ */

let DB_ONLINE = false; // set to true after successful backend ping

// ── Init: check backend, then load current period ─────────────
async function dbInit() {
    DB_ONLINE = await API.isOnline();
    if (DB_ONLINE) {
        console.log('[DB] Backend connected:', API.base);
        updateDbStatusBadge(true);
        await dbLoadPeriod();
    } else {
        console.log('[DB] Backend unavailable — running offline (localStorage)');
        updateDbStatusBadge(false);
    }
}

// ── Load all modules for current period from DB ───────────────
async function dbLoadPeriod() {
    if (!DB_ONLINE) return;
    const { year, month } = getGlobalPeriod();
    const m = API.monthNum(month);
    if (!m) return;

    try {
        const all = await API.loadAll(parseInt(year), m);
        if (!all) return;

        // ── Finance ──────────────────────────────────────────
        if (all.finance) {
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

        // ── Planning ─────────────────────────────────────────
        if (all.planning && Object.keys(all.planning).length) {
            Object.assign(plDB[year][month], all.planning);
            plLoadInputs();
        }

        // ── Procurement ──────────────────────────────────────
        if (all.procurement) {
            procDB[year][month].actual = all.procurement.actual ?? '';
            procDB[year][month].target = all.procurement.target ?? '';
            procLoadInputs();
        }

        // ── Production — utilization ─────────────────────────
        if (all.production_util) {
            for (const [line, data] of Object.entries(all.production_util)) {
                if (utilDB[year][month][line]) {
                    Object.assign(utilDB[year][month][line], data);
                }
            }
        }

        // ── Production — waste ────────────────────────────────
        if (all.production_waste) {
            for (const [line, data] of Object.entries(all.production_waste)) {
                if (wasteDB[year][month][line]) {
                    Object.assign(wasteDB[year][month][line], data);
                }
            }
        }

        // ── Production — scheduling ───────────────────────────
        if (all.production_sched) {
            for (const [line, data] of Object.entries(all.production_sched)) {
                if (schedDB[year][month][line]) {
                    Object.assign(schedDB[year][month][line], data);
                }
            }
        }

        // ── Warehouse ─────────────────────────────────────────
        if (all.warehouse) {
            const w = all.warehouse;
            const existing = whDB[year][month];
            if (w.otif)    Object.assign(existing.otif, w.otif);
            if (w.vol)     Object.assign(existing.vol,  w.vol);
            if (w.fr)      Object.assign(existing.fr,   w.fr);
            if (w.wh)      Object.assign(existing.wh,   w.wh);
            if (w.otdl)    Object.assign(existing.otdl, w.otdl);
            if (w.trucks)  Object.assign(existing.trucks, w.trucks);
            if (w.mp)      Object.assign(existing.mp,   w.mp);
            if (w.nonOtif) Object.assign(existing.nonOtif, w.nonOtif);
            if (w.soVal)   Object.assign(existing.soVal,   w.soVal);
            if (w.soWt)    Object.assign(existing.soWt,    w.soWt);
        }

        console.log(`[DB] Period ${month} ${year} loaded from MySQL`);
    } catch (err) {
        console.warn('[DB] Load failed:', err.message);
    }
}

// ── Sync a module's current data to MySQL ─────────────────────
async function dbSync(module, extraData = {}) {
    if (!DB_ONLINE) return;
    const { year, month } = getGlobalPeriod();
    const m = API.monthNum(month);
    if (!m) return;

    let payload = { ...extraData };

    switch (module) {
        case 'finance':
            payload = finDB[year][month];
            break;
        case 'planning': {
            const d = plDB[year][month];
            payload = { fields: d };
            break;
        }
        case 'procurement':
            payload = procDB[year][month];
            break;
        case 'warehouse':
            payload = whDB[year][month];
            break;
        // production_util / production_waste / production_sched
        // pass extraData directly (line + its data)
    }

    try {
        const res = await API.save(module, parseInt(year), m, payload);
        if (res?.error) console.warn(`[DB] Sync error (${module}):`, res.error);
        else console.log(`[DB] ${module} synced`);
    } catch (err) {
        console.warn(`[DB] Sync failed (${module}):`, err.message);
    }
}

// ── Patch module save functions to also sync to MySQL ─────────
function dbPatchSaveFunctions() {
    // Store original functions
    const _origFinSave     = window.finSave;
    const _origProcSave    = window.procSave;
    const _origPlSaveCat   = window.plSaveCat;
    const _origUtilSave    = window.utilSave;
    const _origWasteSave   = window.wasteSave;
    const _origSchedSave   = window.schedSave;
    const _origWhSave      = window.whSave;

    window.finSave = function(...args) {
        const r = _origFinSave?.(...args);
        dbSync('finance');
        return r;
    };
    window.procSave = function(...args) {
        const r = _origProcSave?.(...args);
        dbSync('procurement');
        return r;
    };
    window.plSaveCat = function(...args) {
        const r = _origPlSaveCat?.(...args);
        dbSync('planning');
        return r;
    };
    window.utilSave = function(...args) {
        const r = _origUtilSave?.(...args);
        // Get current line and its data
        const line = document.getElementById('util-lineSelect')?.value;
        const { year, month } = getGlobalPeriod();
        if (line) dbSync('production_util', { line, ...utilDB[year][month][line] });
        return r;
    };
    window.wasteSave = function(...args) {
        const r = _origWasteSave?.(...args);
        const line = document.getElementById('waste-lineSelect')?.value;
        const { year, month } = getGlobalPeriod();
        if (line) dbSync('production_waste', { line, ...wasteDB[year][month][line] });
        return r;
    };
    window.schedSave = function(...args) {
        const r = _origSchedSave?.(...args);
        const line = document.getElementById('sched-lineSelect')?.value;
        const { year, month } = getGlobalPeriod();
        if (line) dbSync('production_sched', { line, ...schedDB[year][month][line] });
        return r;
    };
    window.whSave = function(...args) {
        const r = _origWhSave?.(...args);
        dbSync('warehouse');
        return r;
    };
}

// ── Patch globalFilterChange to reload from DB on period change ─
function dbPatchGlobalFilter() {
    const _orig = window.globalFilterChange;
    window.globalFilterChange = function(...args) {
        const r = _orig?.(...args);
        if (DB_ONLINE) dbLoadPeriod();
        return r;
    };
}

// ── Patch auth to use DB login when online ─────────────────────
function dbPatchAuth() {
    const _origLogin  = window.authLogin;
    const _origLogout = window.authLogout;
    const _origReg    = window.authRegister;
    const _origApprove = window.approveUser;
    const _origReject  = window.rejectUser;
    const _origDelete  = window.deleteUser;
    const _origChange  = window.changeUserRole;

    window.authLogin = async function() {
        const uEl = document.getElementById('login-username');
        const pEl = document.getElementById('login-password');
        const bEl = document.getElementById('login-submit');
        if (!uEl || !pEl) return;

        const username = uEl.value.trim().toLowerCase();
        const password = pEl.value;

        if (DB_ONLINE) {
            if (bEl) { bEl.disabled = true; bEl.textContent = 'Signing in…'; }
            const res = await API.login(username, password);
            if (bEl) { bEl.disabled = false; bEl.textContent = 'Sign In'; }

            if (res?.error) {
                // map HTTP errors to login error messages
                document.getElementById('login-error')?.classList.remove('show');
                const errMsg = res.status === 403
                    ? (res.error.includes('pending') ? 'Your account is pending approval by an administrator.' : res.error)
                    : 'Invalid username or password.';
                const el = document.getElementById('login-error');
                if (el) { el.querySelector('.login-error-msg').textContent = errMsg; el.classList.add('show'); }
                document.querySelector('.login-card')?.classList.add('shake');
                setTimeout(() => document.querySelector('.login-card')?.classList.remove('shake'), 500);
                return;
            }

            // Merge DB response into local auth session
            if (res?.token) {
                authSession = {
                    loggedIn:    true,
                    username:    res.username,
                    role:        res.role,
                    displayName: res.displayName,
                    dbToken:     res.token
                };
                try { sessionStorage.setItem('sc_hub_session', JSON.stringify(authSession)); } catch(e) {}
                _applyRole(res.role);
                _updateTopbar();
                const screen = document.getElementById('login-screen');
                if (screen) {
                    screen.style.transition = 'opacity 0.3s'; screen.style.opacity = '0';
                    setTimeout(() => { screen.classList.add('hidden'); screen.style.opacity = ''; }, 300);
                }
                dbLoadPeriod();
                return;
            }
        }
        // Offline fallback to built-in local auth
        return _origLogin?.();
    };

    window.authLogout = async function() {
        if (DB_ONLINE) await API.logout();
        return _origLogout?.();
    };

    window.authRegister = async function() {
        if (!DB_ONLINE) { _origReg?.(); return; }
        const uname = document.getElementById('reg-username')?.value.trim().toLowerCase();
        const dname = document.getElementById('reg-displayname')?.value.trim();
        const pwd   = document.getElementById('reg-password')?.value;
        const pwd2  = document.getElementById('reg-password2')?.value;
        const role  = document.getElementById('reg-role')?.value;

        // Client-side validation (same as local)
        if (!uname||!dname||!pwd) { _clearRegError?.(); _regErr?.('All fields required.'); return; }
        if (uname.length < 3) { _regErr?.('Username must be at least 3 characters.'); return; }
        if (!/^[a-z0-9_]+$/.test(uname)) { _regErr?.('Username: letters, numbers, underscores only.'); return; }
        if (pwd.length < 8) { _regErr?.('Password must be at least 8 characters.'); return; }
        if (pwd !== pwd2) { _regErr?.('Passwords do not match.'); return; }

        const res = await API.register(uname, dname, pwd, role);
        if (res?.error) { _regErr?.(res.error); return; }

        document.getElementById('reg-panel').innerHTML = `
          <div style="text-align:center;padding:24px 0 8px">
            <div style="font-size:44px;margin-bottom:14px">✅</div>
            <div class="login-heading" style="font-size:18px">Request Submitted!</div>
            <div class="login-subheading">Your request for <strong>@${uname}</strong> is pending admin approval.</div>
            <button class="login-btn" onclick="authShowLogin()" style="margin-top:20px;">Back to Sign In</button>
          </div>`;
    };

    // User management — DB-first
    window.approveUser = async function(idx) {
        if (!DB_ONLINE) { _origApprove?.(idx); return; }
        const pending = pendingGet();
        const req = pending[idx]; if (!req) return;
        const res = await API.approveUser(req.username);
        if (res?.error) { showToast('Error: ' + res.error); return; }
        showToast(`✅ ${req.displayName} approved`);
        renderUserMgmt();
    };

    window.rejectUser = async function(idx) {
        if (!DB_ONLINE) { _origReject?.(idx); return; }
        const pending = pendingGet();
        const req = pending[idx]; if (!req) return;
        if (!confirm(`Reject registration for @${req.username}?`)) return;
        const res = await API.rejectUser(req.username);
        if (res?.error) { showToast('Error: ' + res.error); return; }
        showToast(`Registration for @${req.username} rejected.`);
        renderUserMgmt();
    };

    window.deleteUser = async function(username) {
        if (!DB_ONLINE) { _origDelete?.(username); return; }
        if (!confirm(`Permanently delete @${username}?`)) return;
        const res = await API.deleteUser(username);
        if (res?.error) { showToast('Error: ' + res.error); return; }
        showToast(`@${username} deleted.`);
        renderUserMgmt();
    };

    window.changeUserRole = async function(username, newRole) {
        if (!DB_ONLINE) { _origChange?.(username, newRole); return; }
        const res = await API.changeRole(username, newRole);
        if (res?.error) { showToast('Error: ' + res.error); return; }
        showToast(`Role updated for @${username}.`);
        renderUserMgmt();
    };
}

// ── Patch renderUserMgmt to load from DB ──────────────────────
function dbPatchRenderUserMgmt() {
    const _orig = window.renderUserMgmt;
    window.renderUserMgmt = async function() {
        if (!DB_ONLINE) { _orig?.(); return; }
        const [usersRes, pendingRes] = await Promise.all([API.listUsers(), API.listPending()]);

        // Rebuild local user store from DB response for the modal renderer
        if (Array.isArray(usersRes)) {
            const merged = {};
            usersRes.forEach(u => { merged[u.username] = { role: u.role, displayName: u.display_name, builtin: !!u.is_builtin, status: 'active', createdAt: u.created_at?.split('T')[0] ?? '—' }; });
            // patch usersGet to return this
            window._dbUsers = merged;
        }
        if (Array.isArray(pendingRes)) {
            window._dbPending = pendingRes.map(p => ({
                username: p.username, displayName: p.display_name,
                role: p.role, requestedAt: p.created_at?.split('T')[0] ?? '—'
            }));
        }
        // Override pendingGet for this render cycle
        const _origPendingGet = window.pendingGet;
        window.pendingGet = () => window._dbPending ?? _origPendingGet?.() ?? [];
        const _origUsersGet  = window.usersGet;
        window.usersGet  = () => window._dbUsers   ?? _origUsersGet?.()  ?? {};
        _orig?.();
        window.pendingGet = _origPendingGet;
        window.usersGet   = _origUsersGet;
    };
}

// ── DB status badge in topbar ─────────────────────────────────
function updateDbStatusBadge(online) {
    const el = document.getElementById('db-status-badge');
    if (!el) return;
    el.title = online ? 'Connected to MySQL database' : 'Offline mode — data stored locally';
    el.style.background = online ? 'rgba(21,128,61,0.12)' : 'rgba(200,32,42,0.1)';
    el.style.color      = online ? 'var(--green)'          : 'var(--pioneer-red)';
    el.innerHTML = online
        ? `<svg viewBox="0 0 16 16" fill="currentColor" width="9"><path d="M8 0C5.24 0 3 1.12 3 2.5v11C3 14.88 5.24 16 8 16s5-1.12 5-2.5v-11C13 1.12 10.76 0 8 0zm3 13.5c0 .55-1.34 1-3 1s-3-.45-3-1v-2.09c.85.38 1.9.59 3 .59s2.15-.21 3-.59v2.09zm0-4c0 .55-1.34 1-3 1s-3-.45-3-1V7.41c.85.38 1.9.59 3 .59s2.15-.21 3-.59V9.5zm0-4c0 .55-1.34 1-3 1s-3-.45-3-1v-2.09c.85.38 1.9.59 3 .59s2.15-.21 3-.59V5.5zM8 4c-1.66 0-3-.45-3-1s1.34-1 3-1 3 .45 3 1-1.34 1-3 1z"/></svg> MySQL`
        : `<svg viewBox="0 0 16 16" fill="currentColor" width="9"><path d="M8 0C5.24 0 3 1.12 3 2.5v11C3 14.88 5.24 16 8 16s5-1.12 5-2.5v-11C13 1.12 10.76 0 8 0zm3 13.5c0 .55-1.34 1-3 1s-3-.45-3-1v-2.09c.85.38 1.9.59 3 .59s2.15-.21 3-.59v2.09zm0-4c0 .55-1.34 1-3 1s-3-.45-3-1V7.41c.85.38 1.9.59 3 .59s2.15-.21 3-.59V9.5zm0-4c0 .55-1.34 1-3 1v-2.09c.85.38 1.9.59 3 .59s2.15-.21 3-.59V5.5zM8 4c-1.66 0-3-.45-3-1s1.34-1 3-1 3 .45 3 1-1.34 1-3 1z"/></svg> Offline`;
}

// ── Boot sequence ─────────────────────────────────────────────
window.addEventListener('load', () => {
    // Small delay to let all modules initialize first
    setTimeout(async () => {
        await dbInit();
        dbPatchSaveFunctions();
        dbPatchGlobalFilter();
        dbPatchAuth();
        dbPatchRenderUserMgmt();
        console.log('[DB] Bridge initialized. Online:', DB_ONLINE);
    }, 200);
});
