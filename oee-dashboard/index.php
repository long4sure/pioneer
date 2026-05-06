<?php
require_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();

// Get performance targets
$targets_query = "SELECT * FROM performance_targets";
$targets_stmt = $db->prepare($targets_query);
$targets_stmt->execute();
$targets = [];
while ($row = $targets_stmt->fetch(PDO::FETCH_ASSOC)) {
    $targets[$row['target_name']] = $row['target_value'];
}

// Get production lines
$lines_query = "SELECT * FROM production_lines WHERE is_active = 1";
$lines_stmt = $db->prepare($lines_query);
$lines_stmt->execute();
$lines = $lines_stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Power BI Style OEE Dashboard</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="stylesheet" href="css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="pbi-container">
        <!-- Navigation -->
        <nav class="pbi-nav">
            <div class="pbi-logo">
                <i class="fas fa-chart-line"></i>
                <span>OEE Power BI</span>
            </div>
            <div class="pbi-nav-items">
                <div class="pbi-nav-item active">
                    <i class="fas fa-home"></i>
                    <span>Dashboard</span>
                </div>
                <div class="pbi-nav-item">
                    <i class="fas fa-industry"></i>
                    <span>Production</span>
                </div>
                <div class="pbi-nav-item">
                    <i class="fas fa-chart-bar"></i>
                    <span>Analytics</span>
                </div>
                <div class="pbi-nav-item">
                    <i class="fas fa-cog"></i>
                    <span>Settings</span>
                </div>
            </div>
            <div>
                <button class="pbi-btn-icon" id="refreshBtn">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <button class="pbi-btn-icon">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        </nav>

        <!-- Header -->
        <header class="pbi-header">
            <div class="pbi-header-title">
                <h1>Production Lines Overview</h1>
                <p>Real-time OEE monitoring for all production lines</p>
            </div>
            <div class="pbi-date-range">
                <i class="far fa-calendar-alt"></i>
                <span id="dateRange">Last 7 Days</span>
                <select id="periodSelect">
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                </select>
                <button class="pbi-btn-primary" id="applyDateBtn">
                    <i class="fas fa-check"></i> Apply
                </button>
            </div>
        </header>

        <!-- KPI Cards -->
        <div class="pbi-kpi-grid">
            <div class="pbi-kpi-card oee">
                <div class="pbi-kpi-label">
                    <i class="fas fa-star"></i> Overall OEE
                </div>
                <div class="pbi-kpi-value" id="kpiOEE">85.3%</div>
                <div class="pbi-kpi-trend up">
                    <i class="fas fa-arrow-up"></i> +2.1% vs target
                </div>
            </div>
            <div class="pbi-kpi-card availability">
                <div class="pbi-kpi-label">
                    <i class="fas fa-clock"></i> Availability
                </div>
                <div class="pbi-kpi-value" id="kpiAvail">91.2%</div>
                <div class="pbi-kpi-trend up">
                    <i class="fas fa-arrow-up"></i> +1.5% vs target
                </div>
            </div>
            <div class="pbi-kpi-card performance">
                <div class="pbi-kpi-label">
                    <i class="fas fa-tachometer-alt"></i> Performance
                </div>
                <div class="pbi-kpi-value" id="kpiPerf">94.5%</div>
                <div class="pbi-kpi-trend down">
                    <i class="fas fa-arrow-down"></i> -0.8% vs target
                </div>
            </div>
            <div class="pbi-kpi-card quality">
                <div class="pbi-kpi-label">
                    <i class="fas fa-check-circle"></i> RFT (Quality)
                </div>
                <div class="pbi-kpi-value" id="kpiRFT">98.2%</div>
                <div class="pbi-kpi-trend up">
                    <i class="fas fa-arrow-up"></i> +0.3% vs target
                </div>
            </div>
        </div>

        <!-- Filters -->
        <div class="pbi-filters">
            <div class="pbi-filter-group">
                <i class="fas fa-industry"></i>
                <select id="lineFilter">
                    <option value="">All Lines</option>
                    <?php foreach ($lines as $line): ?>
                        <option value="<?= $line['id'] ?>"><?= $line['line_name'] ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="pbi-filter-group">
                <i class="fas fa-clock"></i>
                <select id="shiftFilter">
                    <option value="">All Shifts</option>
                    <option value="Day">Day</option>
                    <option value="Night">Night</option>
                    <option value="Afternoon">Afternoon</option>
                </select>
            </div>
            <div style="flex:1"></div>
            <button class="pbi-btn-primary" id="newEntryBtn">
                <i class="fas fa-plus"></i> New Entry
            </button>
        </div>

        <!-- Line Cards -->
        <div class="pbi-line-grid" id="lineCards">
            <!-- Dynamically loaded -->
        </div>

        <!-- Charts Row -->
        <div class="pbi-chart-row">
            <div class="pbi-chart-card">
                <div class="pbi-chart-header">
                    <h3><i class="fas fa-chart-bar"></i> OEE by Line</h3>
                    <button class="pbi-btn-icon">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
                <div class="pbi-chart-container">
                    <canvas id="oeeChart"></canvas>
                </div>
            </div>
            <div class="pbi-chart-card">
                <div class="pbi-chart-header">
                    <h3><i class="fas fa-chart-line"></i> Daily Trend</h3>
                    <button class="pbi-btn-icon">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>
                <div class="pbi-chart-container">
                    <canvas id="trendChart"></canvas>
                </div>
            </div>
        </div>

        <!-- Table -->
        <div class="pbi-table-card">
            <div class="pbi-table-header">
                <h3><i class="fas fa-table"></i> Detailed Line Performance</h3>
                <div>
                    <button class="pbi-btn-outline" id="exportBtn">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
            <table class="pbi-table">
                <thead>
                    <tr>
                        <th>Line</th>
                        <th>UTILIZATION</th>
                        <th>RFT</th>
                        <th>OEE</th>
                        <th>ELOR</th>
                        <th>AVAIL</th>
                        <th>PER</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <!-- Dynamically loaded -->
                </tbody>
                <tfoot>
                    <tr>
                        <td><strong>AVERAGE</strong></td>
                        <td id="avgUtil">-</td>
                        <td id="avgRFT">-</td>
                        <td id="avgOEE">-</td>
                        <td id="avgELOR">-</td>
                        <td id="avgAvail">-</td>
                        <td id="avgPer">-</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>

    <!-- Add Entry Modal -->
    <div class="pbi-modal" id="entryModal">
        <div class="pbi-modal-content">
            <div class="pbi-modal-header">
                <h3><i class="fas fa-plus-circle"></i> New Production Entry</h3>
                <button class="pbi-close" onclick="closeModal()">&times;</button>
            </div>
            <form id="entryForm">
                <div class="pbi-modal-body">
                    <div class="pbi-form-row">
                        <div class="pbi-form-group">
                            <label>Date</label>
                            <input type="date" id="entryDate" required>
                        </div>
                        <div class="pbi-form-group">
                            <label>Shift</label>
                            <select id="entryShift" required>
                                <option value="Day">Day</option>
                                <option value="Night">Night</option>
                                <option value="Afternoon">Afternoon</option>
                            </select>
                        </div>
                    </div>
                    <div class="pbi-form-row">
                        <div class="pbi-form-group">
                            <label>Line</label>
                            <select id="entryLine" required>
                                <?php foreach ($lines as $line): ?>
                                    <option value="<?= $line['id'] ?>"><?= $line['line_name'] ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="pbi-form-group">
                            <label>Product</label>
                            <input type="text" id="entryProduct" required>
                        </div>
                    </div>
                    <div class="pbi-form-row">
                        <div class="pbi-form-group">
                            <label>Hours Worked</label>
                            <input type="number" step="0.1" id="entryHours" required>
                        </div>
                        <div class="pbi-form-group">
                            <label>Total Units</label>
                            <input type="number" id="entryUnits" required>
                        </div>
                    </div>
                    <div class="pbi-form-row">
                        <div class="pbi-form-group">
                            <label>Defects</label>
                            <input type="number" id="entryDefects" required>
                        </div>
                        <div class="pbi-form-group">
                            <label>Ideal Rate</label>
                            <input type="number" step="0.1" id="entryIdealRate" required>
                        </div>
                    </div>
                </div>
                <div class="pbi-modal-footer">
                    <button type="button" class="pbi-btn-outline" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="pbi-btn-primary">Save Entry</button>
                </div>
            </form>
        </div>
    </div>

    <script src="js/dashboard.js"></script>
    <script src="js/charts.js"></script>
    <script>
        // Initialize dashboard with PHP data
        const DASHBOARD_CONFIG = {
            targets: <?= json_encode($targets) ?>,
            lines: <?= json_encode($lines) ?>
        };
    </script>
</body>
</html>