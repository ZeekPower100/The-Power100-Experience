/**
 * AI Persona Side Panel — chat client
 *
 * Reads ICPersonaConfig (printed by single-ic_contributor.php) for:
 *   - icId, p100Id, name, firstName, headshot
 *   - memberWpId, memberEmail
 *   - bridgeTs, bridgeNonce  (HMAC bridge)
 *   - apiBase                 (TPE backend base URL)
 *
 * Builds a slide-out chat panel + floating launcher button.
 */
(function () {
    'use strict';

    var cfg = window.ICPersonaConfig;
    if (!cfg || !cfg.icId || !cfg.apiBase) return;

    var conversation = []; // [{role:'user'|'assistant', content:'...'}]
    var sending = false;

    // ── Build DOM ──────────────────────────────────────────────────────────
    var initials = (cfg.name || 'X').split(/\s+/).map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();

    var launcher = document.createElement('button');
    launcher.className = 'ic-persona-launcher';
    launcher.type = 'button';
    launcher.setAttribute('aria-label', 'Open chat with ' + cfg.firstName);
    launcher.innerHTML =
        '<div class="ic-persona-launcher__photo' + (cfg.headshot ? '' : ' placeholder') + '"' +
            (cfg.headshot ? ' style="background-image:url(\'' + escAttr(cfg.headshot) + '\')"' : '') + '>' +
            (cfg.headshot ? '' : escHtml(initials)) +
        '</div>' +
        '<div class="ic-persona-launcher__text">' +
            '<span class="ic-persona-launcher__primary">Talk with ' + escHtml(cfg.firstName) + '</span>' +
            '<span class="ic-persona-launcher__sub">Powered by AI</span>' +
        '</div>';

    var backdrop = document.createElement('div');
    backdrop.className = 'ic-persona-backdrop';

    var panel = document.createElement('aside');
    panel.className = 'ic-persona-panel';
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
        '<header class="ic-persona-header">' +
            '<div class="ic-persona-header__photo' + (cfg.headshot ? '' : ' placeholder') + '"' +
                (cfg.headshot ? ' style="background-image:url(\'' + escAttr(cfg.headshot) + '\')"' : '') + '>' +
                (cfg.headshot ? '' : escHtml(initials)) +
            '</div>' +
            '<div class="ic-persona-header__info">' +
                '<h2 class="ic-persona-header__title">' + escHtml(cfg.name) + '</h2>' +
                '<div class="ic-persona-header__sub">' + escHtml(cfg.role || 'Power100 Contributor') + '</div>' +
            '</div>' +
            '<button type="button" class="ic-persona-header__close" aria-label="Close">×</button>' +
        '</header>' +
        '<div class="ic-persona-disclosure">' +
            '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-6h2v6zm0-8h-2V7h2v4z"/></svg>' +
            'Powered by AI · grounded in ' + escHtml(cfg.firstName) + '’s published work' +
        '</div>' +
        '<div class="ic-persona-messages" id="ic-persona-messages">' +
            '<div class="ic-persona-empty">' +
                'Ask <strong>' + escHtml(cfg.firstName) + '</strong> anything about their work, perspective, or experience.<br><br>' +
                'Their voice is grounded in their published articles, episodes, and bio. ' +
                'If they haven’t spoken publicly about a topic, they’ll tell you.' +
            '</div>' +
        '</div>' +
        '<div class="ic-persona-composer">' +
            '<div class="ic-persona-composer__row">' +
                '<textarea id="ic-persona-input" placeholder="Type your question..." rows="1" maxlength="2000"></textarea>' +
                '<button type="button" class="ic-persona-composer__send" id="ic-persona-send" aria-label="Send">' +
                    '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>' +
                '</button>' +
            '</div>' +
            '<div class="ic-persona-composer__meta">' +
                '<span>Enter to send · Shift+Enter for newline</span>' +
                '<span id="ic-persona-count">0/2000</span>' +
            '</div>' +
        '</div>';

    document.body.appendChild(launcher);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    var $messages = panel.querySelector('#ic-persona-messages');
    var $input    = panel.querySelector('#ic-persona-input');
    var $send     = panel.querySelector('#ic-persona-send');
    var $count    = panel.querySelector('#ic-persona-count');
    var $close    = panel.querySelector('.ic-persona-header__close');

    // ── Open/close ────────────────────────────────────────────────────────
    function open() {
        panel.classList.add('is-open');
        backdrop.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
        setTimeout(function () { $input.focus(); }, 200);
    }
    function close() {
        panel.classList.remove('is-open');
        backdrop.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
    }
    launcher.addEventListener('click', open);
    $close.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
    });

    // ── Composer ──────────────────────────────────────────────────────────
    function autoResize() {
        $input.style.height = 'auto';
        $input.style.height = Math.min($input.scrollHeight, 140) + 'px';
        $count.textContent = $input.value.length + '/2000';
    }
    $input.addEventListener('input', autoResize);
    $input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    });
    $send.addEventListener('click', submit);

    // ── Send + render ─────────────────────────────────────────────────────
    function submit() {
        if (sending) return;
        var text = $input.value.trim();
        if (!text) return;

        // Clear empty-state on first send
        var empty = $messages.querySelector('.ic-persona-empty');
        if (empty) empty.remove();

        appendMessage('user', text);
        conversation.push({ role: 'user', content: text });
        $input.value = '';
        autoResize();

        sending = true;
        $send.disabled = true;
        var typing = appendTyping();

        var payload = {
            ic_id:         cfg.icId,
            message:       text,
            conversation:  conversation.slice(0, -1), // exclude the just-added user msg (sent as `message`)
            member_wp_id:  cfg.memberWpId,
            member_email:  cfg.memberEmail,
            ts:            cfg.bridgeTs,
            nonce:         cfg.bridgeNonce,
        };

        fetch(cfg.apiBase + '/api/contributor-persona/ask', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        })
        .then(function (r) { return r.json().then(function (j) { return { status: r.status, body: j }; }); })
        .then(function (resp) {
            typing.remove();
            sending = false;
            $send.disabled = false;
            if (resp.body && resp.body.ok && resp.body.message) {
                appendMessage('assistant', resp.body.message);
                conversation.push({ role: 'assistant', content: resp.body.message });
            } else if (resp.body && resp.body.rateLimited) {
                appendError(resp.body.message || 'Daily message limit reached.');
            } else {
                appendError((resp.body && resp.body.error) || 'Something went wrong. Please try again.');
            }
        })
        .catch(function (err) {
            typing.remove();
            sending = false;
            $send.disabled = false;
            appendError('Network error: ' + (err.message || err));
        });
    }

    function appendMessage(role, content) {
        var div = document.createElement('div');
        div.className = 'ic-persona-msg ic-persona-msg--' + role;
        div.textContent = content;
        $messages.appendChild(div);
        $messages.scrollTop = $messages.scrollHeight;
        return div;
    }
    function appendTyping() {
        var div = document.createElement('div');
        div.className = 'ic-persona-typing';
        div.innerHTML = '<span></span><span></span><span></span>';
        $messages.appendChild(div);
        $messages.scrollTop = $messages.scrollHeight;
        return div;
    }
    function appendError(text) {
        var div = document.createElement('div');
        div.className = 'ic-persona-msg ic-persona-msg--error';
        div.textContent = text;
        $messages.appendChild(div);
        $messages.scrollTop = $messages.scrollHeight;
    }

    function escHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function escAttr(s) { return escHtml(s); }
})();
