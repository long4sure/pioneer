<?php
/**
 * Helper functions for the KPI system
 */

/**
 * Get status badge HTML based on actual vs target
 */
function getStatusBadge($kpi) {
    $target = $kpi['target'] ?? 0;
    $actual = $kpi['actual'] ?? 0;
    
    if ($target <= 0) {
        return '<span class="status-badge info">No Target</span>';
    }
    
    $achievement = ($actual / $target) * 100;
    
    if ($achievement >= 100) {
        return '<span class="status-badge success">On Track</span>';
    } elseif ($achievement >= 80) {
        return '<span class="status-badge warning">At Risk</span>';
    } elseif ($achievement > 0) {
        return '<span class="status-badge danger">Behind</span>';
    } else {
        return '<span class="status-badge info">No Data</span>';
    }
}

/**
 * Format number with specified decimals
 */
function formatNumber($number, $decimals = 2) {
    return number_format(floatval($number), $decimals);
}

/**
 * Calculate percentage
 */
function calculatePercentage($value, $total, $decimals = 1) {
    if ($total == 0) return 0;
    return round(($value / $total) * 100, $decimals);
}

/**
 * Get month name from abbreviation
 */
function getMonthName($month) {
    $months = [
        'JAN' => 'January',
        'FEB' => 'February',
        'MAR' => 'March',
        'APR' => 'April',
        'MAY' => 'May',
        'JUN' => 'June',
        'JUL' => 'July',
        'AUG' => 'August',
        'SEP' => 'September',
        'OCT' => 'October',
        'NOV' => 'November',
        'DEC' => 'December'
    ];
    
    return $months[$month] ?? $month;
}

/**
 * Get month abbreviation from number
 */
function getMonthAbbr($monthNum) {
    $months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
               'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    return $months[$monthNum - 1] ?? 'JAN';
}

/**
 * Sanitize input data
 */
function sanitize($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

/**
 * Validate date range
 */
function isValidMonth($month) {
    $validMonths = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return in_array($month, $validMonths);
}

/**
 * Get KPI value by ID
 */
function getKPIValue($kpiData, $id, $field = 'actual') {
    if (!isset($kpiData[$id])) return 0;
    
    $kpi = $kpiData[$id];
    
    switch ($field) {
        case 'target':
            return floatval($kpi['target'] ?? 0);
        case 'month':
            return floatval($kpi['month_value'] ?? 0);
        default:
            return floatval($kpi['actual'] ?? 0);
    }
}

/**
 * Log user action
 */
function logAction($action, $details = '') {
    $logFile = __DIR__ . '/../logs/actions.log';
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $user = $_SESSION['username'] ?? 'anonymous';
    
    $logEntry = "[$timestamp] User: $user, IP: $ip, Action: $action, Details: $details" . PHP_EOL;
    
    // Ensure logs directory exists
    $logDir = dirname($logFile);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

/**
 * Get data quality score
 */
function getDataQualityScore($kpiData) {
    $totalKPIs = count($kpiData);
    if ($totalKPIs == 0) return 0;
    
    $completedKPIs = 0;
    
    foreach ($kpiData as $kpi) {
        if (($kpi['target'] ?? 0) > 0 || ($kpi['actual'] ?? 0) > 0) {
            $completedKPIs++;
        }
    }
    
    return round(($completedKPIs / $totalKPIs) * 100, 1);
}

/**
 * Export to Excel format
 */
function exportToExcel($data, $filename) {
    // Implementation for Excel export
    // Could use PHPExcel or similar library
}

/**
 * Send email notification
 */
function sendNotification($to, $subject, $message) {
    // Implementation for email notifications
    // Could use PHP mail() or SMTP
}

/**
 * Check user permissions
 */
function checkPermission($permission) {
    if (!isset($_SESSION['user_permissions'])) {
        return false;
    }
    
    return in_array($permission, $_SESSION['user_permissions']);
}

/**
 * Get dashboard summary
 */
function getDashboardSummary($db, $month, $year) {
    $summary = [
        'production_target' => 0,
        'production_actual' => 0,
        'productive_time' => 0,
        'absenteeism' => 0,
        'inventory_accuracy' => 0,
        'total_kpis' => 0,
        'completed_kpis' => 0
    ];
    
    // Query to get summary data
    $stmt = $db->prepare("
        SELECT 
            SUM(CASE WHEN kd.id = 4 THEN kv.month_value ELSE 0 END) as production_actual,
            SUM(CASE WHEN kd.id = 5 THEN kv.month_value ELSE 0 END) as production_target,
            AVG(CASE WHEN kd.id = 27 THEN kv.actual_value ELSE NULL END) * 100 as productive_time,
            AVG(CASE WHEN kd.id = 68 THEN kv.actual_value ELSE NULL END) * 100 as absenteeism,
            AVG(CASE WHEN kd.id IN (30,31) THEN kv.actual_value ELSE NULL END) * 100 as inventory_accuracy
        FROM kpi_definitions kd
        LEFT JOIN kpi_values kv ON kd.id = kv.kpi_definition_id 
            AND kv.year = :year AND kv.month = :month
    ");
    
    $stmt->execute([':year' => $year, ':month' => $month]);
    $result = $stmt->fetch();
    
    if ($result) {
        $summary = array_merge($summary, $result);
    }
    
    return $summary;
}
?>