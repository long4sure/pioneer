<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Validate required fields
        $required = ['date', 'shift', 'line_id', 'product', 'hours', 'units', 'defects', 'ideal_rate'];
        foreach ($required as $field) {
            if (empty($_POST[$field])) {
                throw new Exception("Missing required field: $field");
            }
        }

        // Get or create product
        $product_code = $_POST['product'];
        $product_query = "SELECT id FROM products WHERE product_code = :code";
        $product_stmt = $db->prepare($product_query);
        $product_stmt->execute([':code' => $product_code]);
        $product = $product_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            // Insert new product
            $insert_product = "INSERT INTO products (product_code, product_name, ideal_rate) 
                              VALUES (:code, :name, :rate)";
            $insert_stmt = $db->prepare($insert_product);
            $insert_stmt->execute([
                ':code' => $product_code,
                ':name' => $product_code,
                ':rate' => $_POST['ideal_rate']
            ]);
            $product_id = $db->lastInsertId();
        } else {
            $product_id = $product['id'];
        }

        // Get shift ID
        $shift_query = "SELECT id FROM shifts WHERE shift_name = :shift";
        $shift_stmt = $db->prepare($shift_query);
        $shift_stmt->execute([':shift' => $_POST['shift']]);
        $shift = $shift_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$shift) {
            throw new Exception("Invalid shift: " . $_POST['shift']);
        }

        // Insert production entry
        $insert_query = "INSERT INTO production_entries 
                        (line_id, shift_id, product_id, entry_date, hours_worked, 
                         total_units, defect_units, ideal_rate_used, notes) 
                        VALUES 
                        (:line_id, :shift_id, :product_id, :date, :hours, 
                         :units, :defects, :ideal_rate, :notes)";

        $insert_stmt = $db->prepare($insert_query);
        $insert_stmt->execute([
            ':line_id' => $_POST['line_id'],
            ':shift_id' => $shift['id'],
            ':product_id' => $product_id,
            ':date' => $_POST['date'],
            ':hours' => $_POST['hours'],
            ':units' => $_POST['units'],
            ':defects' => $_POST['defects'],
            ':ideal_rate' => $_POST['ideal_rate'],
            ':notes' => $_POST['notes'] ?? ''
        ]);

        $entry_id = $db->lastInsertId();

        // Insert downtime entries if provided
        if (!empty($_POST['downtime'])) {
            $downtime_items = json_decode($_POST['downtime'], true);
            if (is_array($downtime_items)) {
                $downtime_query = "INSERT INTO downtime_entries 
                                   (production_entry_id, category_id, downtime_minutes, notes) 
                                   VALUES 
                                   (:entry_id, :category_id, :minutes, :notes)";
                $downtime_stmt = $db->prepare($downtime_query);

                foreach ($downtime_items as $item) {
                    // Get category ID
                    $cat_query = "SELECT id FROM downtime_categories WHERE category_code = :code";
                    $cat_stmt = $db->prepare($cat_query);
                    $cat_stmt->execute([':code' => $item['category']]);
                    $category = $cat_stmt->fetch(PDO::FETCH_ASSOC);

                    if ($category) {
                        $downtime_stmt->execute([
                            ':entry_id' => $entry_id,
                            ':category_id' => $category['id'],
                            ':minutes' => $item['minutes'],
                            ':notes' => $item['notes'] ?? ''
                        ]);
                    }
                }
            }
        }

        echo json_encode([
            'success' => true,
            'message' => 'Entry saved successfully',
            'entry_id' => $entry_id
        ]);

    } catch (Exception $e) {
        error_log("Save Error: " . $e->getMessage());
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