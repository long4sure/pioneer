<?php
session_start();
include 'config.php';

$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $username = trim($_POST['username']);
    $password = $_POST['password'];

    if (empty($username) || empty($password)) {
        $error = "All fields are required.";
    } else {

        // Use prepared statement (SECURE)
        $stmt = $conn->prepare("SELECT id, fullname, password, role FROM users WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 1) {

            $user = $result->fetch_assoc();

            if (password_verify($password, $user['password'])) {

                // Prevent session fixation attack
                session_regenerate_id(true);

                $_SESSION['user_id'] = $user['id'];
                $_SESSION['fullname'] = $user['fullname'];
                $_SESSION['role'] = $user['role'];

                header("Location: index.php");
                exit();

            } else {
                $error = "Invalid username or password.";
            }

        } else {
            $error = "Invalid username or password.";
        }

        $stmt->close();
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Login - KPI Dashboard</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="login-body">

<div class="login-box">
    <h2>KPI Dashboard Login</h2>

    <?php if(!empty($error)): ?>
        <p class="error"><?= $error ?></p>
    <?php endif; ?>

    <form method="POST">
        <input type="text" name="username" placeholder="Username" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Login</button>
    </form>

    <p class="register-link">
        <a href="register.php">Create Account</a>
    </p>
</div>

</body>
</html>