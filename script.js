/* SUPABASE */
const SB_URL = 'https://pnzjihqlgtwxhswddtio.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuemppaHFsZ3R3eGhzd2RkdGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTIwMDUsImV4cCI6MjA5MjYyODAwNX0.9e-Ehm_35DooAVJRy-Y6aOkYVcTTKiUkmbW9BSDnLcs';
const sb = window.supabase.createClient(SB_URL, SB_KEY);
let currentUser = null;

/* CONFIGURAÇÃO - Categorias e constantes */
const CATS = [
    { key: 'study',    name: 'Tempo de Estudo',    icon: '<i data-lucide="book"></i>', color: '#60a5fa', desc: 'Foco, aprendizado, leituras' },
    { key: 'health',   name: 'Saúde & Exercícios', icon: '<i data-lucide="activity"></i>', color: '#34d399', desc: 'Atividade física e bem-estar' },
    { key: 'hobbies',  name: 'Hobbies Externos',   icon: '<i data-lucide="palette"></i>', color: '#ff6e35', desc: 'Lazer e atividades de prazer' },
    { key: 'projects', name: 'Projetos Pessoais',  icon: '<i data-lucide="kanban"></i>', color: '#a78bfa', desc: 'Progresso nos seus projetos' },
    { key: 'mood',     name: 'Humor & Energia',    icon: '<i data-lucide="smile"></i>', color: '#fbbf24', desc: 'Como você se sentiu' },
    { key: 'finance',  name: 'Financeiro',         icon: '<i data-lucide="wallet"></i>', color: '#10b981', desc: 'Controle e saúde financeira' },
    { key: 'time',     name: 'Controle de Tempo',  icon: '<i data-lucide="clock"></i>', color: '#f59e0b', desc: 'Celular, vídeos, distrações' },
    { key: 'social',   name: 'Relacionamentos',    icon: '<i data-lucide="users"></i>', color: '#ec4899', desc: 'Conexões e vida social' },
];

const MAX_PTS    = 50;
const GOAL_PTS   = 40;
const NOTE_COLORS = ['#c8f060','#60c8f0','#f060c8','#f5c842','#f06060','#a78bfa'];

/* SYNC BADGE */
function setSyncBadge(mode) {
    const b = document.getElementById('sync-badge');
    b.className  = 'sync-badge ' + mode;
    b.textContent = mode === 'online' ? '● Supabase' : mode === 'offline' ? '● Offline' : '● Local';
}

/* AUTH */
function showLogin() {
    document.getElementById('auth-login-view').style.display  = '';
    document.getElementById('auth-signup-view').style.display = 'none';
    document.getElementById('auth-error').textContent = '';
}

function showSignup() {
    document.getElementById('auth-signup-view').style.display = '';
    document.getElementById('auth-login-view').style.display  = 'none';
    document.getElementById('signup-error').textContent = '';
}

async function login() {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errEl    = document.getElementById('auth-error');
    if (!email || !password) { errEl.textContent = 'Preencha e-mail e senha.'; return; }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { errEl.textContent = error.message; return; }
    closeOverlay('ov-login');
    showToast('✦ Bem-vindo de volta!');
}

async function signup() {
    const email  = document.getElementById('signup-email').value.trim();
    const pw     = document.getElementById('signup-password').value;
    const pw2    = document.getElementById('signup-password2').value;
    const errEl  = document.getElementById('signup-error');
    if (!email || !pw)  { errEl.textContent = 'Preencha todos os campos.'; return; }
    if (pw !== pw2)     { errEl.textContent = 'As senhas não coincidem.'; return; }
    if (pw.length < 6)  { errEl.textContent = 'Senha mínima de 6 caracteres.'; return; }
    const { error } = await sb.auth.signUp({ email, password: pw });
    if (error) { errEl.textContent = error.message; return; }
    errEl.style.color   = 'var(--green)';
    errEl.textContent   = 'Para terminar a criação da conta verifique o email.';
    showToast('Conta criada!');
}

async function logout() {
    await sb.auth.signOut();
    currentUser = null;
    updateAuthUI(null);
    closeOverlay('ov-login');
    showToast('Até logo!');
}

