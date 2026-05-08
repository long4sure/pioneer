/* ============================================================
   js/core/auth.js  —  Three-role auth with registration approval
   Roles: superadmin | admin | viewer
   ============================================================ */

// ── Built-in accounts ─────────────────────────────────────────
const BUILTIN_USERS = {
    'sysadmin': { role:'superadmin', password:'SC@SysAdmin2026!', displayName:'System Admin', builtin:true,  status:'active', createdAt:'2026-01-01' },
    'user':     { role:'admin',      password:'SC@User2026!',     displayName:'User',         builtin:true,  status:'active', createdAt:'2026-01-01' },
    'viewer':   { role:'viewer',     password:'SC@Viewer2026!',   displayName:'Viewer',       builtin:false, status:'active', createdAt:'2026-01-01' },
};

// ── Persistence ───────────────────────────────────────────────
function usersGet() {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem('sc_hub_users') || '{}'); } catch(e) {}
    return { ...BUILTIN_USERS, ...stored };
}
function usersSave(users) {
    const toSave = {};
    for (const [k,v] of Object.entries(users)) { if (!BUILTIN_USERS[k]) toSave[k] = v; }
    try { localStorage.setItem('sc_hub_users', JSON.stringify(toSave)); } catch(e) {}
}
function pendingGet() {
    try { return JSON.parse(localStorage.getItem('sc_hub_pending') || '[]'); } catch(e) { return []; }
}
function pendingSave(arr) {
    try { localStorage.setItem('sc_hub_pending', JSON.stringify(arr)); } catch(e) {}
}

// ── Session ───────────────────────────────────────────────────
let authSession = { loggedIn:false, username:null, role:null, displayName:null };

function authInit() {
    try {
        const p = JSON.parse(sessionStorage.getItem('sc_hub_session') || 'null');
        if (p?.loggedIn && p?.role) {
            authSession = p;
            _applyRole(p.role);
            document.getElementById('login-screen')?.classList.add('hidden');
            _updateTopbar();
            return;
        }
    } catch(e) {}
    _showLogin();
}

// ── Login ─────────────────────────────────────────────────────
function authLogin() {
    const uEl = document.getElementById('login-username');
    const pEl = document.getElementById('login-password');
    const bEl = document.getElementById('login-submit');
    if (!uEl||!pEl) return;
    const username = uEl.value.trim().toLowerCase();
    const password = pEl.value;
    _clearLoginError();
    if (!username||!password) { _loginErr('Please enter your username and password.'); return; }
    if (bEl) { bEl.disabled=true; bEl.textContent='Signing in…'; }
    setTimeout(()=>{
        const users = usersGet();
        const user  = users[username];
        if (!user || user.password!==password) {
            _loginErr('Invalid username or password.');
            if (bEl) { bEl.disabled=false; bEl.textContent='Sign In'; }
            const c = document.querySelector('.login-card');
            c?.classList.add('shake'); setTimeout(()=>c?.classList.remove('shake'),500);
            return;
        }
        if (user.status==='pending') { _loginErr('Your account is pending approval by an administrator.'); if(bEl){bEl.disabled=false;bEl.textContent='Sign In';} return; }
        if (user.status==='rejected') { _loginErr('Your registration was not approved. Contact an administrator.'); if(bEl){bEl.disabled=false;bEl.textContent='Sign In';} return; }
        authSession = { loggedIn:true, username, role:user.role, displayName:user.displayName||username };
        try { sessionStorage.setItem('sc_hub_session', JSON.stringify(authSession)); } catch(e) {}
        _applyRole(user.role);
        _updateTopbar();
        const screen = document.getElementById('login-screen');
        if (screen) { screen.style.transition='opacity 0.3s'; screen.style.opacity='0'; setTimeout(()=>{screen.classList.add('hidden');screen.style.opacity='';},300); }
        if (bEl) { bEl.disabled=false; bEl.textContent='Sign In'; }
        
        // Post-login initializations
        if (typeof Chat !== 'undefined') Chat.init();
        if (typeof loadHomePosts === 'function') loadHomePosts();
    },280);
}

// ── Logout ────────────────────────────────────────────────────
function authLogout() {
    try { sessionStorage.removeItem('sc_hub_session'); } catch(e) {}
    authSession = { loggedIn:false, username:null, role:null, displayName:null };
    document.body.classList.remove('role-admin','role-viewer','role-superadmin');
    if (typeof Chat !== 'undefined') Chat.reset();
    _showLogin();
}

