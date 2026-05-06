// Dashboard functionality
class Dashboard {
    constructor() {
        this.kpiData = window.kpiData || {};
        this.currentMonth = window.currentMonth || 'OCT';
        this.currentYear = window.currentYear || 2026;
        this.updateInterval = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadData();
        this.startAutoRefresh();
        this.updateDateTime();
    }
    
    setupEventListeners() {
        // Month selector change
        document.getElementById('monthSelector').addEventListener('change', (e) => {
            this.currentMonth = e.target.value;
            this.loadData();
        });
        
        // Refresh button
        document.querySelector('.btn-success').addEventListener('click', () => {
            this.refreshData();
        });
        
        // Export button
        document.querySelector('.btn-secondary').addEventListener('click', () => {
            this.exportDashboard();
        });
    }
    
    loadData() {
        // Show loading state
        this.showLoading();
        
        // Fetch data from API
        fetch(`api/get_kpi_data.php?month=${this.currentMonth}&year=${this.currentYear}`)
            .then(response => response.json())
            .then(data => {
                this.kpiData = data;
                this.updateAllCards();
                this.updateSummaryCards();
                this.hideLoading();
                this.updateLastUpdated();
            })
            .catch(error => {
                console.error('Error loading data:', error);
                this.showError('Failed to load data');
            });
    }
    
    refreshData() {
        this.loadData();
    }
    
    updateAllCards() {
        // Production Output
        this.updateProductionOutput();
        
        // Productive Time
        this.updateProductiveTime();
        
        // Downtime Breakdown
        this.updateDowntimeBreakdown();
        
        // Attendance
        this.updateAttendance();
        
        // Labor Report
        this.updateLaborReport();
        
        // Inventory
        this.updateInventory();
        
        // Forecast
        this.updateForecast();
        
        // Absenteeism by Line
        this.updateAbsenteeismByLine();
    }
    
    updateProductionOutput() {
        const outputTarget = this.getKPIValue(5, 'month');
        const outputActual = this.getKPIValue(4, 'month');
        const achievement = outputTarget > 0 ? (outputActual / outputTarget * 100) : 0;
        
        document.getElementById('outputTarget').textContent = this.formatNumber(outputTarget, 1);
        document.getElementById('outputActual').textContent = this.formatNumber(outputActual, 1);
        document.getElementById('outputProgress').style.width = `${Math.min(achievement, 100)}%`;
        document.getElementById('outputAchievement').textContent = this.formatNumber(achievement, 1) + '%';
        
        // Summary card
        document.getElementById('summaryProduction').textContent = this.formatNumber(outputActual, 1) + ' MT';
    }
    
    updateProductiveTime() {
        const productiveRate = this.getKPIValue(27) * 100;
        const machineUtil = this.getKPIValue(28) * 100;
        
        document.getElementById('productiveTime').textContent = this.formatNumber(productiveRate, 1) + '%';
        document.getElementById('machineUtil').textContent = this.formatNumber(machineUtil, 1) + '%';
        
        // Summary card
        document.getElementById('summaryProductive').textContent = this.formatNumber(productiveRate, 1) + '%';
    }
    
    updateDowntimeBreakdown() {
        const downtimeItems = [
            { id: 25, label: 'Idle time' },
            { id: 18, label: 'Change Over Time' },
            { id: 21, label: 'Start-up Time' },
            { id: 23, label: 'Breaktime' },
            { id: 20, label: 'Sanitation Time' },
            { id: 19, label: 'Meeting' },
            { id: 24, label: 'Breakdown' },
            { id: 22, label: 'Testing Time' },
            { id: 26, label: 'Preventive Maintenance' }
        ];
        
        const list = document.getElementById('downtimeList');
        list.innerHTML = '';
        
        downtimeItems.forEach(item => {
            const value = this.getKPIValue(item.id) * 100;
            const div = document.createElement('div');
            div.className = 'downtime-item';
            div.innerHTML = `
                <span class="label">${item.label}</span>
                <span class="value">${this.formatNumber(value, 1)}%</span>
            `;
            list.appendChild(div);
        });
    }
    