function updateAuthUI(user) {
    if (user) {
        currentUser = user;
        setSyncBadge('online');

        document.getElementById('auth-login-view').style.display  = 'none';
        document.getElementById('auth-signup-view').style.display = 'none';
        document.getElementById('auth-logged-view').style.display = '';
        document.getElementById('logged-email-display').textContent = user.email;
    } else {
        setSyncBadge('local');

        document.getElementById('auth-logged-view').style.display = 'none';
        document.getElementById('auth-login-view').style.display  = '';
    }
}   

sb.auth.onAuthStateChange((_event, session) => updateAuthUI(session?.user || null));
(async () => {
    const { data: { session } } = await sb.auth.getSession();
    updateAuthUI(session?.user || null);
})();

/* OVERLAY ENGINE */
let activeCharts = {};

function openOverlay(id) {
    const needsAuth = ['ov-form', 'ov-dashboard', 'ov-calendar', 'ov-notes'];
    if (needsAuth.includes(id) && !currentUser) {
        openOverlay('ov-login');
        showToast('Faça login primeiro!');
        return;
    }

    document.getElementById(id).classList.add('open');

    if (id === 'ov-login')     updateAuthUI(currentUser);
    if (id === 'ov-form')      renderForm();
    if (id === 'ov-dashboard') renderDashboard();
    if (id === 'ov-calendar')  renderCalendar();
    if (id === 'ov-notes')     renderNotesList();

    // Fechar ao clicar fora
    document.getElementById(id).addEventListener('click', function handler(e) {
        if (e.target === this) { closeOverlay(id); this.removeEventListener('click', handler); }
    });
}

function closeOverlay(id) {
    document.getElementById(id).classList.remove('open');
    if (id === 'ov-dashboard') {
        Object.values(activeCharts).forEach(c => { try { c.destroy(); } catch {} });
        activeCharts = {};
    }
}

/* DB HELPERS */
async function dbGetWeeks() {
    if (!currentUser) return [];
    const { data, error } = await sb.from('weeks').select('*').eq('user_id', currentUser.id).order('week_key');
    if (error) { setSyncBadge('offline'); return []; }
    setSyncBadge('online');
    return (data || []).map(r => ({
        weekKey:   r.week_key,
        startDate: r.start_date,
        endDate:   r.end_date,
        scores:    r.scores  || {},
        average:   r.average || 0,
        points:    r.points  || 0,
        notes:     r.notes   || '',
        goals:     r.goals   || [],
    }));
}

async function dbSaveWeek(w) {
    if (!currentUser) return;
    const { error } = await sb.from('weeks').upsert({
        user_id:    currentUser.id,
        week_key:   w.weekKey,
        start_date: w.startDate,
        end_date:   w.endDate,
        scores:     w.scores,
        average:    w.average,
        points:     w.points,
        notes:      w.notes  || '',
        goals:      w.goals  || [],
    }, { onConflict: 'user_id,week_key' });
    if (error) setSyncBadge('offline'); else setSyncBadge('online');
}

async function dbGetNotes() {
    if (!currentUser) return [];
    const { data, error } = await sb.from('free_notes').select('*').eq('user_id', currentUser.id).order('updated_at', { ascending: false });
    if (error) return [];
    return data || [];
}

async function dbSaveNote(note) {
    if (!currentUser) return null;
    const row = { user_id: currentUser.id, title: note.title, content: note.content, color: note.color, updated_at: new Date().toISOString() };
    if (note.id) {
        const { data } = await sb.from('free_notes').update(row).eq('id', note.id).select().single();
        return data;
    } else {
        const { data } = await sb.from('free_notes').insert(row).select().single();
        return data;
    }
}

async function dbDeleteNote(id) {
    await sb.from('free_notes').delete().eq('id', id);
}