// ── Registration ──────────────────────────────────────────────
function authShowRegister() {
    document.getElementById('login-panel').style.display = 'none';
    const rp = document.getElementById('reg-panel');
    rp.style.display = 'block';
    rp.innerHTML = _regPanelHTML();
    _clearLoginError();
}
function authShowLogin() {
    document.getElementById('login-panel').style.display = 'block';
    document.getElementById('reg-panel').style.display = 'none';
    _clearLoginError();
}
function authRegister() {
    const uname = document.getElementById('reg-username').value.trim().toLowerCase();
    const dname = document.getElementById('reg-displayname').value.trim();
    const pwd   = document.getElementById('reg-password').value;
    const pwd2  = document.getElementById('reg-password2').value;
    const role  = document.getElementById('reg-role').value;
    _clearRegError();
    if (!uname||!dname||!pwd) { _regErr('All fields are required.'); return; }
    if (uname.length<3)        { _regErr('Username must be at least 3 characters.'); return; }
    if (!/^[a-z0-9_]+$/.test(uname)) { _regErr('Username may only contain letters, numbers, and underscores.'); return; }
    if (pwd.length<8)          { _regErr('Password must be at least 8 characters.'); return; }
    if (pwd!==pwd2)            { _regErr('Passwords do not match.'); return; }
    const users   = usersGet();
    const pending = pendingGet();
    if (users[uname])                              { _regErr('Username already exists. Please choose another.'); return; }
    if (pending.find(p=>p.username===uname))       { _regErr('A pending request already exists for this username.'); return; }
    pending.push({ username:uname, password:pwd, displayName:dname, role, status:'pending', requestedAt:new Date().toISOString().split('T')[0] });
    pendingSave(pending);
    document.getElementById('reg-panel').innerHTML = `
      <div style="text-align:center;padding:24px 0 8px">
        <div style="font-size:44px;margin-bottom:14px">✅</div>
        <div class="login-heading" style="font-size:18px">Request Submitted!</div>
        <div class="login-subheading">Your request for <strong>@${_esc(uname)}</strong> has been sent for approval. You'll be notified once an administrator reviews it.</div>
        <button class="login-btn" onclick="authShowLogin()" style="margin-top:20px;">Back to Sign In</button>
      </div>`;
}

// ── User management functions moved to sysadmin.js ─────────────


function approveUser(idx) {
    const pending = pendingGet();
    const req = pending[idx]; if(!req) return;
    const users = usersGet();
    if (users[req.username]) { showToast('Username already taken.'); return; }
    users[req.username] = { role:req.role, password:req.password, displayName:req.displayName, builtin:false, status:'active', createdAt:new Date().toISOString().split('T')[0] };
    usersSave(users);
    pending.splice(idx,1); pendingSave(pending);
    showToast(`✅ ${req.displayName} approved as ${req.role}.`);
    saRenderPending?.(); saRenderUsers?.(); saRenderOverview?.();
}
function rejectUser(idx) {
    const pending = pendingGet();
    const req = pending[idx]; if(!req) return;
    if (!confirm(`Reject registration for @${req.username}?`)) return;
    pending.splice(idx,1); pendingSave(pending);
    showToast(`Registration for @${req.username} rejected.`);
    saRenderPending?.(); saRenderOverview?.();
}
function deleteUser(username) {
    if (!confirm(`Permanently delete @${username}?`)) return;
    if (BUILTIN_USERS[username]?.builtin) { showToast('Cannot delete built-in accounts.'); return; }
    const users = usersGet();
    delete users[username];
    usersSave(users);
    showToast(`@${username} deleted.`);
    saRenderUsers?.(); saRenderOverview?.();
}
function changeUserRole(username, newRole) {
    if (username==='sysadmin') { showToast('Cannot change superadmin role.'); saRenderUsers?.(); return; }
    const users = usersGet();
    if (!users[username]) return;
    users[username].role = newRole;
    usersSave(users);
    // If user changed their own role, update session
    if (username===authSession.username) { authSession.role=newRole; _applyRole(newRole); _updateTopbar(); }
    showToast(`Role updated for @${username}.`);
    saRenderUsers?.(); saRenderOverview?.();
}

