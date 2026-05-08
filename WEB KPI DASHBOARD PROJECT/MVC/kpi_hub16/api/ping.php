<?php
// =============================================================
// api/ping.php  –  Health check + sync status + heartbeat
// =============================================================
// GET  ?action=ping              → server health check
// GET  ?action=sync&year=&month= → check if data changed since last_fetch
//                                  (requires X-Token)
// POST { action:'heartbeat' }    → update session last_seen
//                                  (requires X-Token)
// GET  ?action=active_sessions   → who is currently online
//                                  (requires X-Token, superadmin)
// =============================================================

require_once __DIR__ . '/config.php';
cors();

$action = $_GET['action'] ?? (body()['action'] ?? 'ping');

match ($action) {
    'ping'            => doPing(),
    'heartbeat'       => doHeartbeat(),
    'sync'            => doSync(),
    'active_sessions' => doActiveSessions(),
    default           => doPing(),
};

// =============================================================
function doPing(): never {
    try {
        db()->query('SELECT 1');
        ok(['server' => 'SC Operations Hub', 'db' => 'connected', 'time' => date('Y-m-d H:i:s')]);
    } catch (Throwable $e) {
        http_response_code(503);
        echo json_encode(['ok' => false, 'db' => 'unavailable']);
        exit;
    }
}

// =============================================================
// Heartbeat — update last_seen + return count of online users
// Call every 30 seconds from each connected browser tab.
// =============================================================
function doHeartbeat(): never {
    $token = $_SERVER['HTTP_X_TOKEN'] ?? '';
    if (!$token) ok(['online' => 0]); // unauthenticated — just ping

    try {
        // Update last_seen for this session
        db()->prepare('UPDATE sc_sessions SET last_seen = NOW() WHERE token = ?')
           ->execute([$token]);

        // Count sessions active in the last 2 minutes
        $stmt = db()->query(
            'SELECT COUNT(*) AS cnt FROM sc_sessions
             WHERE last_seen > DATE_SUB(NOW(), INTERVAL 2 MINUTE)
               AND expires_at > NOW()'
        );
        $cnt = (int)($stmt->fetch()['cnt'] ?? 0);

        ok(['online' => $cnt, 'time' => date('Y-m-d H:i:s')]);
    } catch (Throwable) {
        ok(['online' => 0]);
    }
}

// =============================================================
// Sync check — did any module for this period change since last_fetch?
// Client sends its last_fetch timestamp; server returns whether to reload.
// =============================================================
function doSync(): never {
    $token      = $_SERVER['HTTP_X_TOKEN'] ?? '';
    $year       = (int)($_GET['year']       ?? 0);
    $month      = (int)($_GET['month']      ?? 0);
    $last_fetch = $_GET['last_fetch']       ?? '1970-01-01 00:00:00';

    if (!$token || $year < 2020 || $month < 1 || $month > 12) {
        ok(['changed' => false]);
    }

    try {
        $pid = getPeriodId($year, $month);
        if (!$pid) { ok(['changed' => false]); }

        // Check if any module for this period was saved after last_fetch
        $stmt = db()->prepare(
            'SELECT module, saved_at FROM sc_sync_log
             WHERE period_id = ? AND saved_at > ?
             ORDER BY saved_at DESC'
        );
        $stmt->execute([$pid, $last_fetch]);
        $changes = $stmt->fetchAll();

        ok([
            'changed'  => count($changes) > 0,
            'modules'  => array_column($changes, 'module'),
            'saved_at' => $changes[0]['saved_at'] ?? null,
            'time'     => date('Y-m-d H:i:s'),
        ]);
    } catch (Throwable) {
        ok(['changed' => false]);
    }
}

// =============================================================
// Active sessions — who is online right now (superadmin only)
// "Online" = session active in last 2 minutes via heartbeat
// =============================================================
function doActiveSessions(): never {
    requireAuth('superadmin');

    try {
        $stmt = db()->query(
            'SELECT u.username, u.display_name, u.role,
                    s.ip, s.device_info, s.last_seen, s.created_at AS login_at
             FROM sc_sessions s
             JOIN sc_users u ON s.user_id = u.id
             WHERE s.last_seen > DATE_SUB(NOW(), INTERVAL 2 MINUTE)
               AND s.expires_at > NOW()
               AND u.status = "active"
             ORDER BY s.last_seen DESC'
        );
        ok($stmt->fetchAll());
    } catch (Throwable $e) {
        fail($e->getMessage());
    }
}
