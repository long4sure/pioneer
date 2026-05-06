<?php
require_once '../config/database.php';

try {
    $month = $_GET['month'] ?? date('M');
    $year = $_GET['year'] ?? 2026;
    
    $db = Database::getInstance()->getConnection();
    
    // Fetch all KPIs with values
    $stmt = $db->prepare("
        SELECT 
            kd.id,
            kd.kpi_name,
            kd.uom,
            kd.is_forecast,
            kc.name as category,
            ksc.name as subcategory,
            COALESCE(kv.target_value, 0) as target_value,
            COALESCE(kv.month_value, 0) as month_value,
            COALESCE(kv.actual_value, 0) as actual_value
        FROM kpi_definitions kd
        JOIN kpi_subcategories ksc ON kd.subcategory_id = ksc.id
        JOIN kpi_categories kc ON ksc.category_id = kc.id
        LEFT JOIN kpi_values kv ON kd.id = kv.kpi_definition_id 
            AND kv.year = :year AND kv.month = :month
        ORDER BY kc.display_order, ksc.display_order, kd.display_order
    ");
    
    $stmt->execute([':year' => $year, ':month' => $month]);
    $kpis = $stmt->fetchAll();
    
    // Set headers for CSV download
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="kpi_tracker_' . $month . '_' . $year . '.csv"');
    
    // Create output stream
    $output = fopen('php://output', 'w');
    
    // Add UTF-8 BOM for Excel
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    // Add headers
    fputcsv($output, [
        'ID',
        'KPI Name',
        'UoM',
        'Category',
        'Subcategory',
        'Is Forecast',
        'Target Value',
        'Month Value (' . $month . ')',
        'Actual Value',
        'Status'
    ]);
    
    // Add data rows
    foreach ($kpis as $kpi) {
        // Calculate status
        $status = 'No Data';
        if ($kpi['target_value'] > 0) {
            $achievement = ($kpi['actual_value'] / $kpi['target_value']) * 100;
            if ($achievement >= 100) $status = 'On Track';
            elseif ($achievement >= 80) $status = 'At Risk';
            elseif ($achievement > 0) $status = 'Behind';
        }
        
        fputcsv($output, [
            $kpi['id'],
            $kpi['kpi_name'],
            $kpi['uom'],
            $kpi['category'],
            $kpi['subcategory'],
            $kpi['is_forecast'] ? 'Yes' : 'No',
            $kpi['target_value'],
            $kpi['month_value'],
            $kpi['actual_value'],
            $status
        ]);
    }
    
    fclose($output);
    
} catch (Exception $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}
?>