    updateAttendance() {
        const absenteeism = this.getKPIValue(68) * 100;
        const manpower = Math.round(this.getKPIValue(69) / 12);
        const workingDays = this.getKPIValue(71);
        
        document.getElementById('absenteeism').textContent = this.formatNumber(absenteeism, 1) + '%';
        document.getElementById('manpower').textContent = manpower;
        document.getElementById('workingDays').textContent = workingDays;
        
        // Summary card
        document.getElementById('summaryAttendance').textContent = this.formatNumber(100 - absenteeism, 1) + '%';
    }
    
    updateLaborReport() {
        document.getElementById('directHours').textContent = Math.round(this.getKPIValue(62)) + ' hrs';
        document.getElementById('directOT').textContent = Math.round(this.getKPIValue(63)) + ' hrs';
        document.getElementById('indirectHours').textContent = Math.round(this.getKPIValue(65)) + ' hrs';
        document.getElementById('indirectOT').textContent = Math.round(this.getKPIValue(66)) + ' hrs';
    }
    
    updateInventory() {
        document.getElementById('invFG').textContent = this.formatNumber(this.getKPIValue(30) * 100, 1) + '%';
        document.getElementById('invRMPM').textContent = this.formatNumber(this.getKPIValue(31) * 100, 1) + '%';
        document.getElementById('whFG').textContent = this.formatNumber(this.getKPIValue(32) * 100, 1) + '%';
        document.getElementById('whRMPM').textContent = this.formatNumber(this.getKPIValue(33) * 100, 1) + '%';
        
        // Summary card
        const avgInventory = (this.getKPIValue(30) + this.getKPIValue(31)) / 2 * 100;
        document.getElementById('summaryInventory').textContent = this.formatNumber(avgInventory, 1) + '%';
    }
    
    updateForecast() {
        const forecastType = document.getElementById('forecastType').value;
        const list = document.getElementById('forecastList');
        
        if (forecastType === 'product') {
            this.updateProductForecast(list);
        } else {
            this.updateLocationForecast(list);
        }
    }
    
    updateProductForecast(list) {
        const forecasts = [
            { id: 34, label: 'EPOXY' },
            { id: 35, label: 'ELASTOSEAL' },
            { id: 36, label: 'MIGHTY BOND' },
            { id: 37, label: 'PRO-EPOXY' },
            { id: 38, label: 'BUILDERS BOND' },
            { id: 39, label: 'COATING MARINE' },
            { id: 40, label: 'TRANSPORTATION' },
            { id: 41, label: 'OTHER CONSUMER' },
            { id: 42, label: 'PRO-SEALANT' },
            { id: 43, label: 'PRO-WATERPROOF' },
            { id: 44, label: 'PRO-PAINTING' },
            { id: 45, label: 'PRO-ADHESIVES' },
            { id: 46, label: 'MINING' }
        ];
        
        list.innerHTML = '';
        forecasts.forEach(f => {
            const value = this.getKPIValue(f.id) * 100;
            const div = document.createElement('div');
            div.className = 'forecast-item';
            div.innerHTML = `
                <span class="label">${f.label}</span>
                <span class="value">${this.formatNumber(value, 1)}%</span>
            `;
            list.appendChild(div);
        });
    }
    
    updateLocationForecast(list) {
        const locations = [
            { id: 47, label: 'LOCAL PHILIPPINES' },
            { id: 48, label: 'GMA' },
            { id: 49, label: 'NORTH LUZON' },
            { id: 50, label: 'SOUTH LUZON' },
            { id: 51, label: 'VISAYAS' },
            { id: 52, label: 'MINDANAO' },
            { id: 53, label: 'MODERN TRADE' },
            { id: 54, label: 'PSBSI' },
            { id: 55, label: 'EXPORT' },
            { id: 56, label: 'INDONESIA' },
            { id: 57, label: 'INDIA' }
        ];
        
        list.innerHTML = '';
        locations.forEach(l => {
            const value = this.getKPIValue(l.id) * 100;
            const div = document.createElement('div');
            div.className = 'forecast-item';
            div.innerHTML = `
                <span class="label">${l.label}</span>
                <span class="value">${this.formatNumber(value, 1)}%</span>
            `;
            list.appendChild(div);
        });
    }
    
