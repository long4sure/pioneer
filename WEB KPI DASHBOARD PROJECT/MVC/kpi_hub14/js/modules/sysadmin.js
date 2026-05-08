/* ============================================================
   js/modules/sysadmin.js
   System Admin Dashboard — in-browser:
   - Full user CRUD (create, edit password/role/name, delete)
   - Pending registration approvals
   - All-modules data table (read all periods, all entries)
   - Audit / activity log (who, when, what)
   ============================================================ */

// ── Audit log (in localStorage) ──────────────────────────────
function saLogGet() {
    try { return JSON.parse(localStorage.getItem('sc_hub_log') || '[]'); } catch(e) { return []; }
}
function saLogSave(entries) {
    try { localStorage.setItem('sc_hub_log', JSON.stringify(entries.slice(-2000))); } catch(e) {} // keep last 2000
}
function saLog(action, module = '', detail = '') {
    if (!authSession?.loggedIn) return;
    const entries = saLogGet();
    entries.push({
        ts:       new Date().toISOString(),
        username: authSession.username,
        display:  authSession.displayName || authSession.username,
        role:     authSession.role,
        action, module, detail
    });
    saLogSave(entries);
    // refresh log panel if open
    const panel = document.getElementById('sa-panel-log');
    if (panel?.classList.contains('active')) saRenderLog();
}

// Patch save functions to log who saved what
function saPatchSaveLogs() {
    const origFin  = window.finSave;
    const origProc = window.procSave;
    const origPl   = window.plSaveCat;
    const origUtil = window.utilSave;
    const origWaste = window.wasteSave;
    const origSched = window.schedSave;
    const origWh   = window.whSave;
    window.finSave   = (...a) => { const r = origFin?.(...a);   const {year,month}=getGlobalPeriod(); saLog('save','Finance',  `${month} ${year}`); return r; };
    window.procSave  = (...a) => { const r = origProc?.(...a);  const {year,month}=getGlobalPeriod(); saLog('save','Procurement',`${month} ${year}`); return r; };
    window.plSaveCat = (...a) => { const r = origPl?.(...a);    const {year,month}=getGlobalPeriod(); saLog('save','SC Planning',`${month} ${year}`); return r; };
    window.utilSave  = (...a) => { const r = origUtil?.(...a);  const {year,month}=getGlobalPeriod(); const ln=document.getElementById('util-lineSelect')?.value||''; saLog('save','Production Util', `${ln} ${month} ${year}`); return r; };
    window.wasteSave = (...a) => { const r = origWaste?.(...a); const {year,month}=getGlobalPeriod(); const ln=document.getElementById('waste-lineSelect')?.value||''; saLog('save','Production Waste',`${ln} ${month} ${year}`); return r; };
    window.schedSave = (...a) => { const r = origSched?.(...a); const {year,month}=getGlobalPeriod(); const ln=document.getElementById('sched-lineSelect')?.value||''; saLog('save','Production Sched',`${ln} ${month} ${year}`); return r; };
    window.whSave    = (...a) => { const r = origWh?.(...a);    const {year,month}=getGlobalPeriod(); saLog('save','Warehouse',  `${month} ${year}`); return r; };
}

// Also log login/logout/register events from auth
function saPatchAuthLogs() {
    const origLogin  = window.authLogin;
    const origLogout = window.authLogout;
    const origApprove = window.approveUser;
    const origReject  = window.rejectUser;
    const origDelete  = window.deleteUser;
    const origChange  = window.changeUserRole;
    window.authLogin = (...a) => {
        const u = document.getElementById('login-username')?.value?.trim()?.toLowerCase() || '';
        const r = origLogin?.(...a);
        setTimeout(() => { if (authSession?.loggedIn) saLog('login','Auth',`User @${authSession.username} signed in`); }, 400);
        return r;
    };
    window.authLogout = (...a) => {
        saLog('logout','Auth',`User @${authSession?.username} signed out`);
        return origLogout?.(...a);
    };
    window.approveUser = (idx) => {
        const pending = pendingGet();
        const req = pending[idx];
        if (req) saLog('approve','Users',`Approved @${req.username} as ${req.role}`);
        return origApprove?.(idx);
    };
    window.rejectUser = (idx) => {
        const pending = pendingGet();
        const req = pending[idx];
        if (req) saLog('reject','Users',`Rejected @${req.username}`);
        return origReject?.(idx);
    };
    window.deleteUser = (username) => {
        saLog('delete','Users',`Deleted @${username}`);
        return origDelete?.(username);
    };
    window.changeUserRole = (username, role) => {
        saLog('role_change','Users',`Changed @${username} → ${role}`);
        return origChange?.(username, role);
    };
}

// ── Tab switching ─────────────────────────────────────────────
function saSwitchTab(tab, el) {
    document.querySelectorAll('.sa-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sa-panel').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    const panel = document.getElementById('sa-panel-' + tab);
    if (panel) panel.classList.add('active');
    // Lazy-render on first open
    if (tab === 'users')    saRenderUsers();
    if (tab === 'pending')  saRenderPending();
    if (tab === 'data')     saRenderData();
    if (tab === 'log')      saRenderLog();
    if (tab === 'overview') saRenderOverview();
}

