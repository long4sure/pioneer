<?php
/**
 * Helper Functions for Pioneer KPI System
 */

function formatNumber($number, $decimals = 2) {
    return number_format((float)$number, $decimals);
}

function formatPercent($number, $decimals = 1) {
    return number_format((float)$number, $decimals) . '%';
}

function formatCurrency($amount) {
    return '₱' . number_format((float)$amount, 2);
}

function getStatusClass($actual, $target, $type = 'lower_better') {
    if ($type === 'higher_better') {
        return $actual >= $target ? 'good' : 'bad';
    } else {
        return $actual <= $target ? 'good' : 'bad';
    }
}

function getStatusBadge($actual, $target, $type = 'lower_better') {
    $isGood = ($type === 'higher_better') ? $actual >= $target : $actual <= $target;
    $class = $isGood ? 'status-good' : 'status-bad';
    $text = $isGood ? '✓ On Track' : '✗ Below Target';
    return "<span class='badge $class'>$text</span>";
}

function sanitize($input) {
    return htmlspecialchars(strip_tags(trim($input)));
}

function getMonthOptions($selected = null) {
    $months = [
        '01' => 'January', '02' => 'February', '03' => 'March',
        '04' => 'April', '05' => 'May', '06' => 'June',
        '07' => 'July', '08' => 'August', '09' => 'September',
        '10' => 'October', '11' => 'November', '12' => 'December'
    ];
    
    $html = '';
    foreach ($months as $num => $name) {
        $sel = ($selected == $num) ? 'selected' : '';
        $html .= "<option value='$num' $sel>$name</option>";
    }
    return $html;
}

function getYearOptions($start = 2024, $end = 2027) {
    $html = '';
    for ($y = $start; $y <= $end; $y++) {
        $sel = ($y == date('Y')) ? 'selected' : '';
        $html .= "<option value='$y' $sel>$y</option>";
    }
    return $html;
}

function redirect($url) {
    header("Location: " . BASE_URL . $url);
    exit();
}

function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function requireLogin() {
    if (!isLoggedIn()) {
        redirect('/login.php');
    }
}

function hasRole($role) {
    return isset($_SESSION['role']) && $_SESSION['role'] === $role;
}

function hasDepartment($dept) {
    return isset($_SESSION['department']) && $_SESSION['department'] === $dept;
}

function logActivity($db, $user_id, $action, $details = '') {
    try {
        $query = "INSERT INTO activity_logs (user_id, action, details, ip_address) 
                  VALUES (:user_id, :action, :details, :ip)";
        $stmt = $db->prepare($query);
        $stmt->execute([
            ':user_id' => $user_id,
            ':action' => $action,
            ':details' => $details,
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'
        ]);
    } catch (Exception $e) {
        // Silently fail - logging shouldn't break the app
    }
}
?>