// Dashboard-specific functionality - COMPLETELY STATIC VERSION

const OEE_DASHBOARD = {
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
    chartsInitialized: false,

    init: function() {
        this.loadTargets();
        this.generateMockData();
        this.renderLineCards();
        this.renderMetricsTable();
        this.updateOverallAverages();
        
        // Only initialize charts once
        if (!this.chartsInitialized) {
            setTimeout(() => {
                this.initCharts();
                this.chartsInitialized = true;
            }, 200);
        }
        
        this.attachEventListeners();
    },

    loadTargets: function() {
        const saved = localStorage.getItem('dashboardTargets');
        if (saved) {
            this.targets = JSON.parse(saved);
        }
        
        const oeeTarget = document.getElementById('oeeTarget');
        const rftTarget = document.getElementById('rftTarget');
        const elorTarget = document.getElementById('elorTarget');
        const availTarget = document.getElementById('availTarget');
        const perfTarget = document.getElementById('perfTarget');
        
        if (oeeTarget) oeeTarget.textContent = this.targets.oee + '%';
        if (rftTarget) rftTarget.textContent = this.targets.rft + '%';
        if (elorTarget) elorTarget.textContent = this.targets.elor + '%';
        if (availTarget) availTarget.textContent = this.targets.avail + '%';
        if (perfTarget) perfTarget.textContent = this.targets.per + '%';
    },

    saveTargets: function() {
        localStorage.setItem('dashboardTargets', JSON.stringify(this.targets));
    },

    generateMockData: function() {
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
        const grid = document.getElementById('linePerformanceGrid');
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

    renderMetricsTable: function() {
        const tbody = document.getElementById('metricsBody');
        if (!tbody) return;
        
        let html = '';

        this.lines.forEach(line => {
            const data = this.lineData[line.id];
            const status = this.calculateOverallStatus(data);
            
            html += `
                <tr>
                    <td><strong>${line.name}</strong></td>
                    <td>${data.utilization}%</td>
                    <td>${data.rft}% ${this.getTargetIcon(data.rft, this.targets.rft)}</td>
                    <td>${data.oee}% ${this.getTargetIcon(data.oee, this.targets.oee)}</td>
                    <td>${data.elor}% ${this.getTargetIcon(data.elor, this.targets.elor)}</td>
                    <td>${data.avail}% ${this.getTargetIcon(data.avail, this.targets.avail)}</td>
                    <td>${data.per}% ${this.getTargetIcon(data.per, this.targets.per)}</td>
                    <td>
                        <span class="target-indicator ${status.color}"></span>
                        ${status.text}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    },

    updateOverallAverages: function() {
        const metrics = ['utilization', 'rft', 'oee', 'elor', 'avail', 'per'];
        const averages = {};

        metrics.forEach(metric => {
            const sum = this.lines.reduce((acc, line) => {
                return acc + parseFloat(this.lineData[line.id][metric]);
            }, 0);
            averages[metric] = (sum / this.lines.length).toFixed(1);
        });

        const avgUtil = document.getElementById('avgUtil');
        const avgRFT = document.getElementById('avgRFT');
        const avgOEE = document.getElementById('avgOEE');
        const avgELOR = document.getElementById('avgELOR');
        const avgAvail = document.getElementById('avgAvail');
        const avgPer = document.getElementById('avgPer');
        
        if (avgUtil) avgUtil.textContent = averages.utilization + '%';
        if (avgRFT) avgRFT.textContent = averages.rft + '%';
        if (avgOEE) avgOEE.textContent = averages.oee + '%';
        if (avgELOR) avgELOR.textContent = averages.elor + '%';
        if (avgAvail) avgAvail.textContent = averages.avail + '%';
        if (avgPer) avgPer.textContent = averages.per + '%';

        const overallOEE = document.getElementById('overallOEE');
        const overallAvail = document.getElementById('overallAvail');
        const overallPerf = document.getElementById('overallPerf');
        const overallRFT = document.getElementById('overallRFT');
        
        if (overallOEE) overallOEE.textContent = averages.oee + '%';
        if (overallAvail) overallAvail.textContent = averages.avail + '%';
        if (overallPerf) overallPerf.textContent = averages.per + '%';
        if (overallRFT) overallRFT.textContent = averages.rft + '%';
    },

    initCharts: function() {
        // First, destroy any existing Chart.js instances
        if (window.oeeChartInstance) {
            window.oeeChartInstance.destroy();
        }
        if (window.radarChartInstance) {
            window.radarChartInstance.destroy();
        }
        
        // Completely remove and recreate canvas elements
        this.recreateCanvas('oeeComparisonChart');
        this.recreateCanvas('radarChart');
        
        // Small delay to ensure DOM is updated
        setTimeout(() => {
            this.createStaticBarChart();
            this.createStaticRadarChart();
        }, 50);
    },

    recreateCanvas: function(id) {
        const oldCanvas = document.getElementById(id);
        if (oldCanvas) {
            const parent = oldCanvas.parentNode;
            const newCanvas = document.createElement('canvas');
            newCanvas.id = id;
            newCanvas.style.width = '100%';
            newCanvas.style.height = '300px';
            parent.replaceChild(newCanvas, oldCanvas);
        }
    },

    createStaticBarChart: function() {
        const canvas = document.getElementById('oeeComparisonChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        const lineNames = this.lines.map(l => l.name);
        const oeeData = this.lines.map(l => parseFloat(this.lineData[l.id].oee));
        const rftData = this.lines.map(l => parseFloat(this.lineData[l.id].rft));
        const availData = this.lines.map(l => parseFloat(this.lineData[l.id].avail));

        // Create chart with animations completely disabled
        window.oeeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: lineNames,
                datasets: [
                    {
                        label: 'OEE',
                        data: oeeData,
                        backgroundColor: '#2563eb',
                        borderRadius: 6,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'RFT',
                        data: rftData,
                        backgroundColor: '#10b981',
                        borderRadius: 6,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'Availability',
                        data: availData,
                        backgroundColor: '#f59e0b',
                        borderRadius: 6,
                        barPercentage: 0.7,
                        categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                transitions: {
                    active: {
                        animation: {
                            duration: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        animation: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        title: {
                            display: true,
                            text: 'Percentage (%)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                hover: {
                    mode: null,
                    animationDuration: 0
                },
                elements: {
                    bar: {
                        borderRadius: 6
                    }
                }
            }
        });
    },

    createStaticRadarChart: function() {
        const canvas = document.getElementById('radarChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        const metrics = ['OEE', 'RFT', 'ELOR', 'AVAIL', 'PER'];
        
        const datasets = this.lines.map(line => ({
            label: line.name,
            data: [
                parseFloat(this.lineData[line.id].oee),
                parseFloat(this.lineData[line.id].rft),
                parseFloat(this.lineData[line.id].elor),
                parseFloat(this.lineData[line.id].avail),
                parseFloat(this.lineData[line.id].per)
            ],
            backgroundColor: this.hexToRGBA(line.color, 0.1),
            borderColor: line.color,
            borderWidth: 2,
            pointBackgroundColor: line.color,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: line.color,
            pointRadius: 3
        }));

        window.radarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: metrics,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                transitions: {
                    active: {
                        animation: {
                            duration: 0
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            callback: function(value) {
                                return value + '%';
                            },
                            showLabelBackdrop: false
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: 12
                            }
                        },
                        angleLines: {
                            display: true
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    },
                    tooltip: {
                        enabled: true,
                        animation: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw + '%';
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        borderWidth: 2
                    },
                    point: {
                        radius: 3,
                        hoverRadius: 3
                    }
                },
                hover: {
                    mode: null,
                    animationDuration: 0
                }
            }
        });
    },

    attachEventListeners: function() {
        document.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.addEventListener('blur', (e) => {
                const id = e.target.id;
                const value = parseFloat(e.target.textContent);
                if (!isNaN(value)) {
                    const targetKey = id.replace('Target', '');
                    this.targets[targetKey] = value;
                    this.saveTargets();
                    this.renderMetricsTable();
                }
            });
        });

        const periodSelect = document.getElementById('periodSelect');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                const startDate = document.getElementById('startDate');
                const endDate = document.getElementById('endDate');
                if (e.target.value === 'custom') {
                    if (startDate) startDate.style.display = 'inline-block';
                    if (endDate) endDate.style.display = 'inline-block';
                } else {
                    if (startDate) startDate.style.display = 'none';
                    if (endDate) endDate.style.display = 'none';
                    this.refreshData();
                }
            });
        }

        const applyDateBtn = document.getElementById('applyDateBtn');
        if (applyDateBtn) {
            applyDateBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }

        const exportBtn = document.getElementById('exportCSV');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportToCSV();
            });
        }

        const printBtn = document.getElementById('printDashboard');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    },

    refreshData: function() {
        this.generateMockData();
        this.renderLineCards();
        this.renderMetricsTable();
        this.updateOverallAverages();
        
        // Reinitialize charts with new data
        this.initCharts();
        
        this.showNotification('Dashboard data refreshed!', 'success');
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
            return '<i class="fas fa-check-circle" style="color: var(--success);"></i>';
        }
        return '<i class="fas fa-exclamation-triangle" style="color: var(--warning);"></i>';
    },

    calculateOverallStatus: function(data) {
        const metricsMet = [
            parseFloat(data.oee) >= this.targets.oee,
            parseFloat(data.rft) >= this.targets.rft,
            parseFloat(data.elor) >= this.targets.elor,
            parseFloat(data.avail) >= this.targets.avail,
            parseFloat(data.per) >= this.targets.per
        ].filter(Boolean).length;

        if (metricsMet >= 4) return { color: 'target-met', text: 'Excellent' };
        if (metricsMet >= 3) return { color: 'target-met', text: 'Good' };
        if (metricsMet >= 2) return { color: 'target-not-met', text: 'Fair' };
        return { color: 'target-not-met', text: 'Needs Improvement' };
    },

    hexToRGBA: function(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

    showNotification: function(message, type) {
        alert(message);
    }
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Make sure we only initialize once
    if (!window.dashboardInitialized) {
        OEE_DASHBOARD.init();
        window.dashboardInitialized = true;
    }
});