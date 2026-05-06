<?php
session_start();
require_once '../../config/database.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: ../../login.php");
    exit();
}

$database = new Database();
$db = $database->getConnection();

// Redirect to warehouse module since it handles forecast
header("Location: ../warehouse/add_inventory.php");
exit();
?>