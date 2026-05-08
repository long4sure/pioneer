/* ============================================================
   js/core/misa.js  –  MISA (Messaging & Information Service Assistant)
   ============================================================ */

const MISA = (() => {
    const NAME = 'MISA';

    // ── Knowledge Base ────────────────────────────────────────
    const KNOWLEDGE = [
        {
            keywords: ['hello', 'hi', 'hey', 'misa', 'good morning', 'good afternoon'],
            answer: "Hello {name}! I'm **MISA**, your Messaging & Information Service Assistant. I'm here to help you navigate the Pioneer SC Ops Hub and analyze your KPIs."
        },
        {
            keywords: ['save', 'data entry', 'enter', 'input'],
            answer: "To save data, navigate to the specific module (e.g., **Finance** or **Warehouse**) using the sidebar or home dashboard. Fill in the required fields in the input panel and click the **Save** button. Your data will be synced to the MySQL database immediately."
        },
        {
            keywords: ['export', 'csv', 'download', 'print', 'report'],
            answer: "You can generate reports and export data in the **System Admin** panel. Under the **Data Records** tab, you can filter by module and period, then click **Export CSV** or **Print Table**."
        },
        {
            keywords: ['warehouse', 'logistics', 'delivery', 'manpower'],
            answer: "The **Warehouse & Logistics** module tracks Delivery Volume vs Orders, Freight Costs, and Daily Manpower. You can find it by clicking the Warehouse card on the Home page or via the sidebar."
        },
        {
            keywords: ['finance', 'cost', 'actual', 'budget', 'opex', 'capex'],
            answer: "The **Finance** module provides a comparison of Actual vs Budgeted costs across Production, OPEX, and CAPEX categories. It also tracks DL and IL labor hours."
        },
        {
            keywords: ['production', 'utilization', 'waste', 'scheduling', 'line'],
            answer: "Production KPIs are split into three areas: **Utilization**, **Waste**, and **Scheduling**. You can switch between these views using the sub-tabs within the Production module."
        },
        {
            keywords: ['issue', 'bug', 'report', 'problem', 'suggestion'],
            answer: "I recommend using the **Community Board** on the Home page for reporting issues or sharing suggestions. This allows other users and admins to see and respond to your posts!"
        },
        {
            keywords: ['who are you', 'what can you do', 'help'],
            answer: "I am MISA! I can help you with:\n• **System Navigation**: Ask me where to find specific tools.\n• **KPI Summaries**: Ask for a 'status report' or 'KPI summary'.\n• **Help Guides**: Ask how to save or export data.\n• **Data Lookups**: Ask about specific modules like Finance or Planning."
        }
    ];

    // ── Logic ─────────────────────────────────────────────────
    function init() {
        const u = _getUser();
        const container = document.getElementById('misa-messages');
        if (container && container.children.length === 0) {
            const greeting = `Hello ${u.displayName || u.username || 'there'}! I'm **MISA**. How can I assist you today?`;
            renderMessage(greeting);
        }
    }

    function _getUser() {
        try { return JSON.parse(sessionStorage.getItem('sc_hub_session') || '{}'); } catch (e) { return {}; }
    }

    async function processQuery(query) {
        const q = query.toLowerCase();
        const u = _getUser();

        showTyping(true);
        await new Promise(r => setTimeout(r, 800));

        // 1. Check for summary/status reports
        if (q.includes('summary') || q.includes('report') || q.includes('status') || q.includes('kpi')) {
            const report = generateSummaryReport(q);
            renderMessage(report);
        }
        // 2. Check for navigation requests
        else if (q.includes('where') || q.includes('find') || q.includes('go to')) {
            const nav = handleNavigationQuery(q);
            renderMessage(nav);
        }
        // 3. Knowledge base matching
        else {
            let found = false;
            for (const item of KNOWLEDGE) {
                if (item.keywords.some(k => q.includes(k))) {
                    const ans = item.answer.replace('{name}', u.displayName || u.username || '');
                    renderMessage(ans);
                    found = true;
                    break;
                }
            }

            if (!found) {
                renderMessage("I'm sorry, I don't have information on that yet. Try asking about **'KPI status'**, **'how to save data'**, or for a **'summary report'**!");
            }
        }

        showTyping(false);
    }

    function handleNavigationQuery(q) {
        if (q.includes('finance')) return "You can find the **Finance** module in the sidebar under 'Operations' or by clicking the Finance card on the Home dashboard.";
        if (q.includes('warehouse')) return "The **Warehouse** module is accessible via the sidebar or the primary 'Warehouse' card on the Home page.";
        if (q.includes('admin') || q.includes('user')) return "Management tools are located in the **System Admin** panel (available to admins via the sidebar).";
        if (q.includes('post') || q.includes('board')) return "The **Community Board** is located at the bottom of the Home page.";
        return "You can use the **Sidebar** on the left to navigate between all system modules. If you are on a mobile device, tap the menu icon in the top bar to open the sidebar.";
    }

    function generateSummaryReport(q) {
        const { year, month } = getGlobalPeriod();
        const u = _getUser();

        let report = `### 📊 Performance Summary\n**Period:** ${month} ${year}\n**Generated for:** ${u.displayName || u.username}\n\n`;

        // Scrape current visible KPIs from Home Dashboard
        const fin = document.getElementById('home-fin-kpi')?.textContent || '—';
        const pl = document.getElementById('home-pl-kpi')?.textContent || '—';
        const pr = document.getElementById('home-proc-kpi')?.textContent || '—';
        const ut = document.getElementById('home-prod-kpi')?.textContent || '—';

        report += `• **Finance**: ${fin} (Actual Costs)\n`;
        report += `• **Planning**: ${pl} (Forecast Accuracy)\n`;
        report += `• **Procurement**: ${pr} (Savings/Spend)\n`;
        report += `• **Production**: ${ut} (Utilization)\n\n`;

        if (ut !== '—' && parseFloat(ut) < 70) {
            report += `⚠️ *Note: Production utilization is below the 70% target for this period.*`;
        } else {
            report += `✅ *Operations are tracking within normal parameters.*`;
        }

        return report;
    }

    function renderMessage(text) {
        const container = document.getElementById('misa-messages');
        if (!container) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const html = `
            <div class="chat-msg-row misa">
                <div class="chat-msg-info">MISA • ${time}</div>
                <div class="chat-msg-bubble">${_md(text)}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
    }

    function showTyping(show) {
        const container = document.getElementById('misa-messages');
        if (!container) return;

        const existing = container.querySelector('.misa-typing');
        if (show) {
            if (existing) return;
            container.insertAdjacentHTML('beforeend', `
                <div class="misa-typing">
                    <div class="misa-dot"></div><div class="misa-dot"></div><div class="misa-dot"></div>
                </div>`);
            container.scrollTop = container.scrollHeight;
        } else {
            existing?.remove();
        }
    }

    function _md(s) {
        return _esc(s)
            .replace(/### (.*?)\n/g, '<div style="font-weight:800;font-size:14px;margin-bottom:8px;color:var(--pioneer-gold)">$1</div>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    function _esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    return { init, processQuery };
})();
