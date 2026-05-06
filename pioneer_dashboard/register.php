<?php
session_start();
include 'config.php';

$error = "";
$success = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $fullname = trim($_POST['fullname']);
    $username = trim($_POST['username']);
    $password = $_POST['password'];
    $role = $_POST['role'];

    // Check if username already exists
    $check = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $check->bind_param("s", $username);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        $error = "Username already exists.";
    } else {

        // Secure password hashing
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $conn->prepare("INSERT INTO users (fullname, username, password, role) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $fullname, $username, $hashedPassword, $role);

        if ($stmt->execute()) {
            $success = "Registration successful!";
        } else {
            $error = "Something went wrong.";
        }
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Register</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="login-box">
    <h2>Create Account</h2>

    <?php if($error): ?>
        <p class="error"><?= $error ?></p>
    <?php endif; ?>

    <?php if($success): ?>
        <p class="success"><?= $success ?></p>
    <?php endif; ?>

    <form method="POST">
        <input type="text" name="fullname" placeholder="Full Name" required>
        <input type="text" name="username" placeholder="Username" required>
        <input type="password" name="password" placeholder="Password" required>

        <select name="role" required>
            <option value="viewer">Viewer (View Only)</option>
            <option value="editor">Editor (Can Add/Edit)</option>
            <option value="admin">Admin (Full Access)</option>
        </select>

        <button type="submit">Register</button>
    </form>

    <p><a href="login.php">Back to Login</a></p>
</div>

</body>
</html>