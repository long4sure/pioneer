<?php
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found</title>
    <link rel="stylesheet" href="/pioneer_kpi/assets/css/style.css">
    <style>
        .error-container {
            text-align: center;
            padding: 4rem 2rem;
            max-width: 600px;
            margin: 4rem auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .error-code {
            font-size: 6rem;
            color: #e74c3c;
            margin: 0;
            line-height: 1;
        }
        .error-message {
            font-size: 1.5rem;
            color: #2c3e50;
            margin: 1rem 0;
        }
        .home-link {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background-color: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 1rem;
        }
        .home-link:hover {
            background-color: #2980b9;
        }
    </style>
</head>
<body>
    <?php if (isset($_SESSION['user_id'])): ?>
        <?php include 'includes/navigation.php'; ?>
    <?php endif; ?>
    
    <div class="error-container">
        <h1 class="error-code">404</h1>
        <p class="error-message">Page Not Found</p>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="/pioneer_kpi/dashboard.php" class="home-link">Go to Dashboard</a>
    </div>
    
    <?php include 'includes/footer.php'; ?>
</body>
</html>