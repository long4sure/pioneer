<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        throw new Exception('KPI ID is required');
    }
    
    $db = Database::getInstance()->getConnection();
    
    // Get KPI definition
    $stmt = $db->prepare("
        SELECT kd.kpi_name, kd.uom, kc.name as category, ksc.name as subcategory
        FROM kpi_definitions kd
        JOIN kpi_subcategories ksc ON kd.subcategory_id = ksc.id
        JOIN kpi_categories kc ON ksc.category_id = kc.id
        WHERE kd.id = :id
    ");
    
    $stmt->execute([':id' => $id]);
    $kpiInfo = $stmt->fetch();
    
    // Get history of values
    $stmt = $db->prepare("
        SELECT 
            year,
            month,
            target_value,
            month_value,
            actual_value,
            updated_at,
            updated_by
        FROM kpi_values
        WHERE kpi_definition_id = :id
        ORDER BY year DESC, 
            FIELD(month, 'JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC')
    ");
    
    $stmt->execute([':id' => $id]);
    $history = $stmt->fetchAll();
    
    // Calculate changes
    $previousActual = null;
    foreach ($history as &$record) {
        $record['change'] = 0;
        if ($previousActual !== null && $previousActual > 0) {
            $record['change'] = round((($record['actual_value'] - $previousActual) / $previousActual) * 100, 1);
        }
        $previousActual = $record['actual_value'];
    }
    
    echo json_encode([
        'success' => true,
        'kpi_info' => $kpiInfo,
        'history' => $history
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>