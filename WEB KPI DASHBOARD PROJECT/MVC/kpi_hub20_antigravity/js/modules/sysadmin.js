/* ============================================================
   js/modules/sysadmin.js
   System Admin Dashboard — in-browser:
   - Full user CRUD (create, edit password/role/name, delete)
   - Pending registration approvals
   - All-modules data table (read all periods, all entries)
   - Audit / activity log (who, when, what)
   ============================================================ */

// ── Sign-out confirmation ─────────────────────────────────────
async function saConfirmLogout() {
    const ok = await appConfirm('Sign Out','Are you sure you want to sign out?','Sign Out',false);
    if (ok) authLogout();
}

// ── Audit log (in localStorage) ──────────────────────────────
function saLogGet() {
    try { return JSON.parse(localStorage.getItem('sc_hub_log') || '[]'); } catch(e) { return []; }
}
function saLogSave(entries) {
    try { localStorage.setItem('sc_hub_log', JSON.stringify(entries.slice(-2000))); } catch(e) {} // keep last 2000
}
function saLog(action, module = '', detail = '') {
    if (!authSession?.loggedIn) return;

    // Always write to localStorage as local fallback / cache
    const entries = saLogGet();
    entries.push({
        ts:       new Date().toISOString(),
        username: authSession.username,
        display:  authSession.displayName || authSession.username,
        role:     authSession.role,
        action, module, detail
    });
    saLogSave(entries);

    // Also write to MySQL when online (makes logs shared across all devices)
    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
        API.auditLog(action, module, detail).catch(() => {});
    }

    // Refresh log panel if currently visible
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
    // Stats: read from MySQL when online (cross-device accurate)
    // Fall back to localStorage when offline
    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
        API.auditStats().then(res => {
            if (res && !res.error) {
                setHTML('sa-stat-saves',  res.saves  ?? '—');
                setHTML('sa-stat-logins', res.logins ?? '—');
            }
        }).catch(() => {
            const log = saLogGet();
            setHTML('sa-stat-saves',  log.filter(e => e.action === 'save').length);
            setHTML('sa-stat-logins', log.filter(e => e.action === 'login').length);
        });
    } else {
        const log = saLogGet();
        setHTML('sa-stat-saves',  log.filter(e => e.action === 'save').length);
        setHTML('sa-stat-logins', log.filter(e => e.action === 'login').length);
    }

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
        setHTML('sa-online-list', '<div class="um-empty">No users currently online.</div>');
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
let saDataYear    = '';   // '' = all years
let saDataMonth   = '';   // '' = all months

async function saRenderData() {
    const module = document.getElementById('sa-data-module')?.value || 'finance';
    saDataModule = module;
    saDataYear   = document.getElementById('sa-data-year')?.value  || '';
    saDataMonth  = document.getElementById('sa-data-month')?.value || '';
    const schema = saGetSchema(module);

    // Show a loading indicator while fetching
    setHTML('sa-data-tbody', `<tr class="sa-empty-row"><td colspan="${schema.length + 1}">Loading…</td></tr>`);

    // When online: pull ALL saved periods for this module from MySQL
    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
        const dbResult = await API.loadAllPeriods(module);
        if (Array.isArray(dbResult) && dbResult.length > 0) {
            _saPopulateInMemory(module, dbResult);
        }
    }

    // Read from in-memory DBs (now filled with all-period data)
    const rows = saGetAllData(module);

    // Filter by year and month
    let filtered = rows;
    if (saDataYear)  filtered = filtered.filter(r => String(r[0]) === saDataYear);
    if (saDataMonth) filtered = filtered.filter(r => String(r[1]) === saDataMonth);

    // Text search
    if (saDataSearch) {
        const q = saDataSearch.toLowerCase();
        filtered = filtered.filter(r => r.some(v => String(v||'').toLowerCase().includes(q)));
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
    const schemaLen = schema.length;
    const headers = schema.map((col, i) => {
        const stickyClass = i === 0 ? 'sa-th-sticky-year' : i === 1 ? 'sa-th-sticky-month' : '';
        const sortClass   = saDataSort.col === i ? 'sorted-'+(saDataSort.dir) : '';
        return `<th onclick="saDataSortCol(${i})" class="${sortClass} ${stickyClass}" title="${col}">
            ${col} <span class="sort-icon">${saDataSort.col===i ? (saDataSort.dir==='asc'?'▲':'▼') : '⇅'}</span>
        </th>`;
    }).join('');
    setHTML('sa-data-thead', `<tr>${headers}<th class="sa-col-actions sa-th-sticky-actions">Actions</th></tr>`);

    // Store rows in a registry keyed by index so onclick handlers can look them up
    // safely without any JSON/HTML escaping issues.
    window._saDataRows = window._saDataRows || {};
    window._saDataRows[module] = filtered; // store all filtered rows for lookup

    const tbody = page.map((row, pageIdx) => {
        const absIdx = start + pageIdx; // index into the filtered array
        // First 2 cols = year/month = sticky; rest = scrollable; last = sticky actions
        const cells = row.map((v, i) => {
            const sticky = (i === 0 || i === 1) ? 'sa-td-sticky-' + (i===0?'year':'month') : '';
            return `<td class="${i < 2 ? 'mono' : 'dim'} ${sticky}">${_esc(String(v ?? '—'))}</td>`;
        }).join('');
        return `<tr>
            ${cells}
            <td class="sa-data-actions sa-td-sticky-actions">
                <button class="sa-action-btn sa-action-edit"
                    title="Go to Data Entry for this record"
                    onclick="saDataEditByIdx('${_esc(module)}', ${absIdx})">
                    <svg viewBox="0 0 16 16" fill="currentColor" width="11"><path d="M12.854.146a.5.5 0 00-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 000-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.5h.5a.5.5 0 01.5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 016 13.5V13h-.5a.5.5 0 01-.5-.5V12h-.5a.5.5 0 01-.5-.5V11h-.5a.5.5 0 01-.5-.5V10h-.5a.499.499 0 01-.175-.032l-.179.178a.5.5 0 00-.11.168l-2 5a.5.5 0 00.65.65l5-2a.5.5 0 00.168-.11l.178-.178z"/></svg>
                    Edit
                </button>
                <button class="sa-action-btn sa-action-delete"
                    title="Delete this record"
                    onclick="saDataDeleteByIdx('${_esc(module)}', ${absIdx})">
                    <svg viewBox="0 0 16 16" fill="currentColor" width="11"><path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" clip-rule="evenodd"/></svg>
                </button>
            </td>
        </tr>`;
    }).join('');
    setHTML('sa-data-tbody', tbody || `<tr class="sa-empty-row"><td colspan="${schema.length + 1}">No data entered yet for this module.</td></tr>`);

    _renderPagination('sa-data-pager', total, saDataPage, n => { saDataPage = n; saRenderData(); });
    setText('sa-data-count', `${total} record${total !== 1 ? 's' : ''}`);
}

