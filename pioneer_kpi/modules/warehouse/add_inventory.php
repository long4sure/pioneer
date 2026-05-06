<?php
session_start();
require_once '../../config/database.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: ../../login.php");
    exit();
}

// Check if user has access to warehouse module
$department = $_SESSION['department'] ?? '';
$role = $_SESSION['role'] ?? '';

if ($department != 'warehouse' && $role != 'admin') {
    header("Location: ../../dashboard.php");
    exit();
}

$database = new Database();
$db = $database->getConnection();

$success_message = '';
$error_message = '';

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['add_inventory'])) {
        $inventory_type = $_POST['inventory_type'];
        $total_count = $_POST['total_count'];
        $missed_count = $_POST['missed_count'];
        $month_year = $_POST['month_year'] . '-01';
        
        // Calculate accuracy percentage
        if ($total_count > 0) {
            $accuracy_percent = (($total_count - $missed_count) / $total_count) * 100;
        } else {
            $accuracy_percent = 0;
        }
        
        try {
            $query = "INSERT INTO inventory_accuracy 
                      (inventory_type, total_count, missed_count, accuracy_percent, month_year, entered_by) 
                      VALUES 
                      (:type, :total, :missed, :accuracy, :month, :user)";
            
            $stmt = $db->prepare($query);
            $stmt->execute([
                ':type' => $inventory_type,
                ':total' => $total_count,
                ':missed' => $missed_count,
                ':accuracy' => $accuracy_percent,
                ':month' => $month_year,
                ':user' => $_SESSION['user_id']
            ]);
            
            $success_message = "Inventory record added successfully!";
        } catch (PDOException $e) {
            $error_message = "Error adding record: " . $e->getMessage();
        }
    }
    
    if (isset($_POST['add_forecast'])) {
        $region = $_POST['region'];
        $product_category = $_POST['product_category'];
        $accuracy_percent = $_POST['accuracy_percent'];
        $month_year = $_POST['month_year'] . '-01';
        
        try {
            $query = "INSERT INTO forecast_accuracy 
                      (region, product_category, accuracy_percent, month_year, entered_by) 
                      VALUES 
                      (:region, :product, :accuracy, :month, :user)";
            
            $stmt = $db->prepare($query);
            $stmt->execute([
                ':region' => $region,
                ':product' => $product_category,
                ':accuracy' => $accuracy_percent,
                ':month' => $month_year,
                ':user' => $_SESSION['user_id']
            ]);
            
            $success_message = "Forecast accuracy record added successfully!";
        } catch (PDOException $e) {
            $error_message = "Error adding record: " . $e->getMessage();
        }
    }
}

// Get existing records
$inventory_records = [];
try {
    $query = "SELECT * FROM inventory_accuracy WHERE YEAR(month_year) = 2026 ORDER BY month_year DESC";
    $stmt = $db->query($query);
    $inventory_records = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    // Table might not exist yet
}

