<?php
session_start();
require_once 'config/database.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

$database = new Database();
$db = $database->getConnection();

// Get selected year
$selected_year = isset($_GET['year']) ? $_GET['year'] : date('Y');

// Function to check if table exists
function tableExists($db, $table_name) {
    try {
        $result = $db->query("SHOW TABLES LIKE '$table_name'");
        return $result->rowCount() > 0;
    } catch (Exception $e) {
        return false;
    }
}

// Check which tables exist
$tables = [
    'kpi_definitions' => tableExists($db, 'kpi_definitions'),
    'kpi_records' => tableExists($db, 'kpi_records'),
    'production_lines' => tableExists($db, 'production_lines'),
    'production_output' => tableExists($db, 'production_output'),
    'inventory_accuracy' => tableExists($db, 'inventory_accuracy'),
    'labor_reports' => tableExists($db, 'labor_reports')
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2026 KPI Tracker</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f6fa;
            margin: 0;
            padding: 0;
        }
        .tracker-container {
            max-width: 1400px;
            margin: 2rem auto;
            padding: 0 1rem;
        }
        .tracker-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding: 1rem;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .tracker-header h1 {
            color: #2c3e50;
            margin: 0;
        }
        .tracker-section {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        .tracker-section h2 {
            color: #2c3e50;
            margin-top: 0;
            margin-bottom: 1.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #ecf0f1;
        }
        .table-wrapper {
            overflow-x: auto;
            border: 1px solid #bdc3c7;
            border-radius: 8px;
        }
        .tracker-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
            min-width: 1000px;
        }
        .tracker-table th {
            background-color: #2c3e50;
            color: white;
            padding: 0.75rem;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .tracker-table td {
            padding: 0.75rem;
            border: 1px solid #bdc3c7;
            text-align: center;
        }
        .tracker-table tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .tracker-table tr:hover {
            background-color: #e9ecef;
        }
        .target-value {
            color: #27ae60;
            font-weight: 600;
        }
        .actual-value {
            color: #2c3e50;
            font-weight: 600;
        }
        .missing-value {
            color: #95a5a6;
            font-style: italic;
        }
        .info-box {
            background-color: #d4edda;
            color: #155724;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            border: 1px solid #c3e6cb;
        }
        .warning-box {
            background-color: #fff3cd;
            color: #856404;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            border: 1px solid #ffeeba;
        }
        .error-box {
            background-color: #f8d7da;
            color: #721c24;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
            border: 1px solid #f5c6cb;
        }
        .status-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: bold;
        }
        .status-good {
            background-color: #d4edda;
            color: #155724;
        }
        .status-bad {
            background-color: #f8d7da;
            color: #721c24;
        }
    </style>
