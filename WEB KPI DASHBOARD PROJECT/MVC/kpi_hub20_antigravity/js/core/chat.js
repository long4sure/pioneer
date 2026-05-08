/* ============================================================
   js/core/chat.js  –  Chat Logic & Real-time Polling
   ============================================================ */

const Chat = (() => {
    let _isOpen = false;
    let _lastId = 0;
    let _pollTimer = null;
    let _currentUser = null;
    let _unreadCount = 0;

    // ── Initialization ────────────────────────────────────────
    async function init() {
        // Only run if user is logged in
        _currentUser = JSON.parse(sessionStorage.getItem('sc_hub_session') || 'null');
        if (!_currentUser || !_currentUser.dbToken) return;

        console.log('Initializing Chat...');
        
        // Initial load
        await fetchMessages();
        
        // Start polling every 5 seconds
        startPolling();

        // Bind events
        document.getElementById('chat-toggle').addEventListener('click', toggle);
        document.getElementById('chat-close').addEventListener('click', toggle);
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });
    }

    function toggle() {
        _isOpen = !_isOpen;
        const win = document.getElementById('chat-window');
        if (_isOpen) {
            win.classList.add('open');
            _unreadCount = 0;
            updateBadge();
            scrollToBottom();
            document.getElementById('chat-input').focus();
        } else {
            win.classList.remove('open');
        }
    }

    function startPolling() {
        if (_pollTimer) clearInterval(_pollTimer);
        _pollTimer = setInterval(fetchMessages, 5000);
    }

    async function fetchMessages() {
        try {
            const data = await API.chatList(_lastId);
            if (!data || data.error) return;

            if (data.length > 0) {
                const isFirstLoad = _lastId === 0;
                renderMessages(data);
                
                // Set last ID for next poll
                _lastId = data[data.length - 1].id;

                if (!isFirstLoad && !_isOpen) {
                    _unreadCount += data.length;
                    updateBadge();
                }

                if (_isOpen || isFirstLoad) {
                    scrollToBottom();
                }
            }
        } catch (e) {
            console.error('Chat poll error:', e);
        }
    }

    function renderMessages(messages) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const html = messages.map(m => {
            const isMe = m.username === _currentUser.username;
            const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="chat-msg-row ${isMe ? 'me' : 'other'}" data-id="${m.id}">
                    <div class="chat-msg-info">
                        ${isMe ? '' : `<span style="font-weight:700">${_esc(m.display_name)}</span> • `}${time}
                    </div>
                    <div class="chat-msg-bubble">
                        ${_esc(m.message)}
                    </div>
                </div>
            `;
        }).join('');

        if (_lastId === 0) container.innerHTML = ''; // Clear only on first load
        container.insertAdjacentHTML('beforeend', html);
    }

    async function send() {
        const input = document.getElementById('chat-input');
        const msg = input.value.trim();
        if (!msg) return;

        input.value = ''; // Clear immediately for UX
        input.disabled = true;

        const res = await API.chatSend(msg);
        input.disabled = false;
        input.focus();

        if (res && !res.error) {
            // Success: the polling will pick it up, or we can manually trigger a poll
            fetchMessages();
        } else {
            alert(res?.error || 'Failed to send message');
        }
    }

    function updateBadge() {
        const badge = document.getElementById('chat-badge');
        if (_unreadCount > 0) {
            badge.textContent = _unreadCount > 99 ? '99+' : _unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    function scrollToBottom() {
        const container = document.getElementById('chat-messages');
        container.scrollTop = container.scrollHeight;
    }

    function _esc(s) {
        return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    return { init, toggle, send };
})();
