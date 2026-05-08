<?php
// =============================================================
// api/audit.php  –  Audit log API (MySQL-backed)
// =============================================================
// GET  ?action=list&limit=500&offset=0   → fetch log entries
// GET  ?action=stats                      → save + login counts
// POST { action:'log', action_name, module, detail }  → write entry
// POST { action:'clear' }                 → clear all entries [superadmin]
// All requests require X-Token header.
// =============================================================

require_once __DIR__ . '/config.php';
cors();

$method = $_SERVER['REQUEST_METHOD'];
$b      = $method === 'POST' ? body() : [];
$action = $_GET['action'] ?? ($b['action'] ?? 'list');

match($action) {
    'list'  => doList(),
    'stats' => doStats(),
    'log'   => doLog($b),
    'clear' => doClear(),
    default => fail("Unknown action: $action"),
};

// =============================================================
// List audit entries (newest first)
// =============================================================
function doList(): never {
    requireAuth('superadmin');
    $limit  = max(1, min(2000, (int)($_GET['limit']  ?? 500)));
    $offset = max(0,           (int)($_GET['offset'] ?? 0));

    $rows = db()->prepare(
        'SELECT id, username, action, module, detail, ip, created_at
         FROM sc_audit
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?'
    );
    $rows->execute([$limit, $offset]);
    $entries = $rows->fetchAll();

    // Count total
    $cnt = db()->query('SELECT COUNT(*) AS n FROM sc_audit')->fetch()['n'] ?? 0;

    ok(['entries' => $entries, 'total' => (int)$cnt]);
}

// =============================================================
// Stats — total saves and total logins from sc_audit
// =============================================================
function doStats(): never {
    requireAuth('superadmin');
    $stmt = db()->query(
        "SELECT
            SUM(action='save')  AS saves,
            SUM(action='login') AS logins
         FROM sc_audit"
    );
    $row = $stmt->fetch();
    ok([
        'saves'  => (int)($row['saves']  ?? 0),
        'logins' => (int)($row['logins'] ?? 0),
    ]);
}

// =============================================================
// Write a log entry
// =============================================================
function doLog(array $b): never {
    $sess   = requireAuth('viewer'); // any logged-in user can write logs
    $action = $b['action_name'] ?? '';
    $module = $b['module']      ?? '';
    $detail = $b['detail']      ?? '';

    if (!$action) fail('action_name required');

    audit($sess, $action, $module, null, $detail);
    ok(null, 'Logged');
}

// =============================================================
// Clear all log entries [superadmin only]
// =============================================================
function doClear(): never {
    requireAuth('superadmin');
    db()->exec('DELETE FROM sc_audit');
    ok(null, 'Audit log cleared');
}
