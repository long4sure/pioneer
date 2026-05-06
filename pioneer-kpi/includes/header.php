<?php
// Check if page title is set, otherwise use default
$pageTitle = $pageTitle ?? 'Pioneer KPI System';
$currentUser = getCurrentUser();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($pageTitle); ?></title>
    <link rel="stylesheet" href="assets/css/main.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="app-wrapper">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <h2>PIONEER</h2>
                <span class="version">2026</span>
            </div>
            
            <nav class="sidebar-nav">
                <a href="index.php" class="nav-item <?php echo basename($_SERVER['PHP_SELF']) == 'index.php' ? 'active' : ''; ?>">
                    <span class="nav-icon">📊</span>
                    Dashboard
                </a>
                <a href="tracker.php" class="nav-item <?php echo basename($_SERVER['PHP_SELF']) == 'tracker.php' ? 'active' : ''; ?>">
                    <span class="nav-icon">📝</span>
                    KPI Tracker
                </a>
                <a href="reports.php" class="nav-item">
                    <span class="nav-icon">📈</span>
                    Reports
                </a>
                <a href="settings.php" class="nav-item">
                    <span class="nav-icon">⚙️</span>
                    Settings
                </a>
            </nav>
            
            <div class="sidebar-footer">
                <?php if ($currentUser): ?>
                <div class="user-info">
                    <div class="user-avatar">
                        <?php echo strtoupper(substr($currentUser['fullname'], 0, 1)); ?>
                    </div>
                    <div class="user-details">
                        <div class="user-name"><?php echo htmlspecialchars($currentUser['fullname']); ?></div>
                        <div class="user-role"><?php echo htmlspecialchars($currentUser['role']); ?></div>
                    </div>
                </div>
                <a href="logout.php" class="logout-btn">Logout</a>
                <?php endif; ?>
            </div>
        </aside>
        
        <main class="main-content">