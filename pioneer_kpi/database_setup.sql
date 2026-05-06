-- Create activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Add is_active column to users if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create view for production utilization
CREATE OR REPLACE VIEW vw_production_utilization AS
SELECT 
    line_id,
    month_year,
    (output_kg / (production_days * 24 * 60)) * 100 as utilization
FROM production_output;

-- Create view for KPI summary
CREATE OR REPLACE VIEW vw_kpi_summary AS
SELECT 
    DATE_FORMAT(kr.month_year, '%Y-%m') as month,
    kd.kpi_name,
    kd.uom,
    kd.target_value,
    kr.actual_value,
    (kr.actual_value / kd.target_value * 100) as achievement_percent
FROM kpi_records kr
JOIN kpi_definitions kd ON kr.kpi_id = kd.kpi_id;

-- Update admin password if needed
UPDATE users SET password = MD5('admin123') WHERE username = 'admin';