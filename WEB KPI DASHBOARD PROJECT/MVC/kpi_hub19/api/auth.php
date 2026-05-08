<?php
// =============================================================
// api/auth.php  –  Authentication & User Management
// =============================================================
// POST body (JSON):  { "action": "...", ...fields }
//
// Public actions (no token needed):
//   login     { username, password }
//   register  { username, displayName, password, role }
//
// Authenticated actions (X-Token header required):
//   logout
//   me
//   users_list                         [superadmin]
//   users_pending                      [superadmin]
//   users_create  { username, displayName, password, role }  [superadmin]
//   users_edit    { username, displayName?, password?, role? } [superadmin]
//   users_delete  { username }         [superadmin]
//   users_approve { username }         [superadmin]
//   users_reject  { username }         [superadmin]
//   users_role    { username, role }   [superadmin]
// =============================================================

require_once __DIR__ . '/config.php';
cors();

$b      = body();
$action = $b['action'] ?? ($_GET['action'] ?? '');

match ($action) {
    'login'         => doLogin($b),
    'logout'        => doLogout(),
    'register'      => doRegister($b),
    'me'            => doMe(),
    'users_list'    => doUsersList(),
    'users_pending' => doUsersPending(),
    'users_create'  => doUsersCreate($b),
    'users_edit'    => doUsersEdit($b),
    'users_delete'  => doUsersDelete($b),
    'users_approve' => doUsersApprove($b),
    'users_reject'  => doUsersReject($b),
    'users_role'    => doUsersRole($b),
    default         => fail("Unknown action: $action"),
};

