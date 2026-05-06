<?php
require_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();

echo "<h1>Database Structure Check</h1>";

// Check tables
$tables = ['kpi_definitions', 'kpi_records', 'production_lines', 'production_output', 'inventory_accuracy', 'labor_reports'];
foreach ($tables as $table) {
    try {
        $query = "SELECT COUNT(*) as count FROM $table";
        $stmt = $db->query($query);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "<p style='color: green;'>✅ Table '$table' exists with {$result['count']} records</p>";
    } catch (Exception $e) {
        echo "<p style='color: red;'>❌ Table '$table' error: " . $e->getMessage() . "</p>";
    }
}

// Check kpi_definitions columns
echo "<h2>KPI Definitions Columns:</h2>";
try {
    $query = "SHOW COLUMNS FROM kpi_definitions";
    $stmt = $db->query($query);
    echo "<ul>";
    while ($col = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "<li>" . $col['Field'] . " - " . $col['Type'] . "</li>";
    }
    echo "</ul>";
} catch (Exception $e) {
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
}

// Show sample data
echo "<h2>Sample KPI Data:</h2>";
try {
    $query = "SELECT * FROM kpi_definitions LIMIT 5";
    $stmt = $db->query($query);
    echo "<table border='1' cellpadding='5'>";
    echo "<tr>";
    for ($i = 0; $i < $stmt->columnCount(); $i++) {
        $col = $stmt->getColumnMeta($i);
        echo "<th>" . $col['name'] . "</th>";
    }
    echo "</tr>";
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "<tr>";
        foreach ($row as $value) {
            echo "<td>" . htmlspecialchars($value ?? '-') . "</td>";
        }
        echo "</tr>";
    }
    echo "</table>";
} catch (Exception $e) {
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
}
?>