// ── Populate in-memory DBs from MySQL bulk response ───────────
function _saPopulateInMemory(module, dbResult) {
    const MONTHS_LIST = ['January','February','March','April','May','June',
                         'July','August','September','October','November','December'];
    for (const { year, month, data } of dbResult) {
        const y = String(year); const m = month;
        if (!MONTHS_LIST.includes(m) || !data) continue;
        if (module === 'finance') {
            if (!finDB[y]) finDB[y] = {};
            if (data.prod?.actual || data.op?.actual || data.cap?.actual || data.other?.actual ||
                data.labor?.dl?.reg || data.labor?.dl?.ot) {
                finDB[y][m] = {
                    prod:  {actual:data.prod?.actual??'',   target:data.prod?.target??''},
                    op:    {actual:data.op?.actual??'',     budget:data.op?.budget??''},
                    cap:   {actual:data.cap?.actual??'',    budget:data.cap?.budget??''},
                    other: {actual:data.other?.actual??'',  budget:data.other?.budget??''},
                    labor: {dl:{reg:data.labor?.dl?.reg??'',ot:data.labor?.dl?.ot??''},
                            il:{reg:data.labor?.il?.reg??'',ot:data.labor?.il?.ot??''}},
                };
            }
        } else if (module === 'procurement') {
            if (!procDB[y]) procDB[y] = {};
            if (data.actual || data.target)
                procDB[y][m] = {actual:data.actual??'', target:data.target??''};
        } else if (module === 'planning') {
            if (!plDB[y]) plDB[y] = {};
            if (Object.keys(data).length) {
                if (!plDB[y][m]) plDB[y][m] = {};
                Object.assign(plDB[y][m], data);
            }
        } else if (module === 'warehouse') {
            if (!whDB[y]) whDB[y] = {};
            if (Object.keys(data).length) {
                whDB[y][m] = {
                    vol: {...{del:'',ord:''},      ...(data.vol??{})},
                    fr:  {sc:{...{del:'',ord:''},...(data.fr?.sc??{})},
                          corp:{...{del:'',ord:''},...(data.fr?.corp??{})},
                          core:{...{del:'',ord:''},...(data.fr?.core??{})},
                          m7:{...{del:'',ord:''},...(data.fr?.m7??{})}},
                    wh:     {...(data.wh??{})},
                    otdl:   {...(data.otdl??{})},
                    trucks: {...(data.trucks??{})},
                    mp:     {...(data.mp??{})}
                };
            }
        } else if (module === 'production_util' || module === 'prod_util') {
            if (!utilDB[y]) utilDB[y] = {};
            if (Object.keys(data).length) { if (!utilDB[y][m]) utilDB[y][m] = {}; Object.assign(utilDB[y][m], data); }
        } else if (module === 'production_waste' || module === 'prod_waste') {
            if (!wasteDB[y]) wasteDB[y] = {};
            if (Object.keys(data).length) { if (!wasteDB[y][m]) wasteDB[y][m] = {}; Object.assign(wasteDB[y][m], data); }
        } else if (module === 'production_sched' || module === 'prod_sched') {
            if (!schedDB[y]) schedDB[y] = {};
            if (Object.keys(data).length) { if (!schedDB[y][m]) schedDB[y][m] = {}; Object.assign(schedDB[y][m], data); }
        }
    }
}