    updateAbsenteeismByLine() {
        const lines = [
            { id: 72, label: 'L06 - EPOXY' },
            { id: 73, label: 'L04B - ELASTO' },
            { id: 74, label: 'L03 - CYANO' },
            { id: 75, label: 'L01 - COATINGS' },
            { id: 76, label: 'L07 - EPOXY TUBE' },
            { id: 77, label: 'LINE 9 - EPS' },
            { id: 78, label: 'L10 - CONTACT' },
            { id: 79, label: 'L11 - SILICONE' },
            { id: 80, label: 'L12 - SPECIAL' },
            { id: 81, label: 'L13 - SPECIAL' },
            { id: 82, label: 'LINE 14' },
            { id: 83, label: 'L02 - CYNO' },
            { id: 84, label: 'LABELING' }
        ];
        
        const grid = document.getElementById('absGrid');
        grid.innerHTML = '';
        
        lines.forEach(line => {
            const value = this.getKPIValue(line.id) * 100;
            const div = document.createElement('div');
            div.className = 'abs-item';
            div.innerHTML = `
                <div class="abs-line">${line.label}</div>
                <div class="abs-rate">${this.formatNumber(value, 1)}%</div>
            `;
            grid.appendChild(div);
        });
    }
    
    updateSummaryCards() {
        // Update summary cards with additional data
        const productionAchievement = this.getKPIValue(6) * 100;
        const productiveRate = this.getKPIValue(27) * 100;
        
        // Update trends (simplified - in production, compare with previous month)
        this.updateTrends();
    }
    
    updateTrends() {
        // In production, fetch previous month's data and compare
    }
    
    getKPIValue(id, field = 'actual') {
        const kpi = this.kpiData[id];
        if (!kpi) return 0;
        
        if (field === 'month') {
            return parseFloat(kpi.month_value) || 0;
        } else if (field === 'target') {
            return parseFloat(kpi.target_value) || 0;
        } else {
            return parseFloat(kpi.actual_value) || 0;
        }
    }
    
    formatNumber(value, decimals = 0) {
        return Number(value).toFixed(decimals);
    }
    
    showLoading() {
        // Add loading indicators
        document.body.style.cursor = 'wait';
    }
    
    hideLoading() {
        document.body.style.cursor = 'default';
    }
    
    showError(message) {
        // Show error notification
        console.error(message);
        // Implement toast notification here
    }
    
    updateLastUpdated() {
        const now = new Date();
        document.getElementById('lastUpdated').textContent = 
            now.toLocaleString('en-US', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
    }
    
    updateDateTime() {
        const updateClock = () => {
            const now = new Date();
            document.getElementById('currentDate').textContent = 
                now.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
        };
        
        updateClock();
        setInterval(updateClock, 60000); // Update every minute
    }
    
    startAutoRefresh() {
        // Refresh every 5 minutes
        this.updateInterval = setInterval(() => {
            this.refreshData();
        }, 300000);
    }
    
    exportDashboard() {
        // Generate PDF or image of dashboard
        window.open(`api/export_dashboard.php?month=${this.currentMonth}&year=${this.currentYear}`, '_blank');
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});

// Helper functions for HTML events
function loadMonth() {
    const month = document.getElementById('monthSelector').value;
    window.location.href = `index.php?month=${month}`;
}

function refreshDashboard() {
    window.dashboard.refreshData();
}

function exportDashboard() {
    window.dashboard.exportDashboard();
}

function toggleUserMenu() {
    // Implement user menu dropdown
}

function toggleDowntimeDetails() {
    // Toggle detailed downtime view
}

function showDataQuality() {
    // Show data quality metrics
}