<?php
require_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed. Please check your configuration.");
}

echo "<h1>Pioneer SCM KPI System - Database Setup</h1>";

try {
    // Read and execute SQL file
    $sql = file_get_contents('database_setup.sql');
    
    // Split SQL into individual statements
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    $success = 0;
    $errors = 0;
    
    echo "<h2>Executing SQL statements...</h2>";
    echo "<ul>";
    
    foreach ($statements as $stmt) {
        if (!empty($stmt)) {
            try {
                $db->exec($stmt);
                echo "<li style='color: green;'>✅ Executed successfully</li>";
                $success++;
            } catch (PDOException $e) {
                echo "<li style='color: orange;'>⚠️ " . $e->getMessage() . "</li>";
                $errors++;
            }
        }
    }
    
    echo "</ul>";
    echo "<p><strong>Setup complete!</strong> $success statements executed, $errors errors.</p>";
    
} catch (Exception $e) {
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
}
?>