<?php
// ============================================================
// api/config.php — Database configuration
// ============================================================
// Place the entire kpi_hub/ folder inside:
//   Windows: C:\xampp\htdocs\kpi_hub\
//   Mac/Linux: /Applications/XAMPP/htdocs/kpi_hub/
//
// Access at: http://localhost/kpi_hub/index.html
// API base:  http://localhost/kpi_hub/api/
// ============================================================

define('DB_HOST',     'localhost');
define('DB_PORT',     3306);
define('DB_NAME',     'sc_ops_hub');
define('DB_USER',     'root');        // Change for production
define('DB_PASS',     '');            // Change for production
define('DB_CHARSET',  'utf8mb4');

// Session token TTL in seconds (8 hours)
define('SESSION_TTL', 8 * 3600);

// CORS: allowed origins (add your domain in production)
define('ALLOWED_ORIGINS', ['http://localhost', 'http://127.0.0.1']);

// ── PDO connection singleton ──────────────────────────────────
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
        );
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// ── CORS + JSON headers ───────────────────────────────────────
function setHeaders(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: $origin");
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json; charset=utf-8');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

// ── JSON response helpers ─────────────────────────────────────
function ok(mixed $data = null, string $msg = 'ok'): never {
    echo json_encode(['status' => 'ok', 'message' => $msg, 'data' => $data]);
    exit;
}
function fail(string $msg, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $msg]);
    exit;
}

// ── Auth: validate session token from header ──────────────────
function requireAuth(string $minRole = 'viewer'): array {
    $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    if (!$token) fail('Not authenticated', 401);

    $stmt = db()->prepare(
        'SELECT s.user_id, s.role, u.username, u.display_name
         FROM sessions s JOIN users u ON s.user_id = u.id
         WHERE s.token = ? AND s.expires_at > NOW() AND u.status = "active"'
    );
    $stmt->execute([$token]);
    $session = $stmt->fetch();
    if (!$session) fail('Session expired or invalid', 401);

    $roleRank = ['viewer' => 0, 'admin' => 1, 'superadmin' => 2];
    if (($roleRank[$session['role']] ?? -1) < ($roleRank[$minRole] ?? 0)) {
        fail('Insufficient permissions', 403);
    }

    // Extend session TTL on each request
    db()->prepare('UPDATE sessions SET expires_at = DATE_ADD(NOW(), INTERVAL ' . SESSION_TTL . ' SECOND) WHERE token = ?')
        ->execute([$token]);

    return $session;
}

// ── Get or create period ID ───────────────────────────────────
function getOrCreatePeriod(int $year, int $month): int {
    $stmt = db()->prepare('SELECT id FROM periods WHERE year = ? AND month = ?');
    $stmt->execute([$year, $month]);
    $row = $stmt->fetch();
    if ($row) return (int)$row['id'];

    $ins = db()->prepare('INSERT INTO periods (year, month) VALUES (?, ?)');
    $ins->execute([$year, $month]);
    return (int)db()->lastInsertId();
}

// ── Audit log helper ──────────────────────────────────────────
function auditLog(array $session, string $action, string $module = '', ?int $periodId = null, string $detail = ''): void {
    try {
        db()->prepare(
            'INSERT INTO audit_log (user_id, username, action, module, period_id, detail, ip_address) VALUES (?,?,?,?,?,?,?)'
        )->execute([
            $session['user_id'], $session['username'], $action, $module,
            $periodId, $detail, $_SERVER['REMOTE_ADDR'] ?? ''
        ]);
    } catch (Exception) {}
}

// ── Clean up expired sessions (run occasionally) ──────────────
function cleanSessions(): void {
    try { db()->exec('DELETE FROM sessions WHERE expires_at < NOW()'); } catch (Exception) {}
}
