/* ============================================================
   js/core/ui-components.js — Reusable UI Generation
   ============================================================ */

const UIC = {
    /**
     * Renders a table body given an array of data.
     * @param {string} containerId - The ID of the <tbody> element
     * @param {Array} data - Array of data objects
     * @param {function} rowRenderer - Function(row, index) returning an HTML string for a <tr>
     * @param {string} emptyMsg - Message to show if data is empty
     */
    renderTable: function(containerId, data, rowRenderer, emptyMsg = 'No data available.') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:24px;">${emptyMsg}</td></tr>`;
            return;
        }

        container.innerHTML = data.map(rowRenderer).join('');
    },

    /**
     * Renders a grid of input fields.
     * @param {string} containerId - The ID of the container element
     * @param {string} title - Section title
     * @param {Array} fields - Array of config: [label, path, key, placeholder]
     * @param {Object} dataObj - The data object to extract values from
     * @param {string} prefix - Prefix for the input IDs
     */
    renderInputGrid: function(containerId, title, fields, dataObj, prefix = 'in') {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = `<div class="input-section" style="grid-column:1/-1">`;
        if (title) {
            html += `<div class="input-section-title">${title}</div>`;
        }
        html += `<div class="input-fields-grid">`;

        fields.forEach(([lbl, path, key, ph]) => {
            const parts = path ? path.split('.') : [];
            let v = dataObj; 
            if (v) {
                parts.forEach(p => { if (v) v = v[p]; });
                if (v && key) v = v[key];
            }
            if (v === undefined || v === null) v = '';
            
            const idPath = path ? path.replace(/\./g, '_') + '_' : '';
            const id = `${prefix}_${idPath}${key}`;
            
            html += `
                <div class="input-field-wrap">
                    <label class="input-field-label" for="${id}">${lbl}</label>
                    <input class="input-field" type="number" inputmode="decimal" id="${id}" value="${v}" placeholder="${ph || '0'}">
                </div>
            `;
        });

        html += `</div></div>`;
        container.innerHTML = html;
    },

    /**
     * Extracts values from rendered inputs back into a data object.
     * @param {Array} fields - Array of config: [label, path, key, placeholder]
     * @param {Object} targetObj - The data object to update
     * @param {string} prefix - Prefix for the input IDs
     */
    extractInputGrid: function(fields, targetObj, prefix = 'in') {
        fields.forEach(([lbl, path, key, ph]) => {
            const idPath = path ? path.replace(/\./g, '_') + '_' : '';
            const id = `${prefix}_${idPath}${key}`;
            const el = document.getElementById(id);
            if (!el) return;

            const parts = path ? path.split('.') : [];
            let obj = targetObj;
            parts.forEach(p => {
                if (!obj[p]) obj[p] = {};
                obj = obj[p];
            });
            if (key) {
                obj[key] = el.value;
            }
        });
    }
};
