// Charting functionality

const OEECharts = {
    downtimeChart: null,
    trendChart: null,

    initDowntimeChart: function() {
        const ctx = document.getElementById('downtimeChart').getContext('2d');
        const downtimeSummary = OEEApp.getDowntimeSummary();
        
        const categories = Object.keys(downtimeSummary).slice(0, 5);
        const minutes = categories.map(c => downtimeSummary[c].minutes);
        
        if (this.downtimeChart) {
            this.downtimeChart.destroy();
        }
        
        this.downtimeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories.map(c => downtimeSummary[c].name),
                datasets: [{
                    data: minutes,
                    backgroundColor: [
                        '#2563eb',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6'
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
                }
            }
        });
    },

    initTrendChart: function() {
        const ctx = document.getElementById('trendChart').getContext('2d');
        const entries = OEEApp.getEntries();
        
        // Get last 7 days
        const last7Days = [];
        const oeeValues = [];
        
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            last7Days.push(dateStr.substring(5));
            
            // Calculate average OEE for this date
            const dayEntries = entries.filter(e => e.date === dateStr);
            if (dayEntries.length > 0) {
                const avgOEE = dayEntries.reduce((sum, e) => {
                    const oee = OEEApp.calculateOEE(e).oee;
                    return sum + oee;
                }, 0) / dayEntries.length;
                oeeValues.push(avgOEE.toFixed(1));
            } else {
                oeeValues.push(null);
            }
        }
        
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'OEE %',
                    data: oeeValues,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    },

    refreshCharts: function() {
        this.initDowntimeChart();
        this.initTrendChart();
    }
};