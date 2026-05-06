<?php
session_start();
include 'config.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] == 'viewer') {
    header("Location: index.php");
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $name = $_POST['name'];
    $department = $_POST['department'];
    $target = $_POST['target'];
    $actual = $_POST['actual'];
    $comparison_type = $_POST['comparison_type'];
    $month = $_POST['month'];
    $year = $_POST['year'];
    $created_by = $_SESSION['user_id'];

    mysqli_query($conn,
        "INSERT INTO kpis 
        (name, department, target, actual, comparison_type, month, year, created_by)
        VALUES 
        ('$name','$department','$target','$actual','$comparison_type','$month','$year','$created_by')"
    );

    header("Location: index.php");
    exit();
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Add KPI</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

<h2>Add KPI</h2>

<form method="POST" class="form-box">

    <input type="text" name="name" placeholder="KPI Name" required>
    <input type="text" name="department" placeholder="Department" required>
    <input type="number" step="0.01" name="target" placeholder="Target" required>
    <input type="number" step="0.01" name="actual" placeholder="Actual" required>

    <label>Performance Logic:</label>
    <select name="comparison_type">
        <option value="higher">Higher is Better</option>
        <option value="lower">Lower is Better</option>
    </select>

    <select name="month">
        <option>JAN</option><option>FEB</option><option>MAR</option>
        <option>APR</option><option>MAY</option><option>JUN</option>
        <option>JUL</option><option>AUG</option><option>SEP</option>
        <option>OCT</option><option>NOV</option><option>DEC</option>
    </select>

    <input type="number" name="year" value="<?= date("Y"); ?>" required>

    <button type="submit">Save KPI</button>

</form>

</body>
</html>