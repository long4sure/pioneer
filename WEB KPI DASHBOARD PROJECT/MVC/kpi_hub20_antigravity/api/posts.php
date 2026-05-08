<?php
// =============================================================
// api/posts.php  –  Community Board: Suggestions / Feedback / Issues
// =============================================================
// GET  ?action=list[&category=issue][&status=open][&limit=50][&offset=0]
// POST { action:'create', category, title, body }
// POST { action:'reply',  id, reply }         ← admin only
// POST { action:'status', id, status }         ← admin only
// POST { action:'delete', id }                 ← admin only
// =============================================================

require_once __DIR__ . '/config.php';
cors();

// Ensure table exists (auto-create on first request)
_ensurePostsTable();

$method = $_SERVER['REQUEST_METHOD'];
if      ($method === 'GET')  handlePostsLoad();
elseif  ($method === 'POST') handlePostsWrite();
else fail('Method not allowed', 405);

// ── Auto-create table if missing ──────────────────────────────
function _ensurePostsTable(): void {
    db()->exec("
        CREATE TABLE IF NOT EXISTS sc_posts (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            username     VARCHAR(50)  NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            category     ENUM('suggestion','feedback','issue','general') NOT NULL DEFAULT 'general',
            title        VARCHAR(200) NOT NULL,
            body         TEXT         NOT NULL,
            status       ENUM('open','in_review','resolved','closed') NOT NULL DEFAULT 'open',
            admin_reply  TEXT         DEFAULT NULL,
            replied_by   VARCHAR(50)  DEFAULT NULL,
            created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

// =============================================================
// LOAD — list posts (all users can read)
// =============================================================
function handlePostsLoad(): never {
    $sess     = requireAuth('viewer');
    $category = $_GET['category'] ?? '';
    $status   = $_GET['status']   ?? '';
    $limit    = max(1, min(100, (int)($_GET['limit']  ?? 30)));
    $offset   = max(0, (int)($_GET['offset'] ?? 0));

    $where = [];
    $params = [];
    if ($category && in_array($category, ['suggestion','feedback','issue','general'])) {
        $where[] = 'category = :cat'; $params[':cat'] = $category;
    }
    if ($status && in_array($status, ['open','in_review','resolved','closed'])) {
        $where[] = 'status = :status'; $params[':status'] = $status;
    }
    $sql = 'SELECT * FROM sc_posts' . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY created_at DESC LIMIT :limit OFFSET :offset';
    $stmt = db()->prepare($sql);
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    // Total count for pagination
    $cntSql = 'SELECT COUNT(*) FROM sc_posts' . ($where ? ' WHERE ' . implode(' AND ', $where) : '');
    $cntStmt = db()->prepare($cntSql);
    foreach ($params as $key => $val) {
        $cntStmt->bindValue($key, $val);
    }
    $cntStmt->execute();
    $total = (int)$cntStmt->fetchColumn();

    ok(['posts' => $rows, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
}

// =============================================================
// WRITE — create / reply / status / delete
// =============================================================
function handlePostsWrite(): never {
    $sess   = requireAuth('viewer');
    $b      = body();
    $action = $b['action'] ?? '';

    match($action) {
        'create' => postCreate($sess, $b),
        'reply'  => postReply($sess, $b),
        'status' => postStatus($sess, $b),
        'delete' => postDelete($sess, $b),
        default  => fail("Unknown action: $action"),
    };
}

function postCreate(array $sess, array $b): never {
    $category = $b['category'] ?? 'general';
    $title    = trim($b['title'] ?? '');
    $body     = trim($b['body']  ?? '');
    if (!$title) fail('Title is required');
    if (!$body)  fail('Body is required');
    if (strlen($title) > 200) fail('Title too long (max 200 chars)');
    if (!in_array($category, ['suggestion','feedback','issue','general'])) $category = 'general';

    db()->prepare(
        'INSERT INTO sc_posts (username, display_name, category, title, body) VALUES (?,?,?,?,?)'
    )->execute([$sess['username'], $sess['displayName'], $category, $title, $body]);

    $id = (int) db()->lastInsertId();
    $row = db()->prepare('SELECT * FROM sc_posts WHERE id = ?');
    $row->execute([$id]);
    ok($row->fetch(), 'Post created');
}

function postReply(array $sess, array $b): never {
    _requireAdmin($sess);
    $id    = (int)($b['id'] ?? 0);
    $reply = trim($b['reply'] ?? '');
    if (!$id) fail('Post ID required');
    db()->prepare(
        'UPDATE sc_posts SET admin_reply=?, replied_by=?, status=IF(status="open","in_review",status) WHERE id=?'
    )->execute([$reply ?: null, $reply ? $sess['username'] : null, $id]);
    ok(null, 'Reply saved');
}

function postStatus(array $sess, array $b): never {
    _requireAdmin($sess);
    $id     = (int)($b['id'] ?? 0);
    $status = $b['status'] ?? '';
    if (!$id) fail('Post ID required');
    if (!in_array($status, ['open','in_review','resolved','closed'])) fail('Invalid status');
    db()->prepare('UPDATE sc_posts SET status=? WHERE id=?')->execute([$status, $id]);
    ok(null, 'Status updated');
}

function postDelete(array $sess, array $b): never {
    _requireAdmin($sess);
    $id = (int)($b['id'] ?? 0);
    if (!$id) fail('Post ID required');
    db()->prepare('DELETE FROM sc_posts WHERE id=?')->execute([$id]);
    ok(null, 'Deleted');
}

function _requireAdmin(array $sess): void {
    $rank = ['viewer' => 0, 'admin' => 1, 'superadmin' => 2];
    if (($rank[$sess['role']] ?? 0) < 1) fail('Admin access required', 403);
}
