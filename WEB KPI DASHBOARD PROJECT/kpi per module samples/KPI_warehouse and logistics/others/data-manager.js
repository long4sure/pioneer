// Data Manager Module
const DataManager = {
    // Current data state
    currentData: {
        metadata: {
            month: 'October 2024',
            lastUpdated: new Date().toISOString(),
            version: '1.0'
        },
        kpis: {},
        otdl: {},
        warehouse: {},
        failures: [],
        workforce: {}
    },

    // Initialize data manager
    init: function() {
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.updateDataStats();
    },

    // Setup event listeners for input fields
    setupEventListeners: function() {
        // Real-time calculation listeners
        document.getElementById('servedCount')?.addEventListener('input', () => this.calculateOTIF());
        document.getElementById('totalCount')?.addEventListener('input', () => this.calculateOTIF());
        
        document.getElementById('actualDelivered')?.addEventListener('input', () => this.calculateFillRate());
        document.getElementById('actualOrders')?.addEventListener('input', () => this.calculateFillRate());
        
        document.getElementById('rmpmTotal')?.addEventListener('input', () => this.calculateWarehouseUtil());
        document.getElementById('rmpmUsed')?.addEventListener('input', () => this.calculateWarehouseUtil());
        document.getElementById('fgTotal')?.addEventListener('input', () => this.calculateWarehouseUtil());
        document.getElementById('fgUsed')?.addEventListener('input', () => this.calculateWarehouseUtil());
    },

    // KPI Update Methods
    updateOTIF: function(served, total) {
        const rate = (served / total * 100).toFixed(1);
        this.currentData.kpis.otif = {
            served: served,
            total: total,
            rate: parseFloat(rate)
        };
        this.updateDashboard();
        this.showNotification('OTIF data updated', 'success');
    },

    updateFillRate: function(delivered, orders) {
        const rate = (delivered / orders * 100).toFixed(1);
        this.currentData.kpis.volumeFill = {
            delivered: delivered,
            orders: orders,
            rate: parseFloat(rate)
        };
        this.updateDashboard();
        this.showNotification('Fill rate updated', 'success');
    },

    // Stock Out Management
    addStockOut: function(entry) {
        entry.id = Date.now();
        entry.timestamp = new Date().toISOString();
        this.currentData.failures.push(entry);
        this.updateStockOutTable();
        this.updateFailureChart();
        this.saveToLocalStorage();
        this.showNotification('Stock out entry added', 'success');
    },

    updateStockOut: function(id, updatedEntry) {
        const index = this.currentData.failures.findIndex(f => f.id === id);
        if (index !== -1) {
            this.currentData.failures[index] = { ...this.currentData.failures[index], ...updatedEntry };
            this.updateStockOutTable();
            this.saveToLocalStorage();
            this.showNotification('Entry updated', 'success');
        }
    },

    deleteStockOut: function(id) {
        if (confirm('Are you sure you want to delete this entry?')) {
            this.currentData.failures = this.currentData.failures.filter(f => f.id !== id);
            this.updateStockOutTable();
            this.updateFailureChart();
            this.saveToLocalStorage();
            this.showNotification('Entry deleted', 'success');
        }
    },

    // Bulk Operations
    bulkImport: function(data) {
        try {
            if (Array.isArray(data)) {
                data.forEach(item => this.addStockOut(item));
            } else if (data.failures) {
                data.failures.forEach(item => this.addStockOut(item));
            }
            this.showNotification(`Imported ${data.length || data.failures?.length} records`, 'success');
        } catch (error) {
            this.showNotification('Error importing data: ' + error.message, 'error');
        }
    },

    // Data Validation
    validateStockOut: function(entry) {
        const errors = [];
        
        if (!entry.category) errors.push('Category is required');
        if (!entry.count || entry.count < 0) errors.push('Valid count is required');
        if (!entry.kgs || entry.kgs < 0) errors.push('Valid weight is required');
        if (!entry.php || entry.php < 0) errors.push('Valid value is required');
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    // Save/Load from LocalStorage
    saveToLocalStorage: function() {
        this.currentData.metadata.lastUpdated = new Date().toISOString();
        localStorage.setItem('warehouseData', JSON.stringify(this.currentData));
        
        // Save version history
        this.saveVersion();
    },

    loadFromLocalStorage: function() {
        const saved = localStorage.getItem('warehouseData');
        if (saved) {
            this.currentData = JSON.parse(saved);
            this.updateDashboard();
            this.showNotification('Data loaded from browser storage', 'info');
        }
    },

    // Version Control
    saveVersion: function() {
        const versions = this.getVersions();
        const version = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            data: JSON.parse(JSON.stringify(this.currentData))
        };
        
        versions.push(version);
        // Keep only last 10 versions
        if (versions.length > 10) versions.shift();
        
        localStorage.setItem('warehouseVersions', JSON.stringify(versions));
        this.updateVersionSelect();
    },

    getVersions: function() {
        return JSON.parse(localStorage.getItem('warehouseVersions')) || [];
    },

    restoreVersion: function(versionId) {
        const versions = this.getVersions();
        const version = versions.find(v => v.id == versionId);
        if (version) {
            this.currentData = JSON.parse(JSON.stringify(version.data));
            this.updateDashboard();
            this.saveToLocalStorage();
            this.showNotification('Version restored', 'success');
        }
    },

    // Export/Import
    exportToJSON: function() {
        const dataStr = JSON.stringify(this.currentData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `warehouse-data-${this.currentData.metadata.month.replace(' ', '-')}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully', 'success');
    },

    importFromJSON: function(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.currentData = data;
                this.updateDashboard();
                this.saveToLocalStorage();
                this.showNotification('Data imported successfully', 'success');
            } catch (error) {
                this.showNotification('Invalid JSON file', 'error');
            }
        };
        reader.readAsText(file);
    },

    // Dashboard Update
    updateDashboard: function() {
        // Update KPI displays
        if (this.currentData.kpis.otif) {
            document.getElementById('otifRate').textContent = this.currentData.kpis.otif.rate + '%';
        }
        
        if (this.currentData.kpis.volumeFill) {
            document.getElementById('volumeFillRate').textContent = this.currentData.kpis.volumeFill.rate + '%';
        }
        
        // Update charts
        if (typeof updateCharts === 'function') {
            updateCharts();
        }
        
        // Update tables
        this.updateStockOutTable();
        this.updateDataStats();
    },

    updateStockOutTable: function() {
        const tbody = document.getElementById('recentStockOuts');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // Show last 5 entries
        const recent = this.currentData.failures.slice(-5).reverse();
        
        recent.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.category}</td>
                <td>${entry.count}</td>
                <td>${entry.kgs}</td>
                <td>
                    <button onclick="DataManager.deleteStockOut(${entry.id})" class="btn-small btn-danger">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    updateDataStats: function() {
        document.getElementById('totalRecords').textContent = this.currentData.failures.length;
        document.getElementById('lastUpdated').textContent = 
            new Date(this.currentData.metadata.lastUpdated).toLocaleString();
    },

    updateVersionSelect: function() {
        const select = document.getElementById('versionSelect');
        if (!select) return;
        
        const versions = this.getVersions();
        select.innerHTML = '';
        
        versions.reverse().forEach(version => {
            const option = document.createElement('option');
            option.value = version.id;
            option.textContent = new Date(version.timestamp).toLocaleString();
            select.appendChild(option);
        });
    },

    // Calculation Methods
    calculateOTIF: function() {
        const served = parseFloat(document.getElementById('servedCount')?.value) || 0;
        const total = parseFloat(document.getElementById('totalCount')?.value) || 1;
        const rate = (served / total * 100).toFixed(1);
        
        const otifInput = document.getElementById('otifRateInput');
        if (otifInput) otifInput.value = rate;
        
        return rate;
    },

    calculateFillRate: function() {
        const delivered = parseFloat(document.getElementById('actualDelivered')?.value) || 0;
        const orders = parseFloat(document.getElementById('actualOrders')?.value) || 1;
        const rate = (delivered / orders * 100).toFixed(1);
        
        const fillInput = document.getElementById('volumeFillCalc');
        if (fillInput) fillInput.value = rate;
        
        return rate;
    },

    calculateWarehouseUtil: function() {
        // RM/PM
        const rmpmTotal = parseFloat(document.getElementById('rmpmTotal')?.value) || 1;
        const rmpmUsed = parseFloat(document.getElementById('rmpmUsed')?.value) || 0;
        const rmpmUtil = (rmpmUsed / rmpmTotal * 100).toFixed(1);
        
        const rmpmInput = document.getElementById('rmpmUtil');
        if (rmpmInput) rmpmInput.value = rmpmUtil;
        
        // FG
        const fgTotal = parseFloat(document.getElementById('fgTotal')?.value) || 1;
        const fgUsed = parseFloat(document.getElementById('fgUsed')?.value) || 0;
        const fgUtil = (fgUsed / fgTotal * 100).toFixed(1);
        
        const fgInput = document.getElementById('fgUtil');
        if (fgInput) fgInput.value = fgUtil;
        
        return { rmpmUtil, fgUtil };
    },

    // Notification System
    showNotification: function(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                 type === 'error' ? 'exclamation-circle' : 
                                 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    DataManager.init();
});