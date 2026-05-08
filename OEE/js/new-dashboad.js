// Static Dashboard - No Chart.js, pure HTML/CSS

const StaticDashboard = {
    lines: [
        { id: 'filling', name: 'Filling', color: '#2563eb', class: 'filling' },
        { id: 'milling', name: 'Milling', color: '#10b981', class: 'milling' },
        { id: 'mixing', name: 'Mixing', color: '#f59e0b', class: 'mixing' },
        { id: 'tinting', name: 'Tinting/Letdown', color: '#8b5cf6', class: 'tinting' }
    ],

    targets: {
        oee: 85,
        rft: 98,
        elor: 95,
        avail: 90,
        per: 95
    },

    lineData: {},

    init: function() {
        this.loadTargets();
        this.generateData();
        this.renderLineCards();
        this.renderBarChart();
        this.renderStatsGrid();
        this.renderTable();
        this.updateAverages();
        this.attachEvents();
    },

    loadTargets: function() {
        const saved = localStorage.getItem('dashboardTargets');
        if (saved) {
            this.targets = JSON.parse(saved);
        }
    },

    generateData: function() {
        // Generate consistent data
        this.lines.forEach(line => {
            this.lineData[line.id] = {
                utilization: (85 + Math.random() * 10).toFixed(1),
                rft: (96 + Math.random() * 3).toFixed(1),
                oee: (80 + Math.random() * 10).toFixed(1),
                elor: (90 + Math.random() * 8).toFixed(1),
                avail: (88 + Math.random() * 8).toFixed(1),
                per: (92 + Math.random() * 6).toFixed(1)
            };
        });
    },

    renderLineCards: function() {
        const grid = document.getElementById('lineGrid');
        if (!grid) return;

        let html = '';
        this.lines.forEach(line => {
            const data = this.lineData[line.id];
            const oeeClass = this.getValueClass(data.oee, this.targets.oee);
            const rftClass = this.getValueClass(data.rft, this.targets.rft);

            html += `
                <div class="line-card">
                    <div class="line-header ${line.class}">
                        <i class="fas fa-industry"></i> ${line.name}
                    </div>
                    <div class="line-metrics">
                        <div class="metric-row">
                            <span class="metric-name">OEE</span>
                            <span class="metric-value ${oeeClass}">${data.oee}%</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-name">RFT</span>
                            <span class="metric-value ${rftClass}">${data.rft}%</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-name">ELOR</span>
                            <span class="metric-value">${data.elor}%</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-name">Availability</span>
                            <span class="metric-value">${data.avail}%</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-name">Performance</span>
                            <span class="metric-value">${data.per}%</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-name">Utilization</span>
                            <span class="metric-value">${data.utilization}%</span>
                        </div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    },

    renderBarChart: function() {
        const container = document.getElementById('barChart');
        if (!container) return;

        const metrics = ['OEE', 'RFT', 'AVAIL'];
        const colors = ['#2563eb', '#10b981', '#f59e0b'];

        let html = '';
        this.lines.forEach(line => {
            const data = this.lineData[line.id];
            
            html += `
                <div class="bar-group">
                    <div class="bars-container">
            `;

            // Add bars for each metric
            [data.oee, data.rft, data.avail].forEach((value, index) => {
                const height = parseFloat(value) * 2; // Scale for display
                html += `
                    <div class="bar-wrapper">
                        <div class="bar-label">${metrics[index]}</div>
                        <div class="bar" style="height: ${height}px; background: ${colors[index]}"></div>
                        <div class="bar-value">${value}%</div>
                    </div>
                `;
            });

            html += `
                    </div>
                    <div class="line-label">${line.name}</div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    renderStatsGrid: function() {
        const grid = document.getElementById('statsGrid');
        if (!grid) return;

        let html = '';
        this.lines.forEach(line => {
            const data = this.lineData[line.id];
            
            html += `
                <div class="stat-card ${line.class}">
                    <h4>${line.name}</h4>
                    <div class="stat-item">
                        <span>OEE</span>
                        <strong>${data.oee}%</strong>
                    </div>
                    <div class="stat-item">
                        <span>RFT</span>
                        <strong>${data.rft}%</strong>
                    </div>
                    <div class="stat-item">
                        <span>ELOR</span>
                        <strong>${data.elor}%</strong>
                    </div>
                    <div class="stat-item">
                        <span>Availability</span>
                        <strong>${data.avail}%</strong>
                    </div>
                    <div class="stat-item">
                        <span>Performance</span>
                        <strong>${data.per}%</strong>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    },

    renderTable: function() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

        let html = '';
        this.lines.forEach(line => {
            const data = this.lineData[line.id];
            
            html += `
                <tr>
                    <td><strong>${line.name}</strong></td>
                    <td>${data.utilization}% ${this.getTargetIcon(data.utilization, 85)}</td>
                    <td>${data.rft}% ${this.getTargetIcon(data.rft, this.targets.rft)}</td>
                    <td>${data.oee}% ${this.getTargetIcon(data.oee, this.targets.oee)}</td>
                    <td>${data.elor}% ${this.getTargetIcon(data.elor, this.targets.elor)}</td>
                    <td>${data.avail}% ${this.getTargetIcon(data.avail, this.targets.avail)}</td>
                    <td>${data.per}% ${this.getTargetIcon(data.per, this.targets.per)}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    },

    updateAverages: function() {
        const metrics = ['utilization', 'rft', 'oee', 'elor', 'avail', 'per'];
        const averages = {};

        metrics.forEach(metric => {
            const sum = this.lines.reduce((acc, line) => {
                return acc + parseFloat(this.lineData[line.id][metric]);
            }, 0);
            averages[metric] = (sum / this.lines.length).toFixed(1);
        });

        // Update footer
        document.getElementById('avgUtil').textContent = averages.utilization + '%';
        document.getElementById('avgRFT').textContent = averages.rft + '%';
        document.getElementById('avgOEE').textContent = averages.oee + '%';
        document.getElementById('avgELOR').textContent = averages.elor + '%';
        document.getElementById('avgAvail').textContent = averages.avail + '%';
        document.getElementById('avgPer').textContent = averages.per + '%';

        // Update KPI cards
        document.getElementById('overallOEE').textContent = averages.oee + '%';
        document.getElementById('overallAvail').textContent = averages.avail + '%';
        document.getElementById('overallPerf').textContent = averages.per + '%';
        document.getElementById('overallRFT').textContent = averages.rft + '%';
    },

    getValueClass: function(value, target) {
        value = parseFloat(value);
        if (value >= target) return 'excellent';
        if (value >= target - 5) return 'good';
        if (value >= target - 10) return 'warning';
        return 'poor';
    },

    getTargetIcon: function(value, target) {
        value = parseFloat(value);
        if (value >= target) {
            return '<i class="fas fa-check-circle check-icon"></i>';
        }
        return '<i class="fas fa-exclamation-triangle warning-icon"></i>';
    },

    exportToCSV: function() {
        let csv = 'Line,UTILIZATION,RFT,OEE,ELOR,AVAIL,PER\n';
        
        this.lines.forEach(line => {
            const data = this.lineData[line.id];
            csv += `${line.name},${data.utilization}%,${data.rft}%,${data.oee}%,${data.elor}%,${data.avail}%,${data.per}%\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'oee-dashboard.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    },

    refreshData: function() {
        this.generateData();
        this.renderLineCards();
        this.renderBarChart();
        this.renderStatsGrid();
        this.renderTable();
        this.updateAverages();
        alert('Dashboard refreshed!');
    },

    attachEvents: function() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCSV();
        });
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    StaticDashboard.init();
});