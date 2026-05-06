<?php
if (!isset($_SESSION['user_id'])) {
    return;
}

$department = $_SESSION['department'] ?? 'guest';
$username = $_SESSION['username'] ?? 'User';
$role = $_SESSION['role'] ?? 'viewer';
$full_name = $_SESSION['full_name'] ?? $username;

$current_path = $_SERVER['REQUEST_URI'];
$base_url = '/pioneer_kpi';

function isActive($path) {
    global $current_path, $base_url;
    return strpos($current_path, $base_url . $path) !== false ? 'active' : '';
}
?>
<!DOCTYPE html>
<html>
<head>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        .navbar {
            background: linear-gradient(135deg, #2c3e50, #34495e);
            padding: 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        
        .nav-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .nav-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .nav-brand {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .nav-brand a {
            color: white;
            font-size: 1.5rem;
            font-weight: bold;
            text-decoration: none;
            letter-spacing: 1px;
        }
        
        .nav-brand span {
            color: #3498db;
            font-size: 0.9rem;
            background: rgba(255,255,255,0.1);
            padding: 3px 8px;
            border-radius: 4px;
        }
        
        .nav-user {
            display: flex;
            align-items: center;
            gap: 15px;
            color: white;
        }
        
        .user-avatar {
            width: 35px;
            height: 35px;
            background: #3498db;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.1rem;
        }
        
        .user-info {
            text-align: right;
        }
        
        .user-name {
            font-weight: 600;
            font-size: 0.95rem;
        }
        
        .user-role {
            font-size: 0.8rem;
            opacity: 0.8;
        }
        
        .nav-menu {
            display: flex;
            list-style: none;
            padding: 10px 0;
            gap: 5px;
            flex-wrap: wrap;
        }
        
        .nav-menu li a {
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            padding: 8px 15px;
            border-radius: 5px;
            display: block;
            font-size: 0.95rem;
            transition: all 0.3s;
            white-space: nowrap;
        }
        
        .nav-menu li a:hover {
            background: rgba(255,255,255,0.1);
            color: white;
        }
        
        .nav-menu li a.active {
            background: #3498db;
            color: white;
        }
        
        .nav-menu li a i {
            margin-right: 5px;
        }
        
        .nav-menu li.logout {
            margin-left: auto;
        }
        
        .nav-menu li.logout a {
            background: #e74c3c;
            color: white;
        }
        
        .nav-menu li.logout a:hover {
            background: #c0392b;
        }
        
        .menu-toggle {
            display: none;
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 5px;
        }
        
        @media (max-width: 768px) {
            .menu-toggle {
                display: block;
            }
            
            .nav-menu {
                display: none;
                flex-direction: column;
                width: 100%;
                padding: 10px 0;
            }
            
            .nav-menu.show {
                display: flex;
            }
            
            .nav-menu li {
                width: 100%;
            }
            
            .nav-menu li a {
                width: 100%;
                text-align: center;
            }
            
            .nav-menu li.logout {
                margin-left: 0;
            }
            
            .nav-top {
                flex-wrap: wrap;
            }
            
            .user-info {
                display: none;
            }
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <div class="nav-top">
                <div class="nav-brand">
                    <a href="<?php echo $base_url; ?>/dashboard.php">PIONEER KPI</a>
                    <span>v2.0</span>
                </div>
                
                <button class="menu-toggle" onclick="toggleMenu()">☰</button>
                
                <div class="nav-user">
                    <div class="user-info">
                        <div class="user-name"><?php echo htmlspecialchars($full_name); ?></div>
                        <div class="user-role"><?php echo ucfirst($department); ?> | <?php echo ucfirst($role); ?></div>
                    </div>
                    <div class="user-avatar">
                        <?php echo strtoupper(substr($full_name, 0, 1)); ?>
                    </div>
                </div>
            </div>
            
            <ul class="nav-menu" id="navMenu">
                <li><a href="<?php echo $base_url; ?>/dashboard.php" class="<?php echo isActive('/dashboard.php'); ?>">
                    <i>🏠</i> Dashboard
                </a></li>
                <li><a href="<?php echo $base_url; ?>/scm_dashboard.php" class="<?php echo isActive('/scm_dashboard.php'); ?>">
                    <i>📊</i> SCM Dashboard
                </a></li>
                <li><a href="<?php echo $base_url; ?>/kpi_tracker.php" class="<?php echo isActive('/kpi_tracker.php'); ?>">
                    <i>📈</i> KPI Tracker
                </a></li>
                
                <?php if ($department == 'production' || $role == 'admin'): ?>
                <li><a href="<?php echo $base_url; ?>/modules/production/add_record.php" class="<?php echo isActive('/modules/production/'); ?>">
                    <i>🏭</i> Production
                </a></li>
                <?php endif; ?>
                
                <?php if ($department == 'warehouse' || $role == 'admin'): ?>
                <li><a href="<?php echo $base_url; ?>/modules/warehouse/add_inventory.php" class="<?php echo isActive('/modules/warehouse/'); ?>">
                    <i>📦</i> Warehouse
                </a></li>
                <?php endif; ?>
                
                <?php if ($role == 'admin'): ?>
                <li><a href="<?php echo $base_url; ?>/admin/users.php" class="<?php echo isActive('/admin/'); ?>">
                    <i>👥</i> Users
                </a></li>
                <?php endif; ?>
        
                <li class="logout"><a href="<?php echo $base_url; ?>/logout.php">
                    <i>🚪</i> Logout
                </a></li>
            </ul>
        </div>
    </nav>
    
    <script>
    function toggleMenu() {
        document.getElementById('navMenu').classList.toggle('show');
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('navMenu');
        const toggle = document.querySelector('.menu-toggle');
        
        if (!menu.contains(event.target) && !toggle.contains(event.target)) {
            menu.classList.remove('show');
        }
    });
    </script>
</body>
</html>