</head>
<body>
    <?php include 'includes/navigation.php'; ?>
    
    <div class="tracker-container">
        <div class="tracker-header">
            <h1>2026 KPI TRACKER</h1>
            <div class="year-selector">
                <form method="GET">
                    <select name="year" onchange="this.form.submit()" style="padding: 0.5rem; border-radius: 4px;">
                        <option value="2026" <?php echo $selected_year == '2026' ? 'selected' : ''; ?>>2026</option>
                        <option value="2025" <?php echo $selected_year == '2025' ? 'selected' : ''; ?>>2025</option>
                        <option value="2024" <?php echo $selected_year == '2024' ? 'selected' : ''; ?>>2024</option>
                    </select>
                </form>
            </div>
        </div>

        <!-- Database Status -->
        <div class="info-box">
            <strong>✅ Database Connection:</strong> Successful<br>
            <strong>📊 Tables Found:</strong>
            <?php 
            $found_tables = array_filter($tables);
            echo count($found_tables) . " of " . count($tables);
            ?>
        </div>

        <?php if (!$tables['kpi_definitions']): ?>
            <div class="error-box">
                <strong>❌ Missing Tables:</strong> The database tables are not properly set up. 
                Please run the SQL setup script to create the required tables.
            </div>
        <?php endif; ?>
        
        <!-- Financial KPIs Section -->
        <div class="tracker-section">
            <h2>FINANCIALS</h2>
            <div class="table-wrapper">
                <table class="tracker-table">
                    <thead>
                        <tr>
                            <th style="min-width: 250px;">KPI</th>
                            <th style="min-width: 60px;">UoM</th>
                            <th style="min-width: 80px;">Target</th>
                            <?php
                            $months = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
                            foreach ($months as $month) {
                                echo "<th style='min-width: 80px;'>$month</th>";
                            }
                            ?>
                            <th style="min-width: 80px; background-color: #27ae60;">YTD</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        if ($tables['kpi_definitions']) {
                            try {
                                // Get all KPI definitions
                                $kpi_query = "SELECT kpi_id, kpi_name, uom, target_value FROM kpi_definitions WHERE category_id = 1";
                                $kpi_stmt = $db->query($kpi_query);
                                
                                while ($kpi = $kpi_stmt->fetch(PDO::FETCH_ASSOC)) {
                                    echo "<tr>";
                                    echo "<td style='text-align: left;'><strong>" . htmlspecialchars($kpi['kpi_name']) . "</strong></td>";
                                    echo "<td>" . htmlspecialchars($kpi['uom']) . "</td>";
                                    echo "<td class='target-value'>" . number_format($kpi['target_value'], 2) . "</td>";
                                    
                                    $ytd_total = 0;
                                    $month_count = 0;
                                    
                                    // Loop through months
                                    for ($i = 0; $i < 12; $i++) {
                                        $month_date = date('Y-m-d', strtotime("{$selected_year}-10-01 +$i months"));
                                        $month_year = date('Y-m', strtotime($month_date));
                                        
                                        if ($tables['kpi_records']) {
                                            $value_query = "SELECT actual_value FROM kpi_records 
                                                          WHERE kpi_id = :kpi_id 
                                                          AND DATE_FORMAT(month_year, '%Y-%m') = :month";
                                            $value_stmt = $db->prepare($value_query);
                                            $value_stmt->execute([
                                                ':kpi_id' => $kpi['kpi_id'],
                                                ':month' => $month_year
                                            ]);
                                            $result = $value_stmt->fetch(PDO::FETCH_ASSOC);
                                            
                                            if ($result && $result['actual_value'] > 0) {
                                                $value = $result['actual_value'];
                                                $ytd_total += $value;
                                                $month_count++;
                                                echo "<td class='actual-value'><strong>" . number_format($value, 2) . "</strong></td>";
                                            } else {
                                                echo "<td class='missing-value'>-</td>";
                                            }
                                        } else {
                                            echo "<td class='missing-value'>-</td>";
                                        }
                                    }
                                    
                                    // YTD column
                                    if ($month_count > 0) {
                                        $ytd_avg = $ytd_total / $month_count;
                                        echo "<td class='actual-value' style='background-color: #e8f5e9;'><strong>" . number_format($ytd_avg, 2) . "</strong></td>";
                                    } else {
                                        echo "<td class='missing-value'>-</td>";
                                    }
                                    
                                    echo "</tr>";
                                }
                            } catch (Exception $e) {
                                echo "<tr><td colspan='15' class='error-box'>Error: " . $e->getMessage() . "</td></tr>";
                            }
                        } else {
                            echo "<tr><td colspan='15' class='error-box'>KPI definitions table not found. Please run the database setup.</td></tr>";
                        }
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Production Reports Section -->
        <div class="tracker-section">
            <h2>PRODUCTION REPORTS</h2>
            <div class="table-wrapper">
                <table class="tracker-table">
                    <thead>
                        <tr>
                            <th>Line</th>
                            <th>Metric</th>
                            <th>UoM</th>
                            <?php foreach ($months as $month): ?>
                                <th><?php echo $month; ?></th>
                            <?php endforeach; ?>
                            <th>Average</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        if ($tables['production_lines'] && $tables['production_output']) {
                            try {
                                // Get all production lines
                                $line_query = "SELECT * FROM production_lines WHERE is_active = 1";
                                $line_stmt = $db->query($line_query);
                                
                                $line_count = 0;
                                while ($line = $line_stmt->fetch(PDO::FETCH_ASSOC)) {
                                    $line_count++;
                                    
                                    // Output row
                                    echo "<tr>";
                                    echo "<td><strong>" . htmlspecialchars($line['line_code']) . "</strong></td>";
                                    echo "<td>Output (KG)</td>";
                                    echo "<td>KG</td>";
                                    
                                    $total_output = 0;
                                    $output_month_count = 0;
                                    
                                    for ($i = 0; $i < 12; $i++) {
                                        $month_date = date('Y-m-d', strtotime("{$selected_year}-10-01 +$i months"));
                                        $month_year = date('Y-m', strtotime($month_date));
                                        
                                        $output_query = "SELECT output_kg FROM production_output 
                                                       WHERE line_id = :line_id 
                                                       AND DATE_FORMAT(month_year, '%Y-%m') = :month";
                                        $output_stmt = $db->prepare($output_query);
                                        $output_stmt->execute([
                                            ':line_id' => $line['line_id'],
                                            ':month' => $month_year
                                        ]);
                                        $output = $output_stmt->fetch(PDO::FETCH_ASSOC);
                                        
                                        if ($output && isset($output['output_kg']) && $output['output_kg'] > 0) {
                                            $value = $output['output_kg'];
                                            $total_output += $value;
                                            $output_month_count++;
                                            echo "<td>" . number_format($value, 0) . "</td>";
                                        } else {
                                            echo "<td class='missing-value'>-</td>";
                                        }
                                    }
                                    
                                    if ($output_month_count > 0) {
                                        echo "<td><strong>" . number_format($total_output / $output_month_count, 0) . "</strong></td>";
                                    } else {
                                        echo "<td class='missing-value'>-</td>";
                                    }
                                    echo "</tr>";
                                    
                                    // Waste row
                                    echo "<tr style='background-color: #f8f9fa;'>";
                                    echo "<td></td>";
                                    echo "<td>Waste (KG)</td>";
                                    echo "<td>KG</td>";
                                    
                                    $total_waste = 0;
                                    $waste_month_count = 0;
                                    
                                    for ($i = 0; $i < 12; $i++) {
                                        $month_date = date('Y-m-d', strtotime("{$selected_year}-10-01 +$i months"));
                                        $month_year = date('Y-m', strtotime($month_date));
                                        
                                        $waste_query = "SELECT waste_kg FROM production_output 
                                                       WHERE line_id = :line_id 
                                                       AND DATE_FORMAT(month_year, '%Y-%m') = :month";
                                        $waste_stmt = $db->prepare($waste_query);
                                        $waste_stmt->execute([
                                            ':line_id' => $line['line_id'],
                                            ':month' => $month_year
                                        ]);
                                        $waste = $waste_stmt->fetch(PDO::FETCH_ASSOC);
                                        
                                        if ($waste && isset($waste['waste_kg']) && $waste['waste_kg'] > 0) {
                                            $value = $waste['waste_kg'];
                                            $total_waste += $value;
                                            $waste_month_count++;
                                            echo "<td>" . number_format($value, 0) . "</td>";
                                        } else {
                                            echo "<td class='missing-value'>-</td>";
                                        }
                                    }
                                    
                                    if ($waste_month_count > 0) {
                                        echo "<td><strong>" . number_format($total_waste / $waste_month_count, 0) . "</strong></td>";
                                    } else {
                                        echo "<td class='missing-value'>-</td>";
                                    }
                                    echo "</tr>";
                                }
                                
                                if ($line_count == 0) {
                                    echo "<tr><td colspan='16' class='warning-box'>No active production lines found.</td></tr>";
                                }
                                
                            } catch (Exception $e) {
                                echo "<tr><td colspan='16' class='error-box'>Error loading production data: " . $e->getMessage() . "</td></tr>";
                            }
                        } else {
                            echo "<tr><td colspan='16' class='warning-box'>Production tables not found. Please run the database setup.</td></tr>";
                        }
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Quick Stats -->
        <div class="tracker-section">
            <h2>QUICK STATS</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                <?php
                if ($tables['inventory_accuracy']) {
                    try {
                        $inv_query = "SELECT 
                                        AVG(CASE WHEN inventory_type = 'FG' THEN accuracy_percent END) as fg_acc,
                                        AVG(CASE WHEN inventory_type = 'RMPM' THEN accuracy_percent END) as rmpm_acc
                                      FROM inventory_accuracy 
                                      WHERE YEAR(month_year) = :year";
                        $inv_stmt = $db->prepare($inv_query);
                        $inv_stmt->execute([':year' => $selected_year]);
                        $inv = $inv_stmt->fetch(PDO::FETCH_ASSOC);
                        ?>
                        <div style="background: linear-gradient(135deg, #27ae60, #229954); color: white; padding: 1.5rem; border-radius: 8px;">
                            <h3 style="margin: 0 0 0.5rem 0;">FG Accuracy</h3>
                            <div style="font-size: 2rem; font-weight: bold;"><?php echo number_format($inv['fg_acc'] ?? 0, 1); ?>%</div>
                        </div>
                        
                        <div style="background: linear-gradient(135deg, #e67e22, #d35400); color: white; padding: 1.5rem; border-radius: 8px;">
                            <h3 style="margin: 0 0 0.5rem 0;">RMPM Accuracy</h3>
                            <div style="font-size: 2rem; font-weight: bold;"><?php echo number_format($inv['rmpm_acc'] ?? 0, 1); ?>%</div>
                        </div>
                        <?php
                    } catch (Exception $e) {
                        echo "<div class='error-box'>Error loading inventory stats</div>";
                    }
                }
                
                if ($tables['labor_reports']) {
                    try {
                        $labor_query = "SELECT SUM(regular_hours) as total_reg, SUM(overtime_hours) as total_ot 
                                       FROM labor_reports WHERE YEAR(month_year) = :year";
                        $labor_stmt = $db->prepare($labor_query);
                        $labor_stmt->execute([':year' => $selected_year]);
                        $labor = $labor_stmt->fetch(PDO::FETCH_ASSOC);
                        ?>
                        <div style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 1.5rem; border-radius: 8px;">
                            <h3 style="margin: 0 0 0.5rem 0;">Overtime %</h3>
                            <div style="font-size: 2rem; font-weight: bold;">
                                <?php 
                                $ot_percent = ($labor['total_reg'] > 0) ? ($labor['total_ot'] / $labor['total_reg'] * 100) : 0;
                                echo number_format($ot_percent, 1); ?>%
                            </div>
                        </div>
                        <?php
                    } catch (Exception $e) {
                        echo "<div class='error-box'>Error loading labor stats</div>";
                    }
                }
                ?>
            </div>
        </div>
    </div>
    
    <?php include 'includes/footer.php'; ?>
</body>
</html>