// ── OVERVIEW ─────────────────────────────────────────────────
function saRenderOverview() {
    const log     = saLogGet();
    const saves   = log.filter(e => e.action === 'save').length;
    const logins  = log.filter(e => e.action === 'login').length;
    setHTML('sa-stat-saves',  saves);
    setHTML('sa-stat-logins', logins);

    // When online: fetch live counts from MySQL
    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
        Promise.all([API.usersList(), API.usersPending()]).then(([ul, up]) => {
            if (Array.isArray(ul)) setHTML('sa-stat-users',   ul.length);
            if (Array.isArray(up)) {
                setHTML('sa-stat-pending', up.length);
                const nb = document.getElementById('nav-pending-badge');
                if (nb) { nb.textContent = up.length || ''; nb.style.display = up.length ? '' : 'none'; }
            }
        });
    } else {
        const users   = usersGet();
        const pending = pendingGet();
        const active  = Object.values(users).filter(u => u.status === 'active' || !u.status).length;
        setHTML('sa-stat-users',   active);
        setHTML('sa-stat-pending', pending.length);
    }

    // Fetch live active sessions from MySQL (or show offline message)
    saRefreshOnline();

    // Recent activity (last 10)
    const recent = [...log].reverse().slice(0, 10);
    setHTML('sa-recent-log', recent.length
        ? recent.map(e => `
            <div class="sa-table-row" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border-light);font-size:12px;">
                <span class="log-tag ${_logTag(e.action)}">${e.action}</span>
                <span style="color:var(--text-secondary);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    <strong>${_esc(e.display)}</strong> — ${_esc(e.module)} ${e.detail ? '· '+_esc(e.detail) : ''}
                </span>
                <span class="dim nowrap" style="font-size:10px">${_fmtTs(e.ts)}</span>
            </div>`).join('')
        : '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px;font-style:italic;">No activity yet.</div>'
    );

    // Pending badge
    const badge = document.getElementById('sa-pending-badge');
    // pending badge is handled above in the async block
}

