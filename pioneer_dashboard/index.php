<?php
session_start();
include 'config.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

$month = $_GET['month'] ?? date("M");
$year = $_GET['year'] ?? date("Y");

/* ===============================
   FETCH KPI DATA
================================ */

$query = mysqli_query($conn,
    "SELECT * FROM kpis WHERE month='$month' AND year='$year'"
);

/* ===============================
   DASHBOARD SUMMARY CALCULATION
================================ */

$kpis = mysqli_query($conn,
    "SELECT * FROM kpis WHERE month='$month' AND year='$year'"
);

$total_kpi = 0;
$good_kpi = 0;

while($row = mysqli_fetch_assoc($kpis)) {

    $total_kpi++;

    if ($row['comparison_type'] == 'higher') {
        if ($row['actual'] >= $row['target']) $good_kpi++;
    } else {
        if ($row['actual'] <= $row['target']) $good_kpi++;
    }
}

$performance = $total_kpi > 0 
    ? round(($good_kpi / $total_kpi) * 100, 1) 
    : 0;

/* ===============================
   PREPARE CHART DATA
================================ */

$chart_query = mysqli_query($conn,
    "SELECT name, target, actual, comparison_type 
     FROM kpis 
     WHERE month='$month' AND year='$year'"
);

$kpi_names = [];
$targets = [];
$actuals = [];
$actual_colors = [];

while($chart = mysqli_fetch_assoc($chart_query)) {

    $kpi_names[] = $chart['name'];
    $targets[] = $chart['target'];
    $actuals[] = $chart['actual'];

    // Determine if KPI is good or bad
    if ($chart['comparison_type'] == 'higher') {
        $is_good = $chart['actual'] >= $chart['target'];
    } else {
        $is_good = $chart['actual'] <= $chart['target'];
    }

    $actual_colors[] = $is_good 
        ? 'rgba(0,180,100,0.8)' 
        : 'rgba(230,57,70,0.8)';
}

?>

<!DOCTYPE html>
<html>
<head>
    <title>Pioneer KPI Dashboard</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="top-bar">
    <div class="logo-section">
        <img src="pioneer_logo.png" class="logo">
        <h1>PIONEER KPI DASHBOARD</h1>
    </div>

    <div class="top-actions">
    <button id="darkToggle" class="dark-btn">🌙</button>
    Welcome, <?= $_SESSION['fullname']; ?> |
    <a href="logout.php">Logout</a>
</div>
</div>

<div class="filter-box">
    <form method="GET">
        <select name="month">
            <?php
            $months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
            foreach($months as $m){
                $selected = ($m == $month) ? "selected" : "";
                echo "<option $selected>$m</option>";
            }
            ?>
        </select>

        <input type="number" name="year" value="<?= $year ?>">
        <button type="submit">Filter</button>
    </form>

    <?php if($_SESSION['role'] != 'viewer'): ?>
        <a class="btn" href="add_kpi.php">+ Add KPI</a>
    <?php endif; ?>
</div>

<!-- ===============================
     DASHBOARD CARDS
================================ -->

<div class="dashboard-cards">

    <div class="card">
        <h3>Total KPIs</h3>
        <h1><?= $total_kpi ?></h1>
    </div>

    <div class="card">
        <h3>Meeting Target</h3>
        <h1><?= $good_kpi ?></h1>
    </div>

    <div class="card">
        <h3>Performance %</h3>
        <h1><?= $performance ?>%</h1>
    </div>

</div>

<!-- ===============================
     CHART SECTION
================================ -->

<div class="chart-container">
    <canvas id="kpiChart"></canvas>
</div>

<!-- ===============================
     KPI TABLE
================================ -->

<table>
    <tr>
        <th>KPI</th>
        <th>Department</th>
        <th>Target</th>
        <th>Actual</th>
        <th>Status</th>
        <?php if($_SESSION['role'] != 'viewer'): ?>
        <th>Action</th>
        <?php endif; ?>
    </tr>

    <?php 
    mysqli_data_seek($query, 0);
    while($row = mysqli_fetch_assoc($query)) {

        if ($row['comparison_type'] == 'higher') {
            $status = ($row['actual'] >= $row['target']) ? "green" : "red";
        } else {
            $status = ($row['actual'] <= $row['target']) ? "green" : "red";
        }
    ?>
    <tr>
        <td><?= $row['name']; ?></td>
        <td><?= $row['department']; ?></td>
        <td><?= $row['target']; ?></td>
        <td><?= $row['actual']; ?></td>
        <td><div class="circle <?= $status ?>"></div></td>

        <?php if($_SESSION['role'] != 'viewer'): ?>
        <td>
            <a href="edit_kpi.php?id=<?= $row['id']; ?>">Edit</a> |
            <a href="delete_kpi.php?id=<?= $row['id']; ?>">Delete</a>
        </td>
        <?php endif; ?>
    </tr>
    <?php } ?>
</table>

<!-- ===============================
     CHART SCRIPT
================================ -->

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<script>
const ctx = document.getElementById('kpiChart').getContext('2d');

new Chart(ctx, {
    type: 'bar',
    data: {
        labels: <?= json_encode($kpi_names); ?>,
        datasets: [
            {
                label: 'Target',
                data: <?= json_encode($targets); ?>,
                backgroundColor: 'rgba(11,110,138,0.6)'
            },
            {
                label: 'Actual',
                data: <?= json_encode($actuals); ?>,
                backgroundColor: <?= json_encode($actual_colors); ?>
            }
        ]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { position: 'top' }
        }
    }
});
</script>

<script>
const toggleBtn = document.getElementById("darkToggle");

// Load saved preference
if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
    toggleBtn.innerText = "☀️";
}

toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("darkMode", "enabled");
        toggleBtn.innerText = "☀️";
    } else {
        localStorage.setItem("darkMode", "disabled");
        toggleBtn.innerText = "🌙";
    }
});
</script>

</body>
</html>