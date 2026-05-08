// Data Models and Sample Data

const OEEApp = OEEApp || {};

// Downtime Categories based on the Excel template
OEEApp.downtimeCategories = {
    planned: [
        { code: 'A1', name: '5S, Sanitation' },
        { code: 'A2', name: 'Breaktime' },
        { code: 'A3', name: 'CLAIR' },
        { code: 'A4', name: 'Changeover/Setup' },
        { code: 'A5', name: 'Preventive Maintenance' },
        { code: 'A6', name: 'Flag Ceremony' },
        { code: 'A7', name: 'General Assembly' },
        { code: 'A8', name: 'Performance Dialogue' },
        { code: 'A9', name: 'Trial Run' },
        { code: 'A10', name: 'Training/Meetings' },
        { code: 'A11', name: 'Company Activities' },
        { code: 'A12', name: 'Emergency Drills' },
        { code: 'A13', name: 'No Production Plan' },
        { code: 'A14', name: 'No Head Count' }
    ],
    uncontrollable: [
        { code: 'UDT1', name: 'Force Majeure' },
        { code: 'UDT2', name: 'Grid Power Failure' },
        { code: 'UDT3', name: 'Supply Chain Disruption' },
        { code: 'UDT4', name: 'Gov\'t/Regulatory Issues' },
        { code: 'UDT5', name: 'External Infrastructure' },
        { code: 'UDT6', name: 'Labor External Issues' },
        { code: 'UDT7', name: 'Late Shuttle Service' }
    ],
    breakdowns: [
        { code: 'B1', name: 'Gear Box Problem' },
        { code: 'B2', name: 'Bearing Problem' },
        { code: 'B3', name: 'Compressed Air Low' },
        { code: 'B4', name: 'Heater Problem' },
        { code: 'B5', name: 'Piston Seal Problem' },
        { code: 'B6', name: 'Sensor Problem' },
        { code: 'B7', name: 'Weight Problem (Leak)' },
        { code: 'B8', name: 'Weight Problem (Pressure)' },
        { code: 'B9', name: 'Pressure Gauge Problem' },
        { code: 'B10', name: 'Foot Switch Problem' },
        { code: 'B11', name: 'Air Motor Problem' },
        { code: 'B12', name: 'Extrusion Pump Problem' },
        { code: 'B13', name: 'Conveyor Problem' },
        { code: 'B14', name: 'Can Closer Problem' },
        { code: 'B15', name: 'Crimping Problem' },
        { code: 'B16', name: 'Follower Plate Problem' }
    ]
};

