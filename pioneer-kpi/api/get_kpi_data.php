<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $month = $_GET['month'] ?? date('M');
    $year = $_GET['year'] ?? 2026;
    
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("
        SELECT kd.*, kv.*
        FROM kpi_definitions kd
        LEFT JOIN kpi_values kv ON kd.id = kv.kpi_definition_id 
            AND kv.year = :year AND kv.month = :month
    ");
    
    $stmt->execute([':year' => $year, ':month' => $month]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format as associative array by ID
    $data = [];
    foreach ($results as $row) {
        $data[$row['id']] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $data,
        'month' => $month,
        'year' => $year
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>