// ── Print data records ─────────────────────────────────────────
function saDataPrint() {
    const module = saDataModule;
    const yr = saDataYear || 'All Years';
    const mo = saDataMonth || 'All Months';
    const schema = saGetSchema(module);
    const rows   = window._saDataRows?.[module] ?? saGetAllData(module);
    const e = v => String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const thead = schema.map(c=>`<th>${e(c)}</th>`).join('');
    const tbody = rows.map(r=>`<tr>${r.map(v=>`<td>${e(String(v??''))}</td>`).join('')}</tr>`).join('');
    const win = window.open('','_blank','width=1100,height=750');
    if (!win) { showToast('Allow pop-ups to print.'); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${module} — ${mo} ${yr}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:11px;color:#0a0f1e;padding:16px}
h2{font-size:16px;font-weight:800;margin-bottom:4px}.meta{font-size:11px;color:#3d5070;margin-bottom:14px}
table{width:100%;border-collapse:collapse}
th{background:#1e2d4f;color:#c5d5f0;padding:7px 9px;text-align:left;font-size:9px;text-transform:uppercase;border:1px solid #0d1629}
td{padding:6px 9px;border:1px solid #d0d8e8}tr:nth-child(even) td{background:#f3f6fb}
@page{margin:1cm;size:A4 landscape}</style></head><body>
<h2>Pioneer SC Ops Hub — ${e(module.replace(/_/g,' '))}</h2>
<div class="meta">Period: ${e(mo)} ${e(yr)} · Printed: ${new Date().toLocaleString('en-PH')} · ${rows.length} record(s)</div>
<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
<script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
}

// ── Export CSV ─────────────────────────────────────────────────
function saDataExport() {
    const module = saDataModule;
    const yr = saDataYear || 'all';
    const mo = saDataMonth || 'all';
    const schema = saGetSchema(module);
    const rows   = window._saDataRows?.[module] ?? saGetAllData(module);
    if (!rows.length) { showToast('No data to export.'); return; }
    const esc = v => {
        const sv = String(v ?? '');
        const needsQuote = sv.indexOf(',') >= 0 || sv.indexOf('"') >= 0;
        return needsQuote ? '"' + sv.replace(/"/g, '""') + '"' : sv;
    };
    const CRLF = String.fromCharCode(13, 10);
    const lines = [schema.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))];
    const blob = new Blob([lines.join(CRLF)], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: module + '_' + mo + '_' + yr + '.csv'
    });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
    showToast('Exported ' + rows.length + ' records as CSV');
    saLog('export', 'Data Records', module + ' ' + mo + ' ' + yr);
}

// ── Import CSV ─────────────────────────────────────────────────
async function saDataImport(inputEl) {
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;
    const module = saDataModule;
    const ok = await appConfirm('Import CSV',
        'Import "' + file.name + '" into ' + module + '? Matching period records will be overwritten.',
        'Import', false);
    if (!ok) { inputEl.value = ''; return; }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const CR = String.fromCharCode(13);
        const LF = String.fromCharCode(10);
        const text = e.target.result;
        // Split on LF, strip trailing CR
        const allLines = text.split(LF).map(function(l) { return l.replace(CR, ''); }).filter(function(l) { return l.trim(); });
        if (!allLines.length) { showToast('Empty file.'); return; }

        const parseRow = function(line) {
            const cells = []; let cur = ''; let inQ = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQ && line[i+1] === '"') { cur += '"'; i++; }
                    else inQ = !inQ;
                } else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
                else cur += ch;
            }
            cells.push(cur.trim()); return cells;
        };

        const headers = parseRow(allLines[0]);
        const rows    = allLines.slice(1).map(parseRow);
        const yIdx = headers.findIndex(function(h) { return h.toLowerCase() === 'year'; });
        const mIdx = headers.findIndex(function(h) { return h.toLowerCase() === 'month'; });
        if (yIdx < 0 || mIdx < 0) { showToast('CSV must have Year and Month columns.'); inputEl.value = ''; return; }

        const MONTHS_L = ['January','February','March','April','May','June',
                          'July','August','September','October','November','December'];
        let imported = 0;
        const synced = {};

        for (let ri = 0; ri < rows.length; ri++) {
            const row = rows[ri];
            const year  = row[yIdx] && row[yIdx].trim();
            const month = row[mIdx] && row[mIdx].trim();
            if (!year || !month || MONTHS_L.indexOf(month) < 0) continue;
            if (_importRowCSV(module, headers, row, year, month)) {
                imported++;
                synced[year + '|' + month] = true;
            }
        }

        if (!imported) { showToast('No valid rows found in file.'); inputEl.value = ''; return; }

        // Sync each imported period to MySQL when online
        if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
            const keys = Object.keys(synced);
            let savedCount = 0;
            for (let ki = 0; ki < keys.length; ki++) {
                const parts = keys[ki].split('|');
                const yr = parts[0]; const mo = parts[1];
                const mNum = MONTHS_L.indexOf(mo) + 1;
                if (mNum < 1) continue;
                try {
                    if (module === 'finance') {
                        const payload = (finDB[yr] && finDB[yr][mo]) ? { ...finDB[yr][mo], module: 'finance', year: parseInt(yr), month: mNum } : null;
                        if (payload) { await API.save('finance', parseInt(yr), mNum, finDB[yr][mo]); savedCount++; }
                    } else if (module === 'procurement') {
                        const d = procDB[yr] && procDB[yr][mo];
                        if (d) { await API.save('procurement', parseInt(yr), mNum, d); savedCount++; }
                    } else if (module === 'planning') {
                        const d = plDB[yr] && plDB[yr][mo];
                        if (d) { await API.save('planning', parseInt(yr), mNum, { fields: d }); savedCount++; }
                    } else if (module === 'warehouse') {
                        const d = whDB[yr] && whDB[yr][mo];
                        if (d) { await API.save('warehouse', parseInt(yr), mNum, d); savedCount++; }
                    } else if (module === 'production_util') {
                        // Send one line at a time (backend expects a single line per call)
                        const db = utilDB[yr] && utilDB[yr][mo];
                        if (db) {
                            for (const lineKey of Object.keys(db)) {
                                const d = db[lineKey];
                                const tot = utilKeys2.reduce((s, k) => s + (+d[k] || 0), 0);
                                if (!tot && !d.mAvail && !d.days) continue; // skip empty lines
                                await API.save('prod_util', parseInt(yr), mNum, { line: lineKey, ...d });
                                savedCount++;
                            }
                        }
                    } else if (module === 'production_waste') {
                        const db = wasteDB[yr] && wasteDB[yr][mo];
                        if (db) {
                            for (const lineKey of Object.keys(db)) {
                                const d = db[lineKey];
                                if (!d.fg && !d.waste && !d.rep && !d.rej) continue;
                                await API.save('prod_waste', parseInt(yr), mNum, { line: lineKey, ...d });
                                savedCount++;
                            }
                        }
                    } else if (module === 'production_sched') {
                        const db = schedDB[yr] && schedDB[yr][mo];
                        if (db) {
                            for (const lineKey of Object.keys(db)) {
                                const d = db[lineKey];
                                if (!d.actual && !d.planned) continue;
                                await API.save('prod_sched', parseInt(yr), mNum, { line: lineKey, ...d });
                                savedCount++;
                            }
                        }
                    }
                } catch(err) { console.warn('sync err', err); }
            }
            showToast('Imported and synced ' + savedCount + ' record(s) to database');
        } else {
            showToast('Imported ' + imported + ' record(s) (offline — reload will reset)');
        }
        if (typeof globalFilterChange === 'function') globalFilterChange();
        saLog('import', 'Data Records', module + ' from ' + file.name + ' (' + imported + ')');
        saRenderData();
        inputEl.value = '';
    };
    reader.readAsText(file);
}

