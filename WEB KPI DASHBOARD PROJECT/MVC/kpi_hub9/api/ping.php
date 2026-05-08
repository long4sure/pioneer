<?php
// =============================================================
// api/ping.php  –  Health check endpoint
// =============================================================
// Called by api.js checkOnline() to verify the server is up.
// Returns 200 + JSON if PHP is running and DB is reachable.
// Returns 503 if the database connection fails.
// =============================================================

require_once __DIR__ . '/config.php';
cors();

try {
    // Quick DB check — just verify the connection opens
    db()->query('SELECT 1');
    http_response_code(200);
    echo json_encode([
        'ok'      => true,
        'server'  => 'SC Operations Hub API',
        'db'      => 'connected',
        'time'    => date('Y-m-d H:i:s'),
    ]);
} catch (Throwable $e) {
    http_response_code(503);
    echo json_encode([
        'ok'    => false,
        'db'    => 'unavailable',
        'error' => $e->getMessage(),
    ]);
}
