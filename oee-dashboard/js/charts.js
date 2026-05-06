// Charts configuration for OEE Dashboard
const OEECharts = {
    oeeChart: null,
    trendChart: null,
    downtimeChart: null,
    colors: {
        primary: '#01b8aa',
        blue: '#0078d4',
        green: '#107c41',
        yellow: '#ffb900',
        red: '#d13438',
        purple: '#8764b8',
        orange: '#d83b01'
    },

    init: function(data) {
        this.initOEEChart(data);
        this.initTrendChart(data);
        this.initDowntimeChart(data);
    },

    initOEEChart: function(data) {
        const ctx = document.getElementById('oeeChart')?.getContext('2d');
        if (!ctx) return;

        if (this.oeeChart) {
            this.oeeChart.destroy();
        }

        const lineNames = data.lines.map(l => l.line_name);
        const oeeData = data.lines.map(l => parseFloat(l.oee));
        const rftData = data.lines.map(l => parseFloat(l.rft));
        const availData = data.lines.map(l => parseFloat(l.avail));

        this.oeeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: lineNames,
                datasets: [
                    {
                        label: 'OEE',
                        data: oeeData,
                        backgroundColor: this.colors.primary,
                        borderRadius: 4,
                        barPercentage: 0.7
                    },
                    {
                        label: 'RFT',
                        data: rftData,
                        backgroundColor: this.colors.blue,
                        borderRadius: 4,
                        barPercentage: 0.7
                    },
                    {
                        label: 'Availability',
                        data: availData,
                        backgroundColor: this.colors.green,
                        borderRadius: 4,
                        barPercentage: 0.7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: '#e8edf3',
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            },
                            stepSize: 20
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    },

    initTrendChart: function(data) {
        const ctx = document.getElementById('trendChart')?.getContext('2d');
        if (!ctx) return;

        if (this.trendChart) {
            this.trendChart.destroy();
        }

        // Get last 7 days of data
        const dates = [];
        const oeeTrend = [];
        const availTrend = [];
        
        if (data.trends && data.trends.length > 0) {
            data.trends.forEach(day => {
                dates.push(day.date);
                oeeTrend.push(parseFloat(day.avg_oee));
                availTrend.push(parseFloat(day.avg_avail));
            });
        } else {
            // Generate sample data if no trends available
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                dates.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                oeeTrend.push(75 + Math.random() * 15);
                availTrend.push(80 + Math.random() * 12);
            }
        }

        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'OEE',
                        data: oeeTrend,
                        borderColor: this.colors.primary,
                        backgroundColor: 'rgba(1, 184, 170, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: this.colors.primary
                    },
                    {
                        label: 'Availability',
                        data: availTrend,
                        borderColor: this.colors.blue,
                        backgroundColor: 'rgba(0, 120, 212, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: this.colors.blue
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.raw.toFixed(1) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: '#e8edf3',
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            },
                            stepSize: 20
                        }
                    }
                }
            }
        });
    },

    initDowntimeChart: function(data) {
        const ctx = document.getElementById('downtimeChart')?.getContext('2d');
        if (!ctx) return;

        if (this.downtimeChart) {
            this.downtimeChart.destroy();
        }

        const downtimeData = data.downtime || [
            { category: 'Planned', minutes: 245 },
            { category: 'Breakdowns', minutes: 180 },
            { category: 'Uncontrollable', minutes: 75 }
        ];

        this.downtimeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: downtimeData.map(d => d.category),
                datasets: [{
                    data: downtimeData.map(d => d.minutes),
                    backgroundColor: [
                        this.colors.blue,
                        this.colors.orange,
                        this.colors.red
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} min (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    },

    update: function(data) {
        this.initOEEChart(data);
        this.initTrendChart(data);
        this.initDowntimeChart(data);
    },

    resize: function() {
        if (this.oeeChart) this.oeeChart.resize();
        if (this.trendChart) this.trendChart.resize();
        if (this.downtimeChart) this.downtimeChart.resize();
    }
};