// ── ONLINE USERS ─────────────────────────────────────────────
async function saRefreshOnline() {
    const container = document.getElementById('sa-online-list');
    const statEl    = document.getElementById('sa-stat-online');
    if (!container) return;

    // If DB is offline, show local-only message
    if (typeof DB_MODE === 'undefined' || DB_MODE !== 'online') {
        setHTML('sa-online-list', '<div class="um-empty">Connect to MySQL to see active sessions.</div>');
        if (statEl) setHTML('sa-stat-online', '—');
        return;
    }

    setHTML('sa-online-list', '<div class="um-empty">Loading…</div>');
    const sessions = await API.activeSessions();

    if (!sessions || sessions.error) {
        setHTML('sa-online-list', '<div class="um-empty">Could not load active sessions.</div>');
        if (statEl) setHTML('sa-stat-online', '—');
        return;
    }

    if (statEl) setHTML('sa-stat-online', sessions.length || '0');
    _dbUpdateOnlineCount?.(sessions.length);

    if (!sessions.length) {
        setHTML('sa-online-list', '<div class="um-empty">No users active in the last 2 minutes.</div>');
        return;
    }

    const ROLE_BADGE = { superadmin: 'role-superadmin', admin: 'role-admin', viewer: 'role-viewer' };
    const now = Date.now();

    const html = sessions.map(s => {
        // Calculate how long ago they were last seen
        const lastSeen = new Date(s.last_seen.replace(' ','T') + 'Z');
        const secAgo   = Math.round((now - lastSeen.getTime()) / 1000);
        const agoStr   = secAgo < 10  ? 'just now'
                       : secAgo < 60  ? `${secAgo}s ago`
                       : secAgo < 120 ? '~1 min ago'
                       : `~${Math.round(secAgo/60)} min ago`;

        const isYou = s.username === authSession?.username;

        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border-light);font-size:12px;">
            <span style="width:8px;height:8px;background:var(--green);border-radius:50%;flex-shrink:0;box-shadow:0 0 0 2px rgba(21,128,61,0.2)"></span>
            <div style="flex:1;min-width:0">
                <div style="font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:6px">
                    ${_esc(s.display_name)} <span class="um-row-username">@${_esc(s.username)}</span>
                    <span class="role-badge ${ROLE_BADGE[s.role]||''}" style="font-size:9px">${_roleLabel(s.role)}</span>
                    ${isYou ? '<span class="um-tag um-tag-you">you</span>' : ''}
                </div>
                <div style="color:var(--text-muted);font-size:10px;margin-top:2px;display:flex;gap:12px;flex-wrap:wrap">
                    <span>📍 ${_esc(s.ip || '—')}</span>
                    <span>🖥 ${_esc(s.device_info || '—')}</span>
                    <span>🕐 Signed in ${_fmtTs(s.login_at)}</span>
                </div>
            </div>
            <span style="font-size:10px;color:var(--green);font-weight:600;white-space:nowrap">${agoStr}</span>
        </div>`;
    }).join('');

    setHTML('sa-online-list', html);
}

// ── USERS ─────────────────────────────────────────────────────
let saUsersSort = { col: 'username', dir: 'asc' };
let saUsersSearch = '';
let saUsersPage = 1;
const SA_PAGE_SIZE = 15;

async function saRenderUsers() {
    setHTML('sa-users-tbody', '<tr class="sa-empty-row"><td colspan="5">Loading…</td></tr>');

    let rows = [];

    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
        // Pull live from MySQL
        const res = await API.usersList();
        if (Array.isArray(res)) {
            rows = res.map(u => ({
                username:    u.username,
                displayName: u.display_name || u.displayName || u.username,
                role:        u.role,
                builtin:     !!u.is_builtin,
                createdAt:   (u.created_at || '').split('T')[0].split(' ')[0],
                status:      u.status,
            }));
        }
    } else {
        // Offline: use local cache
        const users = usersGet();
        rows = Object.entries(users)
            .filter(([, u]) => u.status === 'active' || !u.status)
            .map(([uname, u]) => ({ username: uname, ...u }));
    }

    // Search
    if (saUsersSearch) {
        const q = saUsersSearch.toLowerCase();
        rows = rows.filter(r =>
            r.username.includes(q) ||
            (r.displayName||'').toLowerCase().includes(q) ||
            r.role.includes(q)
        );
    }

    // Sort
    rows.sort((a, b) => {
        const va = (a[saUsersSort.col] || '').toString().toLowerCase();
        const vb = (b[saUsersSort.col] || '').toString().toLowerCase();
        return saUsersSort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    const total = rows.length;
    const start = (saUsersPage - 1) * SA_PAGE_SIZE;
    const page  = rows.slice(start, start + SA_PAGE_SIZE);
    const ROLE_BADGE = { superadmin: 'role-superadmin', admin: 'role-admin', viewer: 'role-viewer' };

    const tbody = page.map(u => `
        <tr>
            <td class="mono">${_esc(u.username)}
                ${u.builtin ? '<span class="um-tag">built-in</span>' : ''}
                ${u.username === authSession.username ? '<span class="um-tag um-tag-you">you</span>' : ''}
            </td>
            <td>${_esc(u.displayName || '—')}</td>
            <td><span class="role-badge ${ROLE_BADGE[u.role] || ''}" style="font-size:9px">${_roleLabel(u.role)}</span></td>
            <td class="dim nowrap">${u.createdAt || '—'}</td>
            <td class="nowrap">
                <button class="sa-action-btn sa-action-edit" onclick="saEditUser('${_esc(u.username)}')">✏ Edit</button>
                ${!u.builtin && u.username !== authSession.username
                    ? `<button class="sa-action-btn sa-action-delete" onclick="saDeleteUser('${_esc(u.username)}')" style="margin-left:4px">🗑 Delete</button>`
                    : ''}
            </td>
        </tr>`).join('');

    setHTML('sa-users-tbody', tbody || `<tr class="sa-empty-row"><td colspan="5">No users found.</td></tr>`);
    _renderPagination('sa-users-pager', total, saUsersPage, n => { saUsersPage = n; saRenderUsers(); });
    setText('sa-users-count', `${total} user${total !== 1 ? 's' : ''}`);
}

// ── CREATE USER ───────────────────────────────────────────────
function saOpenCreateUser() {
    setHTML('sa-user-modal-title', 'Create New Account');
    document.getElementById('sa-edit-username').value   = '';
    document.getElementById('sa-edit-display').value    = '';
    document.getElementById('sa-edit-password').value   = '';
    document.getElementById('sa-edit-role').value       = 'viewer';
    document.getElementById('sa-edit-username').disabled = false;
    document.getElementById('sa-edit-form-error').classList.remove('show');
    document.getElementById('sa-user-modal').classList.add('open');
    document.getElementById('sa-edit-username').focus();
    // Mark as create mode
    document.getElementById('sa-user-modal').dataset.mode = 'create';
    document.getElementById('sa-edit-password').placeholder = 'Set password (min 8 chars)';
    document.getElementById('sa-edit-password').parentElement.querySelector('.sa-form-hint').textContent = 'Required for new accounts.';
}

// ── EDIT USER ─────────────────────────────────────────────────
async function saEditUser(username) {
    // When online, get fresh data from MySQL; offline = local cache
    let u = null;
    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
        const list = await API.usersList();
        if (Array.isArray(list)) {
            const row = list.find(r => r.username === username);
            if (row) u = { displayName: row.display_name || row.displayName, role: row.role, builtin: !!row.is_builtin };
        }
    }
    if (!u) {
        const users = usersGet();
        u = users[username];
    }
    if (!u) { showToast('User not found'); return; }

    setHTML('sa-user-modal-title', `Edit @${_esc(username)}`);
    document.getElementById('sa-edit-username').value    = username;
    document.getElementById('sa-edit-display').value     = u.displayName || '';
    document.getElementById('sa-edit-password').value    = '';
    document.getElementById('sa-edit-role').value        = u.role;
    document.getElementById('sa-edit-username').disabled  = true;
    document.getElementById('sa-edit-form-error').classList.remove('show');
    document.getElementById('sa-user-modal').classList.add('open');
    document.getElementById('sa-user-modal').dataset.mode = 'edit';
    document.getElementById('sa-edit-display').focus();
    document.getElementById('sa-edit-password').placeholder = 'Leave blank to keep current password';
    document.getElementById('sa-edit-password').parentElement.querySelector('.sa-form-hint').textContent = 'Leave blank to keep the existing password.';
}

async function saSaveUser() {
    const modal    = document.getElementById('sa-user-modal');
    const mode     = modal.dataset.mode;
    const username = document.getElementById('sa-edit-username').value.trim().toLowerCase();
    const display  = document.getElementById('sa-edit-display').value.trim();
    const password = document.getElementById('sa-edit-password').value;
    const role     = document.getElementById('sa-edit-role').value;
    const errEl    = document.getElementById('sa-edit-form-error');
    errEl.classList.remove('show');

    const showErr = (m) => { errEl.textContent = m; errEl.classList.add('show'); };

    if (!display) { showErr('Display name is required.'); return; }
    if (!role)    { showErr('Role is required.'); return; }

    // ── Online: use MySQL via API ────────────────────────────
    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
        if (mode === 'create') {
            if (!username)                         { showErr('Username is required.'); return; }
            if (username.length < 3)               { showErr('Username must be at least 3 characters.'); return; }
            if (!/^[a-z0-9_]+$/.test(username))    { showErr('Username: letters, numbers, underscores only.'); return; }
            if (!password || password.length < 8)  { showErr('Password must be at least 8 characters.'); return; }
            const res = await API.usersCreate(username, display, password, role);
            if (res?.error) { showErr(res.error); return; }
            saLog('create', 'Users', `Created @${username} as ${role}`);
            showToast(`✅ Account @${username} created`);
        } else {
            if (password && password.length < 8) { showErr('New password must be at least 8 characters.'); return; }
            const res = await API.usersEdit(username, display, password, role);
            if (res?.error) { showErr(res.error); return; }
            saLog('edit', 'Users', `Edited @${username}: role=${role}${password ? ', password changed' : ''}`);
            showToast(`Account @${username} updated`);
        }
        document.getElementById('sa-user-modal').classList.remove('open');
        saRenderUsers();
        saRenderOverview();
        return;
    }

    // ── Offline: localStorage fallback ───────────────────────
    if (mode === 'create') {
        if (!username)                         { showErr('Username is required.'); return; }
        if (username.length < 3)               { showErr('Username must be at least 3 characters.'); return; }
        if (!/^[a-z0-9_]+$/.test(username))    { showErr('Username: letters, numbers, underscores only.'); return; }
        if (!password || password.length < 8)  { showErr('Password must be at least 8 characters.'); return; }
        const users = usersGet();
        if (users[username]) { showErr('Username already exists.'); return; }
        users[username] = { role, password, displayName: display, builtin: false, status: 'active', createdAt: new Date().toISOString().split('T')[0] };
        usersSave(users);
        saLog('create', 'Users', `Created @${username} as ${role}`);
        showToast(`✅ Account @${username} created`);
    } else {
        const users = usersGet();
        if (!users[username]) { showErr('User not found.'); return; }
        if (password && password.length < 8) { showErr('New password must be at least 8 characters.'); return; }
        users[username].displayName = display;
        users[username].role        = role;
        if (password) users[username].password = password;
        usersSave(users);
        saLog('edit', 'Users', `Edited @${username}`);
        showToast(`Account @${username} updated`);
    }
    document.getElementById('sa-user-modal').classList.remove('open');
    saRenderUsers();
    saRenderOverview();
}

function saCloseUserModal() {
    document.getElementById('sa-user-modal').classList.remove('open');
}

async function saDeleteUser(username) {
    if (!await appConfirm('Delete User', `Permanently delete @${username}? This cannot be undone.`, 'Delete', true)) return;

    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
        const res = await API.usersDelete(username);
        if (res?.error) { showToast('Error: ' + res.error); return; }
        saLog('delete','Users',`Deleted @${username}`);
        showToast(`@${username} deleted`);
        saRenderUsers();
        saRenderOverview();
        return;
    }

    // Offline fallback
    if (BUILTIN_USERS[username]?.builtin) { showToast('Cannot delete built-in accounts.'); return; }
    const users = usersGet();
    delete users[username];
    usersSave(users);
    saLog('delete','Users',`Deleted @${username}`);
    showToast(`@${username} deleted`);
    saRenderUsers();
    saRenderOverview();
}

// ── PENDING REGISTRATIONS ────────────────────────────────────
// saRenderPending: fetches from MySQL when online, localStorage when offline
async function saRenderPending() {
    const ROLE_BADGE = { admin: 'role-admin', viewer: 'role-viewer' };

    let pending = [];
    let useIdx  = true; // when true, use array index for approve/reject

    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
        // Pull live pending list from MySQL
        const res = await API.usersPending();
        if (Array.isArray(res)) {
            // Normalise field names from PHP (snake_case) to JS camelCase
            pending = res.map(r => ({
                username:    r.username,
                displayName: r.display_name || r.displayName || r.username,
                role:        r.role,
                requestedAt: (r.created_at || r.requestedAt || '').split('T')[0].split(' ')[0],
            }));
            useIdx = false; // we'll pass username directly for DB operations
        }
    } else {
        pending = pendingGet(); // offline fallback
        useIdx  = true;
    }

    // Update badge on both nav + tab
    const cnt    = pending.length;
    const badge  = document.getElementById('sa-pending-badge');
    const navBdg = document.getElementById('nav-pending-badge');
    if (badge)  { badge.textContent = cnt || ''; badge.style.display = cnt ? '' : 'none'; }
    if (navBdg) { navBdg.textContent = cnt || ''; navBdg.style.display = cnt ? '' : 'none'; }

    const html = pending.length
        ? pending.map((req, i) => {
            const approveCall = useIdx
                ? `saApprovePending(${i})`
                : `saApprovePendingByName('${_esc(req.username)}')`;
            const rejectCall  = useIdx
                ? `saRejectPending(${i})`
                : `saRejectPendingByName('${_esc(req.username)}')`;
            return `<tr>
                <td class="mono">${_esc(req.username)}</td>
                <td>${_esc(req.displayName || '—')}</td>
                <td><span class="role-badge ${ROLE_BADGE[req.role]||''}" style="font-size:9px">${_roleLabel(req.role)}</span></td>
                <td class="dim">${req.requestedAt || '—'}</td>
                <td class="nowrap">
                    <button class="sa-action-btn sa-action-approve" onclick="${approveCall}">✓ Approve</button>
                    <button class="sa-action-btn sa-action-delete"  onclick="${rejectCall}"  style="margin-left:4px">✕ Reject</button>
                </td>
            </tr>`;
          }).join('')
        : `<tr class="sa-empty-row"><td colspan="5">No pending registrations.</td></tr>`;
    setHTML('sa-pending-tbody', html);
}

// DB-mode approve/reject by username (multi-device safe)
async function saApprovePendingByName(username) {
    const res = await API.usersApprove(username);
    if (res?.error) { showToast('Error: ' + res.error); return; }
    showToast(`✅ @${username} approved`);
    saLog('approve', 'Users', `Approved @${username}`);
    saRenderPending(); saRenderUsers(); saRenderOverview();
}
async function saRejectPendingByName(username) {
    if (!await appConfirm('Reject Registration', `Reject the registration request from @${username}?`, 'Reject', true)) return;
    const res = await API.usersReject(username);
    if (res?.error) { showToast('Error: ' + res.error); return; }
    showToast(`Registration for @${username} rejected`);
    saLog('reject', 'Users', `Rejected @${username}`);
    saRenderPending(); saRenderOverview();
}

// Offline fallbacks (by index)
function saApprovePending(idx) { approveUser(idx); saRenderPending(); saRenderUsers(); saRenderOverview(); }
function saRejectPending(idx)  { rejectUser(idx);  saRenderPending(); saRenderOverview(); }

// ── DATA TABLE ────────────────────────────────────────────────
let saDataModule  = 'finance';
let saDataSort    = { col: 0, dir: 'asc' };
let saDataSearch  = '';
let saDataPage    = 1;

function saRenderData() {
    const module = document.getElementById('sa-data-module')?.value || 'finance';
    saDataModule = module;
    const rows   = saGetAllData(module);
    const schema = saGetSchema(module);

    // Search
    let filtered = rows;
    if (saDataSearch) {
        const q = saDataSearch.toLowerCase();
        filtered = rows.filter(r => r.some(v => String(v||'').toLowerCase().includes(q)));
    }

    // Sort
    filtered.sort((a, b) => {
        const va = String(a[saDataSort.col] ?? '').toLowerCase();
        const vb = String(b[saDataSort.col] ?? '').toLowerCase();
        const n  = parseFloat(va) - parseFloat(vb);
        if (!isNaN(n)) return saDataSort.dir === 'asc' ? n : -n;
        return saDataSort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    const total = filtered.length;
    const start = (saDataPage - 1) * SA_PAGE_SIZE;
    const page  = filtered.slice(start, start + SA_PAGE_SIZE);

    // Headers
    const headers = schema.map((col, i) => `
        <th onclick="saDataSortCol(${i})" class="${saDataSort.col===i ? 'sorted-'+(saDataSort.dir) : ''}">
            ${col} <span class="sort-icon">${saDataSort.col===i ? (saDataSort.dir==='asc'?'▲':'▼') : '⇅'}</span>
        </th>`).join('');
    setHTML('sa-data-thead', `<tr>${headers}<th class="sa-col-actions">Actions</th></tr>`);

    const tbody = page.map(row => {
        const cells = row.map((v, i) => `<td class="${i < 2 ? 'mono' : ''} dim">${_esc(String(v ?? '—'))}</td>`).join('');
        // row[0]=year, row[1]=month; for production modules row[2]=line name
        const year  = _esc(String(row[0] ?? ''));
        const month = _esc(String(row[1] ?? ''));
        const line  = (module.startsWith('production_')) ? _esc(String(row[2] ?? '')) : '';
        return `<tr>
            ${cells}
            <td class="sa-data-actions">
                <button class="sa-action-btn sa-action-edit"
                    onclick="saDataEdit(${JSON.stringify(module)},${JSON.stringify(row[0])},${JSON.stringify(row[1])},${JSON.stringify(line)})">
                    <svg viewBox="0 0 16 16" fill="currentColor" width="11"><path d="M12.854.146a.5.5 0 00-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 000-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 016 13.5V13h-.5a.5.5 0 01-.5-.5V12h-.5a.5.5 0 01-.5-.5V11h-.5a.5.5 0 01-.5-.5V10h-.5a.499.499 0 01-.175-.032l-.179.178a.5.5 0 00-.11.168l-2 5a.5.5 0 00.65.65l5-2a.5.5 0 00.168-.11l.178-.178z"/></svg>
                    Edit
                </button>
                <button class="sa-action-btn sa-action-delete"
                    onclick="saDataDelete(${JSON.stringify(module)},${JSON.stringify(row[0])},${JSON.stringify(row[1])},${JSON.stringify(line)})">
                    <svg viewBox="0 0 16 16" fill="currentColor" width="11"><path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clip-rule="evenodd"/></svg>
                </button>
            </td>
        </tr>`;
    }).join('');
    setHTML('sa-data-tbody', tbody || `<tr class="sa-empty-row"><td colspan="${schema.length + 1}">No data entered yet for this module.</td></tr>`);

    _renderPagination('sa-data-pager', total, saDataPage, n => { saDataPage = n; saRenderData(); });
    setText('sa-data-count', `${total} record${total !== 1 ? 's' : ''}`);
}

function saDataSortCol(col) {
    if (saDataSort.col === col) saDataSort.dir = saDataSort.dir === 'asc' ? 'desc' : 'asc';
    else { saDataSort.col = col; saDataSort.dir = 'asc'; }
    saDataPage = 1;
    saRenderData();
}

// ── Data Records: Edit — navigates to the module's data entry tab ──
function saDataEdit(module, year, month, line) {
    // Map module key to navigation module + sub-module
    const MOD_NAV = {
        finance: 'finance', planning: 'planning', procurement: 'procurement',
        production_util: 'production', production_waste: 'production', production_sched: 'production',
        warehouse: 'warehouse',
    };
    const SUBMOD = {
        production_util: 'util', production_waste: 'waste', production_sched: 'sched',
    };
    const navMod = MOD_NAV[module] || module;
    const subMod = SUBMOD[module] || null;

    // Set period selectors to this record's year/month
    const yrEl = document.getElementById('globalYear');
    const moEl = document.getElementById('globalMonth');
    if (yrEl) for (let o of yrEl.options) o.selected = (o.value === String(year) || o.text === String(year));
    if (moEl) for (let o of moEl.options) o.selected = (o.value === month || o.text === month);
    globalFilterChange();

    // Navigate to module
    switchModule(navMod, null);

    setTimeout(() => {
        // Switch to data-entry input tab
        if (subMod && typeof switchSubMod === 'function') switchSubMod(subMod, null);
        // Click the Data Entry tab button
        const inputBtn = document.querySelector(`#mod-${navMod} [data-tab="input"]`);
        if (inputBtn && !inputBtn.disabled) inputBtn.click();
        // For production: select the specific line
        if (line && subMod) {
            const lineEl = document.getElementById(`${subMod}-lineSelect`);
            if (lineEl) {
                // line in the data table is the human-readable name — match by text
                for (let o of lineEl.options) {
                    if (o.text === line || o.value === line) { o.selected = true; break; }
                }
                lineEl.dispatchEvent(new Event('change'));
            }
        }
        showToast(`Editing ${module.replace('_',' ')} — ${month} ${year}${line ? ' / '+line : ''}`);
    }, 320);
}