// =============================================================
// Login
// =============================================================
function doLogin(array $b): never {
    $username = strtolower(trim($b['username'] ?? ''));
    $password = $b['password'] ?? '';
    if (!$username || !$password) fail('Username and password required');

    $stmt = db()->prepare('SELECT * FROM sc_users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user) fail('Invalid username or password', 401);

    // Accept bcrypt hash OR plain-text fallback for built-in accounts on first run
    $valid = password_verify($password, $user['password']);
    if (!$valid) {
        // Fallback: plain-text for built-ins before bcrypt hashes exist
        $plain = match($username) {
            'sysadmin' => 'SC@SysAdmin2026!',
            'user'     => 'SC@User2026!',
            'viewer'   => 'SC@Viewer2026!',
            default    => null,
        };
        $valid = ($plain !== null && $password === $plain);
    }
    if (!$valid) fail('Invalid username or password', 401);

    if ($user['status'] === 'pending')  fail('Account pending approval', 403);
    if ($user['status'] === 'rejected') fail('Account not approved', 403);

    // Issue session token
    $token   = bin2hex(random_bytes(32));
    $exp     = date('Y-m-d H:i:s', time() + SESSION_TTL);
    $ip      = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua      = $_SERVER['HTTP_USER_AGENT'] ?? '';
    // Build a short readable device description from the User-Agent
    $device  = _parseDevice($ua);
    db()->prepare(
        'INSERT INTO sc_sessions (token,user_id,role,ip,device_info,expires_at) VALUES (?,?,?,?,?,?)'
    )->execute([$token, $user['id'], $user['role'], $ip, $device, $exp]);

    // Purge old expired sessions
    db()->exec('DELETE FROM sc_sessions WHERE expires_at < NOW()');
    audit(['user_id' => $user['id'], 'username' => $user['username']], 'login');

    ok([
        'token'       => $token,
        'username'    => $user['username'],
        'displayName' => $user['display_name'],
        'role'        => $user['role'],
        'expiresAt'   => $exp,
    ]);
}

// =============================================================
// Logout
// =============================================================
function doLogout(): never {
    $token = $_SERVER['HTTP_X_TOKEN'] ?? '';
    if ($token) db()->prepare('DELETE FROM sc_sessions WHERE token=?')->execute([$token]);
    ok(null, 'Logged out');
}

// =============================================================
// Me (verify token + return user info)
// =============================================================
function doMe(): never {
    $s = requireAuth();
    ok(['username' => $s['username'], 'displayName' => $s['displayName'], 'role' => $s['role']]);
}

// =============================================================
// Register (public – creates a pending user)
// =============================================================
function doRegister(array $b): never {
    $username    = strtolower(trim($b['username']    ?? ''));
    $displayName = trim($b['displayName'] ?? '');
    $password    = $b['password'] ?? '';
    $role        = $b['role']     ?? 'viewer';

    if (!$username || !$displayName || !$password) fail('All fields required');
    if (strlen($username) < 3)                     fail('Username too short (min 3)');
    if (!preg_match('/^[a-z0-9_]+$/', $username))  fail('Username: letters/numbers/underscores only');
    if (strlen($password) < 8)                     fail('Password too short (min 8)');
    if (!in_array($role, ['viewer', 'admin'], true)) fail('Invalid role');

    $chk = db()->prepare('SELECT id FROM sc_users WHERE username = ?');
    $chk->execute([$username]);
    if ($chk->fetch()) fail('Username already taken');

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    db()->prepare(
        'INSERT INTO sc_users (username,display_name,password,role,status,is_builtin) VALUES (?,?,?,?,"pending",0)'
    )->execute([$username, $displayName, $hash, $role]);

    ok(null, 'Registration submitted – awaiting approval');
}

// =============================================================
// Users list (active)
// =============================================================
function doUsersList(): never {
    requireAuth('superadmin');
    $rows = db()->query(
        'SELECT username,display_name,role,status,is_builtin,created_at FROM sc_users WHERE status="active" ORDER BY created_at'
    )->fetchAll();
    ok($rows);
}

// =============================================================
// Users pending
// =============================================================
function doUsersPending(): never {
    requireAuth('superadmin');
    $rows = db()->query(
        'SELECT username,display_name,role,created_at FROM sc_users WHERE status="pending" ORDER BY created_at'
    )->fetchAll();
    ok($rows);
}

// =============================================================
// Create user directly (superadmin only)
// =============================================================
function doUsersCreate(array $b): never {
    $sess        = requireAuth('superadmin');
    $username    = strtolower(trim($b['username']    ?? ''));
    $displayName = trim($b['displayName'] ?? '');
    $password    = $b['password'] ?? '';
    $role        = $b['role']     ?? 'viewer';

    if (!$username || !$displayName || !$password) fail('All fields required');
    if (strlen($username) < 3)                     fail('Username too short');
    if (!preg_match('/^[a-z0-9_]+$/', $username))  fail('Username format invalid');
    if (strlen($password) < 8)                     fail('Password too short');
    if (!in_array($role, ['viewer','admin','superadmin'], true)) fail('Invalid role');

    $chk = db()->prepare('SELECT id FROM sc_users WHERE username = ?');
    $chk->execute([$username]);
    if ($chk->fetch()) fail('Username already taken');

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    db()->prepare(
        'INSERT INTO sc_users (username,display_name,password,role,status,is_builtin) VALUES (?,?,?,?,"active",0)'
    )->execute([$username, $displayName, $hash, $role]);

    audit($sess, 'create_user', 'Users', null, "@$username as $role");
    ok(null, "Account @$username created");
}

// =============================================================
// Edit user (displayName, password, role)
// =============================================================
function doUsersEdit(array $b): never {
    $sess        = requireAuth('superadmin');
    $username    = strtolower(trim($b['username'] ?? ''));
    $displayName = trim($b['displayName'] ?? '');
    $password    = $b['password'] ?? '';
    $role        = $b['role'] ?? '';

    if (!$username) fail('Username required');
    if ($username === 'sysadmin' && $role && $role !== 'superadmin') fail('Cannot demote sysadmin');

    $sets = [];
    $vals = [];

    if ($displayName)          { $sets[] = 'display_name=?'; $vals[] = $displayName; }
    if ($role)                 { $sets[] = 'role=?';         $vals[] = $role; }
    if (strlen($password) >= 8){ $sets[] = 'password=?';    $vals[] = password_hash($password, PASSWORD_BCRYPT, ['cost'=>12]); }
    if (!$sets) fail('Nothing to update');

    $vals[] = $username;
    db()->prepare('UPDATE sc_users SET ' . implode(',', $sets) . ' WHERE username=?')->execute($vals);
    audit($sess, 'edit_user', 'Users', null, "@$username");
    ok(null, "Updated @$username");
}

// =============================================================
// Delete user
// =============================================================
function doUsersDelete(array $b): never {
    $sess     = requireAuth('superadmin');
    $username = strtolower(trim($b['username'] ?? ''));
    if (!$username)              fail('Username required');
    if ($username === 'sysadmin') fail('Cannot delete sysadmin');
    if ($username === $sess['username']) fail('Cannot delete yourself');

    $chk = db()->prepare('SELECT is_builtin FROM sc_users WHERE username=?');
    $chk->execute([$username]);
    $u = $chk->fetch();
    if (!$u) fail('User not found');

    db()->prepare('DELETE FROM sc_users WHERE username=? AND is_builtin=0')->execute([$username]);
    audit($sess, 'delete_user', 'Users', null, "@$username");
    ok(null, "@$username deleted");
}

// =============================================================
// Approve pending registration
// =============================================================
function doUsersApprove(array $b): never {
    $sess     = requireAuth('superadmin');
    $username = strtolower(trim($b['username'] ?? ''));
    if (!$username) fail('Username required');

    $aff = db()->prepare('UPDATE sc_users SET status="active" WHERE username=? AND status="pending"');
    $aff->execute([$username]);
    if ($aff->rowCount() === 0) fail('User not found or not pending');

    audit($sess, 'approve_user', 'Users', null, "@$username");
    ok(null, "@$username approved");
}

// =============================================================
// Reject pending registration
// =============================================================
function doUsersReject(array $b): never {
    $sess     = requireAuth('superadmin');
    $username = strtolower(trim($b['username'] ?? ''));
    if (!$username) fail('Username required');

    $aff = db()->prepare('DELETE FROM sc_users WHERE username=? AND status="pending" AND is_builtin=0');
    $aff->execute([$username]);
    if ($aff->rowCount() === 0) fail('User not found');

    audit($sess, 'reject_user', 'Users', null, "@$username");
    ok(null, "@$username rejected");
}

// =============================================================
// Parse User-Agent into a short readable device string
// =============================================================
function _parseDevice(string $ua): string {
    // OS detection
    $os = 'Unknown OS';
    if (str_contains($ua, 'Windows'))    $os = 'Windows';
    elseif (str_contains($ua, 'Mac'))    $os = 'macOS';
    elseif (str_contains($ua, 'Linux'))  $os = 'Linux';
    elseif (str_contains($ua, 'Android'))$os = 'Android';
    elseif (str_contains($ua, 'iPhone') || str_contains($ua, 'iPad')) $os = 'iOS';

    // Browser detection
    $br = 'Unknown Browser';
    if (str_contains($ua, 'Edg/'))       $br = 'Edge';
    elseif (str_contains($ua, 'OPR/') || str_contains($ua, 'Opera/')) $br = 'Opera';
    elseif (str_contains($ua, 'Chrome/')) $br = 'Chrome';
    elseif (str_contains($ua, 'Firefox/'))$br = 'Firefox';
    elseif (str_contains($ua, 'Safari/')) $br = 'Safari';

    return "$br on $os";
}

// =============================================================
// Change role
// =============================================================
function doUsersRole(array $b): never {
    $sess     = requireAuth('superadmin');
    $username = strtolower(trim($b['username'] ?? ''));
    $role     = $b['role'] ?? '';
    if (!$username || !$role) fail('Username and role required');
    if ($username === 'sysadmin')  fail('Cannot change sysadmin role');
    if (!in_array($role, ['viewer','admin','superadmin'], true)) fail('Invalid role');

    db()->prepare('UPDATE sc_users SET role=? WHERE username=?')->execute([$role, $username]);
    audit($sess, 'role_change', 'Users', null, "@$username → $role");
    ok(null, 'Role updated');
}
