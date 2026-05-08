// ==================== GLOBAL STATE ====================
let globalDatabase = {};
const years = ['2023', '2024', '2025'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 
               'July', 'August', 'September', 'October', 'November', 'December'];

// Initialize database
function initDatabase() {
    years.forEach(year => {
        globalDatabase[year] = {};
        months.forEach(month => {
            globalDatabase[year][month] = {
                finance: {
                    production: { actual: '', target: '' },
                    operational: { actual: '', budget: '' },
                    capital: { actual: '', budget: '' },
                    other: { actual: '', budget: '' },
                    labor: { dl: { regular: '', overtime: '' }, il: { regular: '', overtime: '' } }
                },
                warehouse: {
                    otif: { served: '', total: '' },
                    volumeFill: { delivered: '', orders: '' },
                    fillRates: {
                        corporate: { delivered: '', orders: '' },
                        sc: { delivered: '', orders: '' },
                        core: { delivered: '', orders: '' },
                        emerging: { delivered: '', orders: '' }
                    },
                    nonOtif: {},
                    stockOuts: { value: {}, weight: {} },
                    warehouse: { rmTotal: '', rmUsed: '', fgTotal: '', fgUsed: '', extTotal: '', extUsed: '' },
                    otdl: { gma: '', north: '', central: '', south: '', visayas: '', mindanao: '', modernTrade: '', pai: '' },
                    trucks: { truck10w: '', truckAuv: '', truck6w: '', truck4w: '', truck20ft: '' },
                    manpower: { regular: '', agency: '', resigned: '', regHours: '', agyHours: '', otHours: '', absences: '', requiredDays: '' }
                },
                procurement: { actual: '', target: '' },
                planning: {
                    safetyStocks: { fg: { a: '', b: '', c: '', allIn: '' }, rm: { a: '', b: '', c: '' }, pm: { core: '48', m7: '36', others: '136' } },
                    inventory: { fg: { kgs: {}, php: {} }, rm: { kgs: {}, php: {} } },
                    accuracy: { fg: { count: '', missed: '' }, rm: { count: '', missed: '' } },
                    forecast: { local: {}, export: {}, product: {} }
                },
                production: {
                    utilization: {},
                    output: {},
                    material: {},
                    scheduling: {},
                    manpower: {}
                }
            };
        });
    });
}