// ── Data Records: Delete — clears data for a specific record ──
async function saDataDelete(module, year, month, line) {
    const label = `${module.replace('_',' ')} — ${month} ${year}${line ? ' / '+line : ''}`;
    const ok = await appConfirm(
        'Delete Record',
        `Delete all data for ${label}? This will clear the values from the system.`,
        'Delete', true
    );
    if (!ok) return;

    const MONTHS_LIST = ['January','February','March','April','May','June',
                         'July','August','September','October','November','December'];

    // Clear the in-memory DB entry
    if (module === 'finance' && finDB[year]?.[month]) {
        finDB[year][month] = {
            prod:{actual:'',target:''}, op:{actual:'',budget:''}, cap:{actual:'',budget:''},
            other:{actual:'',budget:''}, labor:{dl:{reg:'',ot:''},il:{reg:'',ot:''}}
        };
        if (typeof finCalc === 'function') finCalc();
    }
    else if (module === 'procurement' && procDB[year]?.[month]) {
        procDB[year][month] = { actual:'', target:'' };
        if (typeof procCalc === 'function') procCalc();
    }
    else if (module === 'planning' && plDB[year]?.[month]) {
        Object.keys(plDB[year][month]).forEach(k => { plDB[year][month][k] = ''; });
        if (typeof plRender === 'function') plRender();
    }
    else if (module === 'warehouse' && whDB[year]?.[month]) {
        whDB[year][month] = {
            otif:{served:'',total:''}, vol:{del:'',ord:''},
            fr:{sc:{del:'',ord:''},corp:{del:'',ord:''},core:{del:'',ord:''},m7:{del:'',ord:''}},
            wh:{rmTot:'',rmUsed:'',fgTot:'',fgUsed:'',extTot:'',extUsed:''},
            otdl:{gma:'',north:'',central:'',south:'',vis:'',mind:'',mt:'',pai:''},
            trucks:{t10:'',auv:'',t6:'',t4:'',c20:''},
            mp:{reg:'',agy:'',res:'',regH:'',agyH:'',otH:'',abs:'',days:''},
            nonOtif:{}, soVal:{}, soWt:{}
        };
        if (typeof whCalc === 'function') whCalc();
    }
    else if (module === 'production_util' && utilDB[year]?.[month]) {
        // Find line key by matching human name
        const lineKey = utilLines.find(lk => (utilLineNames[lk]||lk) === line) || line;
        if (utilDB[year][month][lineKey]) {
            Object.keys(utilDB[year][month][lineKey]).forEach(k => { utilDB[year][month][lineKey][k] = ''; });
        }
        if (typeof utilRender === 'function') utilRender();
    }
    else if (module === 'production_waste' && wasteDB[year]?.[month]) {
        const lineKey = wasteLines.find(lk => (wasteLineNames[lk]||lk) === line) || line;
        if (wasteDB[year][month][lineKey]) {
            wasteDB[year][month][lineKey] = { fg:'', rep:'', rej:'', waste:'' };
        }
    }
    else if (module === 'production_sched' && schedDB[year]?.[month]) {
        const lineKey = schedLines.find(lk => (schedLineNames[lk]||lk) === line) || line;
        if (schedDB[year][month][lineKey]) {
            schedDB[year][month][lineKey] = { actual:'', planned:'' };
        }
    }

    // Sync deletion to MySQL if online
    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online' && typeof dbSync === 'function') {
        const mNum = MONTHS_LIST.indexOf(month) + 1;
        if (mNum > 0) {
            const extra = line ? { line } : {};
            dbSync(module, extra);
        }
    }

    saLog('delete', 'Data Records', `Deleted ${label}`);
    showToast(`🗑 Deleted: ${label}`);
    saRenderData(); // refresh table
}