// ── Role enforcement ──────────────────────────────────────────
function _applyRole(role) {
    document.body.classList.remove('role-admin','role-viewer','role-superadmin');
    document.body.classList.add('role-'+role);
    const isViewer = (role==='viewer');
    document.querySelectorAll('[data-tab="input"]').forEach(b=>b.style.display=isViewer?'none':'');
    document.querySelectorAll('.input-panel-actions').forEach(el=>el.style.display=isViewer?'none':'');
    const saNav = document.getElementById('nav-sysadmin');
    if (saNav) saNav.style.display = (role==='superadmin')?'':'none';
}

// ── Topbar ────────────────────────────────────────────────────
function _updateTopbar() {
    const ICONS = {
        superadmin:`<svg viewBox="0 0 16 16" fill="currentColor" width="10"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>`,
        admin:`<svg viewBox="0 0 16 16" fill="currentColor" width="10"><path d="M8 1a2.5 2.5 0 011.5 4.5L10 8l3 2-1 1.5-3-2v3H7v-3L4 11.5 3 10l3-2-.5-2.5A2.5 2.5 0 018 1z"/></svg>`,
        viewer:`<svg viewBox="0 0 16 16" fill="currentColor" width="10"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3z"/></svg>`,
    };
    const LABELS = { superadmin:'System Admin', admin:'User', viewer:'Viewer' };
    const rEl = document.getElementById('topbar-role-badge');
    const uEl = document.getElementById('topbar-username');
    if (rEl) { rEl.className='role-badge role-'+(authSession.role||''); rEl.innerHTML=(ICONS[authSession.role]||'')+(LABELS[authSession.role]||authSession.role); }
    if (uEl) uEl.textContent = authSession.displayName||authSession.username||'';

    // Sync sidebar footer (visible on mobile)
    const sfRole = document.getElementById('sf-role-badge');
    const sfUser = document.getElementById('sf-username');
    if (sfRole) { sfRole.className='role-badge role-'+(authSession.role||''); sfRole.innerHTML=(ICONS[authSession.role]||'')+(LABELS[authSession.role]||authSession.role); }
    if (sfUser) sfUser.textContent = authSession.displayName||authSession.username||'';

    if (authSession.role==='superadmin') {
        const cnt = pendingGet().length;
        const nb = document.getElementById('nav-pending-badge');
        if (nb) { nb.textContent=cnt||''; nb.style.display=cnt?'':'none'; }
    }
}

