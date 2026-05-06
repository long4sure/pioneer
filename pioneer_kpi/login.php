<?php
require_once 'config/config.php';
require_once 'config/database.php';

session_start();

// Redirect if already logged in
if (isset($_SESSION['user_id'])) {
    redirect('/dashboard.php');
}

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        $error = "Database connection error. Please try again later.";
    } else {
        $username = sanitize($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        
        // Check if users table exists
        if (!$database->tableExists('users')) {
            $error = "System not properly installed. Please run database setup.";
        } else {
            $query = "SELECT * FROM users WHERE username = :username AND is_active = 1";
            $stmt = $db->prepare($query);
            $stmt->execute([':username' => $username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Simple password verification (in production use password_verify)
            if ($user && md5($password) === $user['password']) {
                $_SESSION['user_id'] = $user['user_id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['full_name'] = $user['full_name'] ?? 'User';
                $_SESSION['department'] = $user['department'] ?? 'viewer';
                $_SESSION['role'] = $user['role'] ?? 'viewer';
                
                // Log login activity
                logActivity($db, $user['user_id'], 'LOGIN', 'User logged in');
                
                redirect('/dashboard.php');
            } else {
                $error = "Invalid username or password";
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Pioneer SCM KPI System</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .login-container {
            width: 100%;
            max-width: 400px;
            padding: 20px;
        }
        
        .login-box {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            padding: 40px;
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .login-header h1 {
            color: #2c3e50;
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .login-header p {
            color: #7f8c8d;
            font-size: 14px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #34495e;
            font-weight: 600;
            font-size: 14px;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #3498db;
        }
        
        .btn-login {
            width: 100%;
            padding: 14px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
        }
        
        .btn-login:hover {
            background: #2980b9;
        }
        
        .alert {
            padding: 12px 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 14px;
        }
        
        .alert-error {
            background: #fde8e8;
            color: #e74c3c;
            border: 1px solid #fad7d7;
        }
        
        .alert-success {
            background: #e3f7e3;
            color: #27ae60;
            border: 1px solid #c3e6cb;
        }
        
        .demo-info {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
            text-align: center;
            color: #7f8c8d;
            font-size: 13px;
        }
        
        .demo-info strong {
            color: #2c3e50;
        }
        
        .version {
            text-align: center;
            margin-top: 20px;
            color: rgba(255,255,255,0.7);
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-box">
            <div class="login-header">
                <h1>Pioneer Adhesives</h1>
                <p>SCM KPI System v2.0</p>
            </div>
            
            <?php if ($error): ?>
                <div class="alert alert-error"><?php echo $error; ?></div>
            <?php endif; ?>
            
            <?php if ($success): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <form method="POST" action="">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" value="admin" required autofocus>
                </div>
                
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" value="admin123" required>
                </div>
                
                <button type="submit" class="btn-login">Sign In</button>
            </form>
            
            <div class="demo-info">
                <p><strong>Demo Credentials</strong></p>
                <p>Username: admin<br>Password: admin123</p>
                <p style="margin-top: 10px; font-style: italic;">Use these credentials for testing</p>
            </div>
        </div>
        <div class="version">
            &copy; <?php echo date('Y'); ?> Pioneer Adhesives Inc. | Version 2.0
        </div>
    </div>
</body>
</html>