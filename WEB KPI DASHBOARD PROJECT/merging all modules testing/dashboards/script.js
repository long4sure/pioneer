// Dashboard Configuration
const dashboards = [
    {
        id: 'finance',
        name: 'Finance Dashboard',
        description: 'Production volume, operational costs, capital expenditure, and labor analysis',
        icon: '💰',
        color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        path: 'dashboards/finance.html',
        previewKPIs: [
            { label: 'Production Volume', key: 'prodValue' },
            { label: 'Operational Cost', key: 'opValue' },
            { label: 'Overall Efficiency', key: 'totalPercent' }
        ]
    },
    {
        id: 'sc-planning',
        name: 'SC Planning Dashboard',
        description: 'Safety stocks, inventory levels, accuracy metrics, and forecast performance',
        icon: '📦',
        color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        path: 'dashboards/sc-planning.html',
        previewKPIs: [
            { label: 'Total Inventory (FG)', key: 'invFgKgs' },
            { label: 'Forecast Accuracy', key: 'forecastOverall' },
            { label: 'FG Accuracy', key: 'accFg' }
        ]
    },
    {
        id: 'procurement',
        name: 'Procurement Dashboard',
        description: 'Savings performance tracking against targets with achievement rates',
        icon: '🛒',
        color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        path: 'dashboards/procurement.html',
        previewKPIs: [
            { label: 'Savings Rate', key: 'savingsRate' },
            { label: 'Actual Savings', key: 'actualSavings' },
            { label: 'Variance', key: 'varianceSavings' }
        ]
    },
    {
        id: 'production',
        name: 'Production Dashboard',
        description: 'Machine utilization, output & wastage, and scheduling attainment metrics',
        icon: '🏭',
        color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        path: 'dashboards/production.html',
        previewKPIs: [
            { label: 'Machine Utilization', key: 'utilOverall' },
            { label: 'Total Output', key: 'wasteTotalOutput' },
            { label: 'Schedule Compliance', key: 'schedOverall' }
        ]
    },
    {
        id: 'warehouse',
        name: 'Warehouse & Logistics',
        description: 'OTIF rates, fill rates, stock outs, warehouse utilization, and manpower',
        icon: '🏢',
        color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        path: 'dashboards/warehouse.html',
        previewKPIs: [
            { label: 'OTIF Rate', key: 'otifValue' },
            { label: 'WH Utilization', key: 'whUtilValue' },
            { label: 'Fill Rate', key: 'volumeFillValue' }
        ]
    }
];

// Global state
let activeFilter = 'all';
let currentPreviewData = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardCards();
    attachEventListeners();
    startAutoRefresh();
});

