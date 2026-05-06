<?php
// First include config which sets up the session and autoloader
require_once 'includes/config.php';

// Now explicitly include auth.php if autoloader doesn't catch it
require_once 'includes/auth.php';

$auth = new Auth();
$auth->logout();

// Redirect to login page
header('Location: pages/login.php');
exit();
?>