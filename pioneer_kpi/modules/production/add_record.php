<?php
session_start();
require_once dirname(__DIR__, 2) . '/config/database.php'; // Go up 2 levels to root

if (!isset($_SESSION['user_id'])) {
    header("Location: /pioneer_kpi/login.php");
    exit();
}

$database = new Database();
$db = $database->getConnection();

$success_message = '';
$error_message = '';

// Get production lines for dropdown
$lines = [];
try {
    $lines_query = "SELECT * FROM production_lines WHERE is_active = 1 ORDER BY line_code";
    $lines_stmt = $db->query($lines_query);
    $lines = $lines_stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $error_message = "Error loading production lines: " . $e->getMessage();
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['add_output'])) {
        $line_id = $_POST['line_id'];
        $product_type = $_POST['product_type'];
        $output_kg = $_POST['output_kg'];
        $waste_kg = $_POST['waste_kg'] ?? 0;
        $rework_kg = $_POST['rework_kg'] ?? 0;
        $production_days = $_POST['production_days'];
        $month_year = $_POST['month_year'] . '-01';
        
        try {
            $query = "INSERT INTO production_output 
                      (line_id, product_type, output_kg, waste_kg, rework_kg, production_days, month_year, entered_by) 
                      VALUES 
                      (:line_id, :product_type, :output_kg, :waste_kg, :rework_kg, :production_days, :month_year, :user)";
            
            $stmt = $db->prepare($query);
            $stmt->execute([
                ':line_id' => $line_id,
                ':product_type' => $product_type,
                ':output_kg' => $output_kg,
                ':waste_kg' => $waste_kg,
                ':rework_kg' => $rework_kg,
                ':production_days' => $production_days,
                ':month_year' => $month_year,
                ':user' => $_SESSION['user_id']
            ]);
            
            $success_message = "Production record added successfully!";
        } catch (PDOException $e) {
            $error_message = "Error adding record: " . $e->getMessage();
        }
    }
    
    if (isset($_POST['add_downtime'])) {
        $line_id = $_POST['line_id'];
        $downtime_type = $_POST['downtime_type'];
        $hours = $_POST['hours'];
        $notes = $_POST['notes'];
        $month_year = $_POST['month_year'] . '-01';
        
        try {
            $query = "INSERT INTO production_downtime 
                      (line_id, downtime_type, hours, notes, month_year, entered_by) 
                      VALUES 
                      (:line_id, :downtime_type, :hours, :notes, :month_year, :user)";
            
            $stmt = $db->prepare($query);
            $stmt->execute([
                ':line_id' => $line_id,
                ':downtime_type' => $downtime_type,
                ':hours' => $hours,
                ':notes' => $notes,
                ':month_year' => $month_year,
                ':user' => $_SESSION['user_id']
            ]);
            
            $success_message = "Downtime record added successfully!";
        } catch (PDOException $e) {
            $error_message = "Error adding record: " . $e->getMessage();
        }
    }
}

