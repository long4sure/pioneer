<?php
// Include config first
require_once 'includes/config.php';
require_once 'includes/auth.php';

$auth = new Auth();

if ($auth->isLoggedIn()) {
    header('Location: pages/dashboard.php');
    exit();
} else {
    header('Location: pages/login.php');
    exit();
}
?>