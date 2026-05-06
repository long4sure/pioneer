<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE');

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    try {
        $entry_id = $_GET['id'] ?? null;
        
        if (!$entry_id) {
            throw new Exception('Entry ID required');
        }

        // Delete downtime entries first (cascade should handle this, but explicit for safety)
        $delete_downtime = "DELETE FROM downtime_entries WHERE production_entry_id = :id";
        $downtime_stmt = $db->prepare($delete_downtime);
        $downtime_stmt->execute([':id' => $entry_id]);

        // Delete production entry
        $delete_entry = "DELETE FROM production_entries WHERE id = :id";
        $entry_stmt = $db->prepare($delete_entry);
        $entry_stmt->execute([':id' => $entry_id]);

        echo json_encode([
            'success' => true,
            'message' => 'Entry deleted successfully'
        ]);

    } catch (Exception $e) {
        error_log("Delete Error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]);
}
?>