function saGetSchema(module) {
    const schemas = {
        finance:          ['Year','Month','Prod Actual (MT)','Prod Target (MT)','Op Actual','Op Budget','Cap Actual','Cap Budget','Other Actual','Other Budget','DL Reg Hrs','DL OT Hrs','IL Reg Hrs','IL OT Hrs'],
        planning:         ['Year','Month','FG Core (days)','FG M7 (days)','FG Others (days)','FG All-In','RM Core','RM M7','RM Others','PM Core','PM M7','PM Others','FG KGS Core','FG KGS M7','FG KGS Others','FG KGS Expired','FG KGS Days','FG PHP Core','FG PHP M7','FG PHP Others','FG PHP Expired','RM KGS Core','RM KGS M7','RM KGS Others','RM KGS Expired','RM KGS Days','Forecast Avg Local','Forecast Avg Export'],
        procurement:      ['Year','Month','Actual Savings (₱)','Target Savings (₱)'],
        production_util:  ['Year','Month','Line','Productive Hrs','Total Hrs','Util %','Machines Avail','Machines Used','Prod Days'],
        production_waste: ['Year','Month','Line','FG Output (kg)','Reprocess (kg)','Rejection (kg)','Waste (kg)','Net Output (kg)','Waste %'],
        production_sched: ['Year','Month','Line','Actual (kg)','Planned (kg)','Compliance %'],
        warehouse:        ['Year','Month','OTIF Served','OTIF Total','OTIF %','Vol Delivered','Vol Orders','Vol Fill %','SC Fill %','Corp Fill %','Core Fill %','M7 Fill %','WH Util %','Total Non-OTIF','Total Stock-Out (₱)'],
    };
    return schemas[module] || [];
}

