<?php
require_once 'includes/session.php';

// Log the logout
if (isset($_SESSION['username'])) {
    logAction('logout', 'User logged out');
}

// Destroy session
logout();

// Redirect to login
header('Location: login.php');
exit();
?>