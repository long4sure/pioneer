<?php
// Application configuration
define('APP_NAME', 'Pioneer SCM KPI System');
define('APP_VERSION', '2.0.0');
define('BASE_URL', '/pioneer_intern_project_2026/pioneer_kpi');
define('BASE_PATH', __DIR__ . '/..');

// Session configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS

// Timezone
date_default_timezone_set('Asia/Manila');

// Error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include helper functions
require_once __DIR__ . '/functions.php';
?>