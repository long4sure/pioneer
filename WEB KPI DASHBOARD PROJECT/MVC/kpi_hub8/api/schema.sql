-- =============================================================
-- api/schema.sql  –  SC Operations Hub database schema
-- =============================================================
-- Run this once in phpMyAdmin → SQL tab, or:
--   mysql -u root sc_kpi < api/schema.sql
-- =============================================================

CREATE DATABASE IF NOT EXISTS sc_kpi
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sc_kpi;

-- -------------------------------------------------------------
-- Users & Auth
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sc_users (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username     VARCHAR(60)  NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    password     VARCHAR(255) NOT NULL,          -- bcrypt hash
    role         ENUM('superadmin','admin','viewer') NOT NULL DEFAULT 'viewer',
    status       ENUM('active','pending','rejected') NOT NULL DEFAULT 'pending',
    is_builtin   TINYINT(1) NOT NULL DEFAULT 0,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Default accounts (passwords hashed with bcrypt cost 12)
-- sysadmin → SC@SysAdmin2026!
-- user     → SC@User2026!
-- viewer   → SC@Viewer2026!
INSERT IGNORE INTO sc_users (username, display_name, password, role, status, is_builtin) VALUES
('sysadmin','System Admin','$2y$12$u7XgaZ1xG6oNqT3JmW5.OOyiWlk0oNZb2p4kNMKlCzHAEWBpSJl1y','superadmin','active',1),
('user',    'User',        '$2y$12$vQj9zT2aK5pMnL8xO3e.OeVNjGh4IpAQU7mWfXrBdZcEHSKuRMv2a','admin',     'active',1),
('viewer',  'Viewer',      '$2y$12$wRk0aU3bL6qNoM9yP4f.Of3OkHi5JqBRV8nXgYsceAdFITLvSNw3b','viewer',    'active',0);

CREATE TABLE IF NOT EXISTS sc_sessions (
    token      CHAR(64) NOT NULL PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    role       VARCHAR(20)  NOT NULL,
    ip         VARCHAR(45),
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sc_users(id) ON DELETE CASCADE,
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Period dimension  (year + month key shared by all modules)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sc_periods (
    id    SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    year  SMALLINT UNSIGNED NOT NULL,
    month TINYINT UNSIGNED  NOT NULL,   -- 1=Jan … 12=Dec
    UNIQUE KEY uq_ym (year, month)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Finance
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sc_finance (
    period_id     SMALLINT UNSIGNED NOT NULL PRIMARY KEY,
    prod_actual   DECIMAL(12,3),
    prod_target   DECIMAL(12,3),
    op_actual     DECIMAL(15,2),
    op_budget     DECIMAL(15,2),
    cap_actual    DECIMAL(15,2),
    cap_budget    DECIMAL(15,2),
    other_actual  DECIMAL(15,2),
    other_budget  DECIMAL(15,2),
    dl_reg        DECIMAL(10,2),
    dl_ot         DECIMAL(10,2),
    il_reg        DECIMAL(10,2),
    il_ot         DECIMAL(10,2),
    saved_by      INT UNSIGNED,
    saved_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES sc_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_by)  REFERENCES sc_users(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- SC Planning  (one row per period, all fields flat)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sc_planning (
    period_id      SMALLINT UNSIGNED NOT NULL PRIMARY KEY,
    -- Safety stocks (days)
    fg_core        DECIMAL(8,2), fg_m7         DECIMAL(8,2), fg_others  DECIMAL(8,2), fg_all_in  DECIMAL(8,2),
    rm_core        DECIMAL(8,2), rm_m7         DECIMAL(8,2), rm_others  DECIMAL(8,2),
    pm_core        DECIMAL(8,2), pm_m7         DECIMAL(8,2), pm_others  DECIMAL(8,2),
    -- FG KGS
    fg_kgs_core    DECIMAL(12,2), fg_kgs_m7    DECIMAL(12,2), fg_kgs_others DECIMAL(12,2),
    fg_kgs_exp     DECIMAL(12,2), fg_kgs_days  DECIMAL(8,2),
    -- FG PHP
    fg_php_core    DECIMAL(15,2), fg_php_m7    DECIMAL(15,2), fg_php_others DECIMAL(15,2),
    fg_php_exp     DECIMAL(15,2),
    -- RM KGS
    rm_kgs_core    DECIMAL(12,2), rm_kgs_m7    DECIMAL(12,2), rm_kgs_others DECIMAL(12,2),
    rm_kgs_exp     DECIMAL(12,2), rm_kgs_days  DECIMAL(8,2),
    -- RM PHP
    rm_php_core    DECIMAL(15,2), rm_php_m7    DECIMAL(15,2), rm_php_others DECIMAL(15,2),
    rm_php_exp     DECIMAL(15,2),
    -- Inventory accuracy
    fg_cnt         INT UNSIGNED, fg_miss  INT UNSIGNED,
    rm_cnt         INT UNSIGNED, rm_miss  INT UNSIGNED,
    -- Forecast – local PH
    fc_gma    DECIMAL(5,2), fc_north  DECIMAL(5,2), fc_south DECIMAL(5,2),
    fc_vis    DECIMAL(5,2), fc_mind   DECIMAL(5,2), fc_mt    DECIMAL(5,2), fc_psbsi DECIMAL(5,2),
    -- Forecast – export
    fc_indo   DECIMAL(5,2), fc_india  DECIMAL(5,2), fc_direct DECIMAL(5,2),
    -- Forecast – product
    p_epoxy      DECIMAL(5,2), p_elasto    DECIMAL(5,2), p_mighty   DECIMAL(5,2),
    p_pro_epoxy  DECIMAL(5,2), p_builders  DECIMAL(5,2), p_coating  DECIMAL(5,2),
    p_transport  DECIMAL(5,2), p_other     DECIMAL(5,2), p_sealant  DECIMAL(5,2),
    p_waterproof DECIMAL(5,2), p_painting  DECIMAL(5,2), p_adhesives DECIMAL(5,2),
    p_mining     DECIMAL(5,2), p_others    DECIMAL(5,2),
    saved_by   INT UNSIGNED,
    saved_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES sc_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_by)  REFERENCES sc_users(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Procurement
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sc_procurement (
    period_id  SMALLINT UNSIGNED NOT NULL PRIMARY KEY,
    actual     DECIMAL(15,2),
    target     DECIMAL(15,2),
    saved_by   INT UNSIGNED,
    saved_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES sc_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_by)  REFERENCES sc_users(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Production – Machine Utilization  (one row per period+line)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sc_prod_util (
    period_id   SMALLINT UNSIGNED NOT NULL,
    line_key    VARCHAR(30)       NOT NULL,
    productive  DECIMAL(10,2), no_plan   DECIMAL(10,2), no_hc      DECIMAL(10,2),
    change_over DECIMAL(10,2), meeting   DECIMAL(10,2), sanitation DECIMAL(10,2),
    startup     DECIMAL(10,2), shutdown  DECIMAL(10,2), testing    DECIMAL(10,2),
    breaktime   DECIMAL(10,2), pm        DECIMAL(10,2), force      DECIMAL(10,2),
    elec        DECIMAL(10,2), mech      DECIMAL(10,2), material   DECIMAL(10,2),
    sorting     DECIMAL(10,2), tech      DECIMAL(10,2), no_manpower DECIMAL(10,2),
    udt         DECIMAL(10,2), no_ot     DECIMAL(10,2), no_bulk    DECIMAL(10,2),
    transfer    DECIMAL(10,2), idle      DECIMAL(10,2),
    m_avail     SMALLINT, m_used SMALLINT, days DECIMAL(5,1),
    saved_by    INT UNSIGNED,
    saved_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (period_id, line_key),
    FOREIGN KEY (period_id) REFERENCES sc_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_by)  REFERENCES sc_users(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Production – Output & Waste
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sc_prod_waste (
    period_id SMALLINT UNSIGNED NOT NULL,
    line_key  VARCHAR(30)       NOT NULL,
    fg        DECIMAL(12,2), rep   DECIMAL(12,2),
    rej       DECIMAL(12,2), waste DECIMAL(12,2),
    saved_by  INT UNSIGNED,
    saved_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (period_id, line_key),
    FOREIGN KEY (period_id) REFERENCES sc_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_by)  REFERENCES sc_users(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Production – Scheduling
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sc_prod_sched (
    period_id SMALLINT UNSIGNED NOT NULL,
    line_key  VARCHAR(30)       NOT NULL,
    actual    DECIMAL(12,2),
    planned   DECIMAL(12,2),
    saved_by  INT UNSIGNED,
    saved_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (period_id, line_key),
    FOREIGN KEY (period_id) REFERENCES sc_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_by)  REFERENCES sc_users(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Warehouse & Logistics
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sc_warehouse (
    period_id    SMALLINT UNSIGNED NOT NULL PRIMARY KEY,
    otif_served  INT UNSIGNED, otif_total   INT UNSIGNED,
    vol_del      DECIMAL(15,2), vol_ord     DECIMAL(15,2),
    fr_sc_del    DECIMAL(15,2), fr_sc_ord   DECIMAL(15,2),
    fr_corp_del  DECIMAL(15,2), fr_corp_ord DECIMAL(15,2),
    fr_core_del  DECIMAL(15,2), fr_core_ord DECIMAL(15,2),
    fr_m7_del    DECIMAL(15,2), fr_m7_ord   DECIMAL(15,2),
    wh_rm_tot    INT UNSIGNED, wh_rm_used  INT UNSIGNED,
    wh_fg_tot    INT UNSIGNED, wh_fg_used  INT UNSIGNED,
    wh_ext_tot   INT UNSIGNED, wh_ext_used INT UNSIGNED,
    otdl_gma     DECIMAL(6,2), otdl_north  DECIMAL(6,2), otdl_central DECIMAL(6,2),
    otdl_south   DECIMAL(6,2), otdl_vis    DECIMAL(6,2), otdl_mind    DECIMAL(6,2),
    otdl_mt      DECIMAL(6,2), otdl_pai    DECIMAL(6,2),
    truck_t10    DECIMAL(10,2), truck_auv  DECIMAL(10,2), truck_t6  DECIMAL(10,2),
    truck_t4     DECIMAL(10,2), truck_c20  DECIMAL(10,2),
    mp_reg       INT UNSIGNED, mp_agy     INT UNSIGNED, mp_res   INT UNSIGNED,
    mp_reg_h     DECIMAL(10,2), mp_agy_h  DECIMAL(10,2), mp_ot_h  DECIMAL(10,2),
    mp_abs       INT UNSIGNED, mp_days    DECIMAL(8,2),
    saved_by     INT UNSIGNED,
    saved_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (period_id) REFERENCES sc_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (saved_by)  REFERENCES sc_users(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sc_wh_non_otif (
    period_id  SMALLINT UNSIGNED NOT NULL,
    issue_idx  TINYINT  UNSIGNED NOT NULL,
    cnt        INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (period_id, issue_idx),
    FOREIGN KEY (period_id) REFERENCES sc_periods(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sc_wh_stockout (
    period_id  SMALLINT UNSIGNED NOT NULL,
    issue_idx  TINYINT  UNSIGNED NOT NULL,
    val_php    DECIMAL(15,2) NOT NULL DEFAULT 0,
    val_kgs    DECIMAL(12,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (period_id, issue_idx),
    FOREIGN KEY (period_id) REFERENCES sc_periods(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- Audit log
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sc_audit (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED,
    username   VARCHAR(60),
    action     VARCHAR(30) NOT NULL,
    module     VARCHAR(30),
    period_id  SMALLINT UNSIGNED,
    detail     TEXT,
    ip         VARCHAR(45),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES sc_users(id)   ON DELETE SET NULL,
    FOREIGN KEY (period_id) REFERENCES sc_periods(id) ON DELETE SET NULL,
    INDEX idx_created (created_at),
    INDEX idx_user    (user_id)
) ENGINE=InnoDB;
