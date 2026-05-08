<?php
// =============================================================
// api/chat.php  –  Real-time Chat Backend
// =============================================================
// GET  ?action=list[&last_id=0]
// POST { action:'send', message }
// =============================================================

require_once __DIR__ . '/config.php';
cors();

// Ensure table exists
_ensureChatTable();

$method = $_SERVER['REQUEST_METHOD'];
if      ($method === 'GET')  handleChatLoad();
elseif  ($method === 'POST') handleChatWrite();
else fail('Method not allowed', 405);

// ── Auto-create table ─────────────────────────────────────────
function _ensureChatTable(): void {
    db()->exec("
        CREATE TABLE IF NOT EXISTS sc_chat_messages (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            user_id      INT NOT NULL,
            username     VARCHAR(50)  NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            message      TEXT         NOT NULL,
            created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            INDEX (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

// ── Load Messages ─────────────────────────────────────────────
function handleChatLoad(): never {
    requireAuth('viewer');
    $lastId = (int)($_GET['last_id'] ?? 0);

    // Fetch last 50 messages, or messages newer than lastId
    if ($lastId > 0) {
        $stmt = db()->prepare('SELECT * FROM sc_chat_messages WHERE id > ? ORDER BY id ASC LIMIT 100');
        $stmt->execute([$lastId]);
    } else {
        // Initial load: get last 50
        $stmt = db()->prepare('SELECT * FROM (SELECT * FROM sc_chat_messages ORDER BY id DESC LIMIT 50) sub ORDER BY id ASC');
        $stmt->execute();
    }

    ok($stmt->fetchAll());
}

// ── Send Message ──────────────────────────────────────────────
function handleChatWrite(): never {
    $sess   = requireAuth('viewer');
    $b      = body();
    $action = $b['action'] ?? '';

    if ($action !== 'send') fail("Unknown action: $action");

    $msg = trim($b['message'] ?? '');
    if (!$msg) fail('Message cannot be empty');
    if (strlen($msg) > 1000) fail('Message too long');

    db()->prepare(
        'INSERT INTO sc_chat_messages (user_id, username, display_name, message) VALUES (?,?,?,?)'
    )->execute([$sess['user_id'], $sess['username'], $sess['displayName'], $msg]);

    $id = (int) db()->lastInsertId();
    $row = db()->prepare('SELECT * FROM sc_chat_messages WHERE id = ?');
    $row->execute([$id]);
    
    ok($row->fetch(), 'Message sent');
}
