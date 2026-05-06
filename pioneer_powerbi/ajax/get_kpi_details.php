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

$kpi = $_POST['kpi'] ?? '';
$month = $_POST['month'] ?? null;

// Get KPI details
$query = "SELECT 
    kd.*,
    AVG(kr.actual_value) as current_value,
    (SELECT actual_value FROM kpi_records 
     WHERE kpi_id = kd.kpi_id 
     ORDER BY month_year DESC LIMIT 1) as latest_value,
    (SELECT actual_value FROM kpi_records 
     WHERE kpi_id = kd.kpi_id 
     ORDER BY month_year DESC LIMIT 1,1) as prev_value
FROM kpi_definitions kd
LEFT JOIN kpi_records kr ON kd.kpi_id = kr.kpi_id
WHERE kd.kpi_name LIKE :kpi
GROUP BY kd.kpi_id";

$stmt = $db->prepare($query);
$stmt->execute([':kpi' => "%$kpi%"]);
$kpi_data = $stmt->fetch(PDO::FETCH_ASSOC);

// Calculate trend
$trend = 0;
if ($kpi_data['latest_value'] && $kpi_data['prev_value']) {
    $trend = (($kpi_data['latest_value'] - $kpi_data['prev_value']) / $kpi_data['prev_value']) * 100;
}

// Get historical data
$history_query = "SELECT 
    DATE_FORMAT(month_year, '%M %Y') as month,
    actual_value,
    :target as target
FROM kpi_records
WHERE kpi_id = :kpi_id
ORDER BY month_year DESC
LIMIT 12";

$stmt = $db->prepare($history_query);
$stmt->execute([
    ':kpi_id' => $kpi_data['kpi_id'],
    ':target' => $kpi_data['target_value']
]);

$history = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $history[] = $row;
}

$response = [
    'current' => $kpi_data['current_value'] ?? 0,
    'target' => $kpi_data['target_value'],
    'unit' => $kpi_data['uom'],
    'achievement' => $kpi_data['current_value'] ? 
        round(($kpi_data['current_value'] / $kpi_data['target_value']) * 100, 1) : 0,
    'trend' => round($trend, 1),
    'history' => $history
];

header('Content-Type: application/json');
echo json_encode($response);
?>