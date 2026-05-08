// Global variables
let currentMonth = new Date();
let chartInstances = {};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    updateMonthDisplay();
    loadDashboardData();
    initializeCharts();
    setupEventListeners();
});

// Load data from JSON or API
function loadDashboardData() {
    // In production, fetch from API
    // For demo, use sample data
    const sampleData = {
        otifRate: 95.2,
        volumeFillRate: 44.4,
        valueFillRate: 59.9,
        whUtilization: 79.0,
        otdlData: {
            labels: ['GMA', 'North Luzon', 'South Luzon', 'Visayas', 'Mindanao', 'Modern Trade'],
            values: [10.83, 20.67, 16.85, 26.80, 26.54, 8.88]
        },
        failureData: {
            count: [45, 32, 28, 25, 20, 18, 15, 12, 10, 8, 6, 5],
            kgs: [2500, 1800, 1500, 1200, 900, 800, 600, 500, 400, 300, 200, 100],
            php: [500000, 350000, 280000, 220000, 180000, 150000, 120000, 90000, 70000, 50000, 30000, 20000]
        },
        stockOuts: [
            { category: 'Material Constraint', count: 45, kgs: 2500, php: 500000 },
            { category: 'Planning Error', count: 32, kgs: 1800, php: 350000 },
            { category: 'Truck Unavailability', count: 28, kgs: 1500, php: 280000 },
            { category: 'Warehouse Constraint', count: 25, kgs: 1200, php: 220000 },
            { category: 'Production Delay', count: 20, kgs: 900, php: 180000 }
        ]
    };
    
    updateKPIs(sampleData);
    populateStockOutTable(sampleData.stockOuts);
}

// Update KPI values
function updateKPIs(data) {
    document.getElementById('otifRate').textContent = data.otifRate + '%';
    document.getElementById('volumeFillRate').textContent = data.volumeFillRate + '%';
    document.getElementById('valueFillRate').textContent = data.valueFillRate + '%';
    document.getElementById('whUtilization').textContent = data.whUtilization + '%';
}

// Initialize charts
function initializeCharts() {
    createOTDLChart();
    createFailureChart('count');
}

// Create OTDL Chart
function createOTDLChart() {
    const ctx = document.getElementById('otdlChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (chartInstances.otdl) {
        chartInstances.otdl.destroy();
    }
    
    chartInstances.otdl = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['GMA', 'North Luzon', 'South Luzon', 'Visayas', 'Mindanao', 'Modern Trade'],
            datasets: [{
                label: 'OTDL (Days)',
                data: [10.83, 20.67, 16.85, 26.80, 26.54, 8.88],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)'
                ],
                borderWidth: 0,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Create Failure Breakdown Chart
function createFailureChart(type = 'count') {
    const ctx = document.getElementById('failureChart').getContext('2d');
    
    // Sample data
    const labels = [
        'Material Constraint', 'Planning Error', 'Truck Unavailability',
        'Warehouse Constraint', 'Production Delay', 'Custom Issue',
        'Permits', 'Machine Downtime', 'Manpower Constraint',
        'Quality Issue', 'Cancelled Order', 'Demand Shift'
    ];
    
    const data = {
        count: [45, 32, 28, 25, 20, 18, 15, 12, 10, 8, 6, 5],
        kgs: [2500, 1800, 1500, 1200, 900, 800, 600, 500, 400, 300, 200, 100],
        php: [500000, 350000, 280000, 220000, 180000, 150000, 120000, 90000, 70000, 50000, 30000, 20000]
    };
    
    // Destroy existing chart if it exists
    if (chartInstances.failure) {
        chartInstances.failure.destroy();
    }
    
    chartInstances.failure = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.slice(0, 5), // Show top 5 for clarity
            datasets: [{
                data: data[type].slice(0, 5),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            cutout: '60%'
        }
    });
}

// Populate stock out table
function populateStockOutTable(data) {
    const tbody = document.getElementById('stockOutTable');
    let totalCount = 0;
    let totalKgs = 0;
    let totalPhp = 0;
    
    tbody.innerHTML = '';
    
    data.forEach(item => {
        totalCount += item.count;
        totalKgs += item.kgs;
        totalPhp += item.php;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.category}</td>
            <td>${item.count.toLocaleString()}</td>
            <td>${item.kgs.toLocaleString()}</td>
            <td>₱${item.php.toLocaleString()}</td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('totalCount').textContent = totalCount.toLocaleString();
    document.getElementById('totalKgs').textContent = totalKgs.toLocaleString();
    document.getElementById('totalPhp').textContent = '₱' + totalPhp.toLocaleString();
}

// Update failure chart when dropdown changes
function updateFailureChart() {
    const type = document.getElementById('failureType').value;
    createFailureChart(type);
}

// Tab switching
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show selected tab
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
}

// Month navigation
function prevMonth() {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    updateMonthDisplay();
    loadDashboardData();
}

function nextMonth() {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    updateMonthDisplay();
    loadDashboardData();
}

function updateMonthDisplay() {
    const options = { year: 'numeric', month: 'long' };
    document.getElementById('currentMonth').textContent = 
        currentMonth.toLocaleDateString('en-US', options);
}

// Export functions
function exportChart(chartId) {
    const canvas = document.getElementById(chartId);
    const link = document.createElement('a');
    link.download = chartId + '_' + currentMonth.toISOString().slice(0,7) + '.png';
    link.href = canvas.toDataURL();
    link.click();
}

function exportToPDF() {
    alert('PDF export functionality would connect to a PDF generation library');
    // In production, use libraries like jsPDF or connect to backend
}

function exportToExcel() {
    alert('Excel export would generate XLSX file using SheetJS or similar');
    // In production, use libraries like SheetJS (xlsx)
}

function sendEmailReport() {
    alert('Email functionality would connect to email API');
    // In production, connect to backend email service
}

function refreshAllData() {
    // Show loading state
    document.body.style.cursor = 'wait';
    
    // Simulate API call
    setTimeout(() => {
        loadDashboardData();
        initializeCharts();
        document.body.style.cursor = 'default';
        
        // Show success message
        showNotification('Data refreshed successfully!', 'success');
    }, 1000);
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
        z-index: 1000;
    }
    
    .notification.success {
        border-left: 4px solid #10b981;
    }
    
    .notification i {
        color: #10b981;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;

document.head.appendChild(style);

// Setup event listeners
function setupEventListeners() {
    // Auto-refresh every 5 minutes
    setInterval(refreshAllData, 300000);
}