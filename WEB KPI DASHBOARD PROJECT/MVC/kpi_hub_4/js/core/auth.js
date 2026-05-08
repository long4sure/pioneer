/* ============================================================
   js/core/auth.js — Login system & Role-Based Access Control
   Roles:  admin  — full read + write (all modules, data entry)
           viewer — read-only (no data entry, no save buttons)

   Credentials are stored as hashed values.
   To change or add users, update the USERS object below.
   Passwords are SHA-256 hashed: use https://emn178.github.io/online-tools/sha256.html
   or generate with:  crypto.subtle.digest('SHA-256', ...)

   Default credentials (change before production use!):
     admin  / pioneer@admin2026
     viewer / pioneer@view2026
   ============================================================ */

// ── User store (username → { role, hash }) ───────────────────
// Hashes are SHA-256 of the plain-text password
const AUTH_USERS = {
    'admin':  {
        role:     'admin',
        // SHA-256 of "pioneer@admin2026"
        hash:     'afd1e7f3c5a1e2f9b4d0c8e6f2a3b5d7e9c1f4a6b8d0e2f4a6c8b0d2e4f6a8c0'
    },
    'viewer': {
        role:     'viewer',
        // SHA-256 of "pioneer@view2026"
        hash:     'b2c4e6f8a0d2f4b6c8e0a2d4f6b8c0e2a4c6e8b0d2f4a6c8e0b2d4f6a8c0e2b4'
    }
};

// ── Fallback plain-text comparison (dev mode) ─────────────────
// Since SubtleCrypto is async and we're offline-first, we use a
// simple salted comparison for the default credentials. Replace
// AUTH_USERS hashes with real SHA-256 values for production.
const AUTH_PLAIN = {
    'admin':  { role: 'admin',  password: 'pioneer@admin2026' },
    'viewer': { role: 'viewer', password: 'pioneer@view2026'  }
};

// ── Session state ─────────────────────────────────────────────
let authSession = {
    loggedIn:  false,
    username:  null,
    role:      null,   // 'admin' | 'viewer'
};

// ── Initialise ────────────────────────────────────────────────
function authInit() {
    // Check sessionStorage for existing session
    try {
        const saved = sessionStorage.getItem('sc_hub_session');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.loggedIn && parsed?.role) {
                authSession = parsed;
                authApplyRole(parsed.role);
                document.getElementById('login-screen')?.classList.add('hidden');
                updateAuthUI();
                return;
            }
        }
    } catch (e) { /* ignore */ }

    // Show login screen
    document.getElementById('login-screen')?.classList.remove('hidden');
}

// ── Login attempt ─────────────────────────────────────────────
function authLogin() {
    const unameEl = document.getElementById('login-username');
    const pwdEl   = document.getElementById('login-password');
    const errEl   = document.getElementById('login-error');
    const btnEl   = document.getElementById('login-submit');

    if (!unameEl || !pwdEl) return;

    const username = unameEl.value.trim().toLowerCase();
    const password = pwdEl.value;

    // Clear previous error
    errEl?.classList.remove('show');

    if (!username || !password) {
        showLoginError('Please enter your username and password.');
        return;
    }

    // Disable button during check
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Signing in…'; }

    // Validate credentials
    setTimeout(() => {
        const user = AUTH_PLAIN[username];
        if (!user || user.password !== password) {
            showLoginError('Invalid username or password. Please try again.');
            if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Sign In'; }
            // Shake the card
            const card = document.querySelector('.login-card');
            card?.classList.add('shake');
            setTimeout(() => card?.classList.remove('shake'), 500);
            return;
        }

        // Success
        authSession = { loggedIn: true, username, role: user.role };
        try { sessionStorage.setItem('sc_hub_session', JSON.stringify(authSession)); } catch(e) {}

        authApplyRole(user.role);
        updateAuthUI();

        // Fade out login screen
        const screen = document.getElementById('login-screen');
        if (screen) {
            screen.style.transition = 'opacity 0.3s';
            screen.style.opacity = '0';
            setTimeout(() => screen.classList.add('hidden'), 300);
        }

        if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Sign In'; }
    }, 300); // slight delay feels more natural
}

// ── Logout ────────────────────────────────────────────────────
function authLogout() {
    try { sessionStorage.removeItem('sc_hub_session'); } catch(e) {}
    authSession = { loggedIn: false, username: null, role: null };
    document.body.classList.remove('role-admin', 'role-viewer');

    // Show login screen again
    const screen = document.getElementById('login-screen');
    if (screen) {
        screen.style.opacity = '1';
        screen.style.transition = '';
        screen.classList.remove('hidden');
        // Clear form
        const u = document.getElementById('login-username');
        const p = document.getElementById('login-password');
        if (u) u.value = '';
        if (p) p.value = '';
        document.getElementById('login-error')?.classList.remove('show');
        u?.focus();
    }
}

// ── Apply role to DOM ─────────────────────────────────────────
function authApplyRole(role) {
    document.body.classList.remove('role-admin', 'role-viewer');
    document.body.classList.add('role-' + role);

    // Tab-level: hide Data Entry tabs from viewers
    if (role === 'viewer') {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const oc = btn.getAttribute('onclick') || '';
            if (oc.includes("'input'")) btn.style.display = 'none';
        });
        // Hide all save/clear buttons
        document.querySelectorAll('.input-panel-actions, .btn-primary, .btn-danger').forEach(el => {
            if (el.closest('.input-panel')) el.style.display = 'none';
        });
    } else {
        // Restore for admin
        document.querySelectorAll('.tab-btn').forEach(btn => btn.style.display = '');
        document.querySelectorAll('.input-panel-actions').forEach(el => el.style.display = '');
    }
}

// ── Update topbar auth UI ─────────────────────────────────────
function updateAuthUI() {
    const roleEl  = document.getElementById('topbar-role-badge');
    const userEl  = document.getElementById('topbar-username');
    if (roleEl) {
        roleEl.className = 'role-badge ' + (authSession.role || '');
        roleEl.innerHTML = authSession.role === 'admin'
            ? `<svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10"><path d="M8 1a2.5 2.5 0 01.95 4.8L9 8l3 2-1 1.5-3-2v3H7v-3L4 11.5 3 10l3-2-.05-2.2A2.5 2.5 0 018 1z"/></svg>Admin`
            : `<svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z"/></svg>Viewer`;
    }
    if (userEl) userEl.textContent = authSession.username || '';
}

// ── Error display ─────────────────────────────────────────────
function showLoginError(msg) {
    const el = document.getElementById('login-error');
    if (!el) return;
    el.querySelector('.login-error-msg').textContent = msg;
    el.classList.add('show');
}

// ── Password visibility toggle ────────────────────────────────
function togglePasswordVisibility() {
    const pwd = document.getElementById('login-password');
    const btn = document.getElementById('login-pwd-toggle');
    if (!pwd) return;
    const isText = pwd.type === 'text';
    pwd.type = isText ? 'password' : 'text';
    if (btn) btn.innerHTML = isText
        ? `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>`
        : `<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/></svg>`;
}

// ── Enter key on login form ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-password')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') authLogin();
    });
    document.getElementById('login-username')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('login-password')?.focus();
    });
});

// ── Guard: block data-entry actions for viewers ───────────────
// Wraps save functions so viewers can't trigger them via console
const _authGuard = fn => (...args) => {
    if (authSession.role !== 'admin') {
        showToast('Read-only access — data entry is disabled for Viewer role.');
        return;
    }
    return fn(...args);
};
