class KPITracker {
    constructor() {
        this.modifiedRows = new Set();
        this.autoSaveTimer = null;
        this.currentMonth = window.currentMonth || 'OCT';
        this.currentYear = window.currentYear || 2026;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadData();
        this.setupAutoSave();
        this.highlightModifiedCells();
    }
    
    setupEventListeners() {
        // Month selector change
        document.getElementById('monthSelector').addEventListener('change', (e) => {
            this.currentMonth = e.target.value;
        });
        
        // Year selector change
        document.getElementById('yearSelector').addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
        });
        
        // Input change listeners
        document.querySelectorAll('.target-input, .month-input, .actual-input').forEach(input => {
            input.addEventListener('change', (e) => this.handleInputChange(e));
            input.addEventListener('input', (e) => this.handleInputInput(e));
        });
        
        // Save button
        document.querySelector('.btn-success').addEventListener('click', () => {
            this.saveAllChanges();
        });
        
        // Export button
        document.querySelector('.btn-secondary').addEventListener('click', () => {
            this.exportToCSV();
        });
        
        // Import button
        document.querySelector('.btn-info').addEventListener('click', () => {
            this.importFromCSV();
        });
    }
    
    loadData() {
        this.showLoading();
        
        fetch(`api/get_kpi_data.php?month=${this.currentMonth}&year=${this.currentYear}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.updateTableData(data.data);
                }
                this.hideLoading();
            })
            .catch(error => {
                console.error('Error loading data:', error);
                this.showError('Failed to load data');
                this.hideLoading();
            });
    }
    
    updateTableData(data) {
        // Update all input fields with new data
        Object.keys(data).forEach(id => {
            const kpi = data[id];
            
            const targetInput = document.querySelector(`.target-input[data-id="${id}"]`);
            const monthInput = document.querySelector(`.month-input[data-id="${id}"]`);
            const actualInput = document.querySelector(`.actual-input[data-id="${id}"]`);
            
            if (targetInput) targetInput.value = kpi.target_value || 0;
            if (monthInput) monthInput.value = kpi.month_value || 0;
            if (actualInput) actualInput.value = kpi.actual_value || 0;
            
            this.updateStatus(id);
        });
        
        this.modifiedRows.clear();
        this.updateModifiedCount();
    }
    
    handleInputChange(event) {
        const input = event.target;
        const id = input.dataset.id;
        const field = input.dataset.field;
        const value = parseFloat(input.value) || 0;
        
        this.modifiedRows.add(id);
        input.classList.add('modified');
        
        this.updateStatus(id);
        this.updateModifiedCount();
        
        // Schedule auto-save
        this.scheduleAutoSave();
    }
    
    handleInputInput(event) {
        // Real-time validation or formatting could go here
    }
    
    updateStatus(id) {
        const targetInput = document.querySelector(`.target-input[data-id="${id}"]`);
        const monthInput = document.querySelector(`.month-input[data-id="${id}"]`);
        const actualInput = document.querySelector(`.actual-input[data-id="${id}"]`);
        const statusCell = document.getElementById(`status-${id}`);
        
        if (!targetInput || !monthInput || !actualInput || !statusCell) return;
        
        const target = parseFloat(targetInput.value) || 0;
        const month = parseFloat(monthInput.value) || 0;
        const actual = parseFloat(actualInput.value) || 0;
        
        // Calculate status based on actual vs target
        let status = 'info';
        let statusText = 'No Data';
        
        if (target > 0) {
            const achievement = (actual / target) * 100;
            
            if (achievement >= 100) {
                status = 'success';
                statusText = 'On Track';
            } else if (achievement >= 80) {
                status = 'warning';
                statusText = 'At Risk';
            } else if (achievement > 0) {
                status = 'danger';
                statusText = 'Behind';
            }
        }
        
        statusCell.innerHTML = `<span class="status-badge ${status}">${statusText}</span>`;
    }
    
    saveRow(id) {
        const targetInput = document.querySelector(`.target-input[data-id="${id}"]`);
        const monthInput = document.querySelector(`.month-input[data-id="${id}"]`);
        const actualInput = document.querySelector(`.actual-input[data-id="${id}"]`);
        
        if (!targetInput || !monthInput || !actualInput) return;
        
        const data = {
            id: id,
            target: parseFloat(targetInput.value) || 0,
            month: parseFloat(monthInput.value) || 0,
            actual: parseFloat(actualInput.value) || 0,
            month_name: this.currentMonth,
            year: this.currentYear
        };
        
        this.showSaving();
        
        fetch('api/save_kpi_data.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                this.modifiedRows.delete(id);
                targetInput.classList.remove('modified');
                monthInput.classList.remove('modified');
                actualInput.classList.remove('modified');
                this.updateModifiedCount();
                this.showSaved();
            } else {
                this.showError('Failed to save');
            }
        })
        .catch(error => {
            console.error('Error saving:', error);
            this.showError('Failed to save');
        });
    }
    
    saveAllChanges() {
        if (this.modifiedRows.size === 0) {
            this.showInfo('No changes to save');
            return;
        }
        
        const promises = [];
        
        this.modifiedRows.forEach(id => {
            const targetInput = document.querySelector(`.target-input[data-id="${id}"]`);
            const monthInput = document.querySelector(`.month-input[data-id="${id}"]`);
            const actualInput = document.querySelector(`.actual-input[data-id="${id}"]`);
            
            if (targetInput && monthInput && actualInput) {
                const data = {
                    id: id,
                    target: parseFloat(targetInput.value) || 0,
                    month: parseFloat(monthInput.value) || 0,
                    actual: parseFloat(actualInput.value) || 0,
                    month_name: this.currentMonth,
                    year: this.currentYear
                };
                
                promises.push(
                    fetch('api/save_kpi_data.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data)
                    }).then(res => res.json())
                );
            }
        });
        
        this.showSaving();
        
        Promise.all(promises)
            .then(results => {
                const allSuccess = results.every(r => r.success);
                if (allSuccess) {
                    this.modifiedRows.clear();
                    document.querySelectorAll('.modified').forEach(el => {
                        el.classList.remove('modified');
                    });
                    this.updateModifiedCount();
                    this.showSaved();
                } else {
                    this.showError('Some saves failed');
                }
            })
            .catch(error => {
                console.error('Error saving:', error);
                this.showError('Failed to save');
            });
    }
    
    resetRow(id) {
        if (confirm('Reset this row to last saved values?')) {
            const targetInput = document.querySelector(`.target-input[data-id="${id}"]`);
            const monthInput = document.querySelector(`.month-input[data-id="${id}"]`);
            const actualInput = document.querySelector(`.actual-input[data-id="${id}"]`);
            
            // Reload from server
            fetch(`api/get_kpi_data.php?month=${this.currentMonth}&year=${this.currentYear}&id=${id}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data[id]) {
                        const kpi = data.data[id];
                        targetInput.value = kpi.target_value || 0;
                        monthInput.value = kpi.month_value || 0;
                        actualInput.value = kpi.actual_value || 0;
                        
                        targetInput.classList.remove('modified');
                        monthInput.classList.remove('modified');
                        actualInput.classList.remove('modified');
                        
                        this.modifiedRows.delete(id);
                        this.updateModifiedCount();
                        this.updateStatus(id);
                    }
                });
        }
    }
    
    showHistory(id) {
        const modal = document.getElementById('historyModal');
        const content = document.getElementById('historyContent');
        
        fetch(`api/get_kpi_history.php?id=${id}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    let html = '<table class="history-table">';
                    html += '<tr><th>Date</th><th>Target</th><th>Month</th><th>Actual</th><th>Change</th></tr>';
                    
                    data.history.forEach(item => {
                        html += '<tr>';
                        html += `<td class="history-date">${item.updated_at}</td>`;
                        html += `<td class="history-value">${item.target_value}</td>`;
                        html += `<td class="history-value">${item.month_value}</td>`;
                        html += `<td class="history-value">${item.actual_value}</td>`;
                        html += `<td class="history-change ${item.change > 0 ? 'positive' : 'negative'}">${item.change > 0 ? '+' : ''}${item.change}%</td>`;
                        html += '</tr>';
                    });
                    
                    html += '</table>';
                    content.innerHTML = html;
                    modal.classList.add('show');
                }
            });
    }
    
    exportToCSV() {
        window.location.href = `api/export_csv.php?month=${this.currentMonth}&year=${this.currentYear}`;
    }
    
    importFromCSV() {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('month', this.currentMonth);
            formData.append('year', this.currentYear);
            
            this.showLoading();
            
            fetch('api/import_csv.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    this.loadData();
                    this.showInfo('Import successful');
                } else {
                    this.showError('Import failed');
                }
                this.hideLoading();
            })
            .catch(error => {
                console.error('Import error:', error);
                this.showError('Import failed');
                this.hideLoading();
            });
        };
        
        input.click();
    }
    
    scheduleAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setTimeout(() => {
            this.saveAllChanges();
        }, 5000);
    }
    
    updateModifiedCount() {
        const count = this.modifiedRows.size;
        document.getElementById('modifiedCount').textContent = `${count} modified`;
    }
    
    showLoading() {
        document.body.style.cursor = 'wait';
    }
    
    hideLoading() {
        document.body.style.cursor = 'default';
    }
    
    showSaving() {
        const status = document.getElementById('saveStatus');
        status.innerHTML = '<span class="status-indicator saving">Saving...</span>';
    }
    
    showSaved() {
        const status = document.getElementById('saveStatus');
        status.innerHTML = '<span class="status-indicator">All changes saved</span>';
        
        const now = new Date();
        document.getElementById('lastSave').textContent = `Last save: ${now.toLocaleTimeString()}`;
    }
    
    showError(message) {
        const status = document.getElementById('saveStatus');
        status.innerHTML = `<span class="status-indicator error">${message}</span>`;
        
        // Auto-hide error after 3 seconds
        setTimeout(() => {
            this.showSaved();
        }, 3000);
    }
    
    showInfo(message) {
        // Could implement toast notification here
        console.log(message);
    }
    
    highlightModifiedCells() {
        // This is handled in input change events
    }
    
    setupAutoSave() {
        // Auto-save is triggered by input changes
    }
}

// Initialize tracker
document.addEventListener('DOMContentLoaded', () => {
    window.tracker = new KPITracker();
});

// Helper functions for HTML events
function loadMonth() {
    const month = document.getElementById('monthSelector').value;
    const year = document.getElementById('yearSelector').value;
    window.location.href = `tracker.php?month=${month}&year=${year}`;
}

function saveAllChanges() {
    window.tracker.saveAllChanges();
}

function exportToCSV() {
    window.tracker.exportToCSV();
}

function importFromCSV() {
    window.tracker.importFromCSV();
}

function saveRow(id) {
    window.tracker.saveRow(id);
}

function resetRow(id) {
    window.tracker.resetRow(id);
}

function showHistory(id) {
    window.tracker.showHistory(id);
}

function toggleCategory(element) {
    const nextRows = element.closest('tr').nextElementSibling;
    let current = element.closest('tr').nextElementSibling;
    
    while (current && !current.classList.contains('category-row')) {
        if (current.style.display === 'none') {
            current.style.display = '';
        } else {
            current.style.display = 'none';
        }
        current = current.nextElementSibling;
    }
    
    element.textContent = element.textContent === '▼' ? '▶' : '▼';
}

function toggleSubcategory(element) {
    const nextRows = element.closest('tr').nextElementSibling;
    let current = element.closest('tr').nextElementSibling;
    const categoryRow = element.closest('tr').previousElementSibling;
    
    while (current && !current.classList.contains('category-row') && !current.classList.contains('subcategory-row')) {
        if (current.style.display === 'none') {
            current.style.display = '';
        } else {
            current.style.display = 'none';
        }
        current = current.nextElementSibling;
    }
    
    element.textContent = element.textContent === '▼' ? '▶' : '▼';
}

function closeModal() {
    document.getElementById('historyModal').classList.remove('show');
}