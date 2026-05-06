<?php
// Make sure db_connection is included
require_once __DIR__ . '/db_connection.php';

class Auth {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    public function login($username, $password) {
        $conn = $this->db->getConnection();
        $username = $this->db->escapeString($username);
        
        $query = "SELECT * FROM users WHERE username = '$username' OR email = '$username'";
        $result = $conn->query($query);
        
        if ($result->num_rows == 1) {
            $user = $result->fetch_assoc();
            if (password_verify($password, $user['password'])) {
                $_SESSION['user_id'] = $user['user_id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['role'] = $user['role'];
                
                // Update last login
                $update = "UPDATE users SET last_login = NOW() WHERE user_id = " . $user['user_id'];
                $conn->query($update);
                
                return true;
            }
        }
        return false;
    }
    
    public function register($username, $email, $password, $role = 'viewer') {
        $conn = $this->db->getConnection();
        
        $username = $this->db->escapeString($username);
        $email = $this->db->escapeString($email);
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $role = $this->db->escapeString($role);
        
        // Check if username or email already exists
        $check_query = "SELECT user_id FROM users WHERE username = '$username' OR email = '$email'";
        $check_result = $conn->query($check_query);
        
        if ($check_result->num_rows > 0) {
            return false; // User already exists
        }
        
        $query = "INSERT INTO users (username, email, password, role) 
                  VALUES ('$username', '$email', '$hashed_password', '$role')";
        
        return $conn->query($query);
    }
    
    public function isLoggedIn() {
        return isset($_SESSION['user_id']);
    }
    
    public function isAdmin() {
        return ($this->isLoggedIn() && $_SESSION['role'] === 'admin');
    }
    
    public function logout() {
        $_SESSION = array();
        
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        
        session_destroy();
        return true;
    }
    
    public function getCurrentUser() {
        if ($this->isLoggedIn()) {
            return [
                'user_id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'role' => $_SESSION['role']
            ];
        }
        return null;
    }
    
    public function requireLogin() {
        if (!$this->isLoggedIn()) {
            header('Location: login.php');
            exit();
        }
    }
    
    public function requireAdmin() {
        $this->requireLogin();
        if (!$this->isAdmin()) {
            header('Location: dashboard.php');
            exit();
        }
    }
}
?>