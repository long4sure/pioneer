<?php
require_once '../includes/config.php';
require_once '../includes/auth.php';

$auth = new Auth();
$auth->requireLogin();

$currentUser = $auth->getCurrentUser();
$db = new Database();
$conn = $db->getConnection();
// Rest of your dashboard.php code...
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - <?php echo APP_NAME; ?></title>
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
                <a href="dashboard.php" class="active">
                    <i class="fas fa-home"></i> Main Dashboard
                </a>
                <a href="custom_dashboard.php">
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
                <h1>Main Dashboard</h1>
                <div class="date-display">
                    <?php echo date('F d, Y'); ?>
                </div>
            </div>
            
            <!-- KPI Summary Cards -->
            <div class="kpi-summary">
                <!-- Conversion Cost (SC only) -->
                <div class="kpi-card">
                    <div class="kpi-header">
                        <h3>Conversion Cost (SC only)</h3>
                        <span class="uom">PHP/KG</span>
                    </div>
                    <div class="kpi-values">
                        <?php
                        $query = "SELECT actual_value, target_value, year_target 
                                 FROM kpi_data 
                                 WHERE kpi_id = 1 
                                 ORDER BY period_date DESC 
                                 LIMIT 1";
                        $result = $conn->query($query);
                        if ($row = $result->fetch_assoc()) {
                            $actual = $row['actual_value'];
                            $target = $row['target_value'];
                            $year_target = $row['year_target'];
                            $vs_target = ($actual / $target) * 100;
                        ?>
                        <div class="actual">₱<?php echo number_format($actual, 2); ?></div>
                        <div class="target">Target: ₱<?php echo number_format($target, 2); ?></div>
                        <div class="vs-target <?php echo $vs_target <= 100 ? 'good' : 'bad'; ?>">
                            vs Target: <?php echo number_format($vs_target, 1); ?>%
                        </div>
                        <div class="year-target">2026 Target: ₱<?php echo number_format($year_target, 2); ?></div>
                        <?php } ?>
                    </div>
                </div>
                
                <!-- Conversion Cost (Overall) -->
                <div class="kpi-card">
                    <div class="kpi-header">
                        <h3>Conversion Cost (Overall)</h3>
                        <span class="uom">PHP/KG</span>
                    </div>
                    <div class="kpi-values">
                        <?php
                        $query = "SELECT actual_value, target_value, year_target 
                                 FROM kpi_data 
                                 WHERE kpi_id = 2 
                                 ORDER BY period_date DESC 
                                 LIMIT 1";
                        $result = $conn->query($query);
                        if ($row = $result->fetch_assoc()) {
                            $actual = $row['actual_value'];
                            $target = $row['target_value'];
                            $year_target = $row['year_target'];
                            $vs_target = ($actual / $target) * 100;
                        ?>
                        <div class="actual">₱<?php echo number_format($actual, 2); ?></div>
                        <div class="target">Target: ₱<?php echo number_format($target, 2); ?></div>
                        <div class="vs-target <?php echo $vs_target <= 100 ? 'good' : 'bad'; ?>">
                            vs Target: <?php echo number_format($vs_target, 1); ?>%
                        </div>
                        <div class="year-target">2026 Target: ₱<?php echo number_format($year_target, 2); ?></div>
                        <?php } ?>
                    </div>
                </div>
                
                <!-- Volume Produced -->
                <div class="kpi-card">
                    <div class="kpi-header">
                        <h3>Volume Produced</h3>
                        <span class="uom">MT</span>
                    </div>
                    <div class="kpi-values">
                        <?php
                        $query = "SELECT kd.*, kdef.kpi_name 
         FROM kpi_data kd
         JOIN kpi_definitions kdef ON kd.kpi_id = kdef.kpi_id
         ORDER BY kd.period_date DESC 
         LIMIT 5";
                        $result = $conn->query($query);
                        if ($row = $result->fetch_assoc()) {
                            $actual = $row['actual_value'];
                            $target = $row['target_value'];
                            $year_target = $row['year_target'];
                            $vs_target = ($actual / $target) * 100;
                        ?>
                        <div class="actual"><?php echo number_format($actual, 0); ?></div>
                        <div class="target">Target: <?php echo number_format($target, 0); ?></div>
                        <div class="vs-target <?php echo $vs_target >= 100 ? 'good' : 'bad'; ?>">
                            vs Target: <?php echo number_format($vs_target, 1); ?>%
                        </div>
                        <div class="year-target">2026 Target: <?php echo number_format($year_target, 0); ?></div>
                        <?php } ?>
                    </div>
                </div>
            </div>
            
            <!-- Charts Section -->
            <div class="charts-row">
                <div class="chart-container">
                    <h3>Monthly Conversion Cost Trend</h3>
                    <canvas id="conversionCostChart"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>Volume Produced vs Target</h3>
                    <canvas id="volumeChart"></canvas>
                </div>
            </div>
            
            <!-- Monthly Data Table -->
            <div class="data-table-container">
                <h3>Monthly Performance Data</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>KPI</th>
                            <th>UoM</th>
                            <th>2026 Target</th>
                            <th>Oct</th>
                            <th>Nov</th>
                            <th>Dec</th>
                            <th>Jan</th>
                            <th>Feb</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        // Get last 5 months of data for each KPI
                        $kpis = [1, 2, 3];
                        $months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
                        
                        foreach ($kpis as $kpi_id) {
                            $query = "SELECT kd.*, kd.kpi_name 
                                     FROM kpi_data kd
                                     JOIN kpi_definitions kd ON kd.kpi_id = kd.kpi_id
                                     WHERE kd.kpi_id = $kpi_id 
                                     ORDER BY kd.period_date DESC 
                                     LIMIT 5";
                            
                            // This is a simplified version - you'll need to adjust based on your actual data structure
                        ?>
                        <tr>
                            <td>Conversion Cost (SC only)</td>
                            <td>PHP/KG</td>
                            <td>10.95</td>
                            <td>10.95</td>
                            <td>14.39</td>
                            <td>15.06</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                        <?php } ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    
    <script>
    // Chart initialization
    const ctx1 = document.getElementById('conversionCostChart').getContext('2d');
    new Chart(ctx1, {
        type: 'line',
        data: {
            labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
            datasets: [{
                label: 'SC Only',
                data: [10.95, 14.39, 15.06, null, null],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }, {
                label: 'Overall',
                data: [15.50, 15.56, 23.64, null, null],
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    const ctx2 = document.getElementById('volumeChart').getContext('2d');
    new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
            datasets: [{
                label: 'Actual Volume',
                data: [1235, 1603, 1115, 1621, null],
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }, {
                label: 'Target Volume',
                data: [1222, 1415, 1091, 1561, null],
                backgroundColor: 'rgba(255, 159, 64, 0.5)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    </script>
</body>
</html>