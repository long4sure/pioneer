<?php
session_start();
require_once '../config/database.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: ../login.php");
    exit();
}

// Check if user is admin
if ($_SESSION['role'] != 'admin') {
    header("Location: ../dashboard.php");
    exit();
}

$database = new Database();
$db = $database->getConnection();

$success_message = '';
$error_message = '';

// Handle user creation
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['add_user'])) {
    $username = $_POST['username'];
    $password = md5($_POST['password']); // Simple hash for demo
    $full_name = $_POST['full_name'];
    $department = $_POST['department'];
    $role = $_POST['role'];
    
    try {
        $query = "INSERT INTO users (username, password, full_name, department, role) 
                  VALUES (:username, :password, :full_name, :department, :role)";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':username' => $username,
            ':password' => $password,
            ':full_name' => $full_name,
            ':department' => $department,
            ':role' => $role
        ]);
        $success_message = "User created successfully!";
    } catch (PDOException $e) {
        $error_message = "Error creating user: " . $e->getMessage();
    }
}

// Get all users
$users_query = "SELECT * FROM users ORDER BY created_at DESC";
$users = $db->query($users_query)->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management</title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <style>
        .admin-container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 1rem;
        }
        .admin-header {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        .user-form {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        .users-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .users-table th {
            background: #2c3e50;
            color: white;
            padding: 1rem;
            text-align: left;
        }
        .users-table td {
            padding: 1rem;
            border-bottom: 1px solid #ecf0f1;
        }
        .role-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: bold;
        }
        .role-admin { background: #e74c3c; color: white; }
        .role-editor { background: #3498db; color: white; }
        .role-viewer { background: #95a5a6; color: white; }
    </style>
</head>
<body>
    <?php include '../includes/navigation.php'; ?>
    
    <div class="admin-container">
        <div class="admin-header">
            <h1>👥 User Management</h1>
        </div>
        
        <?php if ($success_message): ?>
            <div class="success-message"><?php echo $success_message; ?></div>
        <?php endif; ?>
        
        <?php if ($error_message): ?>
            <div class="error-message"><?php echo $error_message; ?></div>
        <?php endif; ?>
        
        <div class="user-form">
            <h2>Add New User</h2>
            <form method="POST" class="data-form">
                <div class="form-group">
                    <label>Username:</label>
                    <input type="text" name="username" required>
                </div>
                
                <div class="form-group">
                    <label>Password:</label>
                    <input type="password" name="password" required>
                </div>
                
                <div class="form-group">
                    <label>Full Name:</label>
                    <input type="text" name="full_name" required>
                </div>
                
                <div class="form-group">
                    <label>Department:</label>
                    <select name="department" required>
                        <option value="production">Production</option>
                        <option value="warehouse">Warehouse</option>
                        <option value="purchasing">Purchasing</option>
                        <option value="planning">Planning</option>
                        <option value="finance">Finance</option>
                        <option value="admin">Administrator</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Role:</label>
                    <select name="role" required>
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Administrator</option>
                    </select>
                </div>
                
                <button type="submit" name="add_user" class="btn-submit">Create User</button>
            </form>
        </div>
        
        <h2>System Users</h2>
        <table class="users-table">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Full Name</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($users as $user): ?>
                <tr>
                    <td><?php echo htmlspecialchars($user['username']); ?></td>
                    <td><?php echo htmlspecialchars($user['full_name']); ?></td>
                    <td><?php echo ucfirst($user['department']); ?></td>
                    <td>
                        <span class="role-badge role-<?php echo $user['role']; ?>">
                            <?php echo ucfirst($user['role']); ?>
                        </span>
                    </td>
                    <td><?php echo date('M d, Y', strtotime($user['created_at'])); ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    
    <?php include '../includes/footer.php'; ?>
</body>
</html>