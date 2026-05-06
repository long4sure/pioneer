<?php
require_once '../includes/config.php';
require_once '../includes/auth.php';

$auth = new Auth();

// Redirect if already logged in
if ($auth->isLoggedIn()) {
    header('Location: dashboard.php');
    exit();
}

// Rest of your register.php code...
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - <?php echo APP_NAME; ?></title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="auth-page">
    <div class="auth-container">
        <div class="auth-box">
            <div class="auth-header">
                <h1><?php echo APP_NAME; ?></h1>
                <p>Create a new account</p>
            </div>
            
            <?php
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $username = $_POST['username'] ?? '';
                $email = $_POST['email'] ?? '';
                $password = $_POST['password'] ?? '';
                $confirm_password = $_POST['confirm_password'] ?? '';
                
                $errors = [];
                
                if ($password !== $confirm_password) {
                    $errors[] = "Passwords do not match";
                }
                
                if (strlen($password) < 6) {
                    $errors[] = "Password must be at least 6 characters";
                }
                
                if (empty($errors)) {
                    if ($auth->register($username, $email, $password)) {
                        echo '<div class="alert alert-success">Registration successful! <a href="login.php">Login here</a></div>';
                    } else {
                        echo '<div class="alert alert-error">Registration failed. Username or email may already exist.</div>';
                    }
                } else {
                    foreach ($errors as $error) {
                        echo '<div class="alert alert-error">' . $error . '</div>';
                    }
                }
            }
            ?>
            
            <form method="POST" action="" class="auth-form">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required>
                </div>
                
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required>
                </div>
                
                <div class="form-group">
                    <label for="confirm_password">Confirm Password</label>
                    <input type="password" id="confirm_password" name="confirm_password" required>
                </div>
                
                <button type="submit" class="btn btn-primary btn-block">Register</button>
            </form>
            
            <div class="auth-footer">
                <p>Already have an account? <a href="login.php">Login here</a></p>
            </div>
        </div>
    </div>
</body>
</html>