// Load dashboard cards into grid
function loadDashboardCards() {
    const grid = document.getElementById('dashboardGrid');
    const filteredDashboards = activeFilter === 'all' 
        ? dashboards 
        : dashboards.filter(d => d.id === activeFilter);
    
    grid.innerHTML = filteredDashboards.map(dashboard => `
        <div class="dashboard-card" data-dashboard-id="${dashboard.id}">
            <div class="card-header" style="background: ${dashboard.color}">
                <div class="card-badge">${dashboard.icon}</div>
                <h3>${dashboard.name}</h3>
                <p>${dashboard.description}</p>
            </div>
            <div class="card-content">
                <div class="kpi-preview" id="preview-${dashboard.id}">
                    ${generatePreviewPlaceholder(dashboard)}
                </div>
                <div class="card-actions">
                    <button class="btn-preview" onclick="previewDashboard('${dashboard.id}')">
                        👁️ Preview
                    </button>
                    <button class="btn-view" onclick="openDashboard('${dashboard.path}')">
                        🚀 Open Dashboard
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Load preview data for each dashboard
    dashboards.forEach(dashboard => {
        loadPreviewData(dashboard);
    });
}

// Generate preview placeholder
function generatePreviewPlaceholder(dashboard) {
    return dashboard.previewKPIs.map(kpi => `
        <div class="preview-item">
            <span class="preview-label">${kpi.label}</span>
            <span class="preview-value" id="${dashboard.id}-${kpi.key}">--</span>
        </div>
    `).join('');
}

// Load preview data from localStorage or default
function loadPreviewData(dashboard) {
    const year = document.getElementById('globalYearSelect').value;
    const month = document.getElementById('globalMonthSelect').value;
    const storageKey = `${dashboard.id}_${year}_${month}`;
    
    // Try to get stored data
    const storedData = localStorage.getItem(storageKey);
    if (storedData) {
        updatePreviewValues(dashboard, JSON.parse(storedData));
    } else {
        // Use default preview data
        const defaultData = getDefaultPreviewData(dashboard.id);
        updatePreviewValues(dashboard, defaultData);
    }
}

// Get default preview data for each dashboard
function getDefaultPreviewData(dashboardId) {
    const defaults = {
        finance: {
            prodValue: '1,245 MT',
            opValue: '₱2.3M',
            totalPercent: '94.2%'
        },
        'sc-planning': {
            invFgKgs: '45,678 kgs',
            forecastOverall: '87.3%',
            accFg: '96.5%'
        },
        procurement: {
            savingsRate: '78.5%',
            actualSavings: '₱2.6M',
            varianceSavings: '₱0.7M'
        },
        production: {
            utilOverall: '82.4%',
            wasteTotalOutput: '156,789 kg',
            schedOverall: '91.2%'
        },
        warehouse: {
            otifValue: '94.8%',
            whUtilValue: '76.3%',
            volumeFillValue: '92.1%'
        }
    };
    return defaults[dashboardId] || {};
}

// Update preview values
function updatePreviewValues(dashboard, data) {
    dashboard.previewKPIs.forEach(kpi => {
        const element = document.getElementById(`${dashboard.id}-${kpi.key}`);
        if (element && data[kpi.key]) {
            element.textContent = data[kpi.key];
            element.style.animation = 'fadeIn 0.5s ease';
        }
    });
}

// Preview dashboard in modal
function previewDashboard(dashboardId) {
    const dashboard = dashboards.find(d => d.id === dashboardId);
    if (!dashboard) return;
    
    const modal = document.getElementById('dashboardModal');
    const modalTitle = document.getElementById('modalTitle');
    const frame = document.getElementById('dashboardFrame');
    const openFullBtn = document.getElementById('openFullDashboard');
    
    modalTitle.textContent = `${dashboard.icon} ${dashboard.name} - Preview`;
    frame.src = dashboard.path;
    
    // Store current dashboard path for open full button
    openFullBtn.onclick = () => {
        openDashboard(dashboard.path);
    };
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Apply global filters to iframe when loaded
    frame.onload = () => {
        setTimeout(() => {
            applyFiltersToIframe(frame);
        }, 500);
    };
}

// Open dashboard in new tab
function openDashboard(path) {
    const year = document.getElementById('globalYearSelect').value;
    const month = document.getElementById('globalMonthSelect').value;
    window.open(`${path}?year=${year}&month=${month}`, '_blank');
}

// Apply global filters to all dashboards
function applyGlobalFilters() {
    const year = document.getElementById('globalYearSelect').value;
    const month = document.getElementById('globalMonthSelect').value;
    
    // Update all visible previews
    dashboards.forEach(dashboard => {
        loadPreviewData(dashboard);
    });
    
    // Apply to iframe if modal is open
    const modal = document.getElementById('dashboardModal');
    if (modal.style.display === 'block') {
        const frame = document.getElementById('dashboardFrame');
        applyFiltersToIframe(frame);
    }
    
    showNotification(`Filters applied: ${month} ${year}`);
}

// Apply filters to iframe content via postMessage
function applyFiltersToIframe(iframe) {
    const year = document.getElementById('globalYearSelect').value;
    const month = document.getElementById('globalMonthSelect').value;
    
    iframe.contentWindow.postMessage({
        type: 'APPLY_FILTERS',
        year: year,
        month: month
    }, '*');
}

// Filter dashboards by category
function filterDashboards(category) {
    activeFilter = category;
    
    // Update active button state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === category) {
            btn.classList.add('active');
        }
    });
    
    // Reload cards with animation
    const grid = document.getElementById('dashboardGrid');
    grid.style.opacity = '0';
    setTimeout(() => {
        loadDashboardCards();
        grid.style.opacity = '1';
    }, 200);
}

// Refresh all dashboards
function refreshAllDashboards() {
    showNotification('Refreshing all dashboards...');
    
    dashboards.forEach(dashboard => {
        loadPreviewData(dashboard);
    });
    
    // Refresh iframe if open
    const modal = document.getElementById('dashboardModal');
    if (modal.style.display === 'block') {
        const frame = document.getElementById('dashboardFrame');
        frame.src = frame.src;
    }
    
    setTimeout(() => {
        showNotification('All dashboards refreshed!', 'success');
    }, 1000);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 2000;
        animation: fadeInUp 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Auto-refresh every 5 minutes
let refreshInterval;
function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        refreshAllDashboards();
    }, 300000);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}

// Attach event listeners
function attachEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterDashboards(btn.dataset.filter));
    });
    
    // Apply filters button
    document.getElementById('applyGlobalFilter').addEventListener('click', applyGlobalFilters);
    
    // Refresh button
    document.getElementById('refreshAllBtn').addEventListener('click', refreshAllDashboards);
    
    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
        showNotification('Settings panel coming soon!', 'info');
    });
    
    // Modal close
    const modal = document.getElementById('dashboardModal');
    const closeButtons = document.querySelectorAll('.modal-close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            document.getElementById('dashboardFrame').src = '';
        });
    });
    
    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            document.getElementById('dashboardFrame').src = '';
        }
    });
    
    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            document.getElementById('dashboardFrame').src = '';
        }
    });
    
    // Listen for messages from iframes
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'DASHBOARD_READY') {
            applyFiltersToIframe(document.getElementById('dashboardFrame'));
        }
        if (event.data && event.data.type === 'UPDATE_PREVIEW') {
            const dashboard = dashboards.find(d => d.id === event.data.dashboardId);
            if (dashboard) {
                updatePreviewValues(dashboard, event.data.data);
                // Save to localStorage
                const year = document.getElementById('globalYearSelect').value;
                const month = document.getElementById('globalMonthSelect').value;
                const storageKey = `${dashboard.id}_${year}_${month}`;
                localStorage.setItem(storageKey, JSON.stringify(event.data.data));
            }
        }
    });
}

// Export functions for global access
window.previewDashboard = previewDashboard;
window.openDashboard = openDashboard;
window.filterDashboards = filterDashboards;