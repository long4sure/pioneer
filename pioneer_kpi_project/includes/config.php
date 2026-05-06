<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'pioneer_kpi_project');

// Application configuration
define('APP_NAME', 'Pioneer KPI Dashboard');
define('APP_VERSION', '1.0.0');

// Timezone
date_default_timezone_set('Asia/Manila');

// Load session configuration
require_once __DIR__ . '/session_config.php';

// Auto-loader for classes (optional but good practice)
spl_autoload_register(function ($class_name) {
    $file = __DIR__ . '/' . $class_name . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});
?>