/* HELPERS DE DATA */
function weekKey(date) {
    const d   = new Date(date);
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
    const y    = tmp.getUTCFullYear();
    const jan1 = new Date(Date.UTC(y, 0, 1));
    return `${y}-W${String(Math.ceil(((tmp - jan1) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}

function weekRange(key) {
    const [yr, wn] = key.split('-W').map(Number);
    const jan4 = new Date(Date.UTC(yr, 0, 4));
    const mon  = new Date(jan4);
    mon.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1 + (wn - 1) * 7);
    const sun = new Date(mon);
    sun.setUTCDate(mon.getUTCDate() + 6);
    return { start: mon, end: sun };
}

const fmtDate = d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const avgOf   = s => { const v = Object.values(s); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
const toPts   = avg => Math.round((avg / 5) * MAX_PTS * 10) / 10;

/* SISTEMA DE ESTRELAS */
const ratings = {};

function buildStars(catKey, mountEl, initVal) {
    mountEl.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'stars-row';

    for (let i = 1; i <= 5; i++) {
        const wrap = document.createElement('div');
        wrap.className = 'star-wrap';

        const svg  = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', '12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26');
        svg.appendChild(poly);
        wrap.appendChild(svg);

        wrap.addEventListener('mousemove', function(e) {
        const r = this.getBoundingClientRect();
        paintStars(catKey, (e.clientX - r.left) < r.width / 2 ? i - 0.5 : i);
        });
        wrap.addEventListener('mouseleave', () => paintStars(catKey, ratings[catKey] || 0));
        wrap.addEventListener('click', function(e) {
        const r = this.getBoundingClientRect();
        ratings[catKey] = (e.clientX - r.left) < r.width / 2 ? i - 0.5 : i;
        paintStars(catKey, ratings[catKey]);
        updateLiveAvg();
        this.closest('.cat-card')?.classList.add('rated');
        });

        row.appendChild(wrap);
    }

    const lbl = document.createElement('span');
    lbl.className = 'star-label';
    lbl.id = 'lbl-' + catKey;
    row.appendChild(lbl);
    mountEl.appendChild(row);
    paintStars(catKey, initVal || 0);
}

function paintStars(catKey, value) {
    const card = document.querySelector(`.cat-card[data-key="${catKey}"]`);
    if (!card) return;
    card.querySelectorAll('.star-wrap').forEach((wrap, idx) => {
        const i    = idx + 1;
        const poly = wrap.querySelector('polygon');
        poly.setAttribute('fill', value >= i ? '#f5c842' : value >= i - 0.5 ? 'url(#hg)' : '#2a2a33');
    });
    const lbl = document.getElementById('lbl-' + catKey);
    if (lbl) lbl.textContent = value > 0 ? value.toFixed(1) : '—';
}

function updateLiveAvg() {
    const vals  = Object.values(ratings).filter(v => v > 0);
    const avgEl = document.getElementById('live-avg');
    const ptsEl = document.getElementById('live-pts');
    if (!vals.length) {
        if (avgEl) avgEl.textContent = '—';
        if (ptsEl) { ptsEl.textContent = '— pontos de 50'; ptsEl.style.color = 'var(--muted)'; }
        return;
    }
    const a = vals.reduce((s, v) => s + v, 0) / vals.length;
    const p = toPts(a);
    if (avgEl) avgEl.textContent = a.toFixed(2);
    if (ptsEl) {
        const hit = p >= GOAL_PTS;
        ptsEl.textContent  = `${p.toFixed(1)} pts de 50 ${hit ? '✦ meta!' : `(meta: ${GOAL_PTS})`}`;
        ptsEl.style.color  = hit ? 'var(--accent)' : 'var(--muted)';
    }
}

/* CAMPOS DE METAS */
let goalFields = [];

function renderGoalFields() {
    const list = document.getElementById('goals-list');
    if (!list) return;
    list.innerHTML = '';
    goalFields.forEach((g, i) => {
        const row = document.createElement('div');
        row.className = 'goal-row';

        const inp = document.createElement('input');
        inp.className   = 'goal-inp';
        inp.type        = 'text';
        inp.placeholder = `Meta ${i + 1}…`;
        inp.value       = g.text || '';
        inp.addEventListener('input', e => goalFields[i].text = e.target.value);

        const rm = document.createElement('button');
        rm.className  = 'btn-rm-goal';
        rm.textContent = '✕';
        rm.onclick    = () => { goalFields.splice(i, 1); renderGoalFields(); };

        row.appendChild(inp);
        row.appendChild(rm);
        list.appendChild(row);
    });
}

function addGoalField() {
    goalFields.push({ text: '', done: false });
    renderGoalFields();
}

/* TOOLTIP */
const tooltip = document.getElementById('global-tooltip');

document.querySelectorAll('[data-tooltip]').forEach(el => {
    el.addEventListener('mouseenter', (e) => {
        tooltip.textContent = el.getAttribute('data-tooltip');
        tooltip.classList.add('show');
        positionTooltip(e);
    });
    el.addEventListener('mousemove', positionTooltip);
    el.addEventListener('mouseleave', () => tooltip.classList.remove('show'));
});

function positionTooltip(e) {
    const offset = 14;
    let x = e.clientX + offset;
    let y = e.clientY + offset;
    const rect = tooltip.getBoundingClientRect();
    if (x + rect.width  > window.innerWidth)  x = window.innerWidth  - rect.width  - 10;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 10;
    tooltip.style.left = x + 'px';
    tooltip.style.top  = y + 'px';
}

/* NUVEM — balão ao clicar */
document.getElementById('cloud-main').addEventListener('click', () => {
    const extra = document.getElementById('cloud-extra');
    extra.style.opacity = '1';
    setTimeout(() => { extra.style.opacity = '0'; }, 2500);
});

/* QUESTIONÁRIO */
function renderForm() {
    CATS.forEach(c => ratings[c.key] = 0);
    goalFields = [];

    const now = new Date(), key = weekKey(now);
    const { start, end } = weekRange(key);
    document.getElementById('form-week-label').textContent = `${fmtDate(start)} a ${fmtDate(end)}`;

    (async () => {
        const weeks = await dbGetWeeks();
        const ex    = weeks.find(w => w.weekKey === key);
        if (ex) {
        Object.assign(ratings, ex.scores);
        document.getElementById('week-notes').value = ex.notes || '';
        goalFields = (ex.goals || []).map(g => ({ ...g }));
        }
        renderGoalFields();

        const grid = document.getElementById('cat-grid');
        grid.innerHTML = '';
        CATS.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'cat-card' + (ratings[cat.key] > 0 ? ' rated' : '');
        card.dataset.key = cat.key;
        card.innerHTML = `
            <div class="cat-card-hdr">
            <div class="cat-icon" style="background:${cat.color}22">${cat.icon}</div>
            <div>
                <div class="cat-name">${cat.name}</div>
                <div class="cat-desc">${cat.desc}</div>
            </div>
            </div>
            <div class="stars-mount"></div>`;
        grid.appendChild(card);
        buildStars(cat.key, card.querySelector('.stars-mount'), ratings[cat.key] || 0);
        lucide.createIcons();
        });
        updateLiveAvg();
    })();
}

async function submitWeek() {
    const missing = CATS.filter(c => !(ratings[c.key] > 0));
    if (missing.length) {
        showToast(`Avalie ${missing.length} categoria${missing.length > 1 ? 's' : ''} ainda`);
        return;
    }

    const now = new Date(), key = weekKey(now);
    const { start, end } = weekRange(key);
    const scores = {};
    CATS.forEach(c => scores[c.key] = ratings[c.key]);
    const avg   = avgOf(scores);
    const pts   = toPts(avg);
    const notes = document.getElementById('week-notes').value.trim();
    const goals = goalFields.map(g => ({ text: g.text, done: g.done || false })).filter(g => g.text);

    await dbSaveWeek({
        weekKey:   key,
        startDate: start.toISOString().slice(0, 10),
        endDate:   end.toISOString().slice(0, 10),
        scores, average: avg, points: pts, notes, goals,
    });

    showToast('✦ Semana salva!');
    closeOverlay('ov-form');
    dashIdx = -1;
    setTimeout(() => openOverlay('ov-dashboard'), 400);
}

/* FEEDBACK AUTOMÁTICO */
function buildFeedback(week, prevWeek) {
    const pts      = week.points;
    const delta    = prevWeek != null ? +(pts - prevWeek.points).toFixed(1) : null;
    const worstCat = CATS.reduce((a, b) => (week.scores[a.key] || 0) <= (week.scores[b.key] || 0) ? a : b);
    const worstVal = week.scores[worstCat.key] || 0;

    let cls, title, body;
    if (pts >= 47) {
        cls = 'fb-great'; title = '✦ Semana quase perfeita!';
        body = `${pts.toFixed(1)} pts — alto nível em tudo. Boa, continue assim!`;
    } else if (pts >= GOAL_PTS) {
        if (worstVal < 3) {
        cls = 'fb-good'; title = '✦ Meta batida, mas com ressalva';
        body = `${pts.toFixed(1)} pts. ${worstCat.icon} ${worstCat.name} (${worstVal.toFixed(1)}★) precisa de atenção.`;
        } else {
        cls = 'fb-good'; title = '✦ Boa semana, meta atingida!';
        body = `${pts.toFixed(1)} pontos. Todas as categorias em dia. Consistência é o que diferencia.`;}
    } else if (pts >= 30) {
        cls = 'fb-meh'; title = 'Semana razoável, dava pra ser melhor';
        body = `${pts.toFixed(1)} pts — faltaram ${(GOAL_PTS - pts).toFixed(1)} pra meta. ${worstCat.icon} ${worstCat.name} foi o ponto mais fraco.`;
    } else {
        cls = 'fb-bad'; title = 'Semana difícil...';
        body = `${pts.toFixed(1)} pts — abaixo da meta. Semanas assim acontecem. Identifique o que pesou e siga.`;
    }

    let trendHtml = '';
    if (delta !== null) {
        const sign  = delta > 0 ? '+' : '';
        const tcls  = delta > 0 ? 'trend-up' : delta < 0 ? 'trend-down' : 'trend-same';
        const icon  = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
        trendHtml = `<div class="trend-chip ${tcls}" style="margin-top:7px">${icon} ${sign}${delta} pts vs semana passada</div>`;
    }

    return `<div class="feedback-banner ${cls}"><div class="fb-title">${title}</div><div class="fb-body">${body}</div>${trendHtml}</div>`;
}

/* DASHBOARD */
let dashIdx = -1;

async function renderDashboard() {
    const weeks   = await dbGetWeeks();
    const content = document.getElementById('dash-content');

    if (!weeks.length) {
        document.getElementById('dash-label').textContent = '—';
        content.innerHTML = `<div class="empty-state"><div class="ei"><i data-lucide="bar-chart-3"></i></div><p>Nenhuma semana ainda.<br>Registre sua primeira semana!</p></div>`;
        return;
    }

    if (dashIdx < 0 || dashIdx >= weeks.length) dashIdx = weeks.length - 1;
    const week     = weeks[dashIdx];
    const prevWeek = dashIdx > 0 ? weeks[dashIdx - 1] : null;
    const { start, end } = weekRange(week.weekKey);

    document.getElementById('dash-label').textContent = `${fmtDate(start)} — ${fmtDate(end)}`;

    Object.values(activeCharts).forEach(c => { try { c.destroy(); } catch {} });
    activeCharts = {};

    const pts      = week.points;
    const ptsPct   = Math.min((pts / MAX_PTS) * 100, 100);
    const goalPct  = (GOAL_PTS / MAX_PTS) * 100;
    const ptsFill  = pts >= GOAL_PTS ? 'var(--accent)' : pts >= 30 ? 'var(--gold)' : 'var(--red)';
    const bestCat  = CATS.reduce((a, b) => (week.scores[a.key] || 0) >= (week.scores[b.key] || 0) ? a : b);
    const worstCat = CATS.reduce((a, b) => (week.scores[a.key] || 0) <= (week.scores[b.key] || 0) ? a : b);
    const delta    = prevWeek != null ? +(pts - prevWeek.points).toFixed(1) : null;

    let trendHtml = '';
    if (delta !== null) {
        const sign = delta > 0 ? '+' : '';
        const tcls = delta > 0 ? 'trend-up' : delta < 0 ? 'trend-down' : 'trend-same';
        const icon = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
        trendHtml = `<div class="trend-chip ${tcls}">${icon} ${sign}${delta} pts vs semana passada</div>`;
    }

    const bars = CATS.map(c => {
        const v = week.scores[c.key] || 0;
        return `<div>
        <div class="bar-meta"><span>${c.icon} ${c.name}</span><span>${v.toFixed(1)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${(v/5)*100}%;background:${c.color}"></div></div>
        </div>`;
    }).join('');

    const goalsHtml = week.goals && week.goals.length
        ? `<div class="goals-check-list">${week.goals.map((g, i) =>
            `<label class="goal-check-row${g.done ? ' done' : ''}">
            <input type="checkbox" ${g.done ? 'checked' : ''} onchange="toggleGoal('${week.weekKey}',${i},this.checked)">
            <span>${g.text}</span>
            </label>`).join('')}</div>`
        : `<span style="font-size:0.8rem;color:var(--muted)">Sem metas definidas.</span>`;

    const notesHtml = week.notes
        ? `<div class="note-box">${week.notes}</div>`
        : `<span style="font-size:0.8rem;color:var(--muted)">Sem notas.</span>`;

    content.innerHTML = buildFeedback(week, prevWeek) + `
        <div class="dash-grid">
        <div class="card">
            <div class="card-title">Pontuação</div>
            <div class="stat-big" style="color:${ptsFill}">${pts.toFixed(1)}<span style="font-size:1rem;color:var(--muted)">/${MAX_PTS}</span></div>
            <div class="stat-sub">${week.average.toFixed(2)} estrelas</div>
            ${trendHtml}
            <div class="pts-bar-wrap">
            <div class="pts-bar-labels"><span>0</span><span>meta ${GOAL_PTS}</span><span>${MAX_PTS}</span></div>
            <div class="pts-bar-track">
                <div class="pts-bar-fill" style="width:${ptsPct}%;background:${ptsFill}"></div>
                <div class="goal-line" style="left:${goalPct}%"><div class="goal-line-lbl">meta</div></div>
            </div>
            </div>
        </div>
        <div class="card" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:start">
            <div>
            <div class="card-title">Melhor</div>
            <div style="font-size:1.8rem">${bestCat.icon}</div>
            <div style="font-size:0.8rem;font-weight:600;margin-top:5px">${bestCat.name}</div>
            <div class="stat-sub">${(week.scores[bestCat.key] || 0).toFixed(1)} ★</div>
            </div>
            <div>
            <div class="card-title">A melhorar</div>
            <div style="font-size:1.8rem">${worstCat.icon}</div>
            <div style="font-size:0.8rem;font-weight:600;margin-top:5px">${worstCat.name}</div>
            <div class="stat-sub">${(week.scores[worstCat.key] || 0).toFixed(1)} ★</div>
            </div>
        </div>
        <div class="card"><div class="card-title">Por Categoria</div><div class="bar-list">${bars}</div></div>
        <div class="card"><div class="card-title">Radar</div><div class="chart-wrap"><canvas id="rc"></canvas></div></div>
        <div class="card"><div class="card-title">Metas</div>${goalsHtml}</div>
        <div class="card"><div class="card-title">Notas</div>${notesHtml}</div>
        <div class="card full-col">
            <div class="card-title">Evolução de Pontos</div>
            <div class="chart-wrap" style="height:170px"><canvas id="lc"></canvas></div>
        </div>
        </div>`;

    activeCharts.radar = new Chart(document.getElementById('rc'), {
        type: 'radar',
        data: {
        labels: CATS.map(c => c.name.split(' ')[0]),
        datasets: [{ data: CATS.map(c => week.scores[c.key] || 0), backgroundColor: 'rgba(96, 175, 240, 0.1)', borderColor: '#60c7f0', borderWidth: 2, pointBackgroundColor: '#60aaf0', pointRadius: 4 }],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 5, ticks: { stepSize: 1, color: '#7a7a8a', font: { size: 9 }, backdropColor: 'transparent' }, grid: { color: '#2a2a33' }, angleLines: { color: '#2a2a33' }, pointLabels: { color: '#181821', font: { size: 10 } } } }, plugins: { legend: { display: false } } },
    });

    activeCharts.line = new Chart(document.getElementById('lc'), {
        type: 'line',
        data: {
        labels: weeks.map(w => w.weekKey.replace('-W', ' W')),
        datasets: [
            { data: weeks.map(w => +(w.points || 0).toFixed(1)), borderColor: '#60c5f0', backgroundColor: 'rgba(200,240,96,0.07)', borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: '#60b4f0', pointRadius: 5, pointHoverRadius: 7 },
            { data: weeks.map(() => GOAL_PTS), borderColor: 'rgba(200,240,96,0.25)', borderWidth: 1, borderDash: [5, 5], fill: false, pointRadius: 0 },
        ],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: MAX_PTS, ticks: { color: '#7a7a8a' }, grid: { color: '#2a2a33' } }, x: { ticks: { color: '#7a7a8a' }, grid: { color: '#1e1e24' } } }, plugins: { legend: { display: false } } },
    });
}

function dashNav(dir) {
    (async () => {
        const weeks = await dbGetWeeks();
        if (!weeks.length) return;
        dashIdx = Math.max(0, Math.min(weeks.length - 1, dashIdx + dir));
        renderDashboard();
    })();
}

async function toggleGoal(wKey, idx, done) {
    const weeks = await dbGetWeeks();
    const week  = weeks.find(w => w.weekKey === wKey);
    if (!week || !week.goals) return;
    week.goals[idx].done = done;
    document.querySelectorAll('.goal-check-row')[idx]?.classList.toggle('done', done);
    await dbSaveWeek(week);
}

/* CALENDÁRIO */
let calY = new Date().getFullYear();
let calM = new Date().getMonth();

async function renderCalendar() {
    const weeks  = await dbGetWeeks();
    const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    document.getElementById('cal-title').textContent = `${MONTHS[calM]} ${calY}`;

    const firstDay = new Date(calY, calM, 1).getDay();
    const days     = new Date(calY, calM + 1, 0).getDate();
    const offset   = (firstDay + 6) % 7;

    const dayMap = {};
    weeks.forEach(w => {
        const { start, end } = weekRange(w.weekKey);
        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        if (d.getUTCFullYear() === calY && d.getUTCMonth() === calM) dayMap[d.getUTCDate()] = w;
        }
    });

    const DAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    let html = DAYS.map(d => `<div class="cal-day-name">${d}</div>`).join('');
    for (let i = 0; i < offset; i++) html += '<div class="cal-day empty"></div>';
    for (let d = 1; d <= days; d++) {
        const e = dayMap[d];
        html += e
        ? `<div class="cal-day has-data" onclick="openWeekDetail('${e.weekKey}')"><span>${d}</span><div class="cal-dot"></div></div>`
        : `<div class="cal-day"><span>${d}</span></div>`;
    }
    document.getElementById('cal-grid').innerHTML = html;

    const sorted = [...weeks].reverse();
    document.getElementById('history-list').innerHTML = sorted.length
        ? sorted.map(w => {
            const { start, end } = weekRange(w.weekKey);
            const pc = (w.points || 0) >= GOAL_PTS ? '#1a6bbf' : (w.points || 0) >= 30 ? '#f5a623' : '#e03030';
            return `<div class="history-row" onclick="openWeekDetail('${w.weekKey}')">
            <div>
                <div style="font-weight:700;font-size:0.85rem">${w.weekKey.replace('-W', ' Semana ')}</div>
                <div style="font-size:0.73rem;color:#666">${fmtDate(start)} — ${fmtDate(end)}</div>
            </div>
            <div style="text-align:right">
                <div style="font-family:'Nunito',sans-serif;font-size:1.15rem;font-weight:900;color:${pc}">${(w.points || 0).toFixed(1)} pts</div>
                <div style="font-size:0.72rem;color:#666">${w.average.toFixed(2)} ★</div>
            </div>
            </div>`;
        }).join('')
        : `<div class="empty-state" style="padding:24px 0;color:#999"><p>Nenhuma semana ainda.</p></div>`;
}

function calNav(dir) {
    calM += dir;
    if (calM > 11) { calM = 0; calY++; }
    if (calM < 0)  { calM = 11; calY--; }
    renderCalendar();
}

async function openWeekDetail(key) {
    const weeks    = await dbGetWeeks();
    const week     = weeks.find(w => w.weekKey === key);
    if (!week) return;
    const idx      = weeks.findIndex(w => w.weekKey === key);
    const prevWeek = idx > 0 ? weeks[idx - 1] : null;
    const { start, end } = weekRange(key);

    const pts   = week.points || 0;
    const pc    = pts >= GOAL_PTS ? 'var(--accent)' : pts >= 30 ? 'var(--gold)' : 'var(--red)';
    const delta = prevWeek != null ? +(pts - (prevWeek.points || 0)).toFixed(1) : null;

    let trendHtml = '';
    if (delta !== null) {
        const sign = delta > 0 ? '+' : '';
        const tcls = delta > 0 ? 'trend-up' : delta < 0 ? 'trend-down' : 'trend-same';
        trendHtml = `<div class="trend-chip ${tcls}" style="margin-top:6px">${delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} ${sign}${delta} pts</div>`;
    }

    document.getElementById('week-detail-title').textContent = key.replace('-W', ' • Semana ');
    document.getElementById('week-detail-body').innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:6px;align-items:flex-end">
        <span style="font-size:0.78rem;color:var(--muted)">${fmtDate(start)} — ${fmtDate(end)}</span>
        <div style="text-align:right">
            <div style="font-family:'Playfair Display',serif;font-size:1.5rem;font-weight:900;color:${pc}">${pts.toFixed(1)} pts</div>
            <div style="font-size:0.74rem;color:var(--muted)">${week.average.toFixed(2)} ★</div>
            ${trendHtml}
        </div>
        </div>
        <div class="bar-list" style="margin-bottom:14px">${CATS.map(c => {
        const v = week.scores[c.key] || 0;
        return `<div>
            <div class="bar-meta"><span>${c.icon} ${c.name}</span><span>${v.toFixed(1)}</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${(v/5)*100}%;background:${c.color}"></div></div>
        </div>`;
        }).join('')}</div>
        ${week.goals && week.goals.length
        ? `<div style="margin-bottom:12px">
            <div class="card-title">Metas</div>
            ${week.goals.map(g => `<div style="font-size:0.82rem;padding:3px 0;color:${g.done ? 'var(--accent)' : 'var(--muted)'}">${g.done ? '✓' : '○'} ${g.text}</div>`).join('')}
            </div>` : ''}
        ${week.notes ? `<div class="card-title">Notas</div><div class="note-box">${week.notes}</div>` : ''}`;

    openOverlay('ov-week-detail');
}

/* NOTAS LIVRES */
let currentNote      = null;
let currentNoteColor = NOTE_COLORS[0];

async function renderNotesList() {
    showNotesListView();
    const notes = await dbGetNotes();
    const grid  = document.getElementById('notes-grid');
    const count = document.getElementById('notes-count');
    count.textContent = `${notes.length} nota${notes.length !== 1 ? 's' : ''}`;

    if (!notes.length) {
    grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;padding:40px 0">
        <div class="ei">
            <i data-lucide="file-text"></i>
        </div>
        <p>Nenhuma nota ainda.<br>Clique em "+ Nova nota" para começar.</p>
        </div>
    `;

    lucide.createIcons();
    return;
}

    grid.innerHTML = notes.map(n => `
    <div class="note-card" style="border-left-color:${n.color || 'var(--accent)'}" onclick="openNoteEditor(${JSON.stringify(n).replace(/"/g, '&quot;')})">
    <button class="note-card-del" onclick="event.stopPropagation();deleteNote('${n.id}')">✕</button>
    <div class="note-card-title">${n.title || 'Sem título'}</div>
    <div class="note-card-preview">${n.content || ''}</div>
    <div class="note-card-date">${new Date(n.updated_at).toLocaleDateString('pt-BR')}</div>
    </div>`).join('');
}

function showNotesListView() {
    document.getElementById('notes-list-view').style.display   = '';
    document.getElementById('notes-editor-view').style.display = 'none';
    currentNote = null;
}

function closeNoteEditor() { renderNotesList(); }

function openNoteEditor(note) {
    currentNote      = note;
    currentNoteColor = note?.color || NOTE_COLORS[0];
    document.getElementById('notes-list-view').style.display   = 'none';
    document.getElementById('notes-editor-view').style.display = '';
    document.getElementById('note-title-inp').value   = note?.title   || '';
    document.getElementById('note-content-inp').value = note?.content || '';

    const picker = document.getElementById('note-color-picker');
    picker.innerHTML = NOTE_COLORS.map(c =>
    `<div class="color-dot${c === currentNoteColor ? ' active' : ''}" style="background:${c}" onclick="selectNoteColor('${c}')"></div>`
    ).join('');
}

function selectNoteColor(color) {
    currentNoteColor = color;
    document.querySelectorAll('.color-dot').forEach(d =>
    d.classList.toggle('active', d.style.background === color || d.style.backgroundColor === color)
    );
}

async function saveCurrentNote() {
    const title   = document.getElementById('note-title-inp').value.trim() || 'Sem título';
    const content = document.getElementById('note-content-inp').value.trim();
    await dbSaveNote({ id: currentNote?.id, title, content, color: currentNoteColor });
    showToast('✦ Nota salva!');
    renderNotesList();
}

async function deleteCurrentNote() {
    if (currentNote?.id) { await dbDeleteNote(currentNote.id); showToast('Nota apagada.'); }
    renderNotesList();
}

async function deleteNote(id) {
    await dbDeleteNote(id);
    showToast('Nota apagada.');
    renderNotesList();
}

/* TOAST */
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2800);
}