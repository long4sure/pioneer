-- Create database
CREATE DATABASE IF NOT EXISTS pioneer_kpi_project;
USE pioneer_kpi_project;

-- Users table
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'viewer') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- KPI Categories table (for scalability)
CREATE TABLE kpi_categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KPI Definitions table
CREATE TABLE kpi_definitions (
    kpi_id INT PRIMARY KEY AUTO_INCREMENT,
    kpi_name VARCHAR(200) NOT NULL,
    kpi_code VARCHAR(50) UNIQUE NOT NULL,
    category_id INT,
    uom VARCHAR(50),
    description TEXT,
    target_type ENUM('lower_is_better', 'higher_is_better', 'exact') DEFAULT 'lower_is_better',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES kpi_categories(category_id)
);

-- KPI Data table (actual entries)
CREATE TABLE kpi_data (
    entry_id INT PRIMARY KEY AUTO_INCREMENT,
    kpi_id INT,
    period_date DATE NOT NULL,
    actual_value DECIMAL(15,2),
    target_value DECIMAL(15,2),
    year_target DECIMAL(15,2),
    notes TEXT,
    entered_by INT,
    entry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kpi_id) REFERENCES kpi_definitions(kpi_id),
    FOREIGN KEY (entered_by) REFERENCES users(user_id)
);

-- Insert default categories
INSERT INTO kpi_categories (category_name, description) VALUES 
('Financials', 'Financial KPIs including costs and revenues'),
('Production', 'Production volume and efficiency metrics'),
('Quality', 'Quality control and assurance metrics');

-- Insert initial KPI (Conversion Cost)
INSERT INTO kpi_definitions (kpi_name, kpi_code, category_id, uom, description, target_type) VALUES
('Conversion Cost (SC only)', 'CONV_SC', 1, 'PHP/KG', 'Conversion Cost for SC only', 'lower_is_better'),
('Conversion Cost (Overall)', 'CONV_OVERALL', 1, 'PHP/KG', 'Overall Conversion Cost', 'lower_is_better'),
('Volume Produced', 'VOL_PROD', 2, 'MT', 'Volume Produced in Metric Tons', 'higher_is_better');

-- Insert sample data
INSERT INTO users (username, email, password, role) VALUES 
('admin', 'admin@pioneer.com', '$2y$10$YourHashedPasswordHere', 'admin'),
('viewer', 'viewer@pioneer.com', '$2y$10$YourHashedPasswordHere', 'viewer');