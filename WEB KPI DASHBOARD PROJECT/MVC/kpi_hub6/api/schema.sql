-- ============================================================
-- SC Operations Hub — MySQL Database Schema
-- File: api/schema.sql
--
-- Setup Instructions:
--   1. Open phpMyAdmin (http://localhost/phpmyadmin)
--   2. Create a new database named "sc_ops_hub"
--   3. Select that database and run this entire SQL script
--   OR use command line:
--      mysql -u root -p < api/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS sc_ops_hub
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sc_ops_hub;

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username     VARCHAR(60)  NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    password     VARCHAR(255) NOT NULL,   -- bcrypt hash
    role         ENUM('superadmin','admin','viewer') NOT NULL DEFAULT 'viewer',
    status       ENUM('active','pending','rejected')  NOT NULL DEFAULT 'pending',
    is_builtin   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Default built-in accounts
-- Passwords are bcrypt hashes — see api/config.php to verify
INSERT INTO users (username, display_name, password, role, status, is_builtin) VALUES
('sysadmin', 'System Admin', '$2y$12$HtD3Z7lV8uQ9RkX2MnJ5Oe8PwY4sA1bC6dE7fG8hI9jK0lM1nO2p', 'superadmin', 'active', 1),
('user',     'User',         '$2y$12$AbC1dE2fG3hI4jK5lM6nO7pQ8rS9tU0vW1xY2zA3bC4dE5fG6hI7j', 'admin',      'active', 1),
('viewer',   'Viewer',       '$2y$12$zY9xW8vU7tS6rQ5pO4nM3lK2jI1hG0fE9dC8bA7ZY6XW5VU4TS3RQ', 'viewer',      'active', 0);
-- Plaintext passwords (for initial setup ONLY — change immediately):
--   sysadmin → SC@SysAdmin2026!
--   user     → SC@User2026!
--   viewer   → SC@Viewer2026!

-- ============================================================
-- KPI DATA — shared period key
-- ============================================================

-- Period dimension (year + month combinations)
CREATE TABLE IF NOT EXISTS periods (
    id     SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    year   SMALLINT UNSIGNED NOT NULL,
    month  TINYINT UNSIGNED  NOT NULL,   -- 1=Jan … 12=Dec
    UNIQUE KEY uq_period (year, month)
) ENGINE=InnoDB;

-- ============================================================
-- FINANCE MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS finance (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id     SMALLINT UNSIGNED NOT NULL,
    prod_actual   DECIMAL(12,3),
    prod_target   DECIMAL(12,3),
    op_actual     DECIMAL(15,2),
    op_budget     DECIMAL(15,2),
    cap_actual    DECIMAL(15,2),
    cap_budget    DECIMAL(15,2),
    other_actual  DECIMAL(15,2),
    other_budget  DECIMAL(15,2),
    labor_dl_reg  DECIMAL(10,2),
    labor_dl_ot   DECIMAL(10,2),
    labor_il_reg  DECIMAL(10,2),
    labor_il_ot   DECIMAL(10,2),
    updated_by    INT UNSIGNED,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_finance_period (period_id),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- SC PLANNING MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS planning (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id     SMALLINT UNSIGNED NOT NULL,
    -- Safety stocks (days)
    fg_core       DECIMAL(8,2),
    fg_m7         DECIMAL(8,2),
    fg_others     DECIMAL(8,2),
    fg_all_in     DECIMAL(8,2),
    rm_core       DECIMAL(8,2),
    rm_m7         DECIMAL(8,2),
    rm_others     DECIMAL(8,2),
    pm_core       DECIMAL(8,2),
    pm_m7         DECIMAL(8,2),
    pm_others     DECIMAL(8,2),
    -- FG Inventory KGS
    fg_kgs_core   DECIMAL(12,2),
    fg_kgs_m7     DECIMAL(12,2),
    fg_kgs_others DECIMAL(12,2),
    fg_kgs_exp    DECIMAL(12,2),
    fg_kgs_days   DECIMAL(8,2),
    -- FG Inventory PHP
    fg_php_core   DECIMAL(15,2),
    fg_php_m7     DECIMAL(15,2),
    fg_php_others DECIMAL(15,2),
    fg_php_exp    DECIMAL(15,2),
    -- RM/PM KGS
    rm_kgs_core   DECIMAL(12,2),
    rm_kgs_m7     DECIMAL(12,2),
    rm_kgs_others DECIMAL(12,2),
    rm_kgs_exp    DECIMAL(12,2),
    rm_kgs_days   DECIMAL(8,2),
    -- RM/PM PHP
    rm_php_core   DECIMAL(15,2),
    rm_php_m7     DECIMAL(15,2),
    rm_php_others DECIMAL(15,2),
    rm_php_exp    DECIMAL(15,2),
    -- Inventory accuracy
    fg_cnt        INT UNSIGNED,
    fg_miss       INT UNSIGNED,
    rm_cnt        INT UNSIGNED,
    rm_miss       INT UNSIGNED,
    -- Forecast accuracy: local PH (%)
    fc_gma        DECIMAL(5,2),
    fc_north      DECIMAL(5,2),
    fc_south      DECIMAL(5,2),
    fc_vis        DECIMAL(5,2),
    fc_mind       DECIMAL(5,2),
    fc_mt         DECIMAL(5,2),
    fc_psbsi      DECIMAL(5,2),
    -- Forecast accuracy: export (%)
    fc_indo       DECIMAL(5,2),
    fc_india      DECIMAL(5,2),
    fc_direct     DECIMAL(5,2),
    -- Forecast accuracy: by product (%)
    p_epoxy       DECIMAL(5,2),
    p_elasto      DECIMAL(5,2),
    p_mighty      DECIMAL(5,2),
    p_pro_epoxy   DECIMAL(5,2),
    p_builders    DECIMAL(5,2),
    p_coating     DECIMAL(5,2),
    p_transport   DECIMAL(5,2),
    p_other       DECIMAL(5,2),
    p_sealant     DECIMAL(5,2),
    p_waterproof  DECIMAL(5,2),
    p_painting    DECIMAL(5,2),
    p_adhesives   DECIMAL(5,2),
    p_mining      DECIMAL(5,2),
    p_others      DECIMAL(5,2),
    updated_by    INT UNSIGNED,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_planning_period (period_id),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- PROCUREMENT MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS procurement (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id     SMALLINT UNSIGNED NOT NULL,
    actual        DECIMAL(15,2),
    target        DECIMAL(15,2),
    updated_by    INT UNSIGNED,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_procurement_period (period_id),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- PRODUCTION — MACHINE UTILIZATION
-- ============================================================

CREATE TABLE IF NOT EXISTS production_util (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id     SMALLINT UNSIGNED NOT NULL,
    line_key      VARCHAR(30) NOT NULL,
    productive    DECIMAL(10,2),
    no_plan       DECIMAL(10,2),
    no_hc         DECIMAL(10,2),
    change_over   DECIMAL(10,2),
    meeting       DECIMAL(10,2),
    sanitation    DECIMAL(10,2),
    startup       DECIMAL(10,2),
    shutdown      DECIMAL(10,2),
    testing       DECIMAL(10,2),
    breaktime     DECIMAL(10,2),
    pm            DECIMAL(10,2),
    force         DECIMAL(10,2),
    elec          DECIMAL(10,2),
    mech          DECIMAL(10,2),
    material      DECIMAL(10,2),
    sorting       DECIMAL(10,2),
    tech          DECIMAL(10,2),
    no_manpower   DECIMAL(10,2),
    udt           DECIMAL(10,2),
    no_ot         DECIMAL(10,2),
    no_bulk       DECIMAL(10,2),
    transfer      DECIMAL(10,2),
    idle          DECIMAL(10,2),
    m_avail       INT,
    m_used        INT,
    days          DECIMAL(6,1),
    updated_by    INT UNSIGNED,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_util_period_line (period_id, line_key),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- PRODUCTION — OUTPUT & WASTE
-- ============================================================

CREATE TABLE IF NOT EXISTS production_waste (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id     SMALLINT UNSIGNED NOT NULL,
    line_key      VARCHAR(30) NOT NULL,
    fg            DECIMAL(12,2),
    rep           DECIMAL(12,2),
    rej           DECIMAL(12,2),
    waste         DECIMAL(12,2),
    updated_by    INT UNSIGNED,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_waste_period_line (period_id, line_key),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- PRODUCTION — SCHEDULING
-- ============================================================

CREATE TABLE IF NOT EXISTS production_sched (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id     SMALLINT UNSIGNED NOT NULL,
    line_key      VARCHAR(30) NOT NULL,
    actual        DECIMAL(12,2),
    planned       DECIMAL(12,2),
    updated_by    INT UNSIGNED,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_sched_period_line (period_id, line_key),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- WAREHOUSE & LOGISTICS
-- ============================================================

CREATE TABLE IF NOT EXISTS warehouse (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id       SMALLINT UNSIGNED NOT NULL,
    -- OTIF
    otif_served     INT UNSIGNED,
    otif_total      INT UNSIGNED,
    -- Volume fill
    vol_del         DECIMAL(15,2),
    vol_ord         DECIMAL(15,2),
    -- Fill rates
    fr_sc_del       DECIMAL(15,2),
    fr_sc_ord       DECIMAL(15,2),
    fr_corp_del     DECIMAL(15,2),
    fr_corp_ord     DECIMAL(15,2),
    fr_core_del     DECIMAL(15,2),
    fr_core_ord     DECIMAL(15,2),
    fr_m7_del       DECIMAL(15,2),
    fr_m7_ord       DECIMAL(15,2),
    -- Warehouse utilization
    wh_rm_tot       INT UNSIGNED,
    wh_rm_used      INT UNSIGNED,
    wh_fg_tot       INT UNSIGNED,
    wh_fg_used      INT UNSIGNED,
    wh_ext_tot      INT UNSIGNED,
    wh_ext_used     INT UNSIGNED,
    -- OTDL days
    otdl_gma        DECIMAL(6,2),
    otdl_north      DECIMAL(6,2),
    otdl_central    DECIMAL(6,2),
    otdl_south      DECIMAL(6,2),
    otdl_vis        DECIMAL(6,2),
    otdl_mind       DECIMAL(6,2),
    otdl_mt         DECIMAL(6,2),
    otdl_pai        DECIMAL(6,2),
    -- Trucks (CBM)
    truck_t10       DECIMAL(10,2),
    truck_auv       DECIMAL(10,2),
    truck_t6        DECIMAL(10,2),
    truck_t4        DECIMAL(10,2),
    truck_c20       DECIMAL(10,2),
    -- Manpower
    mp_reg          INT UNSIGNED,
    mp_agy          INT UNSIGNED,
    mp_res          INT UNSIGNED,
    mp_reg_h        DECIMAL(10,2),
    mp_agy_h        DECIMAL(10,2),
    mp_ot_h         DECIMAL(10,2),
    mp_abs          INT UNSIGNED,
    mp_days         DECIMAL(8,2),
    updated_by      INT UNSIGNED,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_warehouse_period (period_id),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Non-OTIF issues (many per period)
CREATE TABLE IF NOT EXISTS wh_non_otif (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id     SMALLINT UNSIGNED NOT NULL,
    issue_idx     TINYINT UNSIGNED  NOT NULL,
    count         INT UNSIGNED      NOT NULL DEFAULT 0,
    UNIQUE KEY uq_non_otif (period_id, issue_idx),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Stock-out issues (value and weight per period)
CREATE TABLE IF NOT EXISTS wh_stockout (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_id     SMALLINT UNSIGNED NOT NULL,
    issue_idx     TINYINT UNSIGNED  NOT NULL,
    val_php       DECIMAL(15,2)     NOT NULL DEFAULT 0,
    val_kgs       DECIMAL(12,2)     NOT NULL DEFAULT 0,
    UNIQUE KEY uq_stockout (period_id, issue_idx),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED,
    username   VARCHAR(60),
    action     VARCHAR(30)  NOT NULL,
    module     VARCHAR(30),
    period_id  SMALLINT UNSIGNED,
    detail     TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE SET NULL,
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_user    (user_id)
) ENGINE=InnoDB;

-- ============================================================
-- SESSION TOKENS (server-side sessions)
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
    token      CHAR(64)     NOT NULL PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    role       VARCHAR(20)  NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    expires_at DATETIME     NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB;