$forecast_records = [];
try {
    $query = "SELECT * FROM forecast_accuracy WHERE YEAR(month_year) = 2026 ORDER BY month_year DESC";
    $stmt = $db->query($query);
    $forecast_records = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    // Table might not exist yet
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warehouse Management - Add Inventory Data</title>
    <link rel="stylesheet" href="../../assets/css/style.css">
    <style>
        .warehouse-container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 1rem;
        }
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding: 1rem;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .page-header h1 {
            color: #2c3e50;
            margin: 0;
        }
        .form-section {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        .form-section h2 {
            color: #2c3e50;
            margin-top: 0;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #ecf0f1;
        }
        .data-form {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
            color: #2c3e50;
        }
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #bdc3c7;
            border-radius: 4px;
            font-size: 1rem;
        }
        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #3498db;
        }
        .btn-submit {
            background-color: #3498db;
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            grid-column: 1 / -1;
        }
        .btn-submit:hover {
            background-color: #2980b9;
        }
        .success-message {
            background-color: #d4edda;
            color: #155724;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            border: 1px solid #c3e6cb;
        }
        .error-message {
            background-color: #f8d7da;
            color: #721c24;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            border: 1px solid #f5c6cb;
        }
        .records-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        .records-table th {
            background-color: #2c3e50;
            color: white;
            padding: 0.75rem;
            text-align: left;
        }
        .records-table td {
            padding: 0.75rem;
            border: 1px solid #bdc3c7;
        }
        .records-table tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.85rem;
            font-weight: bold;
        }
        .badge-fg {
            background-color: #3498db;
            color: white;
        }
        .badge-rmpm {
            background-color: #e67e22;
            color: white;
        }
        .tab-container {
            margin-bottom: 2rem;
        }
        .tab-buttons {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .tab-btn {
            padding: 0.75rem 1.5rem;
            background-color: #ecf0f1;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
        }
        .tab-btn.active {
            background-color: #3498db;
            color: white;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <?php include '../../includes/navigation.php'; ?>
    
    <div class="warehouse-container">
        <div class="page-header">
            <h1>📦 Warehouse Management</h1>
            <div>
                <span class="badge" style="background-color: #27ae60; color: white; padding: 0.5rem 1rem;">
                    Department: <?php echo ucfirst($department); ?>
                </span>
            </div>
        </div>
        
        <?php if ($success_message): ?>
            <div class="success-message"><?php echo $success_message; ?></div>
        <?php endif; ?>
        
        <?php if ($error_message): ?>
            <div class="error-message"><?php echo $error_message; ?></div>
        <?php endif; ?>
        
        <div class="tab-container">
            <div class="tab-buttons">
                <button class="tab-btn active" onclick="showTab('inventory')">📊 Inventory Accuracy</button>
                <button class="tab-btn" onclick="showTab('forecast')">📈 Forecast Accuracy</button>
                <button class="tab-btn" onclick="showTab('view')">👁️ View Records</button>
            </div>
            
            <!-- Inventory Accuracy Form -->
            <div id="inventory-tab" class="tab-content active">
                <div class="form-section">
                    <h2>Add Inventory Accuracy Record</h2>
                    <form method="POST" class="data-form">
                        <div class="form-group">
                            <label>Inventory Type:</label>
                            <select name="inventory_type" required>
                                <option value="">Select Type</option>
                                <option value="FG">Finished Goods (FG)</option>
                                <option value="RMPM">Raw Materials & Packaging (RMPM)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Total Items Counted:</label>
                            <input type="number" name="total_count" min="1" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Items with Discrepancy:</label>
                            <input type="number" name="missed_count" min="0" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Month:</label>
                            <input type="month" name="month_year" required value="<?php echo date('Y-m'); ?>">
                        </div>
                        
                        <button type="submit" name="add_inventory" class="btn-submit">Save Inventory Record</button>
                    </form>
                </div>
            </div>
            
            <!-- Forecast Accuracy Form -->
            <div id="forecast-tab" class="tab-content">
                <div class="form-section">
                    <h2>Add Forecast Accuracy Record</h2>
                    <form method="POST" class="data-form">
                        <div class="form-group">
                            <label>Region:</label>
                            <select name="region" required>
                                <option value="">Select Region</option>
                                <option value="GMA">GMA</option>
                                <option value="NORTH LUZON">North Luzon</option>
                                <option value="SOUTH LUZON">South Luzon</option>
                                <option value="VISAYAS">Visayas</option>
                                <option value="MINDANAO">Mindanao</option>
                                <option value="MODERN TRADE">Modern Trade</option>
                                <option value="PSBSI">PSBSI</option>
                                <option value="INDONESIA">Indonesia</option>
                                <option value="DIRECT EXPORT">Direct Export</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Product Category:</label>
                            <select name="product_category" required>
                                <option value="">Select Product</option>
                                <option value="EPOXY">EPOXY (MARINE + CONSTRUCTION)</option>
                                <option value="ELASTOSEAL">ELASTOSEAL</option>
                                <option value="PRO-PEX">PRO-PEX</option>
                                <option value="BUILDERS BOND">BUILDERS BOND</option>
                                <option value="COATING MARINE">COATING MARINE</option>
                                <option value="PRO-SEALANT">PRO-SEALANT</option>
                                <option value="PRO-WATERPROOFING">PRO-WATERPROOFING</option>
                                <option value="PRO-PAINTING">PRO-PAINTING</option>
                                <option value="PRO-ADHESIVES">PRO-ADHESIVES</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Accuracy Percentage (%):</label>
                            <input type="number" step="0.1" min="0" max="100" name="accuracy_percent" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Month:</label>
                            <input type="month" name="month_year" required value="<?php echo date('Y-m'); ?>">
                        </div>
                        
                        <button type="submit" name="add_forecast" class="btn-submit">Save Forecast Record</button>
                    </form>
                </div>
            </div>
            
            <!-- View Records Tab -->
            <div id="view-tab" class="tab-content">
                <div class="form-section">
                    <h2>Inventory Accuracy Records</h2>
                    <?php if (count($inventory_records) > 0): ?>
                        <table class="records-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Month</th>
                                    <th>Total Count</th>
                                    <th>Missed</th>
                                    <th>Accuracy</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($inventory_records as $record): ?>
                                <tr>
                                    <td>
                                        <span class="badge <?php echo $record['inventory_type'] == 'FG' ? 'badge-fg' : 'badge-rmpm'; ?>">
                                            <?php echo $record['inventory_type']; ?>
                                        </span>
                                    </td>
                                    <td><?php echo date('M Y', strtotime($record['month_year'])); ?></td>
                                    <td><?php echo number_format($record['total_count']); ?></td>
                                    <td><?php echo number_format($record['missed_count']); ?></td>
                                    <td><strong><?php echo number_format($record['accuracy_percent'], 1); ?>%</strong></td>
                                    <td>
                                        <?php if ($record['accuracy_percent'] >= 98): ?>
                                            <span class="badge" style="background-color: #27ae60; color: white;">Excellent</span>
                                        <?php elseif ($record['accuracy_percent'] >= 95): ?>
                                            <span class="badge" style="background-color: #f39c12; color: white;">Good</span>
                                        <?php else: ?>
                                            <span class="badge" style="background-color: #e74c3c; color: white;">Needs Improvement</span>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php else: ?>
                        <p class="missing-value">No inventory records found.</p>
                    <?php endif; ?>
                </div>
                
                <div class="form-section">
                    <h2>Forecast Accuracy Records</h2>
                    <?php if (count($forecast_records) > 0): ?>
                        <table class="records-table">
                            <thead>
                                <tr>
                                    <th>Region</th>
                                    <th>Product</th>
                                    <th>Month</th>
                                    <th>Accuracy</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($forecast_records as $record): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($record['region']); ?></td>
                                    <td><?php echo htmlspecialchars($record['product_category']); ?></td>
                                    <td><?php echo date('M Y', strtotime($record['month_year'])); ?></td>
                                    <td><strong><?php echo number_format($record['accuracy_percent'], 1); ?>%</strong></td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php else: ?>
                        <p class="missing-value">No forecast records found.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    
    <script>
    function showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabName + '-tab').classList.add('active');
        
        // Add active class to clicked button
        event.target.classList.add('active');
    }
    </script>
    
    <?php include '../../includes/footer.php'; ?>
</body>
</html>