// Get current month for display
$current_month = date('F Y');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Production - Add Record</title>
    <link rel="stylesheet" href="/pioneer_kpi/assets/css/style.css">
    <style>
        .production-container {
            max-width: 900px;
            margin: 2rem auto;
            padding: 0 1rem;
        }
        .page-header {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .page-header h1 {
            color: #2c3e50;
            margin: 0;
        }
        .department-badge {
            background-color: #3498db;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.9rem;
        }
        .form-tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .tab-btn {
            padding: 1rem 2rem;
            background-color: #ecf0f1;
            border: none;
            border-radius: 8px 8px 0 0;
            cursor: pointer;
            font-size: 1rem;
            font-weight: bold;
            flex: 1;
            transition: all 0.3s;
        }
        .tab-btn:hover {
            background-color: #d5dbdb;
        }
        .tab-btn.active {
            background-color: #3498db;
            color: white;
        }
        .tab-content {
            display: none;
            background: white;
            padding: 2rem;
            border-radius: 0 8px 8px 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .tab-content.active {
            display: block;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: bold;
            color: #2c3e50;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #bdc3c7;
            border-radius: 4px;
            font-size: 1rem;
            box-sizing: border-box;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 2px rgba(52,152,219,0.2);
        }
        .btn-submit {
            background-color: #27ae60;
            color: white;
            padding: 1rem 2rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1.1rem;
            font-weight: bold;
            width: 100%;
            transition: background-color 0.3s;
        }
        .btn-submit:hover {
            background-color: #229954;
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
        .info-box {
            background-color: #d1ecf1;
            color: #0c5460;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            border: 1px solid #bee5eb;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        @media (max-width: 768px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <?php include dirname(__DIR__, 2) . '/includes/navigation.php'; ?>
    
    <div class="production-container">
        <div class="page-header">
            <h1>🏭 Production Data Entry</h1>
            <span class="department-badge"><?php echo date('F Y'); ?></span>
        </div>
        
        <?php if ($success_message): ?>
            <div class="success-message">✅ <?php echo $success_message; ?></div>
        <?php endif; ?>
        
        <?php if ($error_message): ?>
            <div class="error-message">❌ <?php echo $error_message; ?></div>
        <?php endif; ?>
        
        <?php if (empty($lines)): ?>
            <div class="info-box">
                ℹ️ No production lines found. Please run the database setup script first.
            </div>
        <?php endif; ?>
        
        <div class="form-tabs">
            <button class="tab-btn active" onclick="showTab('output')">📊 Production Output</button>
            <button class="tab-btn" onclick="showTab('downtime')">⏱️ Downtime Recording</button>
        </div>
        
        <!-- Production Output Form -->
        <div id="output-tab" class="tab-content active">
            <form method="POST" class="data-form">
                <div class="form-group">
                    <label>Production Line:</label>
                    <select name="line_id" required>
                        <option value="">-- Select Production Line --</option>
                        <?php foreach ($lines as $line): ?>
                            <option value="<?php echo $line['line_id']; ?>">
                                <?php echo htmlspecialchars($line['line_code'] . ' - ' . $line['line_name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Product Type:</label>
                    <input type="text" name="product_type" required placeholder="e.g., Epoxy Resin, Elastoseal, etc.">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Output (KG):</label>
                        <input type="number" step="0.01" name="output_kg" required placeholder="0.00">
                    </div>
                    
                    <div class="form-group">
                        <label>Production Days:</label>
                        <input type="number" step="0.01" name="production_days" required placeholder="e.g., 23.65">
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Waste (KG):</label>
                        <input type="number" step="0.01" name="waste_kg" value="0" placeholder="0.00">
                    </div>
                    
                    <div class="form-group">
                        <label>Rework (KG):</label>
                        <input type="number" step="0.01" name="rework_kg" value="0" placeholder="0.00">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Month:</label>
                    <input type="month" name="month_year" required value="<?php echo date('Y-m'); ?>">
                </div>
                
                <button type="submit" name="add_output" class="btn-submit">💾 Save Production Record</button>
            </form>
        </div>
        
        <!-- Downtime Form -->
        <div id="downtime-tab" class="tab-content">
            <form method="POST" class="data-form">
                <div class="form-group">
                    <label>Production Line:</label>
                    <select name="line_id" required>
                        <option value="">-- Select Production Line --</option>
                        <?php foreach ($lines as $line): ?>
                            <option value="<?php echo $line['line_id']; ?>">
                                <?php echo htmlspecialchars($line['line_code'] . ' - ' . $line['line_name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Downtime Type:</label>
                    <select name="downtime_type" required>
                        <option value="">-- Select Type --</option>
                        <option value="Change Over">🔄 Change Over</option>
                        <option value="Meeting">👥 Meeting</option>
                        <option value="Sanitation">🧹 Sanitation</option>
                        <option value="Setup">⚙️ Start-up/Setup</option>
                        <option value="Breakdown">🔧 Breakdown</option>
                        <option value="Idle">⏸️ Idle Time</option>
                        <option value="No Manpower">👤 No Manpower</option>
                        <option value="No Material">📦 No Material</option>
                        <option value="Preventive Maintenance">🔨 Preventive Maintenance</option>
                        <option value="Testing">🧪 Testing Time</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Hours:</label>
                    <input type="number" step="0.01" name="hours" required placeholder="0.00">
                </div>
                
                <div class="form-group">
                    <label>Notes (Optional):</label>
                    <textarea name="notes" rows="3" placeholder="Additional details about the downtime..."></textarea>
                </div>
                
                <div class="form-group">
                    <label>Month:</label>
                    <input type="month" name="month_year" required value="<?php echo date('Y-m'); ?>">
                </div>
                
                <button type="submit" name="add_downtime" class="btn-submit">💾 Save Downtime Record</button>
            </form>
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
    
    // Form validation
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredFields = this.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value) {
                    field.style.borderColor = '#e74c3c';
                    isValid = false;
                } else {
                    field.style.borderColor = '#bdc3c7';
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                alert('Please fill in all required fields.');
            }
        });
    });
    </script>
    
    <?php include dirname(__DIR__, 2) . '/includes/footer.php'; ?>
</body>
</html>