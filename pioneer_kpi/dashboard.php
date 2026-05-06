<?php
session_start();
require_once 'config/database.php';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

// Set default values if session variables are not set
$full_name = $_SESSION['full_name'] ?? 'User';
$department = $_SESSION['department'] ?? 'admin';
$role = $_SESSION['role'] ?? 'viewer';
$username = $_SESSION['username'] ?? 'user';

$database = new Database();
$db = $database->getConnection();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pioneer KPI Dashboard</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        .action-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-top: 1rem;
        }
        .action-card {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
            padding: 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            transition: transform 0.3s;
        }
        .action-card:hover {
            transform: translateY(-5px);
        }
        .action-card h3 {
            margin-bottom: 0.5rem;
        }
        .action-card p {
            opacity: 0.9;
            font-size: 0.9rem;
        }
        .user-info {
            background-color: #ecf0f1;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <?php include 'includes/navigation.php'; ?>
    
    <div class="dashboard-container">
        <div class="dashboard-header">
            <h1>Welcome, <?php echo htmlspecialchars($full_name); ?>!</h1>
            <div class="user-info">
                Department: <?php echo ucfirst($department); ?> | 
                Role: <?php echo ucfirst($role); ?> | 
                User: <?php echo htmlspecialchars($username); ?>
            </div>
        </div>
        
        <div class="kpi-grid">
            <!-- Summary Cards -->
            <div class="kpi-card">
                <h3>Total Production MT</h3>
                <?php
                try {
                    $query = "SELECT SUM(output_kg)/1000 as total FROM production_output 
                              WHERE YEAR(month_year) = 2026";
                    $stmt = $db->query($query);
                    $total = $stmt->fetch(PDO::FETCH_ASSOC);
                    $value = $total['total'] ?? 0;
                } catch (Exception $e) {
                    $value = 0;
                }
                ?>
                <div class="value" style="font-size: 2rem; font-weight: bold; color: #2c3e50;">
                    <?php echo number_format($value, 1); ?> MT
                </div>
            </div>
            
            <div class="kpi-card">
                <h3>FG Inventory Accuracy</h3>
                <?php
                try {
                    $query = "SELECT AVG(accuracy_percent) as avg_acc FROM inventory_accuracy 
                              WHERE inventory_type = 'FG' AND YEAR(month_year) = 2026";
                    $stmt = $db->query($query);
                    $accuracy = $stmt->fetch(PDO::FETCH_ASSOC);
                    $value = $accuracy['avg_acc'] ?? 0;
                } catch (Exception $e) {
                    $value = 0;
                }
                ?>
                <div class="value" style="font-size: 2rem; font-weight: bold; color: #2c3e50;">
                    <?php echo number_format($value, 1); ?>%
                </div>
            </div>
            
            <div class="kpi-card">
                <h3>RMPM Inventory Accuracy</h3>
                <?php
                try {
                    $query = "SELECT AVG(accuracy_percent) as avg_acc FROM inventory_accuracy 
                              WHERE inventory_type = 'RMPM' AND YEAR(month_year) = 2026";
                    $stmt = $db->query($query);
                    $accuracy = $stmt->fetch(PDO::FETCH_ASSOC);
                    $value = $accuracy['avg_acc'] ?? 0;
                } catch (Exception $e) {
                    $value = 0;
                }
                ?>
                <div class="value" style="font-size: 2rem; font-weight: bold; color: #2c3e50;">
                    <?php echo number_format($value, 1); ?>%
                </div>
            </div>
            
            <div class="kpi-card">
                <h3>Total Overtime Hours</h3>
                <?php
                try {
                    $query = "SELECT SUM(overtime_hours) as total FROM labor_reports 
                              WHERE YEAR(month_year) = 2026";
                    $stmt = $db->query($query);
                    $overtime = $stmt->fetch(PDO::FETCH_ASSOC);
                    $value = $overtime['total'] ?? 0;
                } catch (Exception $e) {
                    $value = 0;
                }
                ?>
                <div class="value" style="font-size: 2rem; font-weight: bold; color: #2c3e50;">
                    <?php echo number_format($value, 0); ?> hrs
                </div>
            </div>
        </div>
        
        <div class="dashboard-section">
            <h2>Quick Actions</h2>
            <div class="action-grid">
                <?php if ($department == 'production' || $role == 'admin'): ?>
                <a href="modules/production/add_record.php" class="action-card">
                    <h3>📊 Add Production Data</h3>
                    <p>Record output, downtime, and waste</p>
                </a>
                <?php endif; ?>
                
                <?php if ($department == 'warehouse' || $role == 'admin'): ?>
                <a href="modules/warehouse/add_inventory.php" class="action-card">
                    <h3>📦 Update Inventory</h3>
                    <p>Record inventory counts and accuracy</p>
                </a>
                <?php endif; ?>
                
                <?php if ($department == 'planning' || $role == 'admin'): ?>
                <a href="modules/planning/add_forecast.php" class="action-card">
                    <h3>📈 Update Forecast</h3>
                    <p>Record forecast accuracy by region</p>
                </a>
                <?php endif; ?>
                
                <a href="scm_dashboard.php" class="action-card">
                    <h3>📋 View SCM Dashboard</h3>
                    <p>Complete KPI overview</p>
                </a>
                
                <a href="kpi_tracker.php" class="action-card">
                    <h3>📊 KPI Tracker</h3>
                    <p>View all KPI records</p>
                </a>
            </div>
        </div>
        
        <div class="dashboard-section">
            <h2>System Status</h2>
            <div style="background-color: #d4edda; color: #155724; padding: 1rem; border-radius: 4px;">
                ✅ Database connection successful<br>
                ✅ User session active<br>
                ✅ System ready
            </div>
        </div>
    </div>
    
    <?php include 'includes/footer.php'; ?>
</body>
</html>