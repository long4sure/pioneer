<?php
require_once '../config/config.php';
require_once '../config/database.php';

session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Unauthorized']));
}

$database = new Database();
$db = $database->getConnection();

$year = $_POST['year'] ?? date('Y');
$month = $_POST['month'] ?? date('m');
$department = $_POST['department'] ?? 'all';

$response = [
    'kpis' => [],
    'trends' => ['labels' => [], 'datasets' => []],
    'downtime' => ['labels' => [], 'values' => []],
    'production' => ['labels' => [], 'values' => []],
    'forecast' => ['labels' => [], 'values' => []],
    'details' => ['rows' => []]
];

// Get KPI summary
$kpi_query = "SELECT 
    SUM(CASE WHEN kd.kpi_code = 'VOL_PROD_MT' THEN kr.actual_value ELSE 0 END) as total_production,
    AVG(CASE WHEN kd.kpi_code = 'CONV_COST_SC' THEN kr.actual_value ELSE 0 END) as conv_cost,
    AVG(CASE WHEN kd.kpi_code = 'OP_COST' THEN kr.actual_value ELSE 0 END) as op_cost,
    AVG(CASE WHEN kd.kpi_code = 'EFF_RATIO' THEN kr.actual_value ELSE 0 END) as efficiency,
    AVG(CASE WHEN kd.kpi_code = 'FG_ACCURACY' THEN kr.actual_value ELSE 0 END) as fg_accuracy,
    AVG(CASE WHEN kd.kpi_code = 'RMPM_ACCURACY' THEN kr.actual_value ELSE 0 END) as rmpm_accuracy,
    AVG(CASE WHEN kd.kpi_code = 'OTIF' THEN kr.actual_value ELSE 0 END) as otif,
    AVG(CASE WHEN kd.kpi_code = 'FILL_RATE' THEN kr.actual_value ELSE 0 END) as fill_rate
FROM kpi_records kr
JOIN kpi_definitions kd ON kr.kpi_id = kd.kpi_id
WHERE YEAR(kr.month_year) = :year";

if ($month != 'all') {
    $kpi_query .= " AND MONTH(kr.month_year) = :month";
}

$stmt = $db->prepare($kpi_query);
$params = [':year' => $year];
if ($month != 'all') {
    $params[':month'] = $month;
}
$stmt->execute($params);
$response['kpis'] = $stmt->fetch(PDO::FETCH_ASSOC);

// Get trend data (last 6 months)
$trend_query = "SELECT 
    DATE_FORMAT(kr.month_year, '%Y-%m') as month,
    kd.kpi_name,
    AVG(kr.actual_value) as avg_value
FROM kpi_records kr
JOIN kpi_definitions kd ON kr.kpi_id = kd.kpi_id
WHERE kr.month_year >= DATE_SUB(:date, INTERVAL 5 MONTH)
GROUP BY DATE_FORMAT(kr.month_year, '%Y-%m'), kd.kpi_name
ORDER BY kr.month_year";

$stmt = $db->prepare($trend_query);
$stmt->execute([':date' => "$year-$month-01"]);

$trend_data = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    if (!in_array($row['month'], $response['trends']['labels'])) {
        $response['trends']['labels'][] = $row['month'];
    }
    $trend_data[$row['kpi_name']][$row['month']] = $row['avg_value'];
}

// Format trend datasets
$colors = ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c'];
$i = 0;
foreach ($trend_data as $kpi => $values) {
    $dataset = [
        'label' => $kpi,
        'data' => [],
        'borderColor' => $colors[$i % count($colors)],
        'backgroundColor' => 'transparent',
        'tension' => 0.4
    ];
    
    foreach ($response['trends']['labels'] as $month) {
        $dataset['data'][] = $values[$month] ?? null;
    }
    
    $response['trends']['datasets'][] = $dataset;
    $i++;
}

// Get downtime data
$downtime_query = "SELECT 
    downtime_type,
    SUM(hours) as total_hours
FROM production_downtime
WHERE YEAR(month_year) = :year
" . ($month != 'all' ? " AND MONTH(month_year) = :month" : "") . "
GROUP BY downtime_type
ORDER BY total_hours DESC
LIMIT 8";

$stmt = $db->prepare($downtime_query);
$params = [':year' => $year];
if ($month != 'all') {
    $params[':month'] = $month;
}
$stmt->execute($params);

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $response['downtime']['labels'][] = $row['downtime_type'];
    $response['downtime']['values'][] = (float)$row['total_hours'];
}

// Get production data
$prod_query = "SELECT 
    pl.line_code,
    SUM(po.output_kg) as total_output
FROM production_output po
JOIN production_lines pl ON po.line_id = pl.line_id
WHERE YEAR(po.month_year) = :year
" . ($month != 'all' ? " AND MONTH(po.month_year) = :month" : "") . "
GROUP BY pl.line_code
ORDER BY total_output DESC
LIMIT 10";

$stmt = $db->prepare($prod_query);
$stmt->execute($params);

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $response['production']['labels'][] = $row['line_code'];
    $response['production']['values'][] = (float)$row['total_output'];
}

// Get forecast data
$forecast_query = "SELECT 
    region,
    AVG(accuracy_percent) as avg_accuracy
FROM forecast_accuracy
WHERE YEAR(month_year) = :year
" . ($month != 'all' ? " AND MONTH(month_year) = :month" : "") . "
GROUP BY region
ORDER BY avg_accuracy DESC";

$stmt = $db->prepare($forecast_query);
$stmt->execute($params);

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $response['forecast']['labels'][] = $row['region'];
    $response['forecast']['values'][] = (float)$row['avg_accuracy'];
}

// Get detailed data for table
$detail_query = "SELECT 
    kd.kpi_name,
    kc.category_name as category,
    DATE_FORMAT(kr.month_year, '%Y-%m') as month,
    kr.actual_value,
    kd.target_value,
    kd.uom
FROM kpi_records kr
JOIN kpi_definitions kd ON kr.kpi_id = kd.kpi_id
JOIN kpi_categories kc ON kd.category_id = kc.category_id
WHERE YEAR(kr.month_year) = :year
" . ($month != 'all' ? " AND MONTH(kr.month_year) = :month" : "") . "
ORDER BY kr.month_year DESC, kc.category_name";

$stmt = $db->prepare($detail_query);
$stmt->execute($params);

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $response['details']['rows'][] = $row;
}

header('Content-Type: application/json');
echo json_encode($response);
?>