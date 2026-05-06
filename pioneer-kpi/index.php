<?php
require_once 'config/database.php';
require_once 'includes/session.php';
require_once 'includes/functions.php';

$pageTitle = "KPI Dashboard 2026";
$currentMonth = isset($_GET['month']) ? $_GET['month'] : date('M');
$currentYear = isset($_GET['year']) ? $_GET['year'] : 2026;

// Get database connection
$db = Database::getInstance()->getConnection();

// Fetch KPIs for dashboard
$stmt = $db->prepare("
    SELECT kd.*, kv.target_value, kv.actual_value, kv.month_value,
           ksc.name as subcategory_name, kc.name as category_name
    FROM kpi_definitions kd
    LEFT JOIN kpi_values kv ON kd.id = kv.kpi_definition_id 
        AND kv.year = :year AND kv.month = :month
    JOIN kpi_subcategories ksc ON kd.subcategory_id = ksc.id
    JOIN kpi_categories kc ON ksc.category_id = kc.id
    ORDER BY kc.display_order, ksc.display_order, kd.display_order
");

$stmt->execute([':year' => $currentYear, ':month' => $currentMonth]);
$kpis = $stmt->fetchAll();

// Convert to associative array by ID for easy access
$kpiData = [];
foreach ($kpis as $kpi) {
    $kpiData[$kpi['id']] = $kpi;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PIONEER 2026 KPI DASHBOARD</title>
    <link rel="stylesheet" href="assets/css/dashboard.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <h1>PIONEER</h1>
                <div class="year-badge">2026</div>
            </div>
            <div class="header-right">
                <div class="date-display" id="currentDate"></div>
                <div class="user-menu">
                    <span class="username"><?php echo $_SESSION['username'] ?? 'Admin'; ?></span>
                    <button class="btn btn-icon" onclick="toggleUserMenu()">▼</button>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <div class="nav-bar">
            <div class="nav-tabs">
                <a href="index.php" class="nav-tab active">Dashboard</a>
                <a href="tracker.php" class="nav-tab">KPI Tracker</a>
                <a href="#" class="nav-tab">Reports</a>
                <a href="#" class="nav-tab">Settings</a>
            </div>
            <div class="nav-controls">
                <select id="monthSelector" class="form-select">
                    <option value="JAN" <?php echo $currentMonth == 'JAN' ? 'selected' : ''; ?>>January 2026</option>
                    <option value="FEB" <?php echo $currentMonth == 'FEB' ? 'selected' : ''; ?>>February 2026</option>
                    <option value="MAR" <?php echo $currentMonth == 'MAR' ? 'selected' : ''; ?>>March 2026</option>
                    <option value="APR" <?php echo $currentMonth == 'APR' ? 'selected' : ''; ?>>April 2026</option>
                    <option value="MAY" <?php echo $currentMonth == 'MAY' ? 'selected' : ''; ?>>May 2026</option>
                    <option value="JUN" <?php echo $currentMonth == 'JUN' ? 'selected' : ''; ?>>June 2026</option>
                    <option value="JUL" <?php echo $currentMonth == 'JUL' ? 'selected' : ''; ?>>July 2026</option>
                    <option value="AUG" <?php echo $currentMonth == 'AUG' ? 'selected' : ''; ?>>August 2026</option>
                    <option value="SEP" <?php echo $currentMonth == 'SEP' ? 'selected' : ''; ?>>September 2026</option>
                    <option value="OCT" <?php echo $currentMonth == 'OCT' ? 'selected' : ''; ?>>October 2026</option>
                    <option value="NOV" <?php echo $currentMonth == 'NOV' ? 'selected' : ''; ?>>November 2026</option>
                    <option value="DEC" <?php echo $currentMonth == 'DEC' ? 'selected' : ''; ?>>December 2026</option>
                </select>
                <button class="btn btn-primary" onclick="loadMonth()">Load</button>
                <button class="btn btn-success" onclick="refreshDashboard()">
                    <span class="icon">↻</span> Refresh
                </button>
                <button class="btn btn-secondary" onclick="exportDashboard()">
                    <span class="icon">📊</span> Export
                </button>
            </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="kpi-summary">
            <div class="summary-card">
                <div class="summary-icon blue">📈</div>
                <div class="summary-content">
                    <div class="summary-label">Production Volume</div>
                    <div class="summary-value" id="summaryProduction">0 MT</div>
                    <div class="summary-trend positive">+12% vs target</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon green">⏱️</div>
                <div class="summary-content">
                    <div class="summary-label">Productive Time</div>
                    <div class="summary-value" id="summaryProductive">0%</div>
                    <div class="summary-trend positive">+5% vs last month</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon orange">📦</div>
                <div class="summary-content">
                    <div class="summary-label">Inventory Accuracy</div>
                    <div class="summary-value" id="summaryInventory">0%</div>
                    <div class="summary-trend negative">-2% vs target</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon purple">👥</div>
                <div class="summary-content">
                    <div class="summary-label">Attendance Rate</div>
                    <div class="summary-value" id="summaryAttendance">0%</div>
                    <div class="summary-trend neutral">On target</div>
                </div>
            </div>
        </div>

        <!-- Main Dashboard Grid -->
        <div class="dashboard-grid">
            <!-- Column 1: Production & Downtime -->
            <div class="dashboard-col">
                <!-- Output Card -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Production Output</h3>
                        <span class="card-badge">MT</span>
                    </div>
                    <div class="card-body">
                        <div class="kpi-large">
                            <div class="kpi-label">Target</div>
                            <div class="kpi-value" id="outputTarget">0</div>
                        </div>
                        <div class="kpi-large">
                            <div class="kpi-label">Actual</div>
                            <div class="kpi-value highlight" id="outputActual">0</div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="outputProgress" style="width: 0%;"></div>
                        </div>
                        <div class="kpi-comparison">
                            <span>Achievement: <span id="outputAchievement">0%</span></span>
                            <span>vs Target</span>
                        </div>
                    </div>
                </div>

                <!-- Productive Time Card -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Productive Time</h3>
                    </div>
                    <div class="card-body">
                        <div class="kpi-row">
                            <span>Rate</span>
                            <span class="kpi-value-large" id="productiveTime">0%</span>
                        </div>
                        <div class="kpi-row">
                            <span>Machine Utilization</span>
                            <span class="kpi-value" id="machineUtil">0%</span>
                        </div>
                    </div>
                </div>

                <!-- Downtime Breakdown -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Downtime Breakdown</h3>
                        <button class="btn-icon" onclick="toggleDowntimeDetails()">▼</button>
                    </div>
                    <div class="card-body">
                        <div class="downtime-list" id="downtimeList">
                            <!-- Filled by JavaScript -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Column 2: Workforce -->
            <div class="dashboard-col">
                <!-- Attendance Card -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Attendance</h3>
                    </div>
                    <div class="card-body">
                        <div class="kpi-large">
                            <div class="kpi-label">Absenteeism Rate</div>
                            <div class="kpi-value" id="absenteeism">0%</div>
                        </div>
                        <div class="kpi-grid">
                            <div class="kpi-mini">
                                <span class="label">Manpower</span>
                                <span class="value" id="manpower">0</span>
                            </div>
                            <div class="kpi-mini">
                                <span class="label">Working Days</span>
                                <span class="value" id="workingDays">0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Labor Report -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Labor Report</h3>
                    </div>
                    <div class="card-body">
                        <div class="labor-section">
                            <h4>Direct Labor</h4>
                            <div class="kpi-row">
                                <span>Total Hours</span>
                                <span id="directHours">0</span>
                            </div>
                            <div class="kpi-row">
                                <span>OT Hours</span>
                                <span id="directOT">0</span>
                            </div>
                        </div>
                        <div class="labor-section">
                            <h4>Indirect Labor</h4>
                            <div class="kpi-row">
                                <span>Total Hours</span>
                                <span id="indirectHours">0</span>
                            </div>
                            <div class="kpi-row">
                                <span>OT Hours</span>
                                <span id="indirectOT">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Column 3: Inventory & Forecast -->
            <div class="dashboard-col">
                <!-- Inventory Card -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Inventory & Warehouse</h3>
                    </div>
                    <div class="card-body">
                        <div class="kpi-row">
                            <span>FG Accuracy</span>
                            <span id="invFG">0%</span>
                        </div>
                        <div class="kpi-row">
                            <span>RMPM Accuracy</span>
                            <span id="invRMPM">0%</span>
                        </div>
                        <div class="kpi-row">
                            <span>FG Utilization</span>
                            <span id="whFG">0%</span>
                        </div>
                        <div class="kpi-row">
                            <span>RMPM Utilization</span>
                            <span id="whRMPM">0%</span>
                        </div>
                    </div>
                </div>

                <!-- Forecast Accuracy -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Forecast Accuracy</h3>
                        <select class="form-select-sm" id="forecastType">
                            <option value="product">By Product</option>
                            <option value="location">By Location</option>
                        </select>
                    </div>
                    <div class="card-body">
                        <div class="forecast-list" id="forecastList">
                            <!-- Filled by JavaScript -->
                        </div>
                    </div>
                </div>

                <!-- Absenteeism by Line -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Absenteeism by Line</h3>
                    </div>
                    <div class="card-body">
                        <div class="abs-grid" id="absGrid">
                            <!-- Filled by JavaScript -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-left">
                Last updated: <span id="lastUpdated"><?php echo date('Y-m-d H:i:s'); ?></span>
            </div>
            <div class="footer-right">
                <span class="data-source">Data from KPI Tracker</span>
                <button class="btn-link" onclick="showDataQuality()">Data Quality</button>
            </div>
        </div>
    </div>

    <!-- Templates for dynamic content -->
    <template id="downtime-template">
        <div class="downtime-item">
            <span class="label"></span>
            <span class="value"></span>
        </div>
    </template>

    <script>
        // Pass PHP data to JavaScript
        const kpiData = <?php echo json_encode($kpiData); ?>;
        const currentMonth = '<?php echo $currentMonth; ?>';
        const currentYear = <?php echo $currentYear; ?>;
    </script>
    <script src="assets/js/dashboard.js"></script>
</body>
</html>