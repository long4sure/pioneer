<?php
// =============================================================
// api/config.php  –  Database & app configuration
// =============================================================
// Edit ONLY this file to connect to your MySQL database.
//
// XAMPP defaults:
//   host = localhost, user = root, password = (blank)
//   Create a database named "sc_kpi" in phpMyAdmin first.
// =============================================================

define('DB_HOST',    'localhost');
define('DB_PORT',    3306);
define('DB_NAME',    'sc_kpi');
define('DB_USER',    'root');
define('DB_PASS',    '');            // set your MySQL password here
define('DB_CHARSET', 'utf8mb4');

// Session token lifetime in seconds (default: 8 hours)
define('SESSION_TTL', 8 * 3600);

// CORS — allow any HTTP origin so LAN devices (e.g. 192.168.x.x) can connect.
// In production, replace with your specific domain: ['https://yourdomain.com']
// Set to true to allow ALL origins (development/LAN mode)
define('CORS_ALL_ORIGINS', true);
define('CORS_ORIGINS', []);  // only used when CORS_ALL_ORIGINS is false

// =============================================================
// PDO singleton – call db() anywhere to get a connection
// =============================================================
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT
             . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// =============================================================
// HTTP helpers
// =============================================================
function cors(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (CORS_ALL_ORIGINS) {
        // Development / LAN mode: reflect whatever origin sent the request.
        // This lets phones, tablets, and other LAN devices connect.
        if ($origin) {
            header("Access-Control-Allow-Origin: $origin");
        } else {
            header('Access-Control-Allow-Origin: *');
        }
        header('Access-Control-Allow-Credentials: true');
    } elseif (in_array($origin, CORS_ORIGINS, true)) {
        // Production mode: only listed origins are allowed.
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    }

    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Token');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

function ok(mixed $data = null, string $msg = 'ok'): never {
    echo json_encode(['ok' => true, 'msg' => $msg, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $msg, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['ok' => false, 'msg' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

// =============================================================
// Auth middleware – validate X-Token header
// =============================================================
function requireAuth(string $minRole = 'viewer'): array {
    $token = $_SERVER['HTTP_X_TOKEN'] ?? '';
    if (!$token) fail('Not authenticated', 401);

    $stmt = db()->prepare(
        'SELECT s.user_id, s.role, u.username, u.display_name AS displayName
         FROM sc_sessions s
         JOIN sc_users u ON s.user_id = u.id
         WHERE s.token = ? AND s.expires_at > NOW() AND u.status = "active"'
    );
    $stmt->execute([$token]);
    $sess = $stmt->fetch();
    if (!$sess) fail('Session expired', 401);

    $rank = ['viewer' => 0, 'admin' => 1, 'superadmin' => 2];
    if (($rank[$sess['role']] ?? -1) < ($rank[$minRole] ?? 0)) fail('Insufficient role', 403);

    // Extend TTL
    db()->prepare('UPDATE sc_sessions SET expires_at = DATE_ADD(NOW(), INTERVAL ' . SESSION_TTL . ' SECOND) WHERE token = ?')
       ->execute([$token]);

    return $sess;
}

// =============================================================
// Audit log helper
// =============================================================
function audit(array $sess, string $action, string $module = '', ?int $periodId = null, string $detail = ''): void {
    try {
        db()->prepare(
            'INSERT INTO sc_audit (user_id, username, action, module, period_id, detail, ip)
             VALUES (?,?,?,?,?,?,?)'
        )->execute([
            $sess['user_id'], $sess['username'], $action, $module,
            $periodId, $detail, $_SERVER['REMOTE_ADDR'] ?? ''
        ]);
    } catch (Throwable) {}
}

// =============================================================
// Period helpers
// =============================================================
function getOrCreatePeriod(int $year, int $month): int {
    $s = db()->prepare('SELECT id FROM sc_periods WHERE year=? AND month=?');
    $s->execute([$year, $month]);
    $r = $s->fetch();
    if ($r) return (int)$r['id'];
    db()->prepare('INSERT INTO sc_periods (year,month) VALUES (?,?)')->execute([$year, $month]);
    return (int)db()->lastInsertId();
}

function getPeriodId(int $year, int $month): ?int {
    $s = db()->prepare('SELECT id FROM sc_periods WHERE year=? AND month=?');
    $s->execute([$year, $month]);
    $r = $s->fetch();
    return $r ? (int)$r['id'] : null;
}
