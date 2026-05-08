<?php
// ============================================================
// api/auth.php — Authentication & User Management API
// Endpoints (POST, body as JSON):
//   action=login      { username, password }
//   action=logout     { }                         [auth required]
//   action=register   { username, displayName, password, role }
//   action=me         { }                         [auth required]
//   action=list_users { }                         [superadmin]
//   action=list_pending { }                       [superadmin]
//   action=approve    { username }                [superadmin]
//   action=reject     { username }                [superadmin]
//   action=delete     { username }                [superadmin]
//   action=change_role{ username, role }          [superadmin]
// ============================================================

require_once __DIR__ . '/config.php';
setHeaders();

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? ($_GET['action'] ?? '');

match ($action) {
    'login'        => handleLogin($body),
    'logout'       => handleLogout(),
    'register'     => handleRegister($body),
    'me'           => handleMe(),
    'list_users'   => handleListUsers(),
    'list_pending' => handleListPending(),
    'approve'      => handleApprove($body),
    'reject'       => handleReject($body),
    'delete'       => handleDelete($body),
    'change_role'  => handleChangeRole($body),
    default        => fail('Unknown action')
};

// ── Login ─────────────────────────────────────────────────────
function handleLogin(array $b): void {
    $username = strtolower(trim($b['username'] ?? ''));
    $password = $b['password'] ?? '';
    if (!$username || !$password) fail('Username and password required');

    $stmt = db()->prepare('SELECT * FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        // Fallback: plain-text for initial built-in accounts before hashes are set
        $fallback = match($username) {
            'sysadmin' => 'SC@SysAdmin2026!',
            'user'     => 'SC@User2026!',
            'viewer'   => 'SC@Viewer2026!',
            default    => null
        };
        if (!$user || $password !== $fallback) {
            fail('Invalid username or password', 401);
        }
    }
    if ($user['status'] === 'pending')  fail('Account pending approval', 403);
    if ($user['status'] === 'rejected') fail('Account not approved', 403);

    // Generate session token
    $token     = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_TTL);
    $ip        = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua        = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255);

    db()->prepare(
        'INSERT INTO sessions (token, user_id, role, ip_address, user_agent, expires_at) VALUES (?,?,?,?,?,?)'
    )->execute([$token, $user['id'], $user['role'], $ip, $ua, $expiresAt]);

    auditLog(['user_id' => $user['id'], 'username' => $user['username']], 'login');
    cleanSessions();

    ok([
        'token'       => $token,
        'username'    => $user['username'],
        'displayName' => $user['display_name'],
        'role'        => $user['role'],
        'expiresAt'   => $expiresAt,
    ]);
}

// ── Logout ────────────────────────────────────────────────────
function handleLogout(): void {
    $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    if ($token) db()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
    ok(null, 'Logged out');
}

// ── Me ────────────────────────────────────────────────────────
function handleMe(): void {
    $s = requireAuth();
    ok(['username' => $s['username'], 'displayName' => $s['display_name'], 'role' => $s['role']]);
}

// ── Register ──────────────────────────────────────────────────
function handleRegister(array $b): void {
    $username    = strtolower(trim($b['username']    ?? ''));
    $displayName = trim($b['displayName'] ?? '');
    $password    = $b['password'] ?? '';
    $role        = $b['role']     ?? 'viewer';

    if (!$username || !$displayName || !$password) fail('All fields required');
    if (strlen($username) < 3) fail('Username too short (min 3 chars)');
    if (!preg_match('/^[a-z0-9_]+$/', $username)) fail('Username: letters, numbers, underscores only');
    if (strlen($password) < 8) fail('Password too short (min 8 chars)');
    if (!in_array($role, ['viewer', 'admin'], true)) fail('Invalid role');

    $stmt = db()->prepare('SELECT id FROM users WHERE username = ?');
    $stmt->execute([$username]);
    if ($stmt->fetch()) fail('Username already taken');

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    db()->prepare(
        'INSERT INTO users (username, display_name, password, role, status, is_builtin) VALUES (?,?,?,?,?,0)'
    )->execute([$username, $displayName, $hash, $role, 'pending']);

    ok(null, 'Registration submitted — awaiting approval');
}

// ── List active users (superadmin) ───────────────────────────
function handleListUsers(): void {
    requireAuth('superadmin');
    $rows = db()->query(
        'SELECT username, display_name, role, status, is_builtin, created_at FROM users WHERE status = "active" ORDER BY created_at'
    )->fetchAll();
    ok($rows);
}

// ── List pending registrations (superadmin) ───────────────────
function handleListPending(): void {
    requireAuth('superadmin');
    $rows = db()->query(
        'SELECT id, username, display_name, role, created_at FROM users WHERE status = "pending" ORDER BY created_at'
    )->fetchAll();
    ok($rows);
}

// ── Approve ───────────────────────────────────────────────────
function handleApprove(array $b): void {
    $session = requireAuth('superadmin');
    $username = strtolower(trim($b['username'] ?? ''));
    if (!$username) fail('Username required');

    $affected = db()->prepare('UPDATE users SET status = "active" WHERE username = ? AND status = "pending"');
    $affected->execute([$username]);
    if ($affected->rowCount() === 0) fail('User not found or not pending');

    auditLog($session, 'approve_user', '', null, $username);
    ok(null, "User @$username approved");
}

// ── Reject ────────────────────────────────────────────────────
function handleReject(array $b): void {
    $session = requireAuth('superadmin');
    $username = strtolower(trim($b['username'] ?? ''));
    if (!$username) fail('Username required');

    $affected = db()->prepare('DELETE FROM users WHERE username = ? AND status = "pending" AND is_builtin = 0');
    $affected->execute([$username]);
    if ($affected->rowCount() === 0) fail('User not found');

    auditLog($session, 'reject_user', '', null, $username);
    ok(null, "Registration for @$username rejected");
}

// ── Delete ────────────────────────────────────────────────────
function handleDelete(array $b): void {
    $session = requireAuth('superadmin');
    $username = strtolower(trim($b['username'] ?? ''));
    if (!$username) fail('Username required');

    $row = db()->prepare('SELECT is_builtin FROM users WHERE username = ?');
    $row->execute([$username]);
    $user = $row->fetch();
    if (!$user) fail('User not found');
    if ($user['is_builtin']) fail('Cannot delete built-in accounts');
    if ($username === $session['username']) fail('Cannot delete your own account');

    db()->prepare('DELETE FROM users WHERE username = ? AND is_builtin = 0')->execute([$username]);
    auditLog($session, 'delete_user', '', null, $username);
    ok(null, "@$username deleted");
}

// ── Change role ───────────────────────────────────────────────
function handleChangeRole(array $b): void {
    $session = requireAuth('superadmin');
    $username = strtolower(trim($b['username'] ?? ''));
    $newRole  = $b['role'] ?? '';
    if (!$username || !$newRole) fail('Username and role required');
    if (!in_array($newRole, ['viewer','admin','superadmin'], true)) fail('Invalid role');
    if ($username === 'sysadmin') fail('Cannot change sysadmin role');

    db()->prepare('UPDATE users SET role = ? WHERE username = ?')->execute([$newRole, $username]);
    auditLog($session, 'change_role', '', null, "$username → $newRole");
    ok(null, "Role updated");
}
