/* ============================================================
   js/core/api.js  –  HTTP client for the PHP/MySQL backend
   ============================================================
   Works in two modes:
     ONLINE  — XAMPP running, uses MySQL via PHP API
     OFFLINE — file:// or XAMPP not running, uses localStorage

   The app detects which mode it's in automatically.
   No config needed by the developer.
   ============================================================ */

const API = (() => {
    // ── Detect base URL ───────────────────────────────────────
    // Works from any HTTP/HTTPS host: localhost, 127.0.0.1, 192.168.x.x,
    // a hostname, or a production domain.  Only file:// falls back offline.
    const BASE = (() => {
        const { protocol, hostname, port, pathname } = window.location;
        if (protocol === 'file:') return null; // opened as local file — no server
        // Build API path from current page location
        // e.g. http://192.168.1.5/kpi_hub/index.html → http://192.168.1.5/kpi_hub/api
        const folder = pathname.split('/').slice(0, -1).join('/');
        return `${protocol}//${hostname}${port ? ':'+port : ''}${folder}/api`;
    })();

    let _token = null;
    let _online = null; // null = unchecked

    // ── Restore token from sessionStorage ────────────────────
    function _restore() {
        if (_token) return;
        try {
            const s = JSON.parse(sessionStorage.getItem('sc_hub_session') || 'null');
            if (s?.dbToken) _token = s.dbToken;
        } catch(e) {}
    }

    // ── Core fetch ────────────────────────────────────────────
    async function _fetch(file, body = null) {
        _restore();
        if (!BASE) return null;
        const opts = {
            method:  body ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
        };
        if (_token) opts.headers['X-Token'] = _token;
        if (body)   opts.body = JSON.stringify(body);
        try {
            const res  = await fetch(`${BASE}/${file}`, opts);
            const json = await res.json();
            if (!res.ok) return { error: json.msg || 'Request failed', status: res.status };
            return json.data ?? json;
        } catch(e) {
            return null; // network error → offline
        }
    }

    // ── Online check (run once at boot) ──────────────────────
    async function checkOnline() {
        if (_online !== null) return _online;
        if (!BASE) { _online = false; return false; }
        try {
            // Use a dedicated ping endpoint that always returns JSON quickly.
            // We don't care about the content — just that the server responded.
            const r = await fetch(`${BASE}/ping.php`, {
                method: 'GET',
                cache:  'no-store',
                signal: AbortSignal.timeout(3000),
            });
            _online = r.ok; // 200 = server is up and PHP is running
        } catch(e) {
            _online = false;
        }
        return _online;
    }

    // ── Auth ──────────────────────────────────────────────────
    async function login(username, password) {
        const res = await _fetch('auth.php', { action:'login', username, password });
        if (res?.token) {
            _token = res.token;
            _online = true;
            // Persist token in session
            try {
                const s = JSON.parse(sessionStorage.getItem('sc_hub_session') || '{}');
                s.dbToken = res.token;
                sessionStorage.setItem('sc_hub_session', JSON.stringify(s));
            } catch(e) {}
        }
        return res;
    }

    async function logout() {
        if (_token) await _fetch('auth.php', { action:'logout' });
        _token  = null;
        _online = null;
        try {
            const s = JSON.parse(sessionStorage.getItem('sc_hub_session') || '{}');
            delete s.dbToken;
            sessionStorage.setItem('sc_hub_session', JSON.stringify(s));
        } catch(e) {}
    }

    const register = (username, displayName, password, role) =>
        _fetch('auth.php', { action:'register', username, displayName, password, role });

    // ── User management ───────────────────────────────────────
    const usersList    = ()                   => _fetch('auth.php', { action:'users_list' });
    const usersPending = ()                   => _fetch('auth.php', { action:'users_pending' });
    const usersCreate  = (u,dn,pw,r)          => _fetch('auth.php', { action:'users_create',  username:u, displayName:dn, password:pw, role:r });
    const usersEdit    = (u,dn,pw,r)          => _fetch('auth.php', { action:'users_edit',    username:u, displayName:dn, password:pw, role:r });
    const usersDelete  = (u)                  => _fetch('auth.php', { action:'users_delete',  username:u });
    const usersApprove = (u)                  => _fetch('auth.php', { action:'users_approve', username:u });
    const usersReject  = (u)                  => _fetch('auth.php', { action:'users_reject',  username:u });
    const usersRole    = (u, role)            => _fetch('auth.php', { action:'users_role',    username:u, role });

    // ── KPI data ──────────────────────────────────────────────
    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

    async function loadAll(year, month) {
        const m = typeof month === 'string' ? MONTHS.indexOf(month)+1 : month;
        const res = await _fetch(`data.php?module=all&year=${year}&month=${m}`);
        return (res && !res.error) ? (res.data ?? res) : null;
    }

    // Load ALL saved periods for one module (sysadmin Data Records only)
    async function loadAllPeriods(module) {
        const res = await _fetch(`data.php?module=${module}&year=all`);
        if (!res || res.error) return null;
        // Returns array of {year, month, data} from PHP
        return Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : null);
    }

    async function load(module, year, month) {
        const m = typeof month === 'string' ? MONTHS.indexOf(month)+1 : month;
        const res = await _fetch(`data.php?module=${module}&year=${year}&month=${m}`);
        return (res && !res.error) ? (res.data ?? res) : null;
    }

    async function save(module, year, month, data) {
        const m = typeof month === 'string' ? MONTHS.indexOf(month)+1 : month;
        return _fetch('data.php', { module, year: +year, month: m, ...data });
    }

    async function deleteRecord(module, year, month, line = null) {
        _restore();
        if (!BASE) return null;
        const m = typeof month === 'string' ? MONTHS.indexOf(month)+1 : month;
        let url = `${BASE}/data.php?module=${encodeURIComponent(module)}&year=${year}&month=${m}`;
        if (line) url += `&line=${encodeURIComponent(line)}`;
        try {
            const res  = await fetch(url, {
                method:  'DELETE',
                headers: { 'Content-Type': 'application/json', ...(_token ? { 'X-Token': _token } : {}) },
            });
            const json = await res.json();
            if (!res.ok) return { error: json.msg || 'Delete failed', status: res.status };
            return json.data ?? json;
        } catch(e) { return null; }
    }

    // ── Heartbeat / sync / active sessions ──────────────────
    async function heartbeat() {
        return _fetch('ping.php', { action: 'heartbeat' });
    }

    async function checkSync(year, month, lastFetch) {
        const m = typeof month === 'string' ? MONTHS.indexOf(month)+1 : month;
        // GET request — use query string
        _restore();
        if (!BASE) return null;
        try {
            const r = await fetch(
                `${BASE}/ping.php?action=sync&year=${year}&month=${m}&last_fetch=${encodeURIComponent(lastFetch)}`,
                { headers: { 'X-Token': _token || '', 'Content-Type': 'application/json' }, cache: 'no-store' }
            );
            const j = await r.json();
            return j.data ?? j;
        } catch(e) { return null; }
    }

    async function activeSessions() {
        _restore();
        if (!BASE) return null;
        try {
            const r = await fetch(`${BASE}/ping.php?action=active_sessions`, {
                headers: { 'X-Token': _token || '', 'Content-Type': 'application/json' },
                cache: 'no-store',
            });
            const j = await r.json();
            return j.data ?? j;
        } catch(e) { return null; }
    }

    // ── Audit log ─────────────────────────────────────────────
    async function auditList(limit = 500, offset = 0) {
        return _fetch(`audit.php?action=list&limit=${limit}&offset=${offset}`);
    }
    async function auditStats() {
        return _fetch('audit.php?action=stats');
    }
    async function auditLog(actionName, module, detail) {
        return _fetch('audit.php', { action: 'log', action_name: actionName, module, detail });
    }
    async function auditClear() {
        return _fetch('audit.php', { action: 'clear' });
    }

    return {
        get online()  { return _online; },
        get token()   { return _token; },
        get base()    { return BASE; },
        checkOnline,
        login, logout, register,
        usersList, usersPending, usersCreate, usersEdit, usersDelete, usersApprove, usersReject, usersRole,
        loadAll, load, loadAllPeriods, save, deleteRecord,
        heartbeat, checkSync, activeSessions,
        auditList, auditStats, auditLog, auditClear,
    };
})();
