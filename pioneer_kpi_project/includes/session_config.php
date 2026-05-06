<?php
// Session configuration - this must be loaded BEFORE any session starts
if (session_status() === PHP_SESSION_NONE) {
    // Set session cookie parameters
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => false, // Set to true if using HTTPS
        'httponly' => true,
        'samesite' => 'Strict'
    ]);
    
    // These settings must be set before session start
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS
    
    // Start session if not already started
    session_start();
}
?>