<?php
require_once 'config/database.php';
require_once 'includes/session.php';
require_once 'includes/functions.php';

$pageTitle = "KPI Tracker 2026";
$currentMonth = isset($_GET['month']) ? $_GET['month'] : date('M');
$currentYear = isset($_GET['year']) ? $_GET['year'] : 2026;

$db = Database::getInstance()->getConnection();

// Fetch all KPIs with their values
$stmt = $db->prepare("
    SELECT 
        kd.id,
        kd.kpi_name as kpi,
        kd.uom,
        kd.is_forecast,
        kc.name as category,
        ksc.name as subcategory,
        kv.target_value as target,
        kv.actual_value as actual,
        kv.month_value as month_value,
        kv.month as value_month,
        kv.year as value_year
    FROM kpi_definitions kd
    JOIN kpi_subcategories ksc ON kd.subcategory_id = ksc.id
    JOIN kpi_categories kc ON ksc.category_id = kc.id
    LEFT JOIN kpi_values kv ON kd.id = kv.kpi_definition_id 
        AND kv.year = :year AND kv.month = :month
    ORDER BY kc.display_order, ksc.display_order, kd.display_order
");

$stmt->execute([':year' => $currentYear, ':month' => $currentMonth]);
$kpis = $stmt->fetchAll();

// Group by category
$groupedKpis = [];
foreach ($kpis as $kpi) {
    $groupedKpis[$kpi['category']][$kpi['subcategory']][] = $kpi;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PIONEER 2026 KPI TRACKER</title>
    <link rel="stylesheet" href="assets/css/tracker.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <h1>PIONEER</h1>
                <span class="header-badge">KPI TRACKER 2026</span>
            </div>
            <div class="header-right">
                <a href="index.php?month=<?php echo $currentMonth; ?>" class="btn btn-outline">
                    ← Back to Dashboard
                </a>
            </div>
        </div>

        <!-- Controls -->
        <div class="controls-bar">
            <div class="controls-left">
                <select id="monthSelector" class="form-select">
                    <option value="JAN" <?php echo $currentMonth == 'JAN' ? 'selected' : ''; ?>>January</option>
                    <option value="FEB" <?php echo $currentMonth == 'FEB' ? 'selected' : ''; ?>>February</option>
                    <option value="MAR" <?php echo $currentMonth == 'MAR' ? 'selected' : ''; ?>>March</option>
                    <option value="APR" <?php echo $currentMonth == 'APR' ? 'selected' : ''; ?>>April</option>
                    <option value="MAY" <?php echo $currentMonth == 'MAY' ? 'selected' : ''; ?>>May</option>
                    <option value="JUN" <?php echo $currentMonth == 'JUN' ? 'selected' : ''; ?>>June</option>
                    <option value="JUL" <?php echo $currentMonth == 'JUL' ? 'selected' : ''; ?>>July</option>
                    <option value="AUG" <?php echo $currentMonth == 'AUG' ? 'selected' : ''; ?>>August</option>
                    <option value="SEP" <?php echo $currentMonth == 'SEP' ? 'selected' : ''; ?>>September</option>
                    <option value="OCT" <?php echo $currentMonth == 'OCT' ? 'selected' : ''; ?>>October</option>
                    <option value="NOV" <?php echo $currentMonth == 'NOV' ? 'selected' : ''; ?>>November</option>
                    <option value="DEC" <?php echo $currentMonth == 'DEC' ? 'selected' : ''; ?>>December</option>
                </select>
                <input type="number" id="yearSelector" class="form-input" value="<?php echo $currentYear; ?>" min="2024" max="2030" style="width: 80px;">
                <button class="btn btn-primary" onclick="loadMonth()">Load</button>
            </div>
            <div class="controls-right">
                <button class="btn btn-success" onclick="saveAllChanges()">
                    💾 Save All Changes
                </button>
                <button class="btn btn-secondary" onclick="exportToCSV()">
                    📥 Export CSV
                </button>
                <button class="btn btn-info" onclick="importFromCSV()">
                    📤 Import CSV
                </button>
            </div>
        </div>

        <!-- Tracker Table -->
        <div class="table-container">
            <table class="kpi-table" id="kpiTable">
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 350px;">KPI</th>
                        <th style="width: 70px;">UoM</th>
                        <th style="width: 120px;">2026 TARGET</th>
                        <th style="width: 120px;" id="monthHeader"><?php echo $currentMonth; ?></th>
                        <th style="width: 120px;">2026 ACTUAL</th>
                        <th style="width: 100px;">Status</th>
                        <th style="width: 80px;">Actions</th>
                    </tr>
                </thead>
                <tbody id="tableBody">
                    <?php 
                    $rowNumber = 1;
                    foreach ($groupedKpis as $category => $subcategories): 
                    ?>
                        <tr class="category-row">
                            <td colspan="8" class="category-header">
                                <span class="category-toggle" onclick="toggleCategory(this)">▼</span>
                                <?php echo htmlspecialchars($category); ?>
                                <span class="category-stats">
                                    <span class="badge"><?php echo array_sum(array_map('count', $subcategories)); ?> KPIs</span>
                                </span>
                            </td>
                        </tr>
                        
                        <?php foreach ($subcategories as $subcategory => $kpis): ?>
                        <tr class="subcategory-row">
                            <td colspan="8" class="subcategory-header">
                                <span class="subcategory-toggle" onclick="toggleSubcategory(this)">▼</span>
                                <?php echo htmlspecialchars($subcategory); ?>
                            </td>
                        </tr>
                        
                        <?php foreach ($kpis as $kpi): ?>
                        <tr class="kpi-row" data-id="<?php echo $kpi['id']; ?>">
                            <td class="text-center"><?php echo $rowNumber++; ?></td>
                            <td class="kpi-name">
                                <?php echo htmlspecialchars($kpi['kpi']); ?>
                                <?php if ($kpi['is_forecast']): ?>
                                    <span class="forecast-badge">forecast</span>
                                <?php endif; ?>
                            </td>
                            <td class="text-center"><?php echo htmlspecialchars($kpi['uom']); ?></td>
                            <td>
                                <input type="number" 
                                       class="form-input target-input" 
                                       value="<?php echo $kpi['target'] ?? 0; ?>"
                                       data-id="<?php echo $kpi['id']; ?>"
                                       data-field="target"
                                       step="any">
                            </td>
                            <td>
                                <input type="number" 
                                       class="form-input month-input" 
                                       value="<?php echo $kpi['month_value'] ?? 0; ?>"
                                       data-id="<?php echo $kpi['id']; ?>"
                                       data-field="month"
                                       step="any">
                            </td>
                            <td>
                                <input type="number" 
                                       class="form-input actual-input" 
                                       value="<?php echo $kpi['actual'] ?? 0; ?>"
                                       data-id="<?php echo $kpi['id']; ?>"
                                       data-field="actual"
                                       step="any">
                            </td>
                            <td class="status-cell">
                                <span class="status-badge" id="status-<?php echo $kpi['id']; ?>">
                                    <?php echo getStatusBadge($kpi); ?>
                                </span>
                            </td>
                            <td class="actions-cell">
                                <button class="btn-icon" onclick="saveRow(<?php echo $kpi['id']; ?>)">💾</button>
                                <button class="btn-icon" onclick="resetRow(<?php echo $kpi['id']; ?>)">↺</button>
                                <button class="btn-icon" onclick="showHistory(<?php echo $kpi['id']; ?>)">📊</button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        <?php endforeach; ?>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>

        <!-- Bottom status bar -->
        <div class="status-bar">
            <div class="status-left">
                <span class="status-indicator" id="saveStatus">All changes saved</span>
                <span class="status-indicator" id="lastSave">Last save: <?php echo date('H:i:s'); ?></span>
            </div>
            <div class="status-right">
                <span class="kpi-counter">Total KPIs: <?php echo $rowNumber - 1; ?></span>
                <span class="divider">|</span>
                <span class="modified-counter" id="modifiedCount">0 modified</span>
            </div>
        </div>
    </div>

    <!-- History Modal -->
    <div id="historyModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Value History</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body" id="historyContent">
                <!-- Filled by JavaScript -->
            </div>
        </div>
    </div>

    <script>
        const currentMonth = '<?php echo $currentMonth; ?>';
        const currentYear = <?php echo $currentYear; ?>;
    </script>
    <script src="assets/js/tracker.js"></script>
</body>
</html>