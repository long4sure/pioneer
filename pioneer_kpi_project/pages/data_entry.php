<?php
require_once '../includes/config.php';
require_once '../includes/auth.php';

$auth = new Auth();
$auth->requireAdmin(); // This ensures only admin can access

$db = new Database();
$conn = $db->getConnection();

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $kpi_id = (int)$_POST['kpi_id'];
    $period_date = $db->escapeString($_POST['period_date'] . '-01'); // Add first day of month
    $actual_value = (float)$_POST['actual_value'];
    $target_value = (float)$_POST['target_value'];
    $year_target = (float)$_POST['year_target'];
    $notes = $db->escapeString($_POST['notes']);
    $entered_by = $_SESSION['user_id'];
    
    $query = "INSERT INTO kpi_data (kpi_id, period_date, actual_value, target_value, year_target, notes, entered_by) 
              VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("isdddsi", $kpi_id, $period_date, $actual_value, $target_value, $year_target, $notes, $entered_by);
    
    if ($stmt->execute()) {
        $success = "Data saved successfully!";
    } else {
        $error = "Error saving data: " . $conn->error;
    }
    $stmt->close();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Entry - <?php echo APP_NAME; ?></title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="dashboard">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <h2><?php echo APP_NAME; ?></h2>
                <p>Welcome, <?php echo htmlspecialchars($_SESSION['username']); ?></p>
            </div>
            
            <nav class="sidebar-nav">
                <a href="dashboard.php">
                    <i class="fas fa-home"></i> Main Dashboard
                </a>
                <a href="custom_dashboard.php">
                    <i class="fas fa-chart-line"></i> Custom Dashboard
                </a>
                <a href="data_entry.php" class="active">
                    <i class="fas fa-edit"></i> Data Entry
                </a>
                <a href="../logout.php">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </nav>
        </div>
        
        <!-- Main Content -->
        <div class="main-content">
            <div class="content-header">
                <h1>Data Entry</h1>
            </div>
            
            <?php if (isset($success)): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <?php if (isset($error)): ?>
                <div class="alert alert-error"><?php echo $error; ?></div>
            <?php endif; ?>
            
            <div class="entry-form-container">
                <form method="POST" action="" class="entry-form">
                    <div class="form-group">
                        <label for="kpi_id">KPI</label>
                        <select id="kpi_id" name="kpi_id" required>
                            <option value="">Select KPI</option>
                            <?php
                            $query = "SELECT kpi_id, kpi_name, uom FROM kpi_definitions ORDER BY kpi_name";
                            $result = $conn->query($query);
                            while ($row = $result->fetch_assoc()) {
                                echo "<option value='{$row['kpi_id']}'>{$row['kpi_name']} ({$row['uom']})</option>";
                            }
                            ?>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="period_date">Period (Month/Year)</label>
                        <input type="month" id="period_date" name="period_date" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="actual_value">Actual Value</label>
                            <input type="number" step="0.01" id="actual_value" name="actual_value" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="target_value">Monthly Target</label>
                            <input type="number" step="0.01" id="target_value" name="target_value" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="year_target">2026 Year Target</label>
                        <input type="number" step="0.01" id="year_target" name="year_target" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="notes">Notes</label>
                        <textarea id="notes" name="notes" rows="3" placeholder="Optional notes about this entry..."></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">Save Entry</button>
                </form>
            </div>
            
            <!-- Recent Entries -->
            <div class="recent-entries">
                <h3>Recent Entries</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>KPI</th>
                            <th>Actual</th>
                            <th>Target</th>
                            <th>Year Target</th>
                            <th>Entered By</th>
                            <th>Entry Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        // FIXED: Use different aliases for the tables
                        $query = "SELECT kd.*, kdef.kpi_name, kdef.uom, u.username 
                                 FROM kpi_data kd
                                 JOIN kpi_definitions kdef ON kd.kpi_id = kdef.kpi_id
                                 JOIN users u ON kd.entered_by = u.user_id
                                 ORDER BY kd.entry_date DESC 
                                 LIMIT 10";
                        
                        $result = $conn->query($query);
                        
                        if ($result && $result->num_rows > 0) {
                            while ($row = $result->fetch_assoc()) {
                                echo "<tr>";
                                echo "<td>" . date('M Y', strtotime($row['period_date'])) . "</td>";
                                echo "<td>{$row['kpi_name']} ({$row['uom']})</td>";
                                echo "<td>" . number_format($row['actual_value'], 2) . "</td>";
                                echo "<td>" . number_format($row['target_value'], 2) . "</td>";
                                echo "<td>" . number_format($row['year_target'], 2) . "</td>";
                                echo "<td>{$row['username']}</td>";
                                echo "<td>" . date('Y-m-d H:i', strtotime($row['entry_date'])) . "</td>";
                                echo "</tr>";
                            }
                        } else {
                            echo "<tr><td colspan='7' style='text-align: center;'>No entries found</td></tr>";
                        }
                        ?>
                    </tbody>
                </table>
            </div>
            
            <!-- Summary by KPI -->
            <div class="recent-entries" style="margin-top: 20px;">
                <h3>KPI Summary</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>KPI</th>
                            <th>Latest Actual</th>
                            <th>Latest Target</th>
                            <th>Latest Period</th>
                            <th>Total Entries</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $query = "SELECT 
                                    kdef.kpi_name,
                                    kdef.uom,
                                    (SELECT actual_value FROM kpi_data kd2 WHERE kd2.kpi_id = kdef.kpi_id ORDER BY period_date DESC LIMIT 1) as latest_actual,
                                    (SELECT target_value FROM kpi_data kd2 WHERE kd2.kpi_id = kdef.kpi_id ORDER BY period_date DESC LIMIT 1) as latest_target,
                                    (SELECT DATE_FORMAT(period_date, '%M %Y') FROM kpi_data kd2 WHERE kd2.kpi_id = kdef.kpi_id ORDER BY period_date DESC LIMIT 1) as latest_period,
                                    (SELECT COUNT(*) FROM kpi_data kd2 WHERE kd2.kpi_id = kdef.kpi_id) as entry_count
                                 FROM kpi_definitions kdef
                                 ORDER BY kdef.kpi_name";
                        
                        $result = $conn->query($query);
                        
                        if ($result && $result->num_rows > 0) {
                            while ($row = $result->fetch_assoc()) {
                                echo "<tr>";
                                echo "<td>{$row['kpi_name']} ({$row['uom']})</td>";
                                echo "<td>" . ($row['latest_actual'] ? number_format($row['latest_actual'], 2) : 'No data') . "</td>";
                                echo "<td>" . ($row['latest_target'] ? number_format($row['latest_target'], 2) : 'No data') . "</td>";
                                echo "<td>" . ($row['latest_period'] ?: 'No data') . "</td>";
                                echo "<td>{$row['entry_count']}</td>";
                                echo "</tr>";
                            }
                        }
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>