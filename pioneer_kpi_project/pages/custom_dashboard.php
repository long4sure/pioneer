<?php
require_once '../includes/config.php';
require_once '../includes/auth.php';

$auth = new Auth();
$auth->requireLogin();

$currentUser = $auth->getCurrentUser();
$db = new Database();
$conn = $db->getConnection();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom Dashboard - <?php echo APP_NAME; ?></title>
    <link rel="stylesheet" href="../assets/css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="dashboard">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <h2><?php echo APP_NAME; ?></h2>
                <p>Welcome, <?php echo htmlspecialchars($currentUser['username']); ?></p>
            </div>
            
            <nav class="sidebar-nav">
                <a href="dashboard.php">
                    <i class="fas fa-home"></i> Main Dashboard
                </a>
                <a href="custom_dashboard.php" class="active">
                    <i class="fas fa-chart-line"></i> Custom Dashboard
                </a>
                <?php if ($auth->isAdmin()): ?>
                <a href="data_entry.php">
                    <i class="fas fa-edit"></i> Data Entry
                </a>
                <?php endif; ?>
                <a href="../logout.php">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </nav>
        </div>
        
        <!-- Main Content -->
        <div class="main-content">
            <div class="content-header">
                <h1>Custom Dashboard</h1>
            </div>
            
            <!-- Filter Section -->
            <div class="filter-container" style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="margin-bottom: 15px;">Filter Data</h3>
                <form method="GET" action="" class="filter-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div class="form-group">
                        <label for="kpi">KPI</label>
                        <select id="kpi" name="kpi_id">
                            <option value="all">All KPIs</option>
                            <?php
                            $query = "SELECT kpi_id, kpi_name FROM kpi_definitions";
                            $result = $conn->query($query);
                            while ($row = $result->fetch_assoc()) {
                                $selected = (isset($_GET['kpi_id']) && $_GET['kpi_id'] == $row['kpi_id']) ? 'selected' : '';
                                echo "<option value='{$row['kpi_id']}' $selected>{$row['kpi_name']}</option>";
                            }
                            ?>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="date_from">From</label>
                        <input type="month" id="date_from" name="date_from" value="<?php echo $_GET['date_from'] ?? date('Y-m', strtotime('-3 months')); ?>">
                    </div>
                    
                    <div class="form-group">
                        <label for="date_to">To</label>
                        <input type="month" id="date_to" name="date_to" value="<?php echo $_GET['date_to'] ?? date('Y-m'); ?>">
                    </div>
                    
                    <div class="form-group" style="display: flex; align-items: flex-end;">
                        <button type="submit" class="btn btn-primary">Apply Filters</button>
                        <a href="custom_dashboard.php" class="btn" style="margin-left: 10px; background: #6c757d; color: white; text-decoration: none;">Reset</a>
                    </div>
                </form>
            </div>
            
            <!-- Custom Charts Section -->
            <div class="charts-row">
                <div class="chart-container">
                    <h3>Custom KPI Analysis</h3>
                    <canvas id="customChart"></canvas>
                </div>
            </div>
            
            <!-- Filtered Data Table -->
            <div class="data-table-container">
                <h3>Filtered Data</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>KPI</th>
                            <th>UoM</th>
                            <th>Actual</th>
                            <th>Target</th>
                            <th>vs Target %</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        // Build query based on filters
                        $where_clauses = ["1=1"];
                        $params = [];
                        $types = "";
                        
                        if (isset($_GET['kpi_id']) && $_GET['kpi_id'] !== 'all') {
                            $kpi_id = (int)$_GET['kpi_id'];
                            $where_clauses[] = "kd.kpi_id = ?";
                            $params[] = $kpi_id;
                            $types .= "i";
                        }
                        
                        if (isset($_GET['date_from']) && !empty($_GET['date_from'])) {
                            $date_from = $_GET['date_from'] . '-01';
                            $where_clauses[] = "kd.period_date >= ?";
                            $params[] = $date_from;
                            $types .= "s";
                        }
                        
                        if (isset($_GET['date_to']) && !empty($_GET['date_to'])) {
                            $date_to = $_GET['date_to'] . '-01';
                            $where_clauses[] = "kd.period_date <= ?";
                            $params[] = $date_to;
                            $types .= "s";
                        }
                        
                        $where = implode(" AND ", $where_clauses);
                        
                        // FIXED: Use different aliases for the tables
                        $query = "SELECT kd.*, kdef.kpi_name, kdef.uom 
                                 FROM kpi_data kd
                                 JOIN kpi_definitions kdef ON kd.kpi_id = kdef.kpi_id
                                 WHERE $where
                                 ORDER BY kd.period_date DESC, kd.kpi_id";
                        
                        // Use prepared statement if we have parameters
                        if (!empty($params)) {
                            $stmt = $conn->prepare($query);
                            if ($stmt) {
                                $stmt->bind_param($types, ...$params);
                                $stmt->execute();
                                $result = $stmt->get_result();
                            } else {
                                // Fallback to regular query
                                $result = $conn->query($query);
                            }
                        } else {
                            $result = $conn->query($query);
                        }
                        
                        if ($result && $result->num_rows > 0) {
                            while ($row = $result->fetch_assoc()) {
                                $vs_target = ($row['target_value'] > 0) ? ($row['actual_value'] / $row['target_value']) * 100 : 0;
                                // Determine if it's good or bad based on KPI type
                                $is_good = false;
                                if ($row['kpi_id'] <= 2) { // Conversion costs (lower is better)
                                    $is_good = $vs_target <= 100;
                                } else { // Volume (higher is better)
                                    $is_good = $vs_target >= 100;
                                }
                                $vs_class = $is_good ? 'good' : 'bad';
                                
                                echo "<tr>";
                                echo "<td>" . date('M Y', strtotime($row['period_date'])) . "</td>";
                                echo "<td>{$row['kpi_name']}</td>";
                                echo "<td>{$row['uom']}</td>";
                                echo "<td>" . number_format($row['actual_value'], 2) . "</td>";
                                echo "<td>" . number_format($row['target_value'], 2) . "</td>";
                                echo "<td class='$vs_class'>" . number_format($vs_target, 1) . "%</td>";
                                echo "</tr>";
                            }
                        } else {
                            echo "<tr><td colspan='6' style='text-align: center;'>No data available for selected filters</td></tr>";
                        }
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    
    <script>
    // Custom chart based on filters
    <?php
    // Reset chart data for the chart query
    $chart_data = [];
    $chart_labels = [];
    
    // Use the same where clause for the chart
    $query = "SELECT DATE_FORMAT(kd.period_date, '%Y-%m') as month, 
                     AVG(kd.actual_value) as avg_actual,
                     AVG(kd.target_value) as avg_target
              FROM kpi_data kd
              WHERE $where
              GROUP BY DATE_FORMAT(kd.period_date, '%Y-%m')
              ORDER BY kd.period_date ASC
              LIMIT 12";
    
    // Use prepared statement for chart query if needed
    if (!empty($params)) {
        $stmt = $conn->prepare($query);
        if ($stmt) {
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();
        } else {
            $result = $conn->query($query);
        }
    } else {
        $result = $conn->query($query);
    }
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $chart_labels[] = date('M Y', strtotime($row['month'] . '-01'));
            $chart_data['actual'][] = $row['avg_actual'] ? (float)$row['avg_actual'] : null;
            $chart_data['target'][] = $row['avg_target'] ? (float)$row['avg_target'] : null;
        }
    }
    ?>
    
    const ctx = document.getElementById('customChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: <?php echo json_encode($chart_labels); ?>,
            datasets: [{
                label: 'Average Actual',
                data: <?php echo json_encode($chart_data['actual'] ?? []); ?>,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.1,
                fill: true
            }, {
                label: 'Average Target',
                data: <?php echo json_encode($chart_data['target'] ?? []); ?>,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'KPI Performance Trend'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    </script>
</body>
</html>