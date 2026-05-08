/* ============================================================
   js/controllers/home.js — Home Dashboard KPI Aggregator
   ============================================================ */

function updateHomeKPIs() {
    const { year: y, month: m } = getGlobalPeriod();

    // Finance
    const fd = typeof finDB !== 'undefined' ? finDB[y]?.[m] : null;
    let ta = 0;
    if (fd) ta = (+fd.op.actual || 0) + (+fd.cap.actual || 0) + (+fd.other.actual || 0);
    setText('home-fin-kpi', fmtC(ta));

    // Planning
    const pd = typeof plDB !== 'undefined' ? plDB[y]?.[m] : null;
    if (pd) {
        const plVals = ['fcGma','fcNorth','fcSouth','fcVis','fcMind','fcMT','fcPsbsi','fcIndo','fcIndia','fcDirect']
            .map(k => parseFloat(pd[k]) || 0)
            .filter(v => v > 0);
        setText('home-pl-kpi', plVals.length ? (plVals.reduce((a, b) => a + b, 0) / plVals.length).toFixed(2) + '%' : '0%');
    } else {
        setText('home-pl-kpi', '0%');
    }

    // Procurement
    const prd = typeof procDB !== 'undefined' ? procDB[y]?.[m] : null;
    if (prd) {
        const pa2 = +prd.actual || 0;
        const pt2 = +prd.target || 0;
        setText('home-proc-kpi', pt2 > 0 ? (pa2 / pt2 * 100).toFixed(2) + '%' : '0%');
    } else {
        setText('home-proc-kpi', '0%');
    }

    // Production - Utilization
    let ou = 0;
    const udb = typeof utilDB !== 'undefined' ? utilDB[y]?.[m] : null;
    if (udb && typeof utilLines !== 'undefined') {
        let tProd = 0, tTime = 0;
        utilLines.forEach(l => {
            const d = udb[l];
            if (d) {
                tProd += +d.productive || 0;
                tTime += typeof utilKeys2 !== 'undefined' ? utilKeys2.reduce((s, k) => s + (+d[k] || 0), 0) : 0;
            }
        });
        ou = tTime > 0 ? tProd / tTime * 100 : 0;
    }
    setText('home-prod-kpi', ou.toFixed(2) + '%');

    // Warehouse - SC Fill Rate
    const wd = typeof whDB !== 'undefined' ? whDB[y]?.[m] : null;
    if (wd && wd.fr && wd.fr.sc) {
        const fdv = +wd.fr.sc.del || 0;
        const fo = +wd.fr.sc.ord || 0;
        setText('home-wh-kpi', fo > 0 ? (fdv / fo * 100).toFixed(2) + '%' : '0%');
    } else {
        setText('home-wh-kpi', '0%');
    }
}

// ── Community Board / Feedback ─────────────────────────────

function homeInitBoard() {
    loadHomePosts();
}

async function loadHomePosts() {
    const list = document.getElementById('home-posts-list');
    if (!list) return;

    const data = await API.postsList({ limit: 20 });
    if (!data || data.error || !data.posts) {
        list.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted);">Failed to load community board.${data?.error ? '<br><small>'+data.error+'</small>' : ''}</div>`;
        return;
    }

    if (data.posts.length === 0) {
        list.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted); font-size:13px; background:var(--bg-light); border-radius:var(--radius); border:1px dashed var(--border);">No posts yet. Be the first to share your thoughts!</div>`;
        return;
    }

    renderHomePosts(data.posts);
}

function renderHomePosts(posts) {
    const list = document.getElementById('home-posts-list');
    if (!list) return;

    list.innerHTML = posts.map(p => {
        let dateStr = p.created_at;
        if (dateStr && dateStr.includes('-')) dateStr = dateStr.replace(/-/g, '/');
        const date = new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        
        let adminReplyHtml = '';
        if (p.admin_reply) {
            adminReplyHtml = `
                <div class="home-post-reply">
                    <div class="home-post-reply-icon">
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    </div>
                    <div class="home-post-reply-content">
                        <div class="home-post-reply-label">Dev Team Reply</div>
                        <div class="home-post-reply-text">${p.admin_reply}</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="home-post-card">
                <div class="home-post-head">
                    <div class="home-post-meta">
                        <span class="home-post-badge badge-${p.category}">${p.category}</span>
                        <span class="home-post-author">${p.display_name}</span>
                        <span>•</span>
                        <span>${date}</span>
                    </div>
                    <span class="home-post-status status-${p.status}">${p.status.replace('_', ' ')}</span>
                </div>
                <div class="home-post-title">${p.title}</div>
                <div class="home-post-body">${p.body}</div>
                ${adminReplyHtml}
            </div>
        `;
    }).join('');
}

function homeShowPostForm() {
    document.getElementById('home-post-form-wrap').style.display = 'block';
    document.getElementById('home-post-title').focus();
}

function homeHidePostForm() {
    document.getElementById('home-post-form-wrap').style.display = 'none';
    // Clear form
    document.getElementById('home-post-title').value = '';
    document.getElementById('home-post-body').value = '';
}

async function homeSubmitPost() {
    const cat = document.getElementById('home-post-category').value;
    const title = document.getElementById('home-post-title').value.trim();
    const body = document.getElementById('home-post-body').value.trim();

    if (!title || !body) {
        alert('Please provide both a subject and details.');
        return;
    }

    const res = await API.postsCreate(cat, title, body);
    if (res && !res.error) {
        showToast('Post submitted successfully!', '✅');
        homeHidePostForm();
        loadHomePosts();
    } else {
        alert(res?.error || res?.msg || 'Failed to submit post.');
    }
}

