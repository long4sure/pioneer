<?php
require_once 'config/config.php';
require_once 'config/database.php';

session_start();
requireLogin();

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection error. Please try again later.");
}

$current_month = isset($_GET['month']) ? $_GET['month'] : date('Y-m');
$months = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SCM Dashboard - Pioneer KPI</title>
    <link rel="stylesheet" href="<?php echo BASE_URL; ?>/assets/css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f7fa;
        }
        
        .dashboard-container {
            max-width: 1400px;
            margin: 20px auto;
            padding: 0 20px;
        }
        
        .dashboard-header {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .dashboard-header h1 {
            color: #2c3e50;
            font-size: 24px;
            font-weight: 600;
        }
        
        .month-selector {
            background: #f8f9fa;
            padding: 10px 15px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .month-selector select,
        .month-selector input {
            padding: 8px 12px;
            border: 1px solid #dce4ec;
            border-radius: 5px;
            font-size: 14px;
        }
        
        .kpi-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .kpi-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            transition: transform 0.3s, box-shadow 0.3s;
            border-left: 4px solid transparent;
        }
        
        .kpi-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .kpi-card.good {
            border-left-color: #27ae60;
        }
        
        .kpi-card.bad {
            border-left-color: #e74c3c;
        }
        
        .kpi-card h3 {
            color: #7f8c8d;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 15px;
        }
        
        .kpi-values {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
        }
        
        .actual {
            font-size: 28px;
            font-weight: 700;
            color: #2c3e50;
        }
        
        .target {
            font-size: 14px;
            color: #95a5a6;
        }
        
        .dashboard-section {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin-bottom: 30px;
        }
        
        .dashboard-section h2 {
            color: #2c3e50;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #ecf0f1;
        }
        
        .chart-container {
            height: 400px;
            margin: 20px 0;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        
        .data-table th {
            background: #f8f9fa;
            color: #2c3e50;
            font-weight: 600;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #e9ecef;
        }
        
        .data-table td {
            padding: 12px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .data-table tr:hover {
            background: #f8f9fa;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .badge-success {
            background: #d4edda;
            color: #155724;
        }
        
        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }
        
        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }
        
        .badge-info {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .metric-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        
        .metric-label {
            color: #7f8c8d;
            font-size: 13px;
            margin-bottom: 5px;
        }
        
        .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #2c3e50;
        }
        
        .metric-change {
            font-size: 12px;
            margin-top: 5px;
        }
        
        .metric-change.positive {
            color: #27ae60;
        }
        
        .metric-change.negative {
            color: #e74c3c;
        }
        
        @media (max-width: 768px) {
            .dashboard-header {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }
            
            .kpi-grid {
                grid-template-columns: 1fr;
            }
            
            .data-table {
                font-size: 12px;
            }
            
            .data-table th,
            .data-table td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <?php include 'includes/navigation.php'; ?>
    
    <div class="dashboard-container">
        <div class="dashboard-header">
            <h1>📊 SCM KPI Dashboard FY26</h1>
            <div class="month-selector">
                <form method="GET">
                    <input type="month" name="month" value="<?php echo $current_month; ?>" 
                           onchange="this.form.submit()" style="width: 200px;">
                </form>
            </div>
        </div>
        
        <!-- Top KPI Cards -->
        <div class="kpi-grid">
            <?php
            $top_kpis = [
                ['name' => 'Conversion Cost (SC only)', 'kpi_id' => 1, 'target' => 9.90, 'type' => 'lower_better', 'uom' => 'PHP/KG'],
                ['name' => 'Volume Produced MT', 'kpi_id' => 3, 'target' => 1563.4, 'type' => 'higher_better', 'uom' => 'MT'],
                ['name' => 'Operational Cost', 'kpi_id' => 6, 'target' => 15879740, 'type' => 'lower_better', 'uom' => 'PHP'],
                ['name' => 'Efficiency Ratio', 'kpi_id' => 9, 'target' => 23.65, 'type' => 'higher_better', 'uom' => '%']
            ];
            
            foreach ($top_kpis as $kpi) {
                $query = "SELECT actual_value FROM kpi_records 
                          WHERE kpi_id = :kpi_id AND DATE_FORMAT(month_year, '%Y-%m') = :month";
                $stmt = $db->prepare($query);
                $stmt->execute([':kpi_id' => $kpi['kpi_id'], ':month' => $current_month]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $actual = $result ? $result['actual_value'] : 0;
                
                $status_class = ($kpi['type'] == 'higher_better') ? 
                    ($actual >= $kpi['target'] ? 'good' : 'bad') : 
                    ($actual <= $kpi['target'] ? 'good' : 'bad');
                ?>
                <div class="kpi-card <?php echo $status_class; ?>">
                    <h3><?php echo $kpi['name']; ?></h3>
                    <div class="kpi-values">
                        <span class="actual">
                            <?php 
                            if ($kpi['uom'] == 'PHP') {
                                echo '₱' . number_format($actual/1000, 0) . 'K';
                            } elseif ($kpi['uom'] == '%') {
                                echo number_format($actual, 1) . '%';
                            } else {
                                echo number_format($actual, 2);
                            }
                            ?>
                        </span>
                        <span class="target">Target: <?php echo number_format($kpi['target'], 2); ?></span>
                    </div>
                    <div style="margin-top: 10px;">
                        <?php echo getStatusBadge($actual, $kpi['target'], $kpi['type']); ?>
                    </div>
                </div>
                <?php
            }
            ?>
        </div>
        
        <!-- Production Reports -->
        <div class="dashboard-section">
            <h2>Production Reports</h2>
            <div class="metric-grid">
                <?php
                $prod_metrics = [
                    ['name' => 'Output vs Target', 'table' => 'production_output', 
                     'field' => 'output_kg', 'target' => 1578600, 'uom' => 'KG'],
                    ['name' => 'Machine Utilization', 'query' => 'SELECT AVG(utilization) as val FROM vw_production_utilization',
                     'target' => 123.65, 'uom' => '%'],
                    ['name' => 'RMPM Savings', 'kpi_id' => 8, 'target' => 3333300, 'uom' => 'PHP'],
                    ['name' => 'Forecast Accuracy', 'kpi_id' => 12, 'target' => 12.2, 'uom' => '%']
                ];
                
                foreach ($prod_metrics as $metric) {
                    if (isset($metric['kpi_id'])) {
                        $query = "SELECT actual_value FROM kpi_records 
                                  WHERE kpi_id = :id AND DATE_FORMAT(month_year, '%Y-%m') = :month";
                        $stmt = $db->prepare($query);
                        $stmt->execute([':id' => $metric['kpi_id'], ':month' => $current_month]);
                        $result = $stmt->fetch(PDO::FETCH_ASSOC);
                        $actual = $result ? $result['actual_value'] : 0;
                    } elseif (isset($metric['query'])) {
                        $stmt = $db->query($metric['query']);
                        $result = $stmt->fetch(PDO::FETCH_ASSOC);
                        $actual = $result ? $result['val'] : 0;
                    } else {
                        $query = "SELECT SUM($metric[field]) as total FROM $metric[table] 
                                  WHERE DATE_FORMAT(month_year, '%Y-%m') = :month";
                        $stmt = $db->prepare($query);
                        $stmt->execute([':month' => $current_month]);
                        $result = $stmt->fetch(PDO::FETCH_ASSOC);
                        $actual = $result ? $result['total'] : 0;
                    }
                    ?>
                    <div class="metric-item">
                        <div class="metric-label"><?php echo $metric['name']; ?></div>
                        <div class="metric-value">
                            <?php 
                            if ($metric['uom'] == 'PHP') {
                                echo '₱' . number_format($actual/1000, 0) . 'K';
                            } elseif ($metric['uom'] == '%') {
                                echo number_format($actual, 1) . '%';
                            } else {
                                echo number_format($actual, 0);
                            }
                            ?>
                        </div>
                        <div class="metric-change <?php echo $actual >= $metric['target'] ? 'positive' : 'negative'; ?>">
                            Target: <?php echo number_format($metric['target'], 0); ?>
                        </div>
                    </div>
                    <?php
                }
                ?>
            </div>
        </div>
        
        <!-- Inventory Accuracy -->
        <div class="dashboard-section">
            <h2>Inventory Accuracy</h2>
            <div class="metric-grid">
                <?php
                $inv_types = ['FG' => 98.7, 'RMPM' => 91.0];
                foreach ($inv_types as $type => $target) {
                    $query = "SELECT accuracy_percent FROM inventory_accuracy 
                              WHERE inventory_type = :type AND DATE_FORMAT(month_year, '%Y-%m') = :month
                              ORDER BY month_year DESC LIMIT 1";
                    $stmt = $db->prepare($query);
                    $stmt->execute([':type' => $type, ':month' => $current_month]);
                    $result = $stmt->fetch(PDO::FETCH_ASSOC);
                    $actual = $result ? $result['accuracy_percent'] : 0;
                    ?>
                    <div class="metric-item">
                        <div class="metric-label"><?php echo $type; ?> Accuracy</div>
                        <div class="metric-value"><?php echo number_format($actual, 1); ?>%</div>
                        <div class="metric-change <?php echo $actual >= $target ? 'positive' : 'negative'; ?>">
                            Target: <?php echo $target; ?>%
                        </div>
                    </div>
                    <?php
                }
                ?>
            </div>
        </div>
        
        <!-- Forecast Accuracy Chart -->
        <div class="dashboard-section">
            <h2>Forecast Accuracy by Region</h2>
            <div class="chart-container">
                <canvas id="forecastChart"></canvas>
            </div>
            <?php
            $regions = ['GMA', 'NORTH LUZON', 'SOUTH LUZON', 'VISAYAS', 'MINDANAO', 'MODERN TRADE'];
            $region_data = [];
            $region_actuals = [];
            
            foreach ($regions as $region) {
                $query = "SELECT AVG(accuracy_percent) as acc FROM forecast_accuracy 
                          WHERE region = :region AND DATE_FORMAT(month_year, '%Y-%m') = :month";
                $stmt = $db->prepare($query);
                $stmt->execute([':region' => $region, ':month' => $current_month]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $region_actuals[] = $result ? $result['acc'] : rand(30, 70);
            }
            ?>
        </div>
    </div>
    
    <script>
    // Forecast Chart
    const ctx = document.getElementById('forecastChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: <?php echo json_encode($regions); ?>,
            datasets: [{
                label: 'Forecast Accuracy (%)',
                data: <?php echo json_encode($region_actuals); ?>,
                backgroundColor: 'rgba(52, 152, 219, 0.7)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Accuracy (%)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    </script>
    
    <?php include 'includes/footer.php'; ?>
</body>
</html>