// ==================== UTILITY FUNCTIONS ====================
function formatNumber(num, decimals = 2) {
    if (!num || isNaN(num) || parseFloat(num) === 0) return '0';
    return parseFloat(num).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatCurrency(num) {
    if (!num || isNaN(num) || parseFloat(num) === 0) return '₱0';
    if (Math.abs(num) >= 1000000) return '₱' + (parseFloat(num)/1000000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1000) return '₱' + (parseFloat(num)/1000).toFixed(1) + 'K';
    return '₱' + parseFloat(num).toFixed(2);
}

function getCurrentData() {
    const year = document.getElementById('globalYearSelect').value;
    const month = document.getElementById('globalMonthSelect').value;
    return globalDatabase[year][month];
}

function updateTimestamp() {
    const year = document.getElementById('globalYearSelect').value;
    const month = document.getElementById('globalMonthSelect').value;
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString() + ` (${month} ${year})`;
}

// ==================== APP CONTROLLER ====================
const app = {
    currentDashboard: 'finance',
    currentFinanceTab: 'overview',
    currentWarehouseTab: 'overview',
    currentProcurementTab: 'overview',
    currentPlanningTab: 'overview',
    currentProductionTab: 'overview',

    // Dashboard Switching
    switchDashboard: function(dashboard) {
        document.querySelectorAll('.dashboard-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        document.querySelectorAll('.dashboard-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`dashboard-${dashboard}`).classList.add('active');
        this.currentDashboard = dashboard;
        
        if (dashboard === 'finance') this.refreshFinance();
        else if (dashboard === 'warehouse') this.refreshWarehouse();
        else if (dashboard === 'procurement') this.refreshProcurement();
        else if (dashboard === 'planning') this.refreshPlanning();
        else if (dashboard === 'production') this.refreshProduction();
        updateTimestamp();
    },

    // ==================== FINANCE MODULE ====================
    switchFinanceTab: function(tab) {
        document.querySelectorAll('#dashboard-finance .tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        document.querySelectorAll('#dashboard-finance .tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`finance-${tab}`).classList.add('active');
        this.currentFinanceTab = tab;
        
        if (tab === 'input') this.loadFinanceCategory();
        this.refreshFinance();
    },

    refreshFinance: function() {
        const data = getCurrentData().finance;
        
        // Production
        const prodActual = parseFloat(data.production.actual) || 0;
        const prodTarget = parseFloat(data.production.target) || 0;
        const prodPercent = prodTarget > 0 ? (prodActual / prodTarget) * 100 : 0;
        
        // Operational
        const opActual = parseFloat(data.operational.actual) || 0;
        const opBudget = parseFloat(data.operational.budget) || 0;
        const opPercent = opBudget > 0 ? (opActual / opBudget) * 100 : 0;
        
        // Capital
        const capActual = parseFloat(data.capital.actual) || 0;
        const capBudget = parseFloat(data.capital.budget) || 0;
        const capPercent = capBudget > 0 ? (capActual / capBudget) * 100 : 0;
        
        // Other
        const otherActual = parseFloat(data.other.actual) || 0;
        const otherBudget = parseFloat(data.other.budget) || 0;
        const otherPercent = otherBudget > 0 ? (otherActual / otherBudget) * 100 : 0;
        
        // Labor
        const dlReg = parseFloat(data.labor.dl.regular) || 0;
        const dlOT = parseFloat(data.labor.dl.overtime) || 0;
        const ilReg = parseFloat(data.labor.il.regular) || 0;
        const ilOT = parseFloat(data.labor.il.overtime) || 0;
        const totalWorkforce = dlReg + dlOT + ilReg + ilOT;
        const totalReg = dlReg + ilReg;
        const totalOT = dlOT + ilOT;
        const totalHours = totalReg + totalOT;
        const overallOTPercent = totalHours > 0 ? (totalOT / totalHours) * 100 : 0;
        
        const totalActual = opActual + capActual + otherActual;
        const totalBudget = opBudget + capBudget + otherBudget;
        
        // Render Overview KPIs
        document.getElementById('finance-kpis').innerHTML = `
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Production Volume</span></div><div class="kpi-card-main-value">${prodActual ? formatNumber(prodActual, 2) + ' MT' : '0 MT'}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Target</span><span class="kpi-card-detail-value">${prodTarget ? formatNumber(prodTarget, 2) + ' MT' : '0 MT'}</span></div></div><div class="kpi-card-progress"><div class="kpi-card-progress-bar" style="width: ${prodPercent}%"></div></div><div class="kpi-card-footer"><span>${prodPercent.toFixed(1)}%</span><span>Achieved</span></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Operational Cost</span></div><div class="kpi-card-main-value">${formatCurrency(opActual)}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Budget</span><span class="kpi-card-detail-value">${formatCurrency(opBudget)}</span></div></div><div class="kpi-card-progress"><div class="kpi-card-progress-bar" style="width: ${Math.min(opPercent, 100)}%"></div></div><div class="kpi-card-footer"><span>${opPercent.toFixed(1)}%</span><span>of budget</span></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Capital Expenditure</span></div><div class="kpi-card-main-value">${formatCurrency(capActual)}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Budget</span><span class="kpi-card-detail-value">${formatCurrency(capBudget)}</span></div></div><div class="kpi-card-progress"><div class="kpi-card-progress-bar" style="width: ${Math.min(capPercent, 100)}%"></div></div><div class="kpi-card-footer"><span>${capPercent.toFixed(1)}%</span><span>of budget</span></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Other Expenses</span></div><div class="kpi-card-main-value">${formatCurrency(otherActual)}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Budget</span><span class="kpi-card-detail-value">${formatCurrency(otherBudget)}</span></div></div><div class="kpi-card-progress"><div class="kpi-card-progress-bar" style="width: ${Math.min(otherPercent, 100)}%"></div></div><div class="kpi-card-footer"><span>${otherPercent.toFixed(1)}%</span><span>of budget</span></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Labor Overview</span></div><div class="kpi-card-main-value">${formatNumber(totalWorkforce, 0)}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">OT Rate</span><span class="kpi-card-detail-value">${overallOTPercent.toFixed(1)}%</span></div></div><div class="kpi-card-progress"><div class="kpi-card-progress-bar" style="width: ${Math.min(overallOTPercent, 100)}%"></div></div><div class="kpi-card-footer"><span class="status-badge ${overallOTPercent > 35 ? 'status-warning' : (overallOTPercent > 25 ? 'status-neutral' : 'status-good')}">${overallOTPercent > 35 ? 'High' : (overallOTPercent > 25 ? 'Moderate' : 'Normal')}</span><span>OT %</span></div></div>
        `;
        
        // Cost Table
        let costHtml = '';
        const costs = [
            { name: 'Operational', actual: opActual, budget: opBudget },
            { name: 'Capital', actual: capActual, budget: capBudget },
            { name: 'Other', actual: otherActual, budget: otherBudget }
        ];
        costs.forEach(cost => {
            const variance = cost.actual - cost.budget;
            const percent = cost.budget > 0 ? (cost.actual / cost.budget) * 100 : 0;
            costHtml += `<tr><td>${cost.name}</td><td>${formatCurrency(cost.actual)}</td><td>${formatCurrency(cost.budget)}</td><td>${variance >= 0 ? '+' : ''}${formatCurrency(variance)}</td><td>${percent.toFixed(1)}%</td><td><span class="status-badge ${cost.budget === 0 ? 'status-neutral' : (cost.actual <= cost.budget ? 'status-good' : 'status-warning')}">${cost.budget === 0 ? 'No Budget' : (cost.actual <= cost.budget ? 'Under' : 'Over')}</span></td></tr>`;
        });
        costHtml += `<tr style="background-color: #fafbfc; font-weight: 600;"><td>TOTAL</td><td>${formatCurrency(totalActual)}</td><td>${formatCurrency(totalBudget)}</td><td>${(totalActual - totalBudget) >= 0 ? '+' : ''}${formatCurrency(totalActual - totalBudget)}</td><td>${totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}%</td><td><span class="status-badge ${totalBudget === 0 ? 'status-neutral' : (totalActual <= totalBudget ? 'status-good' : 'status-warning')}">${totalBudget === 0 ? 'No Budget' : (totalActual <= totalBudget ? 'Under' : 'Over')}</span></td></tr>`;
        document.getElementById('finance-costTable').innerHTML = costHtml;
        document.getElementById('finance-costTotal').textContent = `Total: ${formatCurrency(totalActual)}`;
        
        // Cost KPIs
        document.getElementById('finance-costKpis').innerHTML = `
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Total Costs</span></div><div class="kpi-card-main-value">${formatCurrency(totalActual)}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Budget</span><span class="kpi-card-detail-value">${formatCurrency(totalBudget)}</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Operational</span></div><div class="kpi-card-main-value">${formatCurrency(opActual)}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Budget</span><span class="kpi-card-detail-value">${formatCurrency(opBudget)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Variance</span><span class="kpi-card-detail-value">${opActual - opBudget >= 0 ? '+' : ''}${formatCurrency(opActual - opBudget)}</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Capital</span></div><div class="kpi-card-main-value">${formatCurrency(capActual)}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Budget</span><span class="kpi-card-detail-value">${formatCurrency(capBudget)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Variance</span><span class="kpi-card-detail-value">${capActual - capBudget >= 0 ? '+' : ''}${formatCurrency(capActual - capBudget)}</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Other</span></div><div class="kpi-card-main-value">${formatCurrency(otherActual)}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Budget</span><span class="kpi-card-detail-value">${formatCurrency(otherBudget)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Variance</span><span class="kpi-card-detail-value">${otherActual - otherBudget >= 0 ? '+' : ''}${formatCurrency(otherActual - otherBudget)}</span></div></div></div>
        `;
        
        document.getElementById('finance-costDetailTable').innerHTML = costHtml;
        
        // Labor KPIs
        document.getElementById('finance-laborKpis').innerHTML = `
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Total Hours</span></div><div class="kpi-card-main-value">${formatNumber(totalHours)} hrs</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Regular</span><span class="kpi-card-detail-value">${formatNumber(totalReg)} hrs</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Overtime</span><span class="kpi-card-detail-value">${formatNumber(totalOT)} hrs</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Direct Labor</span></div><div class="kpi-card-main-value">${formatNumber(dlReg + dlOT)} hrs</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Regular</span><span class="kpi-card-detail-value">${formatNumber(dlReg)} hrs</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Overtime</span><span class="kpi-card-detail-value">${formatNumber(dlOT)} hrs</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">OT Rate</span><span class="kpi-card-detail-value">${dlReg > 0 ? ((dlOT / dlReg) * 100).toFixed(1) : 0}%</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Indirect Labor</span></div><div class="kpi-card-main-value">${formatNumber(ilReg + ilOT)} hrs</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Regular</span><span class="kpi-card-detail-value">${formatNumber(ilReg)} hrs</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Overtime</span><span class="kpi-card-detail-value">${formatNumber(ilOT)} hrs</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">OT Rate</span><span class="kpi-card-detail-value">${ilReg > 0 ? ((ilOT / ilReg) * 100).toFixed(1) : 0}%</span></div></div></div>
        `;
        
        const laborHtml = `
            <tr><td>Direct Labor</td><td>${formatNumber(dlReg, 0)}</td><td>${formatNumber(dlOT, 0)}</td><td>${formatNumber(dlReg + dlOT, 0)}</td><td>${dlReg > 0 ? ((dlOT / dlReg) * 100).toFixed(1) : 0}%</td><td><span class="status-badge ${dlReg === 0 ? 'status-neutral' : ((dlOT / dlReg) * 100 <= 25 ? 'status-good' : ((dlOT / dlReg) * 100 <= 35 ? 'status-neutral' : 'status-warning'))}">${dlReg === 0 ? 'No Data' : ((dlOT / dlReg) * 100 <= 25 ? 'Normal' : ((dlOT / dlReg) * 100 <= 35 ? 'High' : 'Critical'))}</span></td></tr>
            <tr><td>Indirect Labor</td><td>${formatNumber(ilReg, 0)}</td><td>${formatNumber(ilOT, 0)}</td><td>${formatNumber(ilReg + ilOT, 0)}</td><td>${ilReg > 0 ? ((ilOT / ilReg) * 100).toFixed(1) : 0}%</td><td><span class="status-badge ${ilReg === 0 ? 'status-neutral' : ((ilOT / ilReg) * 100 <= 25 ? 'status-good' : ((ilOT / ilReg) * 100 <= 35 ? 'status-neutral' : 'status-warning'))}">${ilReg === 0 ? 'No Data' : ((ilOT / ilReg) * 100 <= 25 ? 'Normal' : ((ilOT / ilReg) * 100 <= 35 ? 'High' : 'Critical'))}</span></td></tr>
            <tr style="background-color: #fafbfc; font-weight: 600;"><td>TOTAL</td><td>${formatNumber(totalReg, 0)}</td><td>${formatNumber(totalOT, 0)}</td><td>${formatNumber(totalHours, 0)}</td><td>${overallOTPercent.toFixed(1)}%</td><td><span class="status-badge ${totalHours === 0 ? 'status-neutral' : (overallOTPercent <= 25 ? 'status-good' : (overallOTPercent <= 35 ? 'status-neutral' : 'status-warning'))}">${totalHours === 0 ? 'No Data' : (overallOTPercent <= 25 ? 'Normal' : (overallOTPercent <= 35 ? 'High' : 'Critical'))}</span></td></tr>
        `;
        document.getElementById('finance-laborTable').innerHTML = laborHtml;
    },

    loadFinanceCategory: function() {
        const category = document.getElementById('finance-category').value;
        const data = getCurrentData().finance;
        let html = '';
        
        if (category === 'production') {
            html = `<div class="input-section" style="grid-column: span 3;"><h4>PRODUCTION VOLUME</h4><div class="input-grid"><div class="input-field"><label>Volume Produced (MT)</label><input type="number" id="fin_prod_actual" value="${data.production.actual}" step="0.01"></div><div class="input-field"><label>Volume Target (MT)</label><input type="number" id="fin_prod_target" value="${data.production.target}" step="0.01"></div></div></div>`;
        } else if (category === 'operational') {
            html = `<div class="input-section" style="grid-column: span 3;"><h4>OPERATIONAL COST</h4><div class="input-grid"><div class="input-field"><label>Actual (₱)</label><input type="number" id="fin_op_actual" value="${data.operational.actual}" step="0.01"></div><div class="input-field"><label>Budget (₱)</label><input type="number" id="fin_op_budget" value="${data.operational.budget}" step="0.01"></div></div></div>`;
        } else if (category === 'capital') {
            html = `<div class="input-section" style="grid-column: span 3;"><h4>CAPITAL EXPENDITURE</h4><div class="input-grid"><div class="input-field"><label>Actual (₱)</label><input type="number" id="fin_cap_actual" value="${data.capital.actual}" step="0.01"></div><div class="input-field"><label>Budget (₱)</label><input type="number" id="fin_cap_budget" value="${data.capital.budget}" step="0.01"></div></div></div>`;
        } else if (category === 'other') {
            html = `<div class="input-section" style="grid-column: span 3;"><h4>OTHER EXPENSES</h4><div class="input-grid"><div class="input-field"><label>Actual (₱)</label><input type="number" id="fin_other_actual" value="${data.other.actual}" step="0.01"></div><div class="input-field"><label>Budget (₱)</label><input type="number" id="fin_other_budget" value="${data.other.budget}" step="0.01"></div></div></div>`;
        } else if (category === 'labor-dl') {
            html = `<div class="input-section" style="grid-column: span 3;"><h4>DIRECT LABOR</h4><div class="input-grid"><div class="input-field"><label>Regular Hours</label><input type="number" id="fin_dl_reg" value="${data.labor.dl.regular}" step="0.01"></div><div class="input-field"><label>Overtime Hours</label><input type="number" id="fin_dl_ot" value="${data.labor.dl.overtime}" step="0.01"></div></div></div>`;
        } else if (category === 'labor-il') {
            html = `<div class="input-section" style="grid-column: span 3;"><h4>INDIRECT LABOR</h4><div class="input-grid"><div class="input-field"><label>Regular Hours</label><input type="number" id="fin_il_reg" value="${data.labor.il.regular}" step="0.01"></div><div class="input-field"><label>Overtime Hours</label><input type="number" id="fin_il_ot" value="${data.labor.il.overtime}" step="0.01"></div></div></div>`;
        }
        
        document.getElementById('finance-inputSections').innerHTML = html;
    },

    saveFinanceData: function() {
        const data = getCurrentData().finance;
        const category = document.getElementById('finance-category').value;
        
        if (category === 'production') {
            data.production.actual = document.getElementById('fin_prod_actual').value;
            data.production.target = document.getElementById('fin_prod_target').value;
        } else if (category === 'operational') {
            data.operational.actual = document.getElementById('fin_op_actual').value;
            data.operational.budget = document.getElementById('fin_op_budget').value;
        } else if (category === 'capital') {
            data.capital.actual = document.getElementById('fin_cap_actual').value;
            data.capital.budget = document.getElementById('fin_cap_budget').value;
        } else if (category === 'other') {
            data.other.actual = document.getElementById('fin_other_actual').value;
            data.other.budget = document.getElementById('fin_other_budget').value;
        } else if (category === 'labor-dl') {
            data.labor.dl.regular = document.getElementById('fin_dl_reg').value;
            data.labor.dl.overtime = document.getElementById('fin_dl_ot').value;
        } else if (category === 'labor-il') {
            data.labor.il.regular = document.getElementById('fin_il_reg').value;
            data.labor.il.overtime = document.getElementById('fin_il_ot').value;
        }
        
        alert('Finance data saved');
        this.refreshFinance();
    },

    clearFinanceCurrent: function() {
        const inputs = document.querySelectorAll('#finance-inputSections input');
        inputs.forEach(input => input.value = '');
        this.saveFinanceData();
    },

    clearFinanceAll: function() {
        if (confirm('Clear ALL finance data for this month?')) {
            const data = getCurrentData().finance;
            data.production = { actual: '', target: '' };
            data.operational = { actual: '', budget: '' };
            data.capital = { actual: '', budget: '' };
            data.other = { actual: '', budget: '' };
            data.labor = { dl: { regular: '', overtime: '' }, il: { regular: '', overtime: '' } };
            this.loadFinanceCategory();
            this.refreshFinance();
        }
    },

    // ==================== WAREHOUSE MODULE ====================
    switchWarehouseTab: function(tab) {
        document.querySelectorAll('#dashboard-warehouse .tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        document.querySelectorAll('#dashboard-warehouse .tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`warehouse-${tab}`).classList.add('active');
        this.currentWarehouseTab = tab;
        
        if (tab === 'input') this.loadWarehouseCategory();
        this.refreshWarehouse();
    },

    refreshWarehouse: function() {
        const data = getCurrentData().warehouse;
        
        // OTIF
        const served = parseFloat(data.otif.served) || 0;
        const total = parseFloat(data.otif.total) || 0;
        const otifRate = total > 0 ? (served / total) * 100 : 0;
        
        // Volume Fill
        const volDelivered = parseFloat(data.volumeFill.delivered) || 0;
        const volOrders = parseFloat(data.volumeFill.orders) || 0;
        const volFillRate = volOrders > 0 ? (volDelivered / volOrders) * 100 : 0;
        
        // Warehouse
        const rmTotal = parseFloat(data.warehouse.rmTotal) || 0;
        const rmUsed = parseFloat(data.warehouse.rmUsed) || 0;
        const fgTotal = parseFloat(data.warehouse.fgTotal) || 0;
        const fgUsed = parseFloat(data.warehouse.fgUsed) || 0;
        const extTotal = parseFloat(data.warehouse.extTotal) || 0;
        const extUsed = parseFloat(data.warehouse.extUsed) || 0;
        const totalPalletPositions = rmTotal + fgTotal + extTotal;
        const totalPalletUsed = rmUsed + fgUsed + extUsed;
        const whUtilRate = totalPalletPositions > 0 ? (totalPalletUsed / totalPalletPositions) * 100 : 0;
        
        // Fill Rates
        const corpDelivered = parseFloat(data.fillRates.corporate.delivered) || 0;
        const corpOrders = parseFloat(data.fillRates.corporate.orders) || 0;
        const corpRate = corpOrders > 0 ? (corpDelivered / corpOrders) * 100 : 0;
        
        // Non-OTIF
        let nonOtifTotal = 0;
        for (let i = 0; i < 21; i++) {
            nonOtifTotal += parseFloat(data.nonOtif[`nonOtif_${i}`]) || 0;
        }
        
        // Stock Outs
        let stockValueTotal = 0, stockWeightTotal = 0;
        for (let i = 0; i < 22; i++) {
            stockValueTotal += parseFloat(data.stockOuts.value[`stockOutValue_${i}`]) || 0;
            stockWeightTotal += parseFloat(data.stockOuts.weight[`stockOutWeight_${i}`]) || 0;
        }
        
        // OTDL
        const otdlValues = [parseFloat(data.otdl.gma)||0, parseFloat(data.otdl.north)||0, parseFloat(data.otdl.central)||0, parseFloat(data.otdl.south)||0, parseFloat(data.otdl.visayas)||0, parseFloat(data.otdl.mindanao)||0, parseFloat(data.otdl.modernTrade)||0, parseFloat(data.otdl.pai)||0];
        let totalOtdl = 0, regionCount = 0;
        otdlValues.forEach(v => { if(v>0){ totalOtdl+=v; regionCount++; } });
        const avgOtdl = regionCount > 0 ? totalOtdl / regionCount : 0;
        
        // Trucks
        const truck10w = parseFloat(data.trucks.truck10w) || 0;
        const truckAuv = parseFloat(data.trucks.truckAuv) || 0;
        const truck6w = parseFloat(data.trucks.truck6w) || 0;
        const truck4w = parseFloat(data.trucks.truck4w) || 0;
        const truck20ft = parseFloat(data.trucks.truck20ft) || 0;
        const totalTruckVolume = truck10w + truckAuv + truck6w + truck4w + truck20ft;
        let truckTypeCount = 0;
        [truck10w, truckAuv, truck6w, truck4w, truck20ft].forEach(v => { if(v>0) truckTypeCount++; });
        
        // Manpower
        const regular = parseFloat(data.manpower.regular) || 0;
        const agency = parseFloat(data.manpower.agency) || 0;
        const regHours = parseFloat(data.manpower.regHours) || 0;
        const agyHours = parseFloat(data.manpower.agyHours) || 0;
        const otHours = parseFloat(data.manpower.otHours) || 0;
        const totalManhours = regHours + agyHours;
        const overtimeRate = totalManhours > 0 ? (otHours / totalManhours) * 100 : 0;
        
        // Top KPIs
        document.getElementById('warehouse-topKpis').innerHTML = `
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">OTIF Rate</span></div><div class="kpi-card-main-value">${otifRate.toFixed(1)}%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Served</span><span class="kpi-card-detail-value">${formatNumber(served)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Total</span><span class="kpi-card-detail-value">${formatNumber(total)}</span></div></div><div class="kpi-card-progress"><div class="kpi-card-progress-bar" style="width: ${otifRate}%"></div></div><div class="kpi-card-footer"><span class="status-badge ${otifRate >= 95 ? 'status-excellent' : (otifRate >= 85 ? 'status-good' : (otifRate >= 75 ? 'status-warning' : 'status-critical'))}">${otifRate >= 95 ? 'Excellent' : (otifRate >= 85 ? 'Good' : (otifRate >= 75 ? 'Warning' : 'Critical'))}</span><span>Per Line</span></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Volume Fill</span></div><div class="kpi-card-main-value">${volFillRate.toFixed(1)}%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Delivered</span><span class="kpi-card-detail-value">${formatCurrency(volDelivered)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Orders</span><span class="kpi-card-detail-value">${formatCurrency(volOrders)}</span></div></div><div class="kpi-card-progress"><div class="kpi-card-progress-bar" style="width: ${volFillRate}%"></div></div><div class="kpi-card-footer"><span class="status-badge ${volFillRate >= 98 ? 'status-excellent' : (volFillRate >= 90 ? 'status-good' : (volFillRate >= 80 ? 'status-warning' : 'status-critical'))}">${volFillRate >= 98 ? 'Excellent' : (volFillRate >= 90 ? 'Good' : (volFillRate >= 80 ? 'Warning' : 'Critical'))}</span><span>Corporate</span></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">WH Utilization</span></div><div class="kpi-card-main-value">${whUtilRate.toFixed(1)}%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Used</span><span class="kpi-card-detail-value">${formatNumber(totalPalletUsed)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Total</span><span class="kpi-card-detail-value">${formatNumber(totalPalletPositions)}</span></div></div><div class="kpi-card-progress"><div class="kpi-card-progress-bar" style="width: ${whUtilRate}%"></div></div><div class="kpi-card-footer"><span class="status-badge ${whUtilRate <= 75 ? 'status-warning' : (whUtilRate <= 85 ? 'status-excellent' : (whUtilRate <= 95 ? 'status-good' : 'status-warning'))}">${whUtilRate <= 75 ? 'Under-Utilized' : (whUtilRate <= 85 ? 'Optimal' : (whUtilRate <= 95 ? 'Good' : 'Near Capacity'))}</span><span>All WH</span></div></div>
        `;
        
        // Key Metrics
        document.getElementById('warehouse-keyMetrics').innerHTML = `
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Non-OTIF</span></div><div class="kpi-card-main-value">${formatNumber(nonOtifTotal)}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Top Category</span><span class="kpi-card-detail-value">-</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Stock Outs</span></div><div class="kpi-card-main-value">${formatCurrency(stockValueTotal)}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Total Weight</span><span class="kpi-card-detail-value">${formatNumber(stockWeightTotal)} KGS</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Warehouse</span></div><div class="kpi-card-main-value">${whUtilRate.toFixed(1)}%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">RM/PM</span><span class="kpi-card-detail-value">${rmTotal > 0 ? ((rmUsed/rmTotal)*100).toFixed(1) : 0}%</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">FG</span><span class="kpi-card-detail-value">${fgTotal > 0 ? ((fgUsed/fgTotal)*100).toFixed(1) : 0}%</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">External</span><span class="kpi-card-detail-value">${extTotal > 0 ? ((extUsed/extTotal)*100).toFixed(1) : 0}%</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">OTDL</span></div><div class="kpi-card-main-value">${avgOtdl.toFixed(1)} days</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Regions</span><span class="kpi-card-detail-value">${regionCount}</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Trucks</span></div><div class="kpi-card-main-value">${formatNumber(totalTruckVolume)} cbm</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Active Types</span><span class="kpi-card-detail-value">${truckTypeCount}</span></div></div></div>
        `;
        
        // Manpower KPIs
        document.getElementById('warehouse-manpowerKpis').innerHTML = `
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Headcount</span></div><div class="kpi-card-main-value">${formatNumber(regular + agency, 0)}</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Regular</span><span class="kpi-card-detail-value">${formatNumber(regular, 0)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Agency</span><span class="kpi-card-detail-value">${formatNumber(agency, 0)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Resigned</span><span class="kpi-card-detail-value">${formatNumber(parseFloat(data.manpower.resigned)||0, 0)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Attrition</span><span class="kpi-card-detail-value">0%</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Manhours</span></div><div class="kpi-card-main-value">${formatNumber(totalManhours)} hrs</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Regular</span><span class="kpi-card-detail-value">${formatNumber(regHours)} hrs</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Agency</span><span class="kpi-card-detail-value">${formatNumber(agyHours)} hrs</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Overtime</span><span class="kpi-card-detail-value">${formatNumber(otHours)} hrs</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">OT Rate</span><span class="kpi-card-detail-value">${overtimeRate.toFixed(1)}%</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Absences</span></div><div class="kpi-card-main-value">${((parseFloat(data.manpower.absences)||0) / (parseFloat(data.manpower.requiredDays)||1) * 100).toFixed(1)}%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Count</span><span class="kpi-card-detail-value">${formatNumber(parseFloat(data.manpower.absences)||0, 0)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Required Days</span><span class="kpi-card-detail-value">${formatNumber(parseFloat(data.manpower.requiredDays)||0, 2)}</span></div></div></div>
        `;
        
        // OTDL Regions
        let otdlHtml = '';
        const regions = ['GMA', 'North Luzon', 'Central Luzon', 'South Luzon', 'Visayas', 'Mindanao', 'Modern Trade', 'PAI OTDL'];
        const otdlVals = [data.otdl.gma, data.otdl.north, data.otdl.central, data.otdl.south, data.otdl.visayas, data.otdl.mindanao, data.otdl.modernTrade, data.otdl.pai];
        for(let i=0; i<regions.length; i++) {
            const val = parseFloat(otdlVals[i]) || 0;
            otdlHtml += `<div class="kpi-card-detail-row"><span class="kpi-card-detail-label">${regions[i]}</span><span class="kpi-card-detail-value">${val ? val.toFixed(1) + ' days' : '0'}</span></div>`;
        }
        document.getElementById('warehouse-otdlRegions').innerHTML = otdlHtml;
        
        // Truck Types
        let truckHtml = '';
        if(truck10w>0) truckHtml += `<div class="kpi-card-detail-row"><span class="kpi-card-detail-label">10-wheeler</span><span class="kpi-card-detail-value">${truck10w.toFixed(1)} cbm</span></div>`;
        if(truckAuv>0) truckHtml += `<div class="kpi-card-detail-row"><span class="kpi-card-detail-label">AUV</span><span class="kpi-card-detail-value">${truckAuv.toFixed(1)} cbm</span></div>`;
        if(truck6w>0) truckHtml += `<div class="kpi-card-detail-row"><span class="kpi-card-detail-label">6-wheeler</span><span class="kpi-card-detail-value">${truck6w.toFixed(1)} cbm</span></div>`;
        if(truck4w>0) truckHtml += `<div class="kpi-card-detail-row"><span class="kpi-card-detail-label">4-wheeler</span><span class="kpi-card-detail-value">${truck4w.toFixed(1)} cbm</span></div>`;
        if(truck20ft>0) truckHtml += `<div class="kpi-card-detail-row"><span class="kpi-card-detail-label">20-ft</span><span class="kpi-card-detail-value">${truck20ft.toFixed(1)} cbm</span></div>`;
        document.getElementById('warehouse-truckTypes').innerHTML = truckHtml || '<div class="kpi-card-detail-row">No data</div>';
        
        // Fill Rates
        document.getElementById('warehouse-fillRates').innerHTML = `
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Corporate</span></div><div class="kpi-card-main-value">${corpRate.toFixed(1)}%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Delivered</span><span class="kpi-card-detail-value">${formatCurrency(corpDelivered)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Orders</span><span class="kpi-card-detail-value">${formatCurrency(corpOrders)}</span></div></div><div class="kpi-card-footer"><span class="status-badge ${corpRate >= 98 ? 'status-excellent' : (corpRate >= 90 ? 'status-good' : (corpRate >= 80 ? 'status-warning' : 'status-critical'))}">${corpRate >= 98 ? 'Excellent' : (corpRate >= 90 ? 'Good' : (corpRate >= 80 ? 'Warning' : 'Critical'))}</span><span>Hit Rate</span></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">SC Fill</span></div><div class="kpi-card-main-value">${((parseFloat(data.fillRates.sc.delivered)||0) / (parseFloat(data.fillRates.sc.orders)||1) * 100).toFixed(1)}%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Delivered</span><span class="kpi-card-detail-value">${formatCurrency(parseFloat(data.fillRates.sc.delivered)||0)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Orders</span><span class="kpi-card-detail-value">${formatCurrency(parseFloat(data.fillRates.sc.orders)||0)}</span></div></div><div class="kpi-card-footer"><span class="status-badge status-neutral">No Data</span><span>Hit Rate</span></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Core Products</span></div><div class="kpi-card-main-value">${((parseFloat(data.fillRates.core.delivered)||0) / (parseFloat(data.fillRates.core.orders)||1) * 100).toFixed(1)}%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Delivered</span><span class="kpi-card-detail-value">${formatCurrency(parseFloat(data.fillRates.core.delivered)||0)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Orders</span><span class="kpi-card-detail-value">${formatCurrency(parseFloat(data.fillRates.core.orders)||0)}</span></div></div><div class="kpi-card-footer"><span class="status-badge status-neutral">No Data</span><span>Hit Rate</span></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Emerging</span></div><div class="kpi-card-main-value">${((parseFloat(data.fillRates.emerging.delivered)||0) / (parseFloat(data.fillRates.emerging.orders)||1) * 100).toFixed(1)}%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Delivered</span><span class="kpi-card-detail-value">${formatCurrency(parseFloat(data.fillRates.emerging.delivered)||0)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Orders</span><span class="kpi-card-detail-value">${formatCurrency(parseFloat(data.fillRates.emerging.orders)||0)}</span></div></div><div class="kpi-card-footer"><span class="status-badge status-neutral">No Data</span><span>Hit Rate</span></div></div>
        `;
        
        // Warehouse Utilization
        document.getElementById('warehouse-utilization').innerHTML = `
            <div class="kpi-card-detail-row"><span class="kpi-card-detail-label">RM/PM Pallet Positions</span><span class="kpi-card-detail-value">${formatNumber(rmTotal)}</span></div>
            <div class="kpi-card-detail-row"><span class="kpi-card-detail-label">RM/PM Pallet Used</span><span class="kpi-card-detail-value">${formatNumber(rmUsed)}</span></div>
            <div class="kpi-card-detail-row"><span class="kpi-card-detail-label">RM/PM Utilization</span><span class="kpi-card-detail-value">${rmTotal > 0 ? ((rmUsed/rmTotal)*100).toFixed(1) : 0}%</span></div>
            <div style="height:10px;"></div>
            <div class="kpi-card-detail-row"><span class="kpi-card-detail-label">FG Pallet Positions</span><span class="kpi-card-detail-value">${formatNumber(fgTotal)}</span></div>
            <div class="kpi-card-detail-row"><span class="kpi-card-detail-label">FG Pallet Used</span><span class="kpi-card-detail-value">${formatNumber(fgUsed)}</span></div>
            <div class="kpi-card-detail-row"><span class="kpi-card-detail-label">FG Utilization</span><span class="kpi-card-detail-value">${fgTotal > 0 ? ((fgUsed/fgTotal)*100).toFixed(1) : 0}%</span></div>
        `;
        document.getElementById('warehouse-external').innerHTML = `
            <div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Pallet Positions</span><span class="kpi-card-detail-value">${formatNumber(extTotal)}</span></div>
            <div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Pallet Used</span><span class="kpi-card-detail-value">${formatNumber(extUsed)}</span></div>
            <div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Utilization</span><span class="kpi-card-detail-value">${extTotal > 0 ? ((extUsed/extTotal)*100).toFixed(1) : 0}%</span></div>
        `;
        
        // Manpower Details
        document.getElementById('warehouse-manpowerDetails').innerHTML = `
            <div class="kpi-card"><h3>Headcount</h3><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Regular</span><span class="kpi-card-detail-value">${formatNumber(regular, 0)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Agency</span><span class="kpi-card-detail-value">${formatNumber(agency, 0)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Resigned</span><span class="kpi-card-detail-value">${formatNumber(parseFloat(data.manpower.resigned)||0, 0)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Attrition</span><span class="kpi-card-detail-value">0%</span></div></div>
            <div class="kpi-card"><h3>Manhours</h3><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Regular</span><span class="kpi-card-detail-value">${formatNumber(regHours)} hrs</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Agency</span><span class="kpi-card-detail-value">${formatNumber(agyHours)} hrs</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Overtime</span><span class="kpi-card-detail-value">${formatNumber(otHours)} hrs</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">OT Rate</span><span class="kpi-card-detail-value">${overtimeRate.toFixed(1)}%</span></div></div>
            <div class="kpi-card"><h3>Absences</h3><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Absences Count</span><span class="kpi-card-detail-value">${formatNumber(parseFloat(data.manpower.absences)||0, 0)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Required Days</span><span class="kpi-card-detail-value">${formatNumber(parseFloat(data.manpower.requiredDays)||0, 2)}</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Absenteeism Rate</span><span class="kpi-card-detail-value">${((parseFloat(data.manpower.absences)||0) / (parseFloat(data.manpower.requiredDays)||1) * 100).toFixed(2)}%</span></div></div>
        `;
    },

    loadWarehouseCategory: function() {
        const category = document.getElementById('warehouse-category').value;
        const data = getCurrentData().warehouse;
        let html = '';
        
        if (category === 'otif') {
            html = `<div class="input-section" style="grid-column: span 3;"><h4>OTIF RATE</h4><div class="input-grid"><div class="input-field"><label>Served per Line Item</label><input type="number" id="wh_otif_served" value="${data.otif.served}" step="0.01"></div><div class="input-field"><label>Total Line Items</label><input type="number" id="wh_otif_total" value="${data.otif.total}" step="0.01"></div></div></div>`;
        } else if (category === 'fillrates') {
            html = `
                <div class="input-section"><h4>Corporate Fill Rate</h4><div class="input-grid"><div class="input-field"><label>Delivered (₱)</label><input type="number" id="wh_corp_delivered" value="${data.fillRates.corporate.delivered}" step="0.01"></div><div class="input-field"><label>Orders (₱)</label><input type="number" id="wh_corp_orders" value="${data.fillRates.corporate.orders}" step="0.01"></div></div></div>
                <div class="input-section"><h4>SC Fill Rate</h4><div class="input-grid"><div class="input-field"><label>Delivered (₱)</label><input type="number" id="wh_sc_delivered" value="${data.fillRates.sc.delivered}" step="0.01"></div><div class="input-field"><label>Orders (₱)</label><input type="number" id="wh_sc_orders" value="${data.fillRates.sc.orders}" step="0.01"></div></div></div>
                <div class="input-section"><h4>Core Products</h4><div class="input-grid"><div class="input-field"><label>Delivered (₱)</label><input type="number" id="wh_core_delivered" value="${data.fillRates.core.delivered}" step="0.01"></div><div class="input-field"><label>Orders (₱)</label><input type="number" id="wh_core_orders" value="${data.fillRates.core.orders}" step="0.01"></div></div></div>
                <div class="input-section"><h4>Emerging Products</h4><div class="input-grid"><div class="input-field"><label>Delivered (₱)</label><input type="number" id="wh_emerging_delivered" value="${data.fillRates.emerging.delivered}" step="0.01"></div><div class="input-field"><label>Orders (₱)</label><input type="number" id="wh_emerging_orders" value="${data.fillRates.emerging.orders}" step="0.01"></div></div></div>
            `;
        } else if (category === 'nonotif') {
            let nonHtml = `<div class="input-section" style="grid-column: span 3;"><h4>NON-OTIF ISSUES (COUNT)</h4><div class="input-grid" style="grid-template-columns: repeat(4, 1fr);">`;
            const issues = ['Material constraint', 'Planning error', 'Capacity Constraint', 'Acumatica Inventory Issue', 'Warehouse Constraint', 'Truck unavailability', 'Dispatch Issue', 'Custom Issue', 'Permits', 'Machine downtime', 'Production Under run', 'Manpower constraint', 'Production delay', 'Acumatica Confirmation delay', 'Subcon delay', 'Developmental Issue', 'Quality Issue', 'Cancelled Order', 'Demand Shift', 'CS Issue', 'Pricing Issue'];
            for(let i=0; i<issues.length; i++) {
                nonHtml += `<div class="input-field"><label>${issues[i]}</label><input type="number" id="wh_nonotif_${i}" value="${data.nonOtif[`nonOtif_${i}`] || ''}" step="0.01"></div>`;
            }
            nonHtml += `</div></div>`;
            html = nonHtml;
        } else if (category === 'stockouts') {
            let stockHtml = `<div class="input-section" style="grid-column: span 3;"><h4>STOCK OUTS - VALUE (₱)</h4><div class="input-grid" style="grid-template-columns: repeat(3, 1fr);">`;
            const issues = ['Material constraint', 'Planning error', 'Capacity Constraint', 'Acumatica Inventory Issue', 'Warehouse Constraint', 'Truck unavailability', 'Dispatch Issue', 'Custom Issue', 'Permits', 'Machine downtime', 'Production Under run', 'Manpower constraint', 'Production delay', 'Acumatica Confirmation delay', 'Subcon delay', 'Developmental Issue', 'Quality Issue', 'Cancelled Order', 'Demand Shift', 'CS Issue', 'Beyond forecast', 'Pricing Issue'];
            for(let i=0; i<issues.length; i++) {
                stockHtml += `<div class="input-field"><label>${issues[i]}</label><input type="number" id="wh_stock_value_${i}" value="${data.stockOuts.value[`stockOutValue_${i}`] || ''}" step="0.01"></div>`;
            }
            stockHtml += `</div></div><div class="input-section" style="grid-column: span 3;"><h4>STOCK OUTS - WEIGHT (KGS)</h4><div class="input-grid" style="grid-template-columns: repeat(3, 1fr);">`;
            for(let i=0; i<issues.length; i++) {
                stockHtml += `<div class="input-field"><label>${issues[i]}</label><input type="number" id="wh_stock_weight_${i}" value="${data.stockOuts.weight[`stockOutWeight_${i}`] || ''}" step="0.01"></div>`;
            }
            stockHtml += `</div></div>`;
            html = stockHtml;
        } else if (category === 'warehouse') {
            html = `
                <div class="input-section"><h4>RM/PM Warehouse</h4><div class="input-grid"><div class="input-field"><label>Pallet Positions</label><input type="number" id="wh_rm_total" value="${data.warehouse.rmTotal}" step="0.01"></div><div class="input-field"><label>Pallet Used</label><input type="number" id="wh_rm_used" value="${data.warehouse.rmUsed}" step="0.01"></div></div></div>
                <div class="input-section"><h4>FG Warehouse</h4><div class="input-grid"><div class="input-field"><label>Pallet Positions</label><input type="number" id="wh_fg_total" value="${data.warehouse.fgTotal}" step="0.01"></div><div class="input-field"><label>Pallet Used</label><input type="number" id="wh_fg_used" value="${data.warehouse.fgUsed}" step="0.01"></div></div></div>
                <div class="input-section"><h4>External Warehouse</h4><div class="input-grid"><div class="input-field"><label>Pallet Positions</label><input type="number" id="wh_ext_total" value="${data.warehouse.extTotal}" step="0.01"></div><div class="input-field"><label>Pallet Used</label><input type="number" id="wh_ext_used" value="${data.warehouse.extUsed}" step="0.01"></div></div></div>
            `;
        } else if (category === 'otdl') {
            html = `<div class="input-section" style="grid-column: span 3;"><h4>OTDL DAYS</h4><div class="input-grid" style="grid-template-columns: repeat(4, 1fr);"><div class="input-field"><label>GMA</label><input type="number" id="wh_gma" value="${data.otdl.gma}" step="0.01"></div><div class="input-field"><label>North Luzon</label><input type="number" id="wh_north" value="${data.otdl.north}" step="0.01"></div><div class="input-field"><label>Central Luzon</label><input type="number" id="wh_central" value="${data.otdl.central}" step="0.01"></div><div class="input-field"><label>South Luzon</label><input type="number" id="wh_south" value="${data.otdl.south}" step="0.01"></div><div class="input-field"><label>Visayas</label><input type="number" id="wh_visayas" value="${data.otdl.visayas}" step="0.01"></div><div class="input-field"><label>Mindanao</label><input type="number" id="wh_mindanao" value="${data.otdl.mindanao}" step="0.01"></div><div class="input-field"><label>Modern Trade</label><input type="number" id="wh_modern" value="${data.otdl.modernTrade}" step="0.01"></div><div class="input-field"><label>PAI OTDL</label><input type="number" id="wh_pai" value="${data.otdl.pai}" step="0.01"></div></div></div>`;
        } else if (category === 'trucks') {
            html = `<div class="input-section" style="grid-column: span 3;"><h4>TRUCK UTILIZATION (CBM)</h4><div class="input-grid" style="grid-template-columns: repeat(3, 1fr);"><div class="input-field"><label>10-wheeler</label><input type="number" id="wh_truck10w" value="${data.trucks.truck10w}" step="0.01"></div><div class="input-field"><label>AUV</label><input type="number" id="wh_truckAuv" value="${data.trucks.truckAuv}" step="0.01"></div><div class="input-field"><label>6-wheeler</label><input type="number" id="wh_truck6w" value="${data.trucks.truck6w}" step="0.01"></div><div class="input-field"><label>4-wheeler</label><input type="number" id="wh_truck4w" value="${data.trucks.truck4w}" step="0.01"></div><div class="input-field"><label>20-ft container</label><input type="number" id="wh_truck20ft" value="${data.trucks.truck20ft}" step="0.01"></div></div></div>`;
        } else if (category === 'manpower') {
            html = `
                <div class="input-section"><h4>Headcount</h4><div class="input-grid"><div class="input-field"><label>Regular</label><input type="number" id="wh_mp_regular" value="${data.manpower.regular}" step="0.01"></div><div class="input-field"><label>Agency</label><input type="number" id="wh_mp_agency" value="${data.manpower.agency}" step="0.01"></div><div class="input-field"><label>Resigned</label><input type="number" id="wh_mp_resigned" value="${data.manpower.resigned}" step="0.01"></div></div></div>
                <div class="input-section"><h4>Manhours</h4><div class="input-grid"><div class="input-field"><label>Regular Hours</label><input type="number" id="wh_mp_regHours" value="${data.manpower.regHours}" step="0.01"></div><div class="input-field"><label>Agency Hours</label><input type="number" id="wh_mp_agyHours" value="${data.manpower.agyHours}" step="0.01"></div><div class="input-field"><label>Overtime Hours</label><input type="number" id="wh_mp_otHours" value="${data.manpower.otHours}" step="0.01"></div></div></div>
                <div class="input-section"><h4>Absences</h4><div class="input-grid"><div class="input-field"><label>Absences Count</label><input type="number" id="wh_mp_absences" value="${data.manpower.absences}" step="0.01"></div><div class="input-field"><label>Required Days</label><input type="number" id="wh_mp_days" value="${data.manpower.requiredDays}" step="0.01"></div></div></div>
            `;
        }
        
        document.getElementById('warehouse-inputSections').innerHTML = html;
    },

    saveWarehouseData: function() {
        const data = getCurrentData().warehouse;
        const category = document.getElementById('warehouse-category').value;
        
        if (category === 'otif') {
            data.otif.served = document.getElementById('wh_otif_served').value;
            data.otif.total = document.getElementById('wh_otif_total').value;
        } else if (category === 'fillrates') {
            data.fillRates.corporate.delivered = document.getElementById('wh_corp_delivered').value;
            data.fillRates.corporate.orders = document.getElementById('wh_corp_orders').value;
            data.fillRates.sc.delivered = document.getElementById('wh_sc_delivered').value;
            data.fillRates.sc.orders = document.getElementById('wh_sc_orders').value;
            data.fillRates.core.delivered = document.getElementById('wh_core_delivered').value;
            data.fillRates.core.orders = document.getElementById('wh_core_orders').value;
            data.fillRates.emerging.delivered = document.getElementById('wh_emerging_delivered').value;
            data.fillRates.emerging.orders = document.getElementById('wh_emerging_orders').value;
        } else if (category === 'nonotif') {
            for(let i=0; i<21; i++) {
                data.nonOtif[`nonOtif_${i}`] = document.getElementById(`wh_nonotif_${i}`).value;
            }
        } else if (category === 'stockouts') {
            for(let i=0; i<22; i++) {
                data.stockOuts.value[`stockOutValue_${i}`] = document.getElementById(`wh_stock_value_${i}`).value;
                data.stockOuts.weight[`stockOutWeight_${i}`] = document.getElementById(`wh_stock_weight_${i}`).value;
            }
        } else if (category === 'warehouse') {
            data.warehouse.rmTotal = document.getElementById('wh_rm_total').value;
            data.warehouse.rmUsed = document.getElementById('wh_rm_used').value;
            data.warehouse.fgTotal = document.getElementById('wh_fg_total').value;
            data.warehouse.fgUsed = document.getElementById('wh_fg_used').value;
            data.warehouse.extTotal = document.getElementById('wh_ext_total').value;
            data.warehouse.extUsed = document.getElementById('wh_ext_used').value;
        } else if (category === 'otdl') {
            data.otdl.gma = document.getElementById('wh_gma').value;
            data.otdl.north = document.getElementById('wh_north').value;
            data.otdl.central = document.getElementById('wh_central').value;
            data.otdl.south = document.getElementById('wh_south').value;
            data.otdl.visayas = document.getElementById('wh_visayas').value;
            data.otdl.mindanao = document.getElementById('wh_mindanao').value;
            data.otdl.modernTrade = document.getElementById('wh_modern').value;
            data.otdl.pai = document.getElementById('wh_pai').value;
        } else if (category === 'trucks') {
            data.trucks.truck10w = document.getElementById('wh_truck10w').value;
            data.trucks.truckAuv = document.getElementById('wh_truckAuv').value;
            data.trucks.truck6w = document.getElementById('wh_truck6w').value;
            data.trucks.truck4w = document.getElementById('wh_truck4w').value;
            data.trucks.truck20ft = document.getElementById('wh_truck20ft').value;
        } else if (category === 'manpower') {
            data.manpower.regular = document.getElementById('wh_mp_regular').value;
            data.manpower.agency = document.getElementById('wh_mp_agency').value;
            data.manpower.resigned = document.getElementById('wh_mp_resigned').value;
            data.manpower.regHours = document.getElementById('wh_mp_regHours').value;
            data.manpower.agyHours = document.getElementById('wh_mp_agyHours').value;
            data.manpower.otHours = document.getElementById('wh_mp_otHours').value;
            data.manpower.absences = document.getElementById('wh_mp_absences').value;
            data.manpower.requiredDays = document.getElementById('wh_mp_days').value;
        }
        
        alert('Warehouse data saved');
        this.refreshWarehouse();
    },

    clearWarehouseCurrent: function() {
        const inputs = document.querySelectorAll('#warehouse-inputSections input');
        inputs.forEach(input => input.value = '');
        this.saveWarehouseData();
    },

    clearWarehouseAll: function() {
        if (confirm('Clear ALL warehouse data for this month?')) {
            const data = getCurrentData().warehouse;
            data.otif = { served: '', total: '' };
            data.volumeFill = { delivered: '', orders: '' };
            data.fillRates = { corporate: { delivered: '', orders: '' }, sc: { delivered: '', orders: '' }, core: { delivered: '', orders: '' }, emerging: { delivered: '', orders: '' } };
            for(let i=0; i<21; i++) data.nonOtif[`nonOtif_${i}`] = '';
            for(let i=0; i<22; i++) { data.stockOuts.value[`stockOutValue_${i}`] = ''; data.stockOuts.weight[`stockOutWeight_${i}`] = ''; }
            data.warehouse = { rmTotal: '', rmUsed: '', fgTotal: '', fgUsed: '', extTotal: '', extUsed: '' };
            data.otdl = { gma: '', north: '', central: '', south: '', visayas: '', mindanao: '', modernTrade: '', pai: '' };
            data.trucks = { truck10w: '', truckAuv: '', truck6w: '', truck4w: '', truck20ft: '' };
            data.manpower = { regular: '', agency: '', resigned: '', regHours: '', agyHours: '', otHours: '', absences: '', requiredDays: '' };
            this.loadWarehouseCategory();
            this.refreshWarehouse();
        }
    },

    // ==================== PROCUREMENT MODULE ====================
    switchProcurementTab: function(tab) {
        document.querySelectorAll('#dashboard-procurement .tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        document.querySelectorAll('#dashboard-procurement .tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`procurement-${tab}`).classList.add('active');
        this.currentProcurementTab = tab;
        
        if (tab === 'input') this.refreshProcurement();
        this.refreshProcurement();
    },

    refreshProcurement: function() {
        const data = getCurrentData().procurement;
        const actual = parseFloat(data.actual) || 0;
        const target = parseFloat(data.target) || 0;
        const rate = target > 0 ? (actual / target) * 100 : 0;
        const variance = actual - target;
        
        document.getElementById('proc-savingsRate').textContent = rate.toFixed(1) + '%';
        document.getElementById('proc-actual').textContent = formatCurrency(actual);
        document.getElementById('proc-target').textContent = formatCurrency(target);
        document.getElementById('proc-variance').textContent = (variance >= 0 ? '+' : '') + formatCurrency(variance);
        document.getElementById('proc-progress').style.width = Math.min(rate, 100) + '%';
        
        let status = 'No Data', statusClass = 'status-neutral';
        if (target > 0) {
            if (rate >= 100) { status = 'Exceeded'; statusClass = 'status-excellent'; }
            else if (rate >= 90) { status = 'Near Target'; statusClass = 'status-good'; }
            else if (rate >= 75) { status = 'Below Target'; statusClass = 'status-warning'; }
            else if (rate > 0) { status = 'Critical'; statusClass = 'status-critical'; }
        }
        document.getElementById('proc-status').textContent = status;
        document.getElementById('proc-status').className = 'status-badge ' + statusClass;
        
        document.getElementById('proc-actualInput').value = data.actual;
        document.getElementById('proc-targetInput').value = data.target;
    },

    saveProcurementData: function() {
        const data = getCurrentData().procurement;
        data.actual = document.getElementById('proc-actualInput').value;
        data.target = document.getElementById('proc-targetInput').value;
        alert('Procurement data saved');
        this.refreshProcurement();
    },

    clearProcurement: function() {
        if (confirm('Clear procurement data for this month?')) {
            const data = getCurrentData().procurement;
            data.actual = '';
            data.target = '';
            this.refreshProcurement();
        }
    },

    // ==================== PLANNING MODULE (Simplified) ====================
    switchPlanningTab: function(tab) {
        document.querySelectorAll('#dashboard-planning .tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        document.querySelectorAll('#dashboard-planning .tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`planning-${tab}`).classList.add('active');
        this.currentPlanningTab = tab;
        
        if (tab === 'input') this.loadPlanningCategory();
        this.refreshPlanning();
    },

    refreshPlanning: function() {
        const data = getCurrentData().planning;
        document.getElementById('planning-overviewKpis').innerHTML = `
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Safety Stocks (Days)</span></div><div class="kpi-card-main-value">PM: 220</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">FG Total</span><span class="kpi-card-detail-value">0</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">RM Total</span><span class="kpi-card-detail-value">0</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Inventory Accuracy</span></div><div class="kpi-card-main-value">0%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">FG</span><span class="kpi-card-detail-value">0%</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">RM/PM</span><span class="kpi-card-detail-value">0%</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Forecast Accuracy</span></div><div class="kpi-card-main-value">0%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Local</span><span class="kpi-card-detail-value">0%</span></div><div class="kpi-card-detail-row"><span class="kpi-card-detail-label">Export</span><span class="kpi-card-detail-value">0%</span></div></div></div>
        `;
        
        document.getElementById('planning-safetyStocks').innerHTML = `
            <div class="kpi-card"><h3>Finished Goods</h3><div class="kpi-card-detail-row"><span>Class A</span><span>0</span></div><div class="kpi-card-detail-row"><span>Class B</span><span>0</span></div><div class="kpi-card-detail-row"><span>Class C</span><span>0</span></div><div class="kpi-card-detail-row"><span>All In</span><span>0</span></div></div>
            <div class="kpi-card"><h3>Raw Materials</h3><div class="kpi-card-detail-row"><span>Class A</span><span>0</span></div><div class="kpi-card-detail-row"><span>Class B</span><span>0</span></div><div class="kpi-card-detail-row"><span>Class C</span><span>0</span></div></div>
            <div class="kpi-card"><h3>Packaging Materials</h3><div class="kpi-card-detail-row"><span>Core</span><span>48</span></div><div class="kpi-card-detail-row"><span>M7</span><span>36</span></div><div class="kpi-card-detail-row"><span>Others</span><span>136</span></div></div>
        `;
        
        document.getElementById('planning-inventoryFG').innerHTML = `<div class="section-header">FG Inventory</div><div class="two-col"><div class="kpi-card"><h3>By Weight (KGS)</h3><div class="kpi-card-detail-row"><span>Total</span><span>0</span></div></div><div class="kpi-card"><h3>By Value (PHP)</h3><div class="kpi-card-detail-row"><span>Total</span><span>₱0</span></div></div></div>`;
        document.getElementById('planning-inventoryRM').innerHTML = `<div class="section-header">RM/PM Inventory</div><div class="two-col"><div class="kpi-card"><h3>By Weight (KGS)</h3><div class="kpi-card-detail-row"><span>Total</span><span>0</span></div></div><div class="kpi-card"><h3>By Value (PHP)</h3><div class="kpi-card-detail-row"><span>Total</span><span>₱0</span></div></div></div>`;
        
        document.getElementById('planning-accuracyCards').innerHTML = `
            <div class="kpi-card"><h3>FG Accuracy</h3><div class="kpi-card-detail-row"><span>Total Count</span><span>0</span></div><div class="kpi-card-detail-row"><span>Total Missed</span><span>0</span></div><div class="kpi-card-detail-row"><span>Accuracy</span><span>0%</span></div></div>
            <div class="kpi-card"><h3>RM/PM Accuracy</h3><div class="kpi-card-detail-row"><span>Total Count</span><span>0</span></div><div class="kpi-card-detail-row"><span>Total Missed</span><span>0</span></div><div class="kpi-card-detail-row"><span>Accuracy</span><span>0%</span></div></div>
        `;
        
        document.getElementById('planning-forecastContent').innerHTML = `<div class="section-header">Forecast Accuracy</div><div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Overall Accuracy</span></div><div class="kpi-card-main-value">0%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span>Local</span><span>0%</span></div><div class="kpi-card-detail-row"><span>Export</span><span>0%</span></div></div></div>`;
    },

    loadPlanningCategory: function() {
        const category = document.getElementById('planning-category').value;
        let html = '';
        if (category === 'safety') {
            html = `<div class="input-section"><h4>FG Safety Stocks</h4><div class="input-grid"><div class="input-field"><label>Class A</label><input type="number" id="plan_fg_a" step="0.1"></div><div class="input-field"><label>Class B</label><input type="number" id="plan_fg_b" step="0.1"></div><div class="input-field"><label>Class C</label><input type="number" id="plan_fg_c" step="0.1"></div><div class="input-field"><label>All In</label><input type="number" id="plan_fg_allin" step="0.1"></div></div></div>
                    <div class="input-section"><h4>RM Safety Stocks</h4><div class="input-grid"><div class="input-field"><label>Class A</label><input type="number" id="plan_rm_a" step="0.1"></div><div class="input-field"><label>Class B</label><input type="number" id="plan_rm_b" step="0.1"></div><div class="input-field"><label>Class C</label><input type="number" id="plan_rm_c" step="0.1"></div></div></div>
                    <div class="input-section"><h4>PM Safety Stocks</h4><div class="input-grid"><div class="input-field"><label>Core</label><input type="number" id="plan_pm_core" value="48" step="0.1"></div><div class="input-field"><label>M7</label><input type="number" id="plan_pm_m7" value="36" step="0.1"></div><div class="input-field"><label>Others</label><input type="number" id="plan_pm_others" value="136" step="0.1"></div></div></div>`;
        } else {
            html = `<div class="input-section" style="grid-column: span 3; text-align: center;"><h4>Planning data input for ${category}</h4><p>Input fields coming soon</p></div>`;
        }
        document.getElementById('planning-inputSections').innerHTML = html;
    },

    savePlanningData: function() {
        alert('Planning data saved (demo)');
        this.refreshPlanning();
    },

    clearPlanningCurrent: function() {
        const inputs = document.querySelectorAll('#planning-inputSections input');
        inputs.forEach(input => input.value = '');
        this.savePlanningData();
    },

    clearPlanningAll: function() {
        if (confirm('Clear ALL planning data for this month?')) {
            this.loadPlanningCategory();
            this.refreshPlanning();
        }
    },

    // ==================== PRODUCTION MODULE (Simplified) ====================
    switchProductionTab: function(tab) {
        document.querySelectorAll('#dashboard-production .tab-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        document.querySelectorAll('#dashboard-production .tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`production-${tab}`).classList.add('active');
        this.currentProductionTab = tab;
        
        if (tab === 'input') this.loadProductionCategory();
        this.refreshProduction();
    },

    refreshProduction: function() {
        document.getElementById('production-topKpis').innerHTML = `
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Machine Utilization</span></div><div class="kpi-card-main-value">0%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span>Productive Time</span><span>0 hrs</span></div><div class="kpi-card-detail-row"><span>Total Time</span><span>0 hrs</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Production Output</span></div><div class="kpi-card-main-value">0 kg</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span>FG Output</span><span>0 kg</span></div><div class="kpi-card-detail-row"><span>Waste</span><span>0 kg</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Material Yield</span></div><div class="kpi-card-main-value">0%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span>RM Usage</span><span>0 kg</span></div><div class="kpi-card-detail-row"><span>Waste %</span><span>0%</span></div></div></div>
        `;
        
        document.getElementById('production-summaryKpis').innerHTML = `
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Scheduling Attainment</span></div><div class="kpi-card-main-value">0%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span>Actual</span><span>0 kg</span></div><div class="kpi-card-detail-row"><span>Planned</span><span>0 kg</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Manpower</span></div><div class="kpi-card-main-value">0</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span>Regular</span><span>0</span></div><div class="kpi-card-detail-row"><span>Agency</span><span>0</span></div><div class="kpi-card-detail-row"><span>OT Rate</span><span>0%</span></div></div></div>
            <div class="kpi-card"><div class="kpi-card-header"><span class="kpi-card-title">Absenteeism</span></div><div class="kpi-card-main-value">0%</div><div class="kpi-card-details"><div class="kpi-card-detail-row"><span>Absences</span><span>0</span></div><div class="kpi-card-detail-row"><span>Working Days</span><span>0</span></div></div></div>
        `;
        
        document.getElementById('production-utilTable').innerHTML = '<tr><td colspan="3" style="text-align:center">No data available</td></tr>';
        document.getElementById('production-outputTable').innerHTML = '<tr><td colspan="7" style="text-align:center">No data available</td></tr>';
        document.getElementById('production-materialTable').innerHTML = '<tr><td colspan="6" style="text-align:center">No data available</td></tr>';
        document.getElementById('production-schedTable').innerHTML = '<tr><td colspan="4" style="text-align:center">No data available</td></tr>';
        document.getElementById('production-manpowerTable').innerHTML = '<tr><td colspan="10" style="text-align:center">No data available</td></tr>';
    },

    loadProductionCategory: function() {
        const category = document.getElementById('production-category').value;
        let html = '';
        if (category === 'utilization') {
            html = `<div class="input-section" style="grid-column: span 3;"><h4>MACHINE UTILIZATION</h4><div class="input-grid"><div class="input-field"><label>Productive Time (hrs)</label><input type="number" id="prod_util_productive" step="0.01"></div><div class="input-field"><label>No Production Plan</label><input type="number" id="prod_util_noPlan" step="0.01"></div><div class="input-field"><label>No Head Count</label><input type="number" id="prod_util_noHc" step="0.01"></div><div class="input-field"><label>Change Over</label><input type="number" id="prod_util_changeover" step="0.01"></div></div></div>`;
        } else if (category === 'output') {
            html = `<div class="input-section" style="grid-column: span 3;"><h4>OUTPUT & WASTE</h4><div class="input-grid"><div class="input-field"><label>FG Output (kg)</label><input type="number" id="prod_out_fg" step="0.01"></div><div class="input-field"><label>Reprocess (kg)</label><input type="number" id="prod_out_reprocess" step="0.01"></div><div class="input-field"><label>Rejection (kg)</label><input type="number" id="prod_out_rejection" step="0.01"></div><div class="input-field"><label>Waste (kg)</label><input type="number" id="prod_out_waste" step="0.01"></div></div></div>`;
        } else {
            html = `<div class="input-section" style="grid-column: span 3; text-align: center;"><h4>Production data input for ${category}</h4><p>Input fields coming soon</p></div>`;
        }
        document.getElementById('production-inputSections').innerHTML = html;
    },

    saveProductionData: function() {
        alert('Production data saved (demo)');
        this.refreshProduction();
    },

    clearProductionCurrent: function() {
        const inputs = document.querySelectorAll('#production-inputSections input');
        inputs.forEach(input => input.value = '');
        this.saveProductionData();
    },

    clearProductionAll: function() {
        if (confirm('Clear ALL production data for this month?')) {
            this.loadProductionCategory();
            this.refreshProduction();
        }
    }
};

// Initialize and add event listeners
window.onload = function() {
    initDatabase();
    app.refreshFinance();
    app.refreshWarehouse();
    app.refreshProcurement();
    app.refreshPlanning();
    app.refreshProduction();
    updateTimestamp();
    
    document.getElementById('globalYearSelect').addEventListener('change', () => {
        app.refreshFinance();
        app.refreshWarehouse();
        app.refreshProcurement();
        app.refreshPlanning();
        app.refreshProduction();
        updateTimestamp();
    });
    
    document.getElementById('globalMonthSelect').addEventListener('change', () => {
        app.refreshFinance();
        app.refreshWarehouse();
        app.refreshProcurement();
        app.refreshPlanning();
        app.refreshProduction();
        updateTimestamp();
    });
};