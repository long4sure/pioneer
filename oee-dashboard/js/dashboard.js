// Power BI Style Dashboard - Complete
const Dashboard = {
    config: window.DASHBOARD_CONFIG || {},
    data: {
        lines: [],
        trends: [],
        downtime: []
    },
    filters: {
        period: 7,
        line: '',
        shift: '',
        search: ''
    },

    init: function() {
        this.loadData();
        this.attachEvents();
        this.initCharts();
        
        // Auto refresh every 5 minutes
        setInterval(() => this.refreshData(), 300000);
        
        // Handle window resize for charts
        window.addEventListener('resize', () => {
            if (window.OEECharts) {
                window.OEECharts.resize();
            }
        });
    },

    loadData: function() {
        this.showLoading();
        
        const params = new URLSearchParams({
            period: this.filters.period,
            line: this.filters.line,
            shift: this.filters.shift,
            search: this.filters.search
        });

        fetch(`api/get_data.php?${params.toString()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    this.data = data;
                    this.renderLineCards();
                    this.renderTable();
                    this.updateKPIs();
                    this.updateFilters();
                    
                    if (window.OEECharts) {
                        window.OEECharts.update(data);
                    }
                } else {
                    this.showError(data.message || 'Error loading data');
                }
                this.hideLoading();
            })
            .catch(error => {
                console.error('Error loading data:', error);
                this.showError('Failed to load dashboard data');
                this.hideLoading();
            });
    },

    renderLineCards: function() {
        const container = document.getElementById('lineCards');
        if (!container) return;

        let html = '';
        this.data.lines.forEach(line => {
            const lineClass = line.line_name.toLowerCase().split('/')[0].trim();
            const oeeClass = this.getValueClass(line.oee, this.config.targets?.OEE || 85);
            const rftClass = this.getValueClass(line.rft, this.config.targets?.RFT || 98);

            html += `
                <div class="pbi-line-card" data-line-id="${line.id}">
                    <div class="pbi-line-header ${lineClass}">
                        <i class="fas fa-industry"></i> ${line.line_name}
                    </div>
                    <div class="pbi-line-body">
                        <div class="pbi-line-metric">
                            <span>OEE</span>
                            <span class="${oeeClass}">${line.oee}%</span>
                        </div>
                        <div class="pbi-line-metric">
                            <span>RFT</span>
                            <span class="${rftClass}">${line.rft}%</span>
                        </div>
                        <div class="pbi-line-metric">
                            <span>ELOR</span>
                            <span>${line.elor}%</span>
                        </div>
                        <div class="pbi-line-metric">
                            <span>Availability</span>
                            <span>${line.avail}%</span>
                        </div>
                        <div class="pbi-line-metric">
                            <span>Performance</span>
                            <span>${line.perf}%</span>
                        </div>
                        <div class="pbi-line-metric">
                            <span>Utilization</span>
                            <span>${line.utilization}%</span>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    renderTable: function() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

        let html = '';
        let sumUtil = 0, sumRFT = 0, sumOEE = 0, sumELOR = 0, sumAvail = 0, sumPerf = 0;

        this.data.lines.forEach(line => {
            sumUtil += parseFloat(line.utilization);
            sumRFT += parseFloat(line.rft);
            sumOEE += parseFloat(line.oee);
            sumELOR += parseFloat(line.elor);
            sumAvail += parseFloat(line.avail);
            sumPerf += parseFloat(line.perf);

            html += `
                <tr>
                    <td><strong>${line.line_name}</strong></td>
                    <td>${line.utilization}% ${this.getStatusIcon(line.utilization, 85)}</td>
                    <td>${line.rft}% ${this.getStatusIcon(line.rft, this.config.targets?.RFT || 98)}</td>
                    <td>${line.oee}% ${this.getStatusIcon(line.oee, this.config.targets?.OEE || 85)}</td>
                    <td>${line.elor}% ${this.getStatusIcon(line.elor, this.config.targets?.ELOR || 95)}</td>
                    <td>${line.avail}% ${this.getStatusIcon(line.avail, this.config.targets?.AVAILABILITY || 90)}</td>
                    <td>${line.perf}% ${this.getStatusIcon(line.perf, this.config.targets?.PERFORMANCE || 95)}</td>
                    <td>
                        <span class="pbi-status ${this.getStatusColor(line)}"></span>
                        ${this.getStatusText(line)}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Update averages
        const count = this.data.lines.length;
        if (count > 0) {
            document.getElementById('avgUtil').innerHTML = (sumUtil / count).toFixed(1) + '%';
            document.getElementById('avgRFT').innerHTML = (sumRFT / count).toFixed(1) + '%';
            document.getElementById('avgOEE').innerHTML = (sumOEE / count).toFixed(1) + '%';
            document.getElementById('avgELOR').innerHTML = (sumELOR / count).toFixed(1) + '%';
            document.getElementById('avgAvail').innerHTML = (sumAvail / count).toFixed(1) + '%';
            document.getElementById('avgPer').innerHTML = (sumPerf / count).toFixed(1) + '%';
        }
    },

    updateKPIs: function() {
        let sumOEE = 0, sumAvail = 0, sumPerf = 0, sumRFT = 0;
        
        this.data.lines.forEach(line => {
            sumOEE += parseFloat(line.oee);
            sumAvail += parseFloat(line.avail);
            sumPerf += parseFloat(line.perf);
            sumRFT += parseFloat(line.rft);
        });

        const count = this.data.lines.length;
        if (count > 0) {
            const avgOEE = (sumOEE / count).toFixed(1);
            const avgAvail = (sumAvail / count).toFixed(1);
            const avgPerf = (sumPerf / count).toFixed(1);
            const avgRFT = (sumRFT / count).toFixed(1);

            document.getElementById('kpiOEE').textContent = avgOEE + '%';
            document.getElementById('kpiAvail').textContent = avgAvail + '%';
            document.getElementById('kpiPerf').textContent = avgPerf + '%';
            document.getElementById('kpiRFT').textContent = avgRFT + '%';

            // Update trends
            this.updateTrendIndicators('oee', avgOEE, this.config.targets?.OEE || 85);
            this.updateTrendIndicators('avail', avgAvail, this.config.targets?.AVAILABILITY || 90);
            this.updateTrendIndicators('perf', avgPerf, this.config.targets?.PERFORMANCE || 95);
            this.updateTrendIndicators('rft', avgRFT, this.config.targets?.RFT || 98);
        }
    },

    updateTrendIndicators: function(metric, current, target) {
        const element = document.querySelector(`#kpi${metric.charAt(0).toUpperCase() + metric.slice(1)}Trend`);
        if (!element) return;

        const diff = (current - target).toFixed(1);
        if (diff > 0) {
            element.innerHTML = `<i class="fas fa-arrow-up"></i> +${diff}% vs target`;
            element.className = 'pbi-kpi-trend up';
        } else if (diff < 0) {
            element.innerHTML = `<i class="fas fa-arrow-down"></i> ${diff}% vs target`;
            element.className = 'pbi-kpi-trend down';
        } else {
            element.innerHTML = `<i class="fas fa-minus"></i> 0% vs target`;
            element.className = 'pbi-kpi-trend';
        }
    },

    updateFilters: function() {
        // Update filter dropdowns with unique values from data
        const lines = [...new Set(this.data.lines.map(l => l.line_name))];
        const lineFilter = document.getElementById('lineFilter');
        if (lineFilter) {
            const currentValue = lineFilter.value;
            lineFilter.innerHTML = '<option value="">All Lines</option>' + 
                lines.map(l => `<option value="${l}" ${l === currentValue ? 'selected' : ''}>${l}</option>`).join('');
        }
    },

    getValueClass: function(value, target) {
        value = parseFloat(value);
        if (value >= target) return 'high';
        if (value >= target - 5) return 'medium';
        return 'low';
    },

    getStatusIcon: function(value, target) {
        value = parseFloat(value);
        if (value >= target) {
            return '<i class="fas fa-check-circle" style="color: var(--success); margin-left: 5px;"></i>';
        }
        return '<i class="fas fa-exclamation-triangle" style="color: var(--warning); margin-left: 5px;"></i>';
    },

    getStatusColor: function(line) {
        const metrics = [
            parseFloat(line.oee) >= (this.config.targets?.OEE || 85),
            parseFloat(line.rft) >= (this.config.targets?.RFT || 98),
            parseFloat(line.avail) >= (this.config.targets?.AVAILABILITY || 90),
            parseFloat(line.perf) >= (this.config.targets?.PERFORMANCE || 95)
        ];
        const successCount = metrics.filter(Boolean).length;
        
        if (successCount >= 3) return 'success';
        if (successCount >= 2) return 'warning';
        return 'danger';
    },

    getStatusText: function(line) {
        const metrics = [
            parseFloat(line.oee) >= (this.config.targets?.OEE || 85),
            parseFloat(line.rft) >= (this.config.targets?.RFT || 98),
            parseFloat(line.avail) >= (this.config.targets?.AVAILABILITY || 90),
            parseFloat(line.perf) >= (this.config.targets?.PERFORMANCE || 95)
        ];
        const successCount = metrics.filter(Boolean).length;
        
        if (successCount >= 3) return 'Good';
        if (successCount >= 2) return 'Fair';
        return 'Attention';
    },

    refreshData: function() {
        this.loadData();
    },

    initCharts: function() {
        if (window.OEECharts) {
            window.OEECharts.init(this.data);
        }
    },

    showLoading: function() {
        // Add loading overlay or spinner
        const container = document.querySelector('.pbi-container');
        if (container) {
            const loader = document.createElement('div');
            loader.className = 'pbi-loader';
            loader.id = 'dashboardLoader';
            loader.innerHTML = '<div class="pbi-spinner"></div>';
            container.appendChild(loader);
        }
    },

    hideLoading: function() {
        const loader = document.getElementById('dashboardLoader');
        if (loader) {
            loader.remove();
        }
    },

    showError: function(message) {
        // Show error notification
        const alert = document.createElement('div');
        alert.className = 'pbi-alert error';
        alert.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        const container = document.querySelector('.pbi-container');
        if (container) {
            container.insertBefore(alert, container.firstChild);
            setTimeout(() => alert.remove(), 5000);
        }
    },

    showSuccess: function(message) {
        const alert = document.createElement('div');
        alert.className = 'pbi-alert success';
        alert.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        
        const container = document.querySelector('.pbi-container');
        if (container) {
            container.insertBefore(alert, container.firstChild);
            setTimeout(() => alert.remove(), 3000);
        }
    },

    openModal: function() {
        const modal = document.getElementById('entryModal');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('entryDate').valueAsDate = new Date();
        }
    },

    closeModal: function() {
        const modal = document.getElementById('entryModal');
        if (modal) {
            modal.classList.remove('active');
            document.getElementById('entryForm').reset();
        }
    },

    saveEntry: function() {
        const formData = new FormData(document.getElementById('entryForm'));

        fetch('api/save_entry.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.closeModal();
                this.refreshData();
                this.showSuccess('Entry saved successfully!');
            } else {
                this.showError('Error saving entry: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            this.showError('Failed to save entry');
        });
    },

    exportData: function() {
        let csv = 'Line,UTILIZATION,RFT,OEE,ELOR,AVAIL,PER\n';
        this.data.lines.forEach(line => {
            csv += `${line.line_name},${line.utilization}%,${line.rft}%,${line.oee}%,${line.elor}%,${line.avail}%,${line.perf}%\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `oee-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    },

    applyFilters: function() {
        this.filters.period = document.getElementById('periodSelect')?.value || 7;
        this.filters.line = document.getElementById('lineFilter')?.value || '';
        this.filters.shift = document.getElementById('shiftFilter')?.value || '';
        this.filters.search = document.getElementById('searchInput')?.value || '';
        this.refreshData();
    },

    attachEvents: function() {
        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => this.refreshData());
        
        // Apply date button
        document.getElementById('applyDateBtn')?.addEventListener('click', () => this.applyFilters());
        
        // New entry button
        document.getElementById('newEntryBtn')?.addEventListener('click', () => this.openModal());
        
        // Export button
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportData());
        
        // Form submit
        document.getElementById('entryForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEntry();
        });

        // Filter changes
        document.getElementById('periodSelect')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('lineFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('shiftFilter')?.addEventListener('change', () => this.applyFilters());
        
        // Search input with debounce
        let searchTimeout;
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = e.target.value;
                this.refreshData();
            }, 500);
        });

        // Modal close button
        document.querySelector('.pbi-close')?.addEventListener('click', () => this.closeModal());
        
        // Cancel button in modal
        document.getElementById('cancelBtn')?.addEventListener('click', () => this.closeModal());
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('entryModal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    Dashboard.init();
    window.Dashboard = Dashboard; // Make globally available
});