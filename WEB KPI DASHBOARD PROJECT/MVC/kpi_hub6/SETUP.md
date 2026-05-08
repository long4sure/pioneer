# SC Operations Hub — XAMPP Setup Guide

## Quick Start (5 minutes)

### 1. Copy project to XAMPP
Copy the entire `kpi_hub/` folder to your XAMPP htdocs directory:
- **Windows:** `C:\xampp\htdocs\kpi_hub\`
- **Mac:**     `/Applications/XAMPP/htdocs/kpi_hub/`
- **Linux:**   `/opt/lampp/htdocs/kpi_hub/`

### 2. Start XAMPP
Open XAMPP Control Panel and start:
- ✅ **Apache**
- ✅ **MySQL**

### 3. Create the database
1. Open your browser and go to: `http://localhost/phpmyadmin`
2. Click **"New"** on the left sidebar
3. Enter database name: `sc_ops_hub`
4. Click **Create**
5. Click the **SQL** tab at the top
6. Open `kpi_hub/api/schema.sql`, copy all contents, paste into the SQL box
7. Click **Go**

### 4. Open the app
Navigate to: **http://localhost/kpi_hub/index.html**

---

## Default Credentials

| Username   | Password         | Role        | Can do |
|------------|------------------|-------------|--------|
| `sysadmin` | `SC@SysAdmin2026!` | System Admin | User management, all modules |
| `user`     | `SC@User2026!`     | User (Admin) | All modules + data entry |
| `viewer`   | `SC@Viewer2026!`   | Viewer       | Read-only access |

⚠️ **Change all passwords immediately after first login.**

---

## File Structure

```
kpi_hub/
├── index.html              ← Main application (open this)
├── api/
│   ├── config.php          ← Database config (edit DB credentials here)
│   ├── schema.sql          ← Run this in phpMyAdmin to create tables
│   ├── auth.php            ← Login / registration / user management API
│   └── data.php            ← KPI data save/load API
├── css/                    ← Stylesheets
└── js/
    ├── core/
    │   ├── api.js          ← HTTP client for PHP API
    │   ├── db.js           ← DB integration bridge
    │   ├── auth.js         ← Local auth + UI (fallback when offline)
    │   ├── navigation.js   ← Module/tab switching
    │   └── utils.js        ← Shared helpers
    ├── modules/            ← One file per module (finance, planning, etc.)
    └── controllers/        ← Cross-module aggregations
```

---

## Database Configuration

Edit `api/config.php` to change connection settings:
```php
define('DB_HOST',  'localhost');
define('DB_PORT',   3306);
define('DB_NAME',  'sc_ops_hub');
define('DB_USER',  'root');       // ← Change for production
define('DB_PASS',  '');           // ← Set your MySQL password
```

---

## Offline Mode

If XAMPP is not running, the app still works using in-memory
storage (data is lost on page refresh). The topbar shows:
- 🟢 **MySQL** — connected to database, data persists
- 🔴 **Offline** — no database, in-memory only

---

## PHP Requirements

- PHP 8.0 or higher (XAMPP 8.x includes this)
- MySQL 5.7 / MariaDB 10.4 or higher
- PDO extension enabled (enabled by default in XAMPP)

---

## Troubleshooting

**"Offline mode" even though XAMPP is running?**
- Check that Apache is started in XAMPP Control Panel
- Make sure the URL is `http://localhost/kpi_hub/index.html` (not `file://`)
- Check `api/config.php` has the correct DB credentials

**phpMyAdmin can't connect to MySQL?**
- Make sure MySQL is started in XAMPP Control Panel
- Default XAMPP MySQL: host=localhost, user=root, password=(blank)

**Blank page or JS errors?**
- Open browser DevTools (F12) → Console tab to see errors
- Make sure all files were copied correctly, especially `api/` folder

**Registration not working in the DB?**
- Check the `schema.sql` was fully executed in phpMyAdmin
- Verify the `users` table exists: run `SHOW TABLES;` in phpMyAdmin

---

## Production Notes

Before deploying to a production server:
1. Change all default passwords
2. Set `DB_PASS` to a strong MySQL password
3. Update `ALLOWED_ORIGINS` in `config.php` to your domain
4. Enable HTTPS
5. Consider adding rate limiting to `api/auth.php`
