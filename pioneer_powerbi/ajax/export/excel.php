<?php
require_once '../config/config.php';
require_once '../config/database.php';

session_start();
if (!isset($_SESSION['user_id'])) {
    die('Unauthorized');
}

$database = new Database();
$db = $database->getConnection();

$year = $_GET['year'] ?? date('Y');
$month = $_GET['month'] ?? date('m');
$department = $_GET['department'] ?? 'all';

// Set headers for Excel download
header('Content-Type: application/vnd.ms-excel');
header('Content-Disposition: attachment; filename="pioneer_kpi_report_' . date('Ymd') . '.xls"');

// Query data
$query = "SELECT 
    kd.kpi_name,
    kc.category_name,
    DATE_FORMAT(kr.month_year, '%M %Y') as month,
    kr.actual_value,
    kd.target_value,
    kd.uom,
    (kr.actual_value / kd.target_value * 100) as achievement
FROM kpi_records kr
JOIN kpi_definitions kd ON kr.kpi_id = kd.kpi_id
JOIN kpi_categories kc ON kd.category_id = kc.category_id
WHERE YEAR(kr.month_year) = :year";

if ($month != 'all') {
    $query .= " AND MONTH(kr.month_year) = :month";
}

$query .= " ORDER BY kr.month_year DESC, kc.category_name";

$stmt = $db->prepare($query);
$params = [':year' => $year];
if ($month != 'all') {
    $params[':month'] = $month;
}
$stmt->execute($params);

// Generate HTML table for Excel
echo "<html>";
echo "<head><title>Pioneer KPI Report</title></head>";
echo "<body>";
echo "<h1>Pioneer Adhesives - KPI Report</h1>";
echo "<p>Generated: " . date('Y-m-d H:i:s') . "</p>";
echo "<p>Period: " . ($month != 'all' ? date('F', mktime(0,0,0,$month,1)) . " $year" : "Year $year") . "</p>";

echo "<table border='1'>";
echo "<tr>";
echo "<th>KPI</th>";
echo "<th>Category</th>";
echo "<th>Month</th>";
echo "<th>Actual</th>";
echo "<th>Target</th>";
echo "<th>UoM</th>";
echo "<th>Achievement %</th>";
echo "</tr>";

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "<tr>";
    echo "<td>" . htmlspecialchars($row['kpi_name']) . "</td>";
    echo "<td>" . htmlspecialchars($row['category_name']) . "</td>";
    echo "<td>" . htmlspecialchars($row['month']) . "</td>";
    echo "<td>" . number_format($row['actual_value'], 2) . "</td>";
    echo "<td>" . number_format($row['target_value'], 2) . "</td>";
    echo "<td>" . htmlspecialchars($row['uom']) . "</td>";
    echo "<td>" . number_format($row['achievement'], 1) . "%</td>";
    echo "</tr>";
}

echo "</table>";
echo "</body>";
echo "</html>";
?>