// ── Helpers ───────────────────────────────────────────────────
function _loginErr(m) { const el=document.getElementById('login-error'); if(!el) return; el.querySelector('.login-error-msg').textContent=m; el.classList.add('show'); }
function _clearLoginError() { document.getElementById('login-error')?.classList.remove('show'); }
function _regErr(m)   { const el=document.getElementById('reg-error');   if(!el) return; el.querySelector('.login-error-msg').textContent=m; el.classList.add('show'); }
function _clearRegError()   { document.getElementById('reg-error')?.classList.remove('show'); }
function _showLogin() {
    const s = document.getElementById('login-screen'); if(!s) return;
    s.style.opacity='1'; s.style.transition=''; s.classList.remove('hidden');
    const lp=document.getElementById('login-panel'), rp=document.getElementById('reg-panel');
    if (lp) lp.style.display='block';
    if (rp) { rp.style.display='none'; rp.innerHTML=_regPanelHTML(); }
    const u=document.getElementById('login-username'), p=document.getElementById('login-password');
    if (u){u.value='';u.focus();} if(p)p.value='';
    _clearLoginError();
}
function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function _regPanelHTML() {
    return `<div style="margin-bottom:16px">
        <button onclick="authShowLogin()" style="display:inline-flex;align-items:center;gap:6px;background:none;border:1px solid var(--border);border-radius:var(--radius-sm);padding:7px 12px;font-family:inherit;font-size:12px;font-weight:600;color:var(--text-secondary);cursor:pointer;transition:all .15s" onmouseover="this.style.background='var(--pioneer-blue-light)';this.style.color='var(--pioneer-blue-dark)';this.style.borderColor='rgba(30,95,200,.3)'" onmouseout="this.style.background='none';this.style.color='var(--text-secondary)';this.style.borderColor='var(--border)'">
          <svg viewBox="0 0 16 16" fill="currentColor" width="12"><path fill-rule="evenodd" d="M15 8a.5.5 0 00-.5-.5H2.707l3.147-3.146a.5.5 0 10-.708-.708l-4 4a.5.5 0 000 .708l4 4a.5.5 0 00.708-.708L2.707 8.5H14.5A.5.5 0 0015 8z" clip-rule="evenodd"/></svg>
          Back to Sign In
        </button>
      </div>
      <div class="login-heading">Request Access</div>
      <div class="login-subheading">Your account will be active after administrator approval.</div>
      <div class="login-error" id="reg-error"><svg viewBox="0 0 16 16" fill="currentColor" width="14" style="flex-shrink:0"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 100-2 1 1 0 000 2z"/></svg><span class="login-error-msg"></span></div>
      <div class="login-field"><label class="login-label">Full Name</label><input class="login-input" id="reg-displayname" placeholder="e.g. Maria Santos"></div>
      <div class="login-field"><label class="login-label">Username</label><input class="login-input" id="reg-username" placeholder="lowercase letters, numbers, underscores" autocomplete="off"></div>
      <div class="login-field">
        <label class="login-label">Password</label>
        <div class="login-input-wrap">
          <input class="login-input" type="password" id="reg-password" placeholder="Minimum 8 characters" style="padding-right:42px">
          <button class="login-pwd-toggle" type="button" id="reg-pwd-toggle" onclick="_regTogglePwd()" title="Show / hide password" tabindex="-1"><svg viewBox="0 0 20 20" fill="currentColor" width="15"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/></svg></button>
        </div>
      </div>
      <div class="login-field">
        <label class="login-label">Confirm Password</label>
        <div class="login-input-wrap">
          <input class="login-input" type="password" id="reg-password2" placeholder="Repeat password" style="padding-right:42px">
          <button class="login-pwd-toggle" type="button" id="reg-pwd2-toggle" onclick="_regTogglePwd2()" title="Show / hide password" tabindex="-1"><svg viewBox="0 0 20 20" fill="currentColor" width="15"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/></svg></button>
        </div>
      </div>
      <div class="login-field"><label class="login-label">Requested Role</label>
        <select class="login-input" id="reg-role" style="cursor:pointer">
          <option value="viewer">Viewer — read-only access</option>
          <option value="admin">User — full data-entry access</option>
        </select>
      </div>
      <button class="login-btn" onclick="authRegister()">Submit Request</button>
      `;
}

// ── Toggle show/hide for registration password fields ──────────
function _regTogglePwd() {
    const inp = document.getElementById('reg-password');
    const btn = document.getElementById('reg-pwd-toggle');
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.innerHTML = show
        ? `<svg viewBox="0 0 20 20" fill="currentColor" width="15"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>`
        : `<svg viewBox="0 0 20 20" fill="currentColor" width="15"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/></svg>`;
}
function _regTogglePwd2() {
    const inp = document.getElementById('reg-password2');
    const btn = document.getElementById('reg-pwd2-toggle');
    if (!inp) return;
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.innerHTML = show
        ? `<svg viewBox="0 0 20 20" fill="currentColor" width="15"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>`
        : `<svg viewBox="0 0 20 20" fill="currentColor" width="15"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/></svg>`;
}

function togglePasswordVisibility(inputId, btnId) {
    const pwd=document.getElementById(inputId||'login-password'), btn=document.getElementById(btnId||'login-pwd-toggle');
    if (!pwd) return;
    const show=pwd.type==='password'; pwd.type=show?'text':'password';
    if (btn) btn.innerHTML=show
      ?`<svg viewBox="0 0 20 20" fill="currentColor" width="15"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>`
      :`<svg viewBox="0 0 20 20" fill="currentColor" width="15"><path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd"/><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z"/></svg>`;
}

const _authGuard = fn=>(...args)=>{
    if (!authSession.loggedIn)         { showToast('Please sign in first.'); return; }
    if (authSession.role==='viewer')   { showToast('Read-only access — data entry is disabled.'); return; }
    return fn(...args);
};

document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('login-password')?.addEventListener('keydown',e=>{if(e.key==='Enter')authLogin();});
    document.getElementById('login-username')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('login-password')?.focus();});
});
