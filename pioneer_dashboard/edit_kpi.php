<?php
session_start();
include 'config.php';

$id = $_GET['id'];
$data = mysqli_fetch_assoc(mysqli_query($conn, "SELECT * FROM kpis WHERE id=$id"));

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $name = $_POST['name'];
    $department = $_POST['department'];
    $target = $_POST['target'];
    $actual = $_POST['actual'];

    mysqli_query($conn,
        "UPDATE kpis SET 
        name='$name',
        department='$department',
        target='$target',
        actual='$actual'
        WHERE id=$id");

    header("Location: index.php");
    exit();
}
?>

<link rel="stylesheet" href="style.css">

<form method="POST">
    <h2>Edit KPI</h2>
    <input type="text" name="name" value="<?= $data['name'] ?>">
    <input type="text" name="department" value="<?= $data['department'] ?>">
    <input type="number" step="0.01" name="target" value="<?= $data['target'] ?>">
    <input type="number" step="0.01" name="actual" value="<?= $data['actual'] ?>">
    <button type="submit">Update</button>
</form>