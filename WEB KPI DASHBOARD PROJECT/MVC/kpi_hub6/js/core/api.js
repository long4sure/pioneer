/* ============================================================
   js/core/api.js — HTTP client for the PHP/MySQL backend
   Wraps all fetch calls with auth token injection, error
   handling, and offline-mode fallback to localStorage.

   USAGE:
     API.login(username, password)           → { token, role, … }
     API.logout()
     API.load(module, year, month)           → module data object
     API.loadAll(year, month)                → all modules at once
     API.save(module, year, month, data)     → void
     API.listUsers()                         → users array
     API.listPending()                       → pending array
     API.approveUser(username)
     API.rejectUser(username)
     API.deleteUser(username)
     API.changeRole(username, role)
     API.register(username, displayName, password, role)
   ============================================================ */

const API = (() => {

    // ── Config ────────────────────────────────────────────────
    // Base URL auto-detects XAMPP vs file:// (offline fallback)
    const BASE = (() => {
        const origin = window.location.origin;
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            // Detect the subfolder path (e.g. /kpi_hub/ or /)
            const path = window.location.pathname.split('/').slice(0, -1).join('/');
            return `${origin}${path}/api`;
        }
        return null; // offline / file:// mode — use localStorage only
    })();

    let _token = null;

    // ── Load token from sessionStorage on init ────────────────
    function _initToken() {
        if (_token) return;
        try {
            const s = JSON.parse(sessionStorage.getItem('sc_hub_session') || 'null');
            if (s?.dbToken) _token = s.dbToken;
        } catch(e) {}
    }

    // ── Core fetch wrapper ────────────────────────────────────
    async function _req(endpoint, body = null, method = null) {
        _initToken();
        if (!BASE) return null; // offline mode — caller handles fallback

        const opts = {
            method:  method || (body ? 'POST' : 'GET'),
            headers: { 'Content-Type': 'application/json' },
        };
        if (_token) opts.headers['X-Auth-Token'] = _token;
        if (body)   opts.body = JSON.stringify(body);

        try {
            const res  = await fetch(`${BASE}/${endpoint}`, opts);
            const json = await res.json();
            if (!res.ok) {
                console.warn(`[API] ${endpoint} → ${res.status}:`, json.message);
                return { error: json.message, status: res.status };
            }
            return json.data ?? json;
        } catch (err) {
            console.warn('[API] Network error:', err.message);
            return null; // triggers offline fallback
        }
    }

    // ── Determine if backend is available ─────────────────────
    let _backendAvailable = null;
    async function isOnline() {
        if (_backendAvailable !== null) return _backendAvailable;
        if (!BASE) { _backendAvailable = false; return false; }
        try {
            const r = await fetch(`${BASE}/auth.php?action=ping`, { method: 'GET', signal: AbortSignal.timeout(2000) });
            _backendAvailable = r.status !== 0;
        } catch(e) { _backendAvailable = false; }
        return _backendAvailable;
    }

    // ── AUTH ──────────────────────────────────────────────────
    async function login(username, password) {
        const res = await _req('auth.php', { action: 'login', username, password });
        if (res?.error) return res;
        if (res?.token) {
            _token = res.token;
            // Merge DB token into sessionStorage session
            try {
                const s = JSON.parse(sessionStorage.getItem('sc_hub_session') || '{}');
                s.dbToken    = res.token;
                s.dbExpires  = res.expiresAt;
                sessionStorage.setItem('sc_hub_session', JSON.stringify(s));
            } catch(e) {}
        }
        return res;
    }

    async function logout() {
        await _req('auth.php', { action: 'logout' });
        _token = null;
        try {
            const s = JSON.parse(sessionStorage.getItem('sc_hub_session') || '{}');
            delete s.dbToken; delete s.dbExpires;
            sessionStorage.setItem('sc_hub_session', JSON.stringify(s));
        } catch(e) {}
    }

    async function register(username, displayName, password, role) {
        return _req('auth.php', { action: 'register', username, displayName, password, role });
    }

    // ── USER MANAGEMENT ───────────────────────────────────────
    const listUsers   = ()                  => _req('auth.php', { action: 'list_users' });
    const listPending = ()                  => _req('auth.php', { action: 'list_pending' });
    const approveUser = (username)          => _req('auth.php', { action: 'approve',     username });
    const rejectUser  = (username)          => _req('auth.php', { action: 'reject',      username });
    const deleteUser  = (username)          => _req('auth.php', { action: 'delete',      username });
    const changeRole  = (username, role)    => _req('auth.php', { action: 'change_role', username, role });

    // ── DATA ──────────────────────────────────────────────────
    async function load(module, year, month) {
        const res = await _req(`data.php?module=${module}&year=${year}&month=${month}`);
        return (res && !res.error) ? res.data ?? res : null;
    }

    async function loadAll(year, month) {
        const res = await _req(`data.php?module=all&year=${year}&month=${month}`);
        return (res && !res.error) ? res.data ?? res : null;
    }

    async function save(module, year, month, data) {
        return _req('data.php', { module, year, month, ...data });
    }

    // ── Month name → number ───────────────────────────────────
    function monthNum(name) {
        return ['January','February','March','April','May','June',
                'July','August','September','October','November','December'].indexOf(name) + 1;
    }

    return { login, logout, register, listUsers, listPending, approveUser, rejectUser, deleteUser, changeRole, load, loadAll, save, isOnline, monthNum, get token() { return _token; }, get base() { return BASE; } };
})();
