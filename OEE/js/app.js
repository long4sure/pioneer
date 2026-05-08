// Main Application Logic

document.addEventListener('DOMContentLoaded', function() {
    // Initialize data if needed
    if (!localStorage.getItem('oeeEntries')) {
        localStorage.setItem('oeeEntries', JSON.stringify(OEEApp.sampleEntries));
    }

    // DOM Elements
    const entriesTableBody = document.getElementById('tableBody');
    const newEntryBtn = document.getElementById('newEntryBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const entryModal = document.getElementById('entryModal');
    const entryForm = document.getElementById('entryForm');
    const addDowntimeBtn = document.getElementById('addDowntimeBtn');
    const downtimeEntries = document.getElementById('downtimeEntries');
    const cancelBtn = document.getElementById('cancelBtn');
    const searchInput = document.getElementById('searchInput');
    const machineFilter = document.getElementById('machineFilter');
    const shiftFilter = document.getElementById('shiftFilter');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // State
    let currentEntries = [...OEEApp.getEntries()];
    let editingId = null;
    let downtimeCounter = 0;

    // Initialize
    renderTable();
    updateKPIs();
    updateFilters();
    renderDowntimeCategories();
    updateSummaryStats();
    OEECharts.refreshCharts();

    // Event Listeners
    newEntryBtn.addEventListener('click', () => openModal());
    refreshBtn.addEventListener('click', () => {
        currentEntries = OEEApp.getEntries();
        renderTable();
        updateKPIs();
        OEECharts.refreshCharts();
        updateSummaryStats();
    });

    cancelBtn.addEventListener('click', () => closeModal());
    
    document.querySelector('.close').addEventListener('click', () => closeModal());

    addDowntimeBtn.addEventListener('click', () => addDowntimeRow());

    entryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEntry();
    });

    searchInput.addEventListener('input', filterEntries);
    machineFilter.addEventListener('change', filterEntries);
    shiftFilter.addEventListener('change', filterEntries);

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            document.getElementById(`${btn.dataset.tab}Tab`).classList.add('active');
        });
    });

    // Functions
    function renderTable() {
        if (!entriesTableBody) return;
        
        let html = '';
        currentEntries.forEach(entry => {
            const oee = OEEApp.calculateOEE(entry);
            
            html += `
                <tr>
                    <td>${formatDate(entry.date)}</td>
                    <td>${entry.shift}</td>
                    <td>${entry.machine}</td>
                    <td>${entry.product}</td>
                    <td>${entry.hours}</td>
                    <td>${entry.units.toLocaleString()}</td>
                    <td>${entry.defects}</td>
                    <td>${entry.idealRate}</td>
                    <td>${oee.availability.toFixed(1)}%</td>
                    <td>${oee.performance.toFixed(1)}%</td>
                    <td>${oee.quality.toFixed(1)}%</td>
                    <td>
                        <button class="action-btn edit" onclick="editEntry(${entry.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteEntry(${entry.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        entriesTableBody.innerHTML = html;
    }

    function updateKPIs() {
        const entries = OEEApp.getEntries();
        if (entries.length === 0) return;
        
        let totalAvail = 0, totalOper = 0, totalUnits = 0, totalDefects = 0, totalIdeal = 0;
        
        entries.forEach(entry => {
            const oee = OEEApp.calculateOEE(entry);
            totalAvail += entry.hours * 60;
            totalOper += oee.operatingTime;
            totalUnits += entry.units;
            totalDefects += entry.defects;
            totalIdeal += oee.operatingTime * entry.idealRate;
        });
        
        const availability = totalAvail > 0 ? (totalOper / totalAvail) * 100 : 0;
        const performance = totalIdeal > 0 ? (totalUnits / totalIdeal) * 100 : 0;
        const quality = totalUnits > 0 ? ((totalUnits - totalDefects) / totalUnits) * 100 : 0;
        const oee = (availability * performance * quality) / 10000;
        
        document.getElementById('availabilityKPI').textContent = availability.toFixed(1) + '%';
        document.getElementById('performanceKPI').textContent = performance.toFixed(1) + '%';
        document.getElementById('qualityKPI').textContent = quality.toFixed(1) + '%';
        document.getElementById('oeeKPI').textContent = oee.toFixed(1) + '%';
    }

    function updateFilters() {
        const entries = OEEApp.getEntries();
        const machines = [...new Set(entries.map(e => e.machine))];
        const shifts = [...new Set(entries.map(e => e.shift))];
        
        machineFilter.innerHTML = '<option value="">All Machines</option>' + 
            machines.map(m => `<option value="${m}">${m}</option>`).join('');
        
        shiftFilter.innerHTML = '<option value="">All Shifts</option>' + 
            shifts.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    function filterEntries() {
        const searchTerm = searchInput.value.toLowerCase();
        const machine = machineFilter.value;
        const shift = shiftFilter.value;
        
        currentEntries = OEEApp.getEntries().filter(entry => {
            const matchesSearch = 
                entry.product.toLowerCase().includes(searchTerm) ||
                entry.machine.toLowerCase().includes(searchTerm);
            const matchesMachine = !machine || entry.machine === machine;
            const matchesShift = !shift || entry.shift === shift;
            
            return matchesSearch && matchesMachine && matchesShift;
        });
        
        renderTable();
    }

    function openModal(entryId = null) {
        entryModal.style.display = 'block';
        
        if (entryId) {
            // Edit mode
            const entry = OEEApp.getEntries().find(e => e.id === entryId);
            if (entry) {
                editingId = entryId;
                document.getElementById('entryDate').value = entry.date;
                document.getElementById('entryShift').value = entry.shift;
                document.getElementById('entryMachine').value = entry.machine;
                document.getElementById('entryProduct').value = entry.product;
                document.getElementById('entryHours').value = entry.hours;
                document.getElementById('entryUnits').value = entry.units;
                document.getElementById('entryDefects').value = entry.defects;
                document.getElementById('entryIdealRate').value = entry.idealRate;
                
                // Clear and add downtime rows
                downtimeEntries.innerHTML = '';
                entry.downtime.forEach(d => {
                    addDowntimeRow(d.category, d.minutes);
                });
            }
        } else {
            // New entry mode
            editingId = null;
            entryForm.reset();
            downtimeEntries.innerHTML = '';
            addDowntimeRow(); // Add one empty row
        }
    }

    function closeModal() {
        entryModal.style.display = 'none';
        entryForm.reset();
        downtimeEntries.innerHTML = '';
        editingId = null;
    }

    function addDowntimeRow(category = '', minutes = '') {
        const rowId = `downtime_${downtimeCounter++}`;
        const allCategories = [
            ...OEEApp.downtimeCategories.planned,
            ...OEEApp.downtimeCategories.uncontrollable,
            ...OEEApp.downtimeCategories.breakdowns
        ];
        
        const options = allCategories.map(c => 
            `<option value="${c.code}" ${category === c.code ? 'selected' : ''}>${c.code} - ${c.name}</option>`
        ).join('');
        
        const html = `
            <div class="downtime-item" id="${rowId}">
                <select class="downtime-category" required>
                    <option value="">Select Category</option>
                    ${options}
                </select>
                <input type="number" class="downtime-minutes" placeholder="Minutes" value="${minutes}" required min="0">
                <button type="button" class="remove-downtime" onclick="this.closest('.downtime-item').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        downtimeEntries.insertAdjacentHTML('beforeend', html);
    }

    function saveEntry() {
        const downtime = [];
        document.querySelectorAll('.downtime-item').forEach(item => {
            const category = item.querySelector('.downtime-category').value;
            const minutes = parseInt(item.querySelector('.downtime-minutes').value);
            
            // Determine type based on category code
            let type = 'planned';
            if (category.startsWith('UDT')) type = 'uncontrollable';
            if (category.startsWith('B')) type = 'breakdown';
            
            if (category && minutes) {
                downtime.push({ category, minutes, type });
            }
        });
        
        const entry = {
            id: editingId,
            date: document.getElementById('entryDate').value,
            shift: document.getElementById('entryShift').value,
            machine: document.getElementById('entryMachine').value,
            product: document.getElementById('entryProduct').value,
            hours: parseFloat(document.getElementById('entryHours').value),
            units: parseInt(document.getElementById('entryUnits').value),
            defects: parseInt(document.getElementById('entryDefects').value),
            idealRate: parseFloat(document.getElementById('entryIdealRate').value),
            downtime
        };
        
        OEEApp.saveEntry(entry);
        
        // Refresh data
        currentEntries = OEEApp.getEntries();
        renderTable();
        updateKPIs();
        updateFilters();
        renderDowntimeCategories();
        updateSummaryStats();
        OEECharts.refreshCharts();
        
        closeModal();
    }

    function renderDowntimeCategories() {
        const plannedList = document.getElementById('plannedDowntimeList');
        const unplannedList = document.getElementById('unplannedDowntimeList');
        const breakdownList = document.getElementById('breakdownList');
        
        if (!plannedList || !unplannedList || !breakdownList) return;
        
        const summary = OEEApp.getDowntimeSummary();
        
        // Planned downtime
        let plannedHtml = '';
        OEEApp.downtimeCategories.planned.forEach(cat => {
            const minutes = summary[cat.code]?.minutes || 0;
            plannedHtml += `
                <div class="downtime-item-stat">
                    <span>${cat.code} - ${cat.name}</span>
                    <strong>${minutes} min</strong>
                </div>
            `;
        });
        plannedList.innerHTML = plannedHtml || '<p>No planned downtime</p>';
        
        // Uncontrollable
        let unplannedHtml = '';
        OEEApp.downtimeCategories.uncontrollable.forEach(cat => {
            const minutes = summary[cat.code]?.minutes || 0;
            unplannedHtml += `
                <div class="downtime-item-stat">
                    <span>${cat.code} - ${cat.name}</span>
                    <strong>${minutes} min</strong>
                </div>
            `;
        });
        unplannedList.innerHTML = unplannedHtml || '<p>No uncontrollable downtime</p>';
        
        // Breakdowns
        let breakdownHtml = '';
        OEEApp.downtimeCategories.breakdowns.forEach(cat => {
            const minutes = summary[cat.code]?.minutes || 0;
            breakdownHtml += `
                <div class="downtime-item-stat">
                    <span>${cat.code} - ${cat.name}</span>
                    <strong>${minutes} min</strong>
                </div>
            `;
        });
        breakdownList.innerHTML = breakdownHtml || '<p>No breakdowns</p>';
    }

    function updateSummaryStats() {
        const entries = OEEApp.getEntries();
        let totalAvail = 0, totalPlanned = 0, totalUnplanned = 0, totalOper = 0;
        let totalUnits = 0, totalDefects = 0;
        
        entries.forEach(entry => {
            const avail = entry.hours * 60;
            totalAvail += avail;
            
            entry.downtime.forEach(d => {
                if (d.type === 'planned') totalPlanned += d.minutes;
                if (d.type === 'uncontrollable' || d.type === 'breakdown') totalUnplanned += d.minutes;
            });
            
            const oee = OEEApp.calculateOEE(entry);
            totalOper += oee.operatingTime;
            totalUnits += entry.units;
            totalDefects += entry.defects;
        });
        
        document.getElementById('totalAvailable').textContent = totalAvail.toFixed(0) + ' min';
        document.getElementById('totalPlannedDowntime').textContent = totalPlanned.toFixed(0) + ' min';
        document.getElementById('totalUnplannedDowntime').textContent = totalUnplanned.toFixed(0) + ' min';
        document.getElementById('totalOperatingTime').textContent = totalOper.toFixed(0) + ' min';
        document.getElementById('totalProduction').textContent = totalUnits.toLocaleString() + ' units';
        document.getElementById('totalDefects').textContent = totalDefects.toLocaleString() + ' units';
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Global functions for onclick handlers
    window.editEntry = function(id) {
        openModal(id);
    };

    window.deleteEntry = function(id) {
        if (confirm('Are you sure you want to delete this entry?')) {
            OEEApp.deleteEntry(id);
            currentEntries = OEEApp.getEntries();
            renderTable();
            updateKPIs();
            updateFilters();
            renderDowntimeCategories();
            updateSummaryStats();
            OEECharts.refreshCharts();
        }
    };

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === entryModal) {
            closeModal();
        }
    });
});