function _importRowCSV(module, headers, row, year, month) {
    const get = function(col) {
        const i = headers.findIndex(function(h) { return h === col; });
        return (i >= 0 && row[i]) ? row[i].trim() : '';
    };
    if (module === 'finance') {
        if (!finDB[year]) finDB[year] = {};
        finDB[year][month] = {
            prod:  { actual: get('Prod Act')  || get('Prod Actual (MT)'),  target: get('Prod Tgt')  || get('Prod Target (MT)') },
            op:    { actual: get('Op Act')    || get('Op Actual'),          budget: get('Op Bgt')    || get('Op Budget') },
            cap:   { actual: get('Cap Act')   || get('Cap Actual'),         budget: get('Cap Bgt')   || get('Cap Budget') },
            other: { actual: get('Oth Act')   || get('Other Actual'),       budget: get('Oth Bgt')   || get('Other Budget') },
            labor: {
                dl: { reg: get('DL Reg') || get('DL Reg Hrs'), ot: get('DL OT') || get('DL OT Hrs') },
                il: { reg: get('IL Reg') || get('IL Reg Hrs'), ot: get('IL OT') || get('IL OT Hrs') },
            },
        };
        return true;
    }
    if (module === 'procurement') {
        if (!procDB[year]) procDB[year] = {};
        procDB[year][month] = {
            actual: get('Actual (\u20b1)') || get('Actual Savings (\u20b1)'),
            target: get('Target (\u20b1)') || get('Target Savings (\u20b1)'),
        };
        return true;
    }
    if (module === 'planning') {
        if (!plDB[year]) plDB[year] = {};
        plDB[year][month] = {
            fgA: get('FG Core (Days)'), fgB: get('FG M7 (Days)'), fgC: get('FG Others (Days)'), fgAllIn: get('FG All-In (Days)'),
            rmA: get('RM Core (Days)'), rmB: get('RM M7 (Days)'), rmC: get('RM Others (Days)'),
            pmCore: get('PM Core (Days)'), pmM7: get('PM M7 (Days)'), pmOthers: get('PM Others (Days)'),
            fgKgsFG: get('FG Kgs Core'), fgKgsFN: get('FG Kgs M7'), fgKgsSL: get('FG Kgs Others'), fgKgsEX: get('FG Kgs Exp'), fgKgsDays: get('FG Kgs Days'),
            fgPhpFG: get('FG Php Core'), fgPhpFN: get('FG Php M7'), fgPhpSL: get('FG Php Others'), fgPhpEX: get('FG Php Exp'),
            rmKgsFG: get('RM Kgs Core'), rmKgsFN: get('RM Kgs M7'), rmKgsSL: get('RM Kgs Others'), rmKgsEX: get('RM Kgs Exp'), rmKgsDays: get('RM Kgs Days'),
            rmPhpFG: get('RM Php Core'), rmPhpFN: get('RM Php M7'), rmPhpSL: get('RM Php Others'), rmPhpEX: get('RM Php Exp'),
            fgCnt: get('FG Cnt'), fgMiss: get('FG Miss'), rmCnt: get('RM Cnt'), rmMiss: get('RM Miss'),
            fcGma: get('FC GMA'), fcNorth: get('FC North'), fcSouth: get('FC South'), fcVis: get('FC Vis'), fcMind: get('FC Mind'), fcMT: get('FC MT'), fcPsbsi: get('FC PSBSI'),
            fcIndo: get('FC Indo'), fcIndia: get('FC India'), fcDirect: get('FC Direct'),
            pEpoxy: get('P Epoxy'), pElasto: get('P Elasto'), pMighty: get('P Mighty'), pProEpoxy: get('P Pro-Epoxy'), pBuilders: get('P Builders'), pCoating: get('P Coating'), pTransport: get('P Transport'), pOther: get('P Other'), pSealant: get('P Sealant'), pWaterproof: get('P Waterproof'), pPainting: get('P Painting'), pAdhesives: get('P Adhesives'), pMining: get('P Mining'), pOthers: get('P Others')
        };
        return true;
    }
    if (module === 'warehouse') {
        if (!whDB[year]) whDB[year] = {};
        whDB[year][month] = {
            vol: { del: get('Vol Del'), ord: get('Vol Ord') },
            fr: {
                sc: { del: get('FR SC Del'), ord: get('FR SC Ord') },
                corp: { del: get('FR Corp Del'), ord: get('FR Corp Ord') },
                core: { del: get('FR Core Del'), ord: get('FR Core Ord') },
                m7: { del: get('FR M7 Del'), ord: get('FR M7 Ord') }
            },
            wh: { rmTot: get('WH RM Tot'), rmUsed: get('WH RM Used'), fgTot: get('WH FG Tot'), fgUsed: get('WH FG Used'), extTot: get('WH Ext Tot'), extUsed: get('WH Ext Used') },
            otdl: { gma: get('OTDL GMA'), north: get('OTDL North'), central: get('OTDL Central'), south: get('OTDL South'), vis: get('OTDL Vis'), mind: get('OTDL Mind'), mt: get('OTDL MT'), pai: get('OTDL PAI') },
            trucks: { t10: get('Truck T10'), auv: get('Truck AUV'), t6: get('Truck T6'), t4: get('Truck T4'), c20: get('Truck C20') },
            mp: { reg: get('MP Reg'), agy: get('MP Agy'), res: get('MP Res'), regH: get('MP Reg H'), agyH: get('MP Agy H'), otH: get('MP OT H'), abs: get('MP Abs'), days: get('MP Days') }
        };
        return true;
    }
    if (module === 'production_util') {
        if (!utilDB[year]) utilDB[year] = {};
        if (!utilDB[year][month]) utilDB[year][month] = {};
        const lineName = get('Line');
        if (!lineName) return false;
        const lineKey = utilLines.find(lk => (utilLineNames[lk]||lk) === lineName) || lineName;
        utilDB[year][month][lineKey] = {
            productive: get('Productive'), noPlan: get('No Plan'), noHc: get('No HC'), changeOver: get('Change Over'),
            meeting: get('Meeting'), sanitation: get('Sanitation'), startup: get('Startup'), shutdown: get('Shutdown'),
            testing: get('Testing'), breaktime: get('Breaktime'), pm: get('PM'), force: get('Force Majeure'),
            elec: get('Elec Breakdown'), mech: get('Mech Breakdown'), material: get('Material'), sorting: get('Sorting'),
            tech: get('Tech'), noManpower: get('No Manpower'), udt: get('UDT'), noOt: get('No OT'),
            noBulk: get('No Bulk'), transfer: get('Transfer'), idle: get('Idle'),
            mAvail: get('M.Avail'), mUsed: get('M.Used'), days: get('Days')
        };
        return true;
    }
    if (module === 'production_waste') {
        if (!wasteDB[year]) wasteDB[year] = {};
        if (!wasteDB[year][month]) wasteDB[year][month] = {};
        const lineName = get('Line');
        if (!lineName) return false;
        const lineKey = wasteLines.find(lk => (wasteLineNames[lk]||lk) === lineName) || lineName;
        wasteDB[year][month][lineKey] = {
            fg: get('FG Output'), rep: get('Reprocess'), rej: get('Rejection'), waste: get('Waste')
        };
        return true;
    }
    if (module === 'production_sched') {
        if (!schedDB[year]) schedDB[year] = {};
        if (!schedDB[year][month]) schedDB[year][month] = {};
        const lineName = get('Line');
        if (!lineName) return false;
        const lineKey = schedLines.find(lk => (schedLineNames[lk]||lk) === lineName) || lineName;
        schedDB[year][month][lineKey] = {
            actual: get('Actual'), planned: get('Planned')
        };
        return true;
    }
    return false;
}

