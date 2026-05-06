<?php
require_once 'config/config.php';
require_once 'config/database.php';

session_start();

// Log logout activity if user was logged in
if (isset($_SESSION['user_id'])) {
    $database = new Database();
    $db = $database->getConnection();
    if ($db) {
        logActivity($db, $_SESSION['user_id'], 'LOGOUT', 'User logged out');
    }
}

// Clear all session data
$_SESSION = array();

// Destroy the session cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destroy the session
session_destroy();

// Redirect to login
redirect('/login.php');
?>