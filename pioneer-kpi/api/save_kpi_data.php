<?php
header('Content-Type: application/json');
require_once '../config/database.php';
require_once '../includes/session.php';

try {
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid input data');
    }
    
    $id = $input['id'] ?? null;
    $target = $input['target'] ?? 0;
    $month = $input['month'] ?? 0;
    $actual = $input['actual'] ?? 0;
    $month_name = $input['month_name'] ?? date('M');
    $year = $input['year'] ?? 2026;
    $username = $_SESSION['username'] ?? 'system';
    
    if (!$id) {
        throw new Exception('KPI ID is required');
    }
    
    $db = Database::getInstance()->getConnection();
    
    // Check if record exists
    $stmt = $db->prepare("
        SELECT id FROM kpi_values 
        WHERE kpi_definition_id = :kpi_id AND year = :year AND month = :month
    ");
    
    $stmt->execute([
        ':kpi_id' => $id,
        ':year' => $year,
        ':month' => $month_name
    ]);
    
    $existing = $stmt->fetch();
    
    if ($existing) {
        // Update existing record
        $stmt = $db->prepare("
            UPDATE kpi_values 
            SET target_value = :target,
                month_value = :month_value,
                actual_value = :actual,
                updated_at = NOW(),
                updated_by = :updated_by
            WHERE kpi_definition_id = :kpi_id 
                AND year = :year 
                AND month = :month
        ");
    } else {
        // Insert new record
        $stmt = $db->prepare("
            INSERT INTO kpi_values 
                (kpi_definition_id, year, month, target_value, month_value, actual_value, updated_by)
            VALUES 
                (:kpi_id, :year, :month, :target, :month_value, :actual, :updated_by)
        ");
    }
    
    $result = $stmt->execute([
        ':kpi_id' => $id,
        ':year' => $year,
        ':month' => $month_name,
        ':target' => $target,
        ':month_value' => $month,
        ':actual' => $actual,
        ':updated_by' => $username
    ]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'KPI values saved successfully',
            'id' => $id
        ]);
    } else {
        throw new Exception('Failed to save KPI values');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>