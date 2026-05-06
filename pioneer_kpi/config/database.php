<?php
class Database {
    private $host = "localhost";
    private $db_name = "pioneer_scm_kpi";
    private $username = "root";
    private $password = "";
    public $conn;
    private $error = null;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8mb4");
            return $this->conn;
        } catch(PDOException $e) {
            $this->error = "Connection error: " . $e->getMessage();
            error_log($this->error);
            return null;
        }
    }
    
    public function getError() {
        return $this->error;
    }
    
    public function testConnection() {
        if ($this->getConnection()) {
            return "✅ Database connection successful!";
        } else {
            return "❌ Database connection failed: " . $this->error;
        }
    }
    
    public function tableExists($table_name) {
        try {
            $conn = $this->getConnection();
            if (!$conn) return false;
            
            $result = $conn->query("SHOW TABLES LIKE '$table_name'");
            return $result->rowCount() > 0;
        } catch (Exception $e) {
            return false;
        }
    }
}
?>