function saGetAllData(module) {
    const rows = [];
    YEARS.forEach(y => MONTHS.forEach((m, mi) => {
        switch(module) {
            case 'finance': {
                const d = finDB[y]?.[m];
                if (!d) return;
                const pa = +d.prod.actual||0, pt = +d.prod.target||0, oa = +d.op.actual||0, ob = +d.op.budget||0;
                const ca = +d.cap.actual||0, cb = +d.cap.budget||0, xa = +d.other.actual||0, xb = +d.other.budget||0;
                const dlr = +d.labor.dl.reg||0, dlot = +d.labor.dl.ot||0, ilr = +d.labor.il.reg||0, ilot = +d.labor.il.ot||0;
                if (!pa&&!pt&&!oa&&!ob&&!ca&&!cb&&!xa&&!xb&&!dlr&&!dlot&&!ilr&&!ilot) return;
                rows.push([y, m, pa||'', pt||'', oa||'', ob||'', ca||'', cb||'', xa||'', xb||'', dlr||'', dlot||'', ilr||'', ilot||'']);
                break;
            }
            case 'planning': {
                const d = plDB[y]?.[m];
                if (!d) return;
                const g = k => parseFloat(d[k]) || null;
                const anySet = ['fgA','fgB','fgC','rmA','rmB','rmC','fcGma','fcNorth'].some(k => d[k] !== '');
                if (!anySet) return;
                const localIds = ['fcGma','fcNorth','fcSouth','fcVis','fcMind','fcMT','fcPsbsi'];
                const expIds   = ['fcIndo','fcIndia','fcDirect'];
                const lv = localIds.map(k => g(k)).filter(v => v !== null);
                const ev = expIds.map(k => g(k)).filter(v => v !== null);
                const lAvg = lv.length ? (lv.reduce((a,b)=>a+b,0)/lv.length).toFixed(2)+'%' : '—';
                const eAvg = ev.length ? (ev.reduce((a,b)=>a+b,0)/ev.length).toFixed(2)+'%' : '—';
                rows.push([y, m, d.fgA||'', d.fgB||'', d.fgC||'', d.fgAllIn||'', d.rmA||'', d.rmB||'', d.rmC||'', d.pmCore||'', d.pmM7||'', d.pmOthers||'', d.fgKgsFG||'', d.fgKgsFN||'', d.fgKgsSL||'', d.fgKgsEX||'', d.fgKgsDays||'', d.fgPhpFG||'', d.fgPhpFN||'', d.fgPhpSL||'', d.fgPhpEX||'', d.rmKgsFG||'', d.rmKgsFN||'', d.rmKgsSL||'', d.rmKgsEX||'', d.rmKgsDays||'', lAvg, eAvg]);
                break;
            }
            case 'procurement': {
                const d = procDB[y]?.[m];
                if (!d || (!d.actual && !d.target)) return;
                rows.push([y, m, d.actual||'', d.target||'']);
                break;
            }
            case 'production_util': {
                const db = utilDB[y]?.[m];
                if (!db) return;
                utilLines.forEach(line => {
                    const d = db[line];
                    const tot = utilKeys2.reduce((s,k) => s+(+d[k]||0), 0);
                    if (!tot) return;
                    const prod = +d.productive||0;
                    const util = tot > 0 ? (prod/tot*100).toFixed(2)+'%' : '—';
                    rows.push([y, m, utilLineNames[line]||line, fmtN(prod), fmtN(tot), util, d.mAvail||'', d.mUsed||'', d.days||'']);
                });
                break;
            }
            case 'production_waste': {
                const db = wasteDB[y]?.[m];
                if (!db) return;
                wasteLines.forEach(line => {
                    const d = db[line];
                    const fg = +d.fg||0, rep = +d.rep||0, rej = +d.rej||0, w = +d.waste||0;
                    if (!fg && !w) return;
                    const net = fg+rep-rej;
                    const wp  = (fg+w) > 0 ? (w/(fg+w)*100).toFixed(2)+'%' : '—';
                    rows.push([y, m, wasteLineNames[line]||line, fmtN(fg), fmtN(rep), fmtN(rej), fmtN(w), fmtN(net), wp]);
                });
                break;
            }
            case 'production_sched': {
                const db = schedDB[y]?.[m];
                if (!db) return;
                schedLines.forEach(line => {
                    const d = db[line];
                    const a = +d.actual||0, p = +d.planned||0;
                    if (!a && !p) return;
                    const comp = p > 0 ? (a/p*100).toFixed(2)+'%' : '—';
                    rows.push([y, m, schedLineNames[line]||line, fmtN(a), fmtN(p), comp]);
                });
                break;
            }
            case 'warehouse': {
                const d = whDB[y]?.[m];
                if (!d) return;
                const sv = +d.otif.served||0, tot = +d.otif.total||0;
                const vd = +d.vol.del||0, vo = +d.vol.ord||0;
                if (!sv && !tot && !vd && !vo) return;
                const otifPct = tot > 0 ? (sv/tot*100).toFixed(2)+'%' : '—';
                const volPct  = vo > 0  ? (vd/vo*100).toFixed(2)+'%'  : '—';
                const fr = d.fr;
                const scPct   = +fr.sc.ord   > 0 ? (+fr.sc.del  /+fr.sc.ord  *100).toFixed(2)+'%' : '—';
                const coPct   = +fr.corp.ord  > 0 ? (+fr.corp.del/+fr.corp.ord *100).toFixed(2)+'%' : '—';
                const corePct = +fr.core.ord  > 0 ? (+fr.core.del/+fr.core.ord *100).toFixed(2)+'%' : '—';
                const m7Pct   = +fr.m7.ord    > 0 ? (+fr.m7.del  /+fr.m7.ord  *100).toFixed(2)+'%' : '—';
                const wTot = (+d.wh.rmTot||0)+(+d.wh.fgTot||0)+(+d.wh.extTot||0);
                const wUsd = (+d.wh.rmUsed||0)+(+d.wh.fgUsed||0)+(+d.wh.extUsed||0);
                const whPct = wTot > 0 ? (wUsd/wTot*100).toFixed(2)+'%' : '—';
                const nonOtif = Object.values(d.nonOtif).reduce((s,v)=>s+(+v||0),0);
                const soVal   = Object.values(d.soVal).reduce((s,v)=>s+(+v||0),0);
                rows.push([y, m, fmtN(sv), fmtN(tot), otifPct, fmtC(vd), fmtC(vo), volPct, scPct, coPct, corePct, m7Pct, whPct, fmtN(nonOtif,0), fmtC(soVal)]);
                break;
            }
        }
    }));
    return rows;
}

