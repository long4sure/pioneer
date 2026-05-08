// Database wrapper for IndexedDB support
const WarehouseDB = {
    dbName: 'WarehouseDashboard',
    dbVersion: 1,
    db: null,

    // Initialize database
    init: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create stores
                if (!db.objectStoreNames.contains('snapshots')) {
                    const snapshotStore = db.createObjectStore('snapshots', { keyPath: 'id' });
                    snapshotStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('dailyData')) {
                    const dailyStore = db.createObjectStore('dailyData', { keyPath: 'date' });
                }
                
                if (!db.objectStoreNames.contains('auditLog')) {
                    const auditStore = db.createObjectStore('auditLog', { keyPath: 'id', autoIncrement: true });
                    auditStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    },

    // Save snapshot
    saveSnapshot: async function(data, name = '') {
        const snapshot = {
            id: Date.now(),
            name: name || `Snapshot ${new Date().toLocaleString()}`,
            timestamp: new Date().toISOString(),
            data: data
        };
        
        const transaction = this.db.transaction(['snapshots'], 'readwrite');
        const store = transaction.objectStore('snapshots');
        
        return new Promise((resolve, reject) => {
            const request = store.add(snapshot);
            request.onsuccess = () => resolve(snapshot.id);
            request.onerror = () => reject(request.error);
        });
    },

    // Get all snapshots
    getSnapshots: async function() {
        const transaction = this.db.transaction(['snapshots'], 'readonly');
        const store = transaction.objectStore('snapshots');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Get snapshot by ID
    getSnapshot: async function(id) {
        const transaction = this.db.transaction(['snapshots'], 'readonly');
        const store = transaction.objectStore('snapshots');
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // Delete snapshot
    deleteSnapshot: async function(id) {
        const transaction = this.db.transaction(['snapshots'], 'readwrite');
        const store = transaction.objectStore('snapshots');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // Log audit entry
    logAudit: async function(action, user = 'system', details = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            action: action,
            user: user,
            details: details
        };
        
        const transaction = this.db.transaction(['auditLog'], 'readwrite');
        const store = transaction.objectStore('auditLog');
        
        return new Promise((resolve, reject) => {
            const request = store.add(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    // Get audit log
    getAuditLog: async function(limit = 100) {
        const transaction = this.db.transaction(['auditLog'], 'readonly');
        const store = transaction.objectStore('auditLog');
        const index = store.index('timestamp');
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(null, 'prev');
            const logs = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && logs.length < limit) {
                    logs.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(logs);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
};