function saDataSortCol(col) {
    if (saDataSort.col === col) saDataSort.dir = saDataSort.dir === 'asc' ? 'desc' : 'asc';
    else { saDataSort.col = col; saDataSort.dir = 'asc'; }
    saDataPage = 1;
    saRenderData();
}

// ── Index-based wrappers (safe from HTML escaping issues) ──────
function saDataEditByIdx(module, idx) {
    const rows = window._saDataRows?.[module];
    if (!rows || !rows[idx]) { showToast('Row not found.'); return; }
    const row  = rows[idx];
    const year  = String(row[0] ?? '');
    const month = String(row[1] ?? '');
    const line  = module.startsWith('production_') ? String(row[2] ?? '') : '';
    saDataEdit(module, year, month, line);
}

async function saDataDeleteByIdx(module, idx) {
    const rows = window._saDataRows?.[module];
    if (!rows || !rows[idx]) { showToast('Row not found.'); return; }
    const row  = rows[idx];
    const year  = String(row[0] ?? '');
    const month = String(row[1] ?? '');
    const line  = module.startsWith('production_') ? String(row[2] ?? '') : '';
    await saDataDelete(module, year, month, line);
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
            vol:{del:'',ord:''},
            fr:{sc:{del:'',ord:''},corp:{del:'',ord:''},core:{del:'',ord:''},m7:{del:'',ord:''}},
            wh:{rmTot:'',rmUsed:'',fgTot:'',fgUsed:'',extTot:'',extUsed:''},
            otdl:{gma:'',north:'',central:'',south:'',vis:'',mind:'',mt:'',pai:''},
            trucks:{t10:'',auv:'',t6:'',t4:'',c20:''},
            mp:{reg:'',agy:'',res:'',regH:'',agyH:'',otH:'',abs:'',days:''}
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
    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online' && typeof API !== 'undefined') {
        const mNum = MONTHS_LIST.indexOf(month) + 1;
        if (mNum > 0) {
            // Map frontend module names to backend table names
            const backendModule = {
                finance: 'finance', planning: 'planning', procurement: 'procurement',
                production_util: 'prod_util', production_waste: 'prod_waste', production_sched: 'prod_sched',
                warehouse: 'warehouse',
            }[module] || module;

            // For production modules, resolve line human-name → line_key for the DB
            let lineKey = null;
            if (module === 'production_util')  lineKey = utilLines.find(lk => (utilLineNames[lk]||lk) === line) || line || null;
            if (module === 'production_waste') lineKey = wasteLines.find(lk => (wasteLineNames[lk]||lk) === line) || line || null;
            if (module === 'production_sched') lineKey = schedLines.find(lk => (schedLineNames[lk]||lk) === line) || line || null;

            try {
                const res = await API.deleteRecord(backendModule, parseInt(year), mNum, lineKey);
                if (res?.error) console.warn('[saDataDelete] DB delete error:', res.error);
                else console.log(`[saDataDelete] Deleted from DB: ${backendModule} ${month} ${year}${lineKey ? ' / '+lineKey : ''}`);
            } catch(e) { console.warn('[saDataDelete] DB delete exception:', e); }
        }
    }

    saLog('delete', 'Data Records', `Deleted ${label}`);
    showToast(`🗑 Deleted: ${label}`);
    saRenderData(); // refresh table
}