// ── AUDIT LOG ─────────────────────────────────────────────────
let saLogSearch  = '';
let saLogPage    = 1;
let saLogFilter  = 'all';

function saRenderLog() {
    let entries = [...saLogGet()].reverse(); // newest first

    if (saLogFilter !== 'all') entries = entries.filter(e => e.action === saLogFilter);
    if (saLogSearch) {
        const q = saLogSearch.toLowerCase();
        entries = entries.filter(e =>
            (e.username||'').toLowerCase().includes(q) ||
            (e.module||'').toLowerCase().includes(q)   ||
            (e.detail||'').toLowerCase().includes(q)
        );
    }

    const total = entries.length;
    const start = (saLogPage - 1) * SA_PAGE_SIZE;
    const page  = entries.slice(start, start + SA_PAGE_SIZE);

    const tbody = page.map(e => `
        <tr>
            <td class="dim nowrap mono" style="font-size:10px">${_fmtTs(e.ts)}</td>
            <td class="mono"><strong>${_esc(e.username)}</strong><br><span class="dim" style="font-size:10px">${_esc(e.display)}</span></td>
            <td><span class="role-badge role-${e.role}" style="font-size:9px">${_roleLabel(e.role)}</span></td>
            <td><span class="log-tag ${_logTag(e.action)}">${e.action}</span></td>
            <td class="dim">${_esc(e.module)}</td>
            <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_esc(e.detail||'')}">${_esc(e.detail||'—')}</td>
        </tr>`).join('');

    setHTML('sa-log-tbody', tbody || `<tr class="sa-empty-row"><td colspan="6">No log entries.</td></tr>`);
    _renderPagination('sa-log-pager', total, saLogPage, n => { saLogPage = n; saRenderLog(); });
    setText('sa-log-count', `${total} entr${total !== 1 ? 'ies' : 'y'}`);
}

