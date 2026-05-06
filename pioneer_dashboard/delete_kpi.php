<?php
session_start();
include 'config.php';

$id = $_GET['id'];
mysqli_query($conn, "DELETE FROM kpis WHERE id=$id");

header("Location: index.php");
exit();
?>