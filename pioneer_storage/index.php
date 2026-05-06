<?php
$conn = new mysqli("localhost", "root", "", "Pioneer_KPI_Storage");

// 1. Handle Saving Data
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $month = $_POST['month'];
    $year = 2026;

    foreach ($_POST['actual'] as $name => $actual) {
        $target = $_POST['target'][$name];
        $cat = $_POST['category'][$name];
        
        // This query inserts new data OR updates it if you change your mind later
        $stmt = $conn->prepare("INSERT INTO kpi_records (kpi_name, category, target_value, actual_value, month_name, year_val) 
                                VALUES (?, ?, ?, ?, ?, ?) 
                                ON DUPLICATE KEY UPDATE actual_value = VALUES(actual_value)");
        $stmt->bind_param("ssddsi", $name, $cat, $target, $actual, $month, $year);
        $stmt->execute();
    }
    echo "<div class='alert'>✅ Data for $month Saved to Pioneer_KPI_Storage!</div>";
}

// 2. Define your KPIs (Based on your Pioneer File)
$my_kpis = [
    ["name" => "Conversion Cost (SC only)", "target" => 11.00, "cat" => "SCM", "lower_is_better" => true],
    ["name" => "Volume Produced MT", "target" => 1414.92, "cat" => "Production", "lower_is_better" => false],
    ["name" => "Fill Rate", "target" => 0.99, "cat" => "SCM", "lower_is_better" => false],
    ["name" => "Operational Cost", "target" => 16210987.82, "cat" => "Finance", "lower_is_better" => true]
];
?>

<!DOCTYPE html>
<html>
<head>
    <title>Pioneer Scorecard</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <form method="POST">
        <div class="header">
            <h2>PIONEER SCM KPI DASHBOARD 2026</h2>
            <select name="month">
                <option>November</option>
                <option>December</option>
            </select>
        </div>

        <table>
            <thead>
                <tr>
                    <th>KPI Name</th>
                    <th>Category</th>
                    <th>Target</th>
                    <th>Actual Input</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($my_kpis as $kpi): ?>
                <tr>
                    <td><?php echo $kpi['name']; ?></td>
                    <td><span class="badge"><?php echo $kpi['cat']; ?></span></td>
                    <td><?php echo number_format($kpi['target'], 2); ?></td>
                    <td>
                        <input type="hidden" name="target[<?php echo $kpi['name']; ?>]" value="<?php echo $kpi['target']; ?>">
                        <input type="hidden" name="category[<?php echo $kpi['name']; ?>]" value="<?php echo $kpi['cat']; ?>">
                        <input type="number" step="0.0001" name="actual[<?php echo $kpi['name']; ?>]" placeholder="0.00">
                    </td>
                    <td><div class="status-light"></div></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
        
        <button type="submit" class="save-btn">Upload Monthly Data</button>
    </form>

</body>
</html>