async function saClearLog() {
    if (!await appConfirm('Clear Audit Log', 'Delete all audit log entries? This cannot be undone.', 'Clear All', true)) return;
    saLogSave([]);
    saRenderLog();
    showToast('Audit log cleared');
}

// ── Helpers ───────────────────────────────────────────────────
function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _fmtTs(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'2-digit' })
        + ' ' + d.toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit', hour12:true });
}
function _logTag(action) {
    const m = { save:'log-tag-save', create:'log-tag-create', login:'log-tag-auth', logout:'log-tag-auth', delete:'log-tag-delete', approve:'log-tag-create', reject:'log-tag-delete', role_change:'log-tag-role', edit:'log-tag-role' };
    return m[action] || 'log-tag-role';
}
function _roleLabel(r) {
    return { superadmin:'System Admin', admin:'User', viewer:'Viewer' }[r] || r;
}
function _renderPagination(containerId, total, current, onPage) {
    const pages = Math.ceil(total / SA_PAGE_SIZE) || 1;
    const el    = document.getElementById(containerId);
    if (!el) return;
    const info = document.createElement('span');
    info.textContent = `${Math.min((current-1)*SA_PAGE_SIZE+1, total)}–${Math.min(current*SA_PAGE_SIZE, total)} of ${total}`;
    const btns = document.createElement('div');
    btns.className = 'sa-page-btns';
    const mkBtn = (label, page, disabled = false, active = false) => {
        const b = document.createElement('button');
        b.className = 'sa-page-btn' + (active ? ' active' : '');
        b.textContent = label;
        b.disabled = disabled;
        b.onclick = () => onPage(page);
        return b;
    };
    btns.appendChild(mkBtn('‹', current - 1, current <= 1));
    const lo = Math.max(1, current - 2), hi = Math.min(pages, current + 2);
    for (let p = lo; p <= hi; p++) btns.appendChild(mkBtn(p, p, false, p === current));
    btns.appendChild(mkBtn('›', current + 1, current >= pages));
    el.innerHTML = '';
    el.appendChild(info);
    el.appendChild(btns);
}

// ── Init (called when switching to sysadmin module) ──────────
function saInit() {
    saRenderOverview();
    // activate overview tab
    document.querySelectorAll('.sa-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sa-panel').forEach(p => p.classList.remove('active'));
    const ovTab = document.getElementById('sa-tab-overview');
    const ovPanel = document.getElementById('sa-panel-overview');
    if (ovTab) ovTab.classList.add('active');
    if (ovPanel) ovPanel.classList.add('active');
}

// ── Wire up when DOM ready ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        saPatchSaveLogs();
        saPatchAuthLogs();
    }, 300);
});

// ── Show/hide password in Create/Edit User modal ──────────────
function _saToggleEditPwd() {
    const inp = document.getElementById('sa-edit-password');
    const btn = document.getElementById('sa-edit-pwd-toggle');
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.innerHTML = show
        ? `<svg viewBox="0 0 20 20" fill="currentColor" width="15"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>`
        : `<svg viewBox="0 0 20 20" fill="currentColor" width="15"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/></svg>`;
}