function saGetSchema(module) {
    const schemas = {
        finance:          ['Year','Month','Prod Act','Prod Tgt','Op Act','Op Bgt','Cap Act','Cap Bgt','Oth Act','Oth Bgt','DL Reg','DL OT','IL Reg','IL OT'],
        planning:         ['Year','Month','FG Core (Days)','FG M7 (Days)','FG Others (Days)','FG All-In (Days)','RM Core (Days)','RM M7 (Days)','RM Others (Days)','PM Core (Days)','PM M7 (Days)','PM Others (Days)','FG Kgs Core','FG Kgs M7','FG Kgs Others','FG Kgs Exp','FG Kgs Days','FG Php Core','FG Php M7','FG Php Others','FG Php Exp','RM Kgs Core','RM Kgs M7','RM Kgs Others','RM Kgs Exp','RM Kgs Days','RM Php Core','RM Php M7','RM Php Others','RM Php Exp','FG Cnt','FG Miss','RM Cnt','RM Miss','FC GMA','FC North','FC South','FC Vis','FC Mind','FC MT','FC PSBSI','FC Indo','FC India','FC Direct','P Epoxy','P Elasto','P Mighty','P Pro-Epoxy','P Builders','P Coating','P Transport','P Other','P Sealant','P Waterproof','P Painting','P Adhesives','P Mining','P Others'],
        procurement:      ['Year','Month','Actual (₱)','Target (₱)'],
        production_util:  ['Year','Month','Line','Productive','No Plan','No HC','Change Over','Meeting','Sanitation','Startup','Shutdown','Testing','Breaktime','PM','Force Majeure','Elec Breakdown','Mech Breakdown','Material','Sorting','Tech','No Manpower','UDT','No OT','No Bulk','Transfer','Idle','M.Avail','M.Used','Days'],
        production_waste: ['Year','Month','Line','FG Output','Reprocess','Rejection','Waste'],
        production_sched: ['Year','Month','Line','Actual','Planned'],
        warehouse:        ['Year','Month','Vol Del','Vol Ord','FR SC Del','FR SC Ord','FR Corp Del','FR Corp Ord','FR Core Del','FR Core Ord','FR M7 Del','FR M7 Ord','WH RM Tot','WH RM Used','WH FG Tot','WH FG Used','WH Ext Tot','WH Ext Used','OTDL GMA','OTDL North','OTDL Central','OTDL South','OTDL Vis','OTDL Mind','OTDL MT','OTDL PAI','Truck T10','Truck AUV','Truck T6','Truck T4','Truck C20','MP Reg','MP Agy','MP Res','MP Reg H','MP Agy H','MP OT H','MP Abs','MP Days'],
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
                const anySet = ['fgA','fgB','fgC','rmA','rmB','rmC','fcGma','fcNorth','pEpoxy','rmPhpFG','fgCnt'].some(k => d[k] !== '');
                if (!anySet) return;
                rows.push([y, m, d.fgA||'', d.fgB||'', d.fgC||'', d.fgAllIn||'', d.rmA||'', d.rmB||'', d.rmC||'', d.pmCore||'', d.pmM7||'', d.pmOthers||'', d.fgKgsFG||'', d.fgKgsFN||'', d.fgKgsSL||'', d.fgKgsEX||'', d.fgKgsDays||'', d.fgPhpFG||'', d.fgPhpFN||'', d.fgPhpSL||'', d.fgPhpEX||'', d.rmKgsFG||'', d.rmKgsFN||'', d.rmKgsSL||'', d.rmKgsEX||'', d.rmKgsDays||'', d.rmPhpFG||'', d.rmPhpFN||'', d.rmPhpSL||'', d.rmPhpEX||'', d.fgCnt||'', d.fgMiss||'', d.rmCnt||'', d.rmMiss||'', d.fcGma||'', d.fcNorth||'', d.fcSouth||'', d.fcVis||'', d.fcMind||'', d.fcMT||'', d.fcPsbsi||'', d.fcIndo||'', d.fcIndia||'', d.fcDirect||'', d.pEpoxy||'', d.pElasto||'', d.pMighty||'', d.pProEpoxy||'', d.pBuilders||'', d.pCoating||'', d.pTransport||'', d.pOther||'', d.pSealant||'', d.pWaterproof||'', d.pPainting||'', d.pAdhesives||'', d.pMining||'', d.pOthers||'']);
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
                    if (!d) return;
                    const tot = utilKeys2.reduce((s,k) => s+(+d[k]||0), 0);
                    if (!tot && !d.mAvail && !d.days) return;
                    rows.push([y, m, utilLineNames[line]||line, d.productive||'', d.noPlan||'', d.noHc||'', d.changeOver||'', d.meeting||'', d.sanitation||'', d.startup||'', d.shutdown||'', d.testing||'', d.breaktime||'', d.pm||'', d.force||'', d.elec||'', d.mech||'', d.material||'', d.sorting||'', d.tech||'', d.noManpower||'', d.udt||'', d.noOt||'', d.noBulk||'', d.transfer||'', d.idle||'', d.mAvail||'', d.mUsed||'', d.days||'']);
                });
                break;
            }
            case 'production_waste': {
                const db = wasteDB[y]?.[m];
                if (!db) return;
                wasteLines.forEach(line => {
                    const d = db[line];
                    if (!d) return;
                    if (!d.fg && !d.waste) return;
                    rows.push([y, m, wasteLineNames[line]||line, d.fg||'', d.rep||'', d.rej||'', d.waste||'']);
                });
                break;
            }
            case 'production_sched': {
                const db = schedDB[y]?.[m];
                if (!db) return;
                schedLines.forEach(line => {
                    const d = db[line];
                    if (!d) return;
                    if (!d.actual && !d.planned) return;
                    rows.push([y, m, schedLineNames[line]||line, d.actual||'', d.planned||'']);
                });
                break;
            }
            case 'warehouse': {
                const d = whDB[y]?.[m];
                if (!d) return;
                // hasData: check for any non-empty, non-null value (including numeric 0 is falsy but '' means no data)
                const hasData = Object.values(d).some(cat => {
                    if (typeof cat !== 'object' || cat == null) return (cat !== '' && cat != null);
                    return Object.values(cat).some(v => {
                        if (typeof v === 'object' && v != null) return Object.values(v).some(val => val !== '' && val != null && val !== undefined);
                        return v !== '' && v != null && v !== undefined;
                    });
                });
                if (!hasData) return;
                rows.push([y, m,
                    d.vol?.del??'', d.vol?.ord??'',
                    d.fr?.sc?.del??'', d.fr?.sc?.ord??'',
                    d.fr?.corp?.del??'', d.fr?.corp?.ord??'',
                    d.fr?.core?.del??'', d.fr?.core?.ord??'',
                    d.fr?.m7?.del??'', d.fr?.m7?.ord??'',
                    d.wh?.rmTot??'', d.wh?.rmUsed??'', d.wh?.fgTot??'', d.wh?.fgUsed??'', d.wh?.extTot??'', d.wh?.extUsed??'',
                    d.otdl?.gma??'', d.otdl?.north??'', d.otdl?.central??'', d.otdl?.south??'',
                    d.otdl?.vis??'', d.otdl?.mind??'', d.otdl?.mt??'', d.otdl?.pai??'',
                    d.trucks?.t10??'', d.trucks?.auv??'', d.trucks?.t6??'', d.trucks?.t4??'', d.trucks?.c20??'',
                    d.mp?.reg??'', d.mp?.agy??'', d.mp?.res??'',
                    d.mp?.regH??'', d.mp?.agyH??'', d.mp?.otH??'', d.mp?.abs??'', d.mp?.days??''
                ]);
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

async function saRenderLog() {
    setHTML('sa-log-tbody', '<tr class="sa-empty-row"><td colspan="6">Loading…</td></tr>');

    let entries = [];
    let total   = 0;

    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
        // Pull from MySQL — includes entries from ALL devices
        const res = await API.auditList(2000, 0);
        if (res && !res.error && Array.isArray(res.entries)) {
            // Normalise MySQL rows to match the local format
            entries = res.entries.map(r => ({
                ts:       r.created_at,
                username: r.username || '—',
                display:  r.username || '—',  // MySQL doesn't store display_name in audit
                role:     '',                  // not stored in sc_audit
                action:   r.action || '',
                module:   r.module || '',
                detail:   r.detail || '',
            }));
            total = res.total ?? entries.length;
        }
    } else {
        // Offline: use localStorage
        entries = [...saLogGet()].reverse();
        total   = entries.length;
    }

    // Filter
    let filtered = entries;
    if (saLogFilter !== 'all') filtered = filtered.filter(e => e.action === saLogFilter);
    if (saLogSearch) {
        const q = saLogSearch.toLowerCase();
        filtered = filtered.filter(e =>
            (e.username||'').toLowerCase().includes(q) ||
            (e.module||'').toLowerCase().includes(q)   ||
            (e.detail||'').toLowerCase().includes(q)
        );
    }

    const filteredTotal = filtered.length;
    const start = (saLogPage - 1) * SA_PAGE_SIZE;
    const page  = filtered.slice(start, start + SA_PAGE_SIZE);

    const tbody = page.map(e => `
        <tr>
            <td class="dim nowrap mono" style="font-size:10px">${_fmtTs(e.ts)}</td>
            <td class="mono"><strong>${_esc(e.username)}</strong></td>
            <td><span class="log-tag ${_logTag(e.action)}">${e.action}</span></td>
            <td class="dim">${_esc(e.module)}</td>
            <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${_esc(e.detail||'')}">${_esc(e.detail||'—')}</td>
        </tr>`).join('');

    setHTML('sa-log-tbody', tbody || `<tr class="sa-empty-row"><td colspan="5">No log entries.</td></tr>`);
    _renderPagination('sa-log-pager', filteredTotal, saLogPage, n => { saLogPage = n; saRenderLog(); });
    setText('sa-log-count', `${filteredTotal} entr${filteredTotal !== 1 ? 'ies' : 'y'}`);
}

async function saClearLog() {
    if (!await appConfirm('Clear Audit Log', 'Delete all audit log entries? This cannot be undone.', 'Clear All', true)) return;
    // Clear localStorage
    saLogSave([]);
    // Clear MySQL when online
    if (typeof DB_MODE !== 'undefined' && DB_MODE === 'online') {
        const res = await API.auditClear();
        if (res?.error) { showToast('Error clearing MySQL log: ' + res.error); return; }
    }
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