// Sample production entries
OEEApp.sampleEntries = [
    {
        id: 1,
        date: '2024-03-01',
        shift: 'Day',
        machine: 'Mixer-01',
        product: 'SKU-A',
        hours: 8,
        units: 5000,
        defects: 50,
        idealRate: 120,
        downtime: [
            { category: 'A2', minutes: 30, type: 'planned' },
            { category: 'B1', minutes: 15, type: 'breakdown' }
        ]
    },
    {
        id: 2,
        date: '2024-03-01',
        shift: 'Night',
        machine: 'Mixer-01',
        product: 'SKU-B',
        hours: 7.5,
        units: 4300,
        defects: 35,
        idealRate: 115,
        downtime: [
            { category: 'A4', minutes: 45, type: 'planned' },
            { category: 'UDT2', minutes: 20, type: 'uncontrollable' }
        ]
    },
    {
        id: 3,
        date: '2024-03-02',
        shift: 'Day',
        machine: 'Filler-01',
        product: 'SKU-C',
        hours: 8,
        units: 6000,
        defects: 45,
        idealRate: 125,
        downtime: [
            { category: 'A5', minutes: 60, type: 'planned' }
        ]
    },
    {
        id: 4,
        date: '2024-03-02',
        shift: 'Afternoon',
        machine: 'Mixer-02',
        product: 'SKU-A',
        hours: 8,
        units: 5200,
        defects: 60,
        idealRate: 120,
        downtime: [
            { category: 'A2', minutes: 30, type: 'planned' },
            { category: 'B6', minutes: 25, type: 'breakdown' },
            { category: 'A4', minutes: 20, type: 'planned' }
        ]
    },
    {
        id: 5,
        date: '2024-03-03',
        shift: 'Day',
        machine: 'Packager-01',
        product: 'SKU-D',
        hours: 8,
        units: 4800,
        defects: 25,
        idealRate: 100,
        downtime: [
            { category: 'A1', minutes: 15, type: 'planned' }
        ]
    },
    {
        id: 6,
        date: '2024-03-03',
        shift: 'Night',
        machine: 'Mixer-01',
        product: 'SKU-B',
        hours: 7,
        units: 3800,
        defects: 30,
        idealRate: 115,
        downtime: [
            { category: 'UDT3', minutes: 45, type: 'uncontrollable' },
            { category: 'B3', minutes: 20, type: 'breakdown' }
        ]
    },
    {
        id: 7,
        date: '2024-03-04',
        shift: 'Day',
        machine: 'Filler-01',
        product: 'SKU-C',
        hours: 8,
        units: 5900,
        defects: 40,
        idealRate: 125,
        downtime: [
            { category: 'A4', minutes: 30, type: 'planned' },
            { category: 'A5', minutes: 30, type: 'planned' }
        ]
    }
];

// Initialize local storage with sample data if empty
if (!localStorage.getItem('oeeEntries')) {
    localStorage.setItem('oeeEntries', JSON.stringify(OEEApp.sampleEntries));
}

// Helper functions
OEEApp.getEntries = function() {
    return JSON.parse(localStorage.getItem('oeeEntries')) || [];
};

OEEApp.saveEntry = function(entry) {
    const entries = this.getEntries();
    if (entry.id) {
        // Update existing
        const index = entries.findIndex(e => e.id === entry.id);
        if (index !== -1) entries[index] = entry;
    } else {
        // Add new
        entry.id = Date.now();
        entries.push(entry);
    }
    localStorage.setItem('oeeEntries', JSON.stringify(entries));
    return entry;
};

OEEApp.deleteEntry = function(id) {
    const entries = this.getEntries();
    const filtered = entries.filter(e => e.id !== id);
    localStorage.setItem('oeeEntries', JSON.stringify(filtered));
};

OEEApp.calculateOEE = function(entry) {
    const availableTime = entry.hours * 60;
    const totalDowntime = entry.downtime.reduce((sum, d) => sum + d.minutes, 0);
    const operatingTime = availableTime - totalDowntime;
    const idealOutput = operatingTime * entry.idealRate;
    const actualOutput = entry.units;
    const goodOutput = entry.units - entry.defects;
    
    const availability = operatingTime / availableTime;
    const performance = actualOutput / idealOutput;
    const quality = goodOutput / actualOutput;
    const oee = availability * performance * quality;
    
    return {
        availability: availability * 100,
        performance: performance * 100,
        quality: quality * 100,
        oee: oee * 100,
        operatingTime,
        totalDowntime
    };
};

OEEApp.getDowntimeSummary = function() {
    const entries = this.getEntries();
    const summary = {};
    
    entries.forEach(entry => {
        entry.downtime.forEach(d => {
            if (!summary[d.category]) {
                summary[d.category] = {
                    minutes: 0,
                    name: this.getDowntimeName(d.category),
                    type: d.type
                };
            }
            summary[d.category].minutes += d.minutes;
        });
    });
    
    return summary;
};

OEEApp.getDowntimeName = function(code) {
    const allCategories = [
        ...this.downtimeCategories.planned,
        ...this.downtimeCategories.uncontrollable,
        ...this.downtimeCategories.breakdowns
    ];
    const cat = allCategories.find(c => c.code === code);
    return cat ? cat.name : code;
};