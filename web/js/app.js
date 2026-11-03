/* DRG ATS · recruiter portal */
(function () {
  const api = ATS.api;
  const STAGES = ATS.STAGES;
  const { ROUND_STAGE, STAGE_ROUND } = ATS;
  const CFG = window.ATS_CONFIG || {};
  const posOf = id => STAGES.find(s => s.id === id)?.position ?? 0;
  const ivWho = i => i.member?.full_name || i.interviewer?.full_name || '';
  const TZS = ['Asia/Kolkata', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney', 'UTC'];
  const app = document.getElementById('app');
  const LOGO = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="23 52 104 53"><defs><linearGradient id="drgw" x1="0" y1="56" x2="0" y2="101" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#C4EC12"/><stop offset="0.5" stop-color="#8FE324"/><stop offset="1" stop-color="#2FDB46"/></linearGradient></defs><path d="M83.92 86.42 L84.92 89.42 L86.92 92.42 L90.83 96.58 L95.92 99.83 L102.58 101.83 L108.75 101.75 L115.00 99.75 L120.67 96.00 L124.08 92.08 L123.50 91.00 L117.33 89.17 L112.33 92.50 L108.92 93.67 L103.67 93.92 L99.33 92.92 L97.00 91.67 L93.50 88.42 L91.17 84.50 L89.92 80.50 L89.33 80.58 Z M105.17 82.25 L106.50 83.00 L116.50 82.83 L122.92 76.58 L123.58 75.33 L122.50 74.92 L105.75 75.08 L105.08 76.00 Z M89.92 62.50 L92.33 70.42 L97.00 66.25 L101.58 64.25 L108.83 64.17 L111.75 65.08 L116.17 67.83 L117.67 66.92 L121.25 63.08 L120.75 61.83 L116.92 59.00 L112.25 57.00 L107.00 55.92 L102.67 56.00 L98.00 57.17 L93.75 59.08 Z M53.75 56.17 L53.83 56.83 L57.75 59.25 L62.58 63.83 L76.25 64.00 L79.00 65.08 L80.67 66.67 L81.83 68.67 L82.33 71.75 L81.67 74.33 L80.42 76.33 L76.67 78.67 L69.33 78.83 L68.42 79.83 L80.92 101.33 L82.33 102.00 L89.42 101.75 L89.25 100.17 L81.08 86.17 L81.50 85.08 L84.58 83.08 L86.83 80.67 L89.00 77.17 L89.83 74.58 L89.83 68.00 L89.00 65.50 L86.67 61.67 L82.67 58.17 L77.00 56.00 Z M28.33 56.00 L28.17 56.92 L35.25 63.83 L45.83 64.17 L48.92 65.08 L52.33 67.33 L54.58 69.50 L56.75 73.25 L57.75 76.25 L57.92 79.92 L57.50 82.67 L55.42 87.17 L53.75 89.33 L50.67 91.92 L45.42 93.83 L36.00 93.92 L35.17 93.00 L35.25 77.08 L34.92 76.17 L34.17 76.17 L27.42 84.42 L27.50 101.42 L28.67 102.00 L45.08 101.92 L49.75 100.75 L54.42 98.67 L57.92 96.08 L60.92 92.83 L63.67 88.25 L64.83 85.17 L65.50 80.08 L65.08 74.00 L63.92 70.08 L61.83 66.50 L57.00 61.17 L54.08 59.08 L49.25 57.00 L44.00 55.92 Z" fill="url(#drgw)" fill-rule="evenodd"/></svg>';
  const state = { me: null, jobs: [], unsub: null, route: '' };

  /* ───────── helpers ───────── */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const stageName = id => STAGES.find(s => s.id === id)?.name || '—';
  const initials = n => (n || '?').replace(/\.(pdf|docx)$/i, '').split(/[\s_]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const AV = ['#178A35', '#2563A8', '#8A4FB8', '#B4720E', '#C2410C', '#3E6B7A'];
  const avColor = n => AV[[...(n || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
  const avatar = (n, size = 34) => `<span class="av" style="background:${avColor(n)};width:${size}px;height:${size}px;font-size:${Math.round(size * .37)}px">${esc(initials(n))}</span>`;
  const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  // Short time-zone name for the viewer, e.g. IST or CST, so booked times aren't misread across India and the US
  const tzShort = d => { try { if (/Kolkata|Calcutta/.test(Intl.DateTimeFormat().resolvedOptions().timeZone)) return 'IST'; return new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date(d)).find(p => p.type === 'timeZoneName')?.value || ''; } catch (e) { return ''; } };
  const fmtTime = d => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const ago = d => { const m = (Date.now() - new Date(d)) / 6e4; return m < 60 ? `${Math.max(1, Math.round(m))}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };
  const VERDICT = { pass: 'Pass', review: 'Review', disqualified: 'Disqualified', low_fit: 'Low fit' };
  const VCOLOR = { pass: 'var(--pass)', review: 'var(--review)', disqualified: 'var(--disq)', low_fit: 'var(--low)' };
  const chip = c => {
    if (c.status === 'screening_queued' || c.status === 'screening') return `<span class="chip v-pending">Screening…</span>`;
    if (c.status === 'screening_failed') return `<span class="chip v-failed">Needs manual review</span>`;
    return c.verdict ? `<span class="chip v-${c.verdict}">${VERDICT[c.verdict]}</span>` : '';
  };
  const ring = (score, verdict, size = 44) => {
    const r = size / 2 - 4, C = 2 * Math.PI * r, p = score == null ? 0 : score / 100;
    return `<span class="ring" style="width:${size}px;height:${size}px" title="AI score">
      <svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="4"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${VCOLOR[verdict] || 'var(--info)'}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${C * p} ${C}"/></svg>
      <span style="font-size:${Math.round(size * .3)}px">${score ?? '…'}</span></span>`;
  };
  const I = {
    dash: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
    jobs: '<path d="M4 7h16v12H4z"/><path d="M9 7V5h6v2"/>',
    board: '<path d="M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z"/>',
    people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5 6-5s5.4 1.6 6 5"/><path d="M16 4.5a3 3 0 0 1 0 6M18 15c1.7.6 2.7 2.2 3 5"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 7l2.6 1.5M17.2 15.5l2.6 1.5M4.2 17l2.6-1.5M17.2 8.5l2.6-1.5"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
    trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>', file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9.5a1 1 0 0 0 1 1h3.5"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>', check: '<path d="M5 12l5 5 9-10"/>'
  };
  const icon = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

  function toast(msg, err) {
    let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.append(box); }
    const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; box.append(t);
    setTimeout(() => t.remove(), err ? 6000 : 3200);
  }
  const fail = e => { console.error(e); toast(e.message || String(e), true); };

  function modal(title, body, actions) {
    const s = document.createElement('div'); s.className = 'scrim center';
    s.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-h row" style="justify-content:space-between"><h2>${esc(title)}</h2><button class="x" data-close aria-label="Close">${icon('x')}</button></div>
      <div class="modal-b">${body}</div><div class="modal-f">${actions}</div></div>`;
    const close = () => s.remove();
    s.addEventListener('click', e => { if (e.target === s || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    document.body.append(s); $('input,select,textarea', s)?.focus(); return { el: s, close };
  }

  /* ───────── shell ───────── */
  const NAV = [
    ['dashboard', 'Dashboard', 'dash'], ['jobs', 'Jobs', 'jobs'], ['pipeline', 'Pipeline', 'board'], ['candidates', 'Candidates', 'people'],
    ['upload', 'Upload resumes', 'upload'], ['interviews', 'Interviews', 'cal'], ['settings', 'Settings', 'gear']
  ];
  function shell() {
    const me = state.me; const isInt = me.role === 'interviewer';
    const nav = NAV.filter(([k]) => isInt ? k === 'interviews' : (k !== 'settings' || me.role === 'admin') && (k !== 'upload' || me.role !== 'hiring_manager'));
    app.innerHTML = `<div class="shell">
      <aside class="side" id="side">
        <div class="brand"><div class="brand-mark">${LOGO}</div><div><div class="brand-name">DRG ATS</div><div class="brand-sub">Applicant tracking</div></div></div>
        <nav class="nav" aria-label="Main">${nav.map(([k, l, ic]) => `<a href="#/${k}" data-nav="${k}" title="${l}">${icon(ic)}<span>${l}</span>${k === 'pipeline' ? '<span class="count" id="nav-review" hidden></span>' : ''}</a>`).join('')}</nav>
        <div class="side-foot">${avatar(me.full_name, 32)}<div class="who"><b>${esc(me.full_name)}</b><span>${esc(me.role.replace('_', ' '))}</span></div>
          <button id="logout" title="Sign out" aria-label="Sign out">${icon('out')}</button></div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn menu-btn" id="menu" aria-label="Open menu">${icon('menu')}</button>
          <form class="search" id="search" role="search">${icon('search')}<input id="q" placeholder="Search candidates, skills, jobs…" aria-label="Search"></form>
          <div class="spacer"></div>
          ${api.mode === 'demo' ? '<span class="demo-pill" title="Sample data. Connect Supabase in config.js to go live.">Demo data</span>' : ''}
          ${!isInt ? `<a class="btn primary" href="#/upload" aria-label="Add candidates">${icon('upload', 16)}<span class="lbl">Add candidates</span></a>` : ''}
        </header>
        <main class="page" id="page" tabindex="-1"></main>
      </div></div>`;
    $('#logout').onclick = async () => { await api.signOut(); state.me = null; boot(); };
    $('#menu').onclick = () => $('#side').classList.toggle('open');
    $('#search').onsubmit = e => { e.preventDefault(); location.hash = `#/candidates?q=${encodeURIComponent($('#q').value)}`; };
  }

  /* ───────── router ───────── */
  async function route() {
    if (!state.me) return;
    const [path, qs] = (location.hash.slice(2) || (state.me.role === 'interviewer' ? 'interviews' : 'dashboard')).split('?');
    const [page, arg] = path.split('/');
    const params = new URLSearchParams(qs || '');
    state.route = page;
    $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === (page === 'candidate' ? 'candidates' : page)));
    $('#side')?.classList.remove('open');
    $$('.scrim').forEach(x => x.remove());
    const el = $('#page'); el.innerHTML = `<div class="empty"><span class="spin"></span></div>`;
    const run = state.run = (state.run || 0) + 1;
    try {
      const candidateLink = async (e, id, p) => { await candidates(e, null, p); if (id) openCandidate(id); };
      const fn = { dashboard, jobs: arg ? jobDetail : jobsPage, pipeline, candidates, candidate: candidateLink, upload, interviews, settings }[page] || dashboard;
      await fn(el, arg, params);
    } catch (e) { if (run !== state.run) return; el.innerHTML = `<div class="card empty">Could not load this page. ${esc(e.message)}</div>`; console.error(e); }
    refreshBadge();
  }
  async function refreshBadge() {
    try { const cards = await api.cards(); const n = cards.filter(c => c.stage_id === 2 && c.verdict && c.verdict !== 'low_fit').length;
      const b = $('#nav-review'); if (b) { b.hidden = !n; b.textContent = n; } } catch (e) { }
  }

  /* ───────── dashboard ───────── */
  async function dashboard(el) {
    const [jobs, cards, ivs] = await Promise.all([api.jobs(), api.cards(), api.interviews()]);
    state.jobs = jobs;
    const open = jobs.filter(j => j.status === 'open');
    const week = cards.filter(c => Date.now() - new Date(c.created_at) < 7 * 864e5);
    const review = cards.filter(c => c.stage_id === 2 && c.verdict).sort((a, b) => (b.score || 0) - (a.score || 0));
    const today = new Date().toDateString();
    const upcoming = ivs.filter(i => i.status === 'scheduled' && new Date(i.scheduled_at) > Date.now() - 36e5);
    const todayN = ivs.filter(i => i.status === 'scheduled' && new Date(i.scheduled_at).toDateString() === today).length;
    const scored = cards.filter(c => c.score != null);
    const avg = scored.length ? Math.round(scored.reduce((a, c) => a + c.score, 0) / scored.length) : 0;
    const jobTitle = id => jobs.find(j => j.id === id)?.title || '';
    const hour = new Date().getHours();
    const counts = STAGES.filter(s => s.id !== 7).map(s => ({ s, n: cards.filter(c => c.stage_id !== 7 && posOf(c.stage_id) >= s.position).length }));
    const max = Math.max(1, counts[0].n);
    el.innerHTML = `
      <div class="page-head"><div><h1>Good ${hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}, ${esc(state.me.full_name.split(' ')[0])}</h1>
        <p>${review.length} candidates are scored and waiting for your decision.</p></div>
        <a class="btn" href="#/jobs">${icon('plus', 16)}New job</a></div>
      <section class="kpis">
        ${kpi('Open roles', open.length, 'jobs', `${jobs.length - open.length} in draft or closed`, '#/jobs?status=open')}
        ${kpi('Applicants this week', week.length, 'people', `${cards.length} in total`, '#/candidates?range=week')}
        ${kpi('Awaiting review', review.length, 'spark', `Average AI score ${avg}`, '#/candidates?view=review')}
        ${kpi('Interviews today', todayN, 'cal', `${upcoming.length} upcoming`, '#/interviews?day=today')}
      </section>
      <section class="dash">
        <div class="card"><div class="card-h"><h3>Needs your review</h3><a class="btn sm ghost" href="#/pipeline">Open pipeline →</a></div>
          <div class="list">${review.slice(0, 7).map(c => `
            <div class="li" data-app="${c.id}" tabindex="0">${ring(c.score, c.verdict, 40)}
              <div class="grow"><b>${esc(c.full_name)}</b><span class="small muted">${esc(jobTitle(c.job_id))} · ${ago(c.created_at)}</span></div>${chip(c)}</div>`).join('') || '<div class="empty">Nothing waiting. New applications will appear here once scored.</div>'}</div></div>
        <div style="display:grid;gap:18px;align-content:start">
          <div class="card"><div class="card-h"><h3>Upcoming interviews</h3><a class="btn sm ghost" href="#/interviews">All →</a></div>
            <div class="list">${upcoming.slice(0, 4).map(i => `
              <div class="li" data-app="${i.application_id}" tabindex="0"><div style="text-align:center;min-width:44px"><div class="mono" style="font-weight:600">${fmtTime(i.scheduled_at)}</div><div class="small muted">${fmtDate(i.scheduled_at)}</div></div>
                <div class="grow"><b>${esc(i.applications?.candidates?.full_name || i.applications?.resumes?.file_name)}</b><span class="small muted">${stageName(i.stage_id)} · ${esc(ivWho(i))}</span></div></div>`).join('') || '<div class="empty">No interviews scheduled.</div>'}</div></div>
          <div class="card"><div class="card-h"><h3>Hiring funnel</h3><span class="small muted">all open roles</span></div>
            <div class="card-b funnel">${counts.map(({ s, n }) => `<div class="fr"><span>${s.name}</span><div class="bar"><i style="width:${n / max * 100}%"></i></div><span class="num" style="text-align:right">${n}</span></div>`).join('')}</div></div>
        </div>
      </section>`;
    bindApps(el);
  }
  const kpi = (l, v, ic, t, href) => `<a class="card kpi kpi-link" href="${href}" aria-label="${l}: ${v}. Show the list"><span class="ico">${icon(ic)}</span><span class="l">${l}</span><span class="v num">${v}</span><span class="small muted">${t}</span></a>`;
  const filterBar = (label, href) => `<div class="filter-bar">${icon('check', 15)}<span>Showing <b>${label}</b></span><a href="${href}">Show all</a></div>`;
  const bindApps = el => $$('[data-app]', el).forEach(n => { n.onclick = () => openCandidate(n.dataset.app); n.onkeydown = e => e.key === 'Enter' && openCandidate(n.dataset.app); });

  /* ───────── jobs ───────── */
  const STAGE_COLORS = ['#9FB3B8', '#2563A8', '#178A35', '#5DBB2C', '#8FBF1F', '#B4720E', '#1C8B57'];
  async function jobsPage(el, _a, params) {
    const jobs = state.jobs = await api.jobs();
    const canEdit = ['admin', 'recruiter'].includes(state.me.role);
    const only = params?.get('status');
    const shown = only ? jobs.filter(j => j.status === only) : jobs.filter(j => j.status !== 'closed');
    const closedN = jobs.filter(j => j.status === 'closed').length;
    el.innerHTML = `<div class="page-head"><div><h1>Jobs</h1><p>${jobs.filter(j => j.status === 'open').length} open roles · ${jobs.reduce((a, j) => a + j.total, 0)} applicants</p></div>
      ${canEdit ? `<button class="btn primary" id="newjob">${icon('plus', 16)}New job</button>` : ''}</div>
      ${only ? filterBar(`${only.replace('_', ' ')} roles (${shown.length})`, '#/jobs') : ''}
      ${!only && closedN ? `<div class="small muted">Closed jobs are hidden here, in the Pipeline and on the careers page. <a href="#/jobs?status=closed">View closed jobs (${closedN})</a></div>` : ''}
      <div class="jobs">${shown.map(j => {
        const active = j.total - (j.byStage[7] || 0);
        return `<article class="card job" data-job="${j.id}" tabindex="0">
          <div class="job-top"><div><h3>${esc(j.title)}${j.client ? ` <span class="chip ext" style="font-size:11px;vertical-align:middle">${esc(j.client)}</span>` : ''}</h3><div class="small muted" style="margin-top:4px">${esc(j.department || '')} · ${esc(j.location || '')}</div></div>
            <span class="chip st-${j.status}">${j.status.replace('_', ' ')}</span></div>
          <div><div class="row" style="justify-content:space-between;margin-bottom:6px"><span class="small muted">Pipeline</span><span class="small num">${active} active</span></div>
            <div class="stagebar">${[1, 2, 3, 4, 8, 5, 6].map((s, k) => `<i style="width:${(j.byStage[s] || 0) / Math.max(1, active) * 100}%;background:${STAGE_COLORS[k]}" title="${stageName(s)}: ${j.byStage[s] || 0}"></i>`).join('')}</div></div>
          <div class="job-foot"><span>${j.rules === null ? '<span style="color:var(--review)">No AI brief yet</span>' : `${j.byStage[2] || 0} screened · ${(j.byStage[3] || 0) + (j.byStage[4] || 0) + (j.byStage[8] || 0)} interviewing`}</span><span>${fmtDate(j.created_at)}</span></div>
        </article>`; }).join('') || `<div class="card empty">${only ? `No ${only.replace('_', ' ')} roles right now.` : 'No jobs yet. Create the first role to start screening.'}</div>`}</div>`;
    $$('[data-job]', el).forEach(n => { n.onclick = () => location.hash = `#/jobs/${n.dataset.job}`; n.onkeydown = e => e.key === 'Enter' && n.click(); });
    if (canEdit) $('#newjob').onclick = () => jobForm();
  }
  async function jobForm(job) {
    let team = [], senders = [];
    try { team = (await api.team()).filter(t => t.active !== false); } catch (e) { fail(e); }
    try { senders = (await api.senders()).filter(x => x.active !== false || x.id === job?.sender_id); } catch (e) { senders = []; }
    const defSender = senders.find(x => x.is_default);
    const m = modal(job ? 'Edit job' : 'New job', `
      <div class="grid2" style="align-items:start"><div class="field"><label for="jt">Job title</label><input class="input" id="jt" required value="${esc(job?.title)}" placeholder="e.g. Sales Development Representative"></div>
        <div class="field"><label for="jc">Hiring for</label><input class="input" id="jc" value="${esc(job?.client)}" placeholder="Dollar Revenue Group" list="jclients"><datalist id="jclients"><option value="TechJays"></option></datalist>
          <div class="small muted">Leave blank for DRG. A client name is added to every interview's calendar title, e.g. "SDR (TechJays) · Intro call · Priya".</div></div></div>
      ${senders.length ? `<div class="field"><label for="jsn">Send candidate emails from</label><select class="input" id="jsn">${senders.map(x => `<option value="${x.id}" ${x.id === (job?.sender_id || defSender?.id) ? 'selected' : ''}>${esc(senderLabel(x))}</option>`).join('')}</select>
        <div class="small muted" id="jsnh"></div></div>` : ''}
      <div class="grid2"><div class="field"><label for="jd2">Department</label><input class="input" id="jd2" value="${esc(job?.department)}" placeholder="Sales"></div>
        <div class="field"><label for="jl">Location</label><input class="input" id="jl" value="${esc(job?.location)}" placeholder="Ahmedabad · Hybrid"></div></div>
      <div class="grid2"><div class="field"><label for="je">Employment type</label><select class="input" id="je">${['Full-time', 'Part-time', 'Contract', 'Internship'].map(t => `<option ${job?.employment_type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="field"><label for="jo">Openings</label><input class="input" id="jo" type="number" min="1" value="${job?.openings || 1}"></div></div>
      <div class="field"><label for="jx">Job description</label><textarea class="input" id="jx" rows="7" placeholder="Paste the JD. Candidates see it on the careers site and the AI reads it when screening.">${esc(job?.jd_text)}</textarea></div>
      <div class="modal-sec"><h3>Candidate emails</h3></div>
      <div class="field" id="jtpl"><div class="small muted"><span class="spin"></span> Loading email templates…</div></div>
      <div class="modal-sec"><h3>Interview scoring</h3></div>
      <div class="field"><div class="small muted">The points interviewers rate from 1 to 5 on a candidate's profile. Click to add or remove. Weights and the scoring formula are on the job's <b>Interview scoring</b> tab.</div>
        <div class="row" id="jsc" style="gap:6px;margin-top:4px"></div>
        <div class="row" style="gap:8px"><input class="input" id="jscn" placeholder="Add your own point, e.g. Objection handling" style="max-width:340px"><button type="button" class="btn sm" id="jsca">Add</button></div></div>
      <div class="modal-sec"><h3>Hiring panel and rounds</h3></div><div id="jpr" style="display:grid;gap:14px"></div>`,
      `<button class="btn" data-close>Cancel</button><button class="btn primary" id="save">${job ? 'Save changes' : 'Create job'}</button>`);
    m.el.querySelector('.modal').classList.add('wide');
    const sn = $('#jsn', m.el), snh = $('#jsnh', m.el);
    const snNote = () => { if (!sn) return; const x = senders.find(y => y.id === sn.value) || defSender || {};
      snh.innerHTML = x.from_email ? `Candidates see <b>${esc(x.from_name)}</b> &lt;${esc(x.from_email)}&gt;. Every email for this job (applied, rounds, confirmations, reminders) comes from here. You can also change it, and each email's wording, on the job's Emails tab.`
        : `Candidates see <b>${esc(x.from_name || 'DRG Talent Team')}</b> from the DRG hiring mailbox.`; };
    if (sn) { sn.onchange = snNote; snNote(); }
    const jc = $('#jc', m.el);
    // Typing a client name picks that client's sender if there is exactly one match (e.g. TechJays → zaina@techjays.com)
    if (jc && sn && !job?.sender_id) jc.onchange = () => { const c = jc.value.trim().toLowerCase(); if (!c) return;
      const hits = senders.filter(x => x.from_email && (x.from_email.split('@')[1] || '').toLowerCase().startsWith(c.replace(/\s+/g, '')));
      if (hits.length === 1) { sn.value = hits[0].id; snNote(); } };
    const scfg = scoringCfg(job); const crit = scfg.criteria.map(c => ({ ...c })); const crit0 = JSON.stringify(crit);
    const drawCrit = () => { const on = crit.map(c => c.name.toLowerCase());
      $('#jsc', m.el).innerHTML = crit.map((c, i) => `<button type="button" class="pick-chip on" data-cx="${i}" title="Remove">${esc(c.name)} ${icon('x', 12)}</button>`).join('')
        + SCORE_PRESETS.filter(([n]) => !on.includes(n.toLowerCase())).map(([n]) => `<button type="button" class="pick-chip" data-cp="${esc(n)}">${icon('plus', 12)}${esc(n)}</button>`).join('');
      $$('[data-cx]', m.el).forEach(b => b.onclick = () => { crit.splice(+b.dataset.cx, 1); drawCrit(); });
      $$('[data-cp]', m.el).forEach(b => b.onclick = () => addCrit(b.dataset.cp)); };
    const addCrit = name => { name = String(name || '').trim(); if (!name || crit.some(c => c.name.toLowerCase() === name.toLowerCase())) return;
      const pre = SCORE_PRESETS.find(x => x[0].toLowerCase() === name.toLowerCase());
      crit.push({ key: critKey(name, crit.map(c => c.key)), name, hint: pre ? pre[1] : '', weight: 1, min: 0 }); drawCrit(); };
    drawCrit();
    const jscn = $('#jscn', m.el); $('#jsca', m.el).onclick = () => { addCrit(jscn.value); jscn.value = ''; };
    jscn.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addCrit(jscn.value); jscn.value = ''; } };
    const senderName = () => { const x = senders.find(y => y.id === $('#jsn', m.el)?.value) || defSender; return x?.from_name || 'DRG Talent Team'; };
    let tpl = { value: () => ({ changes: [] }) };
    jobTemplatesEditor($('#jtpl', m.el), job, senderName, () => $('#jt', m.el).value.trim()).then(x => { tpl = x; });
    const ed = panelRoundsEditor($('#jpr', m.el), { panel: job?.hiring_panel || [], rounds: job?.rounds || [], coord: job?.coordinator_ids || [] }, team, true);
    $('#save', m.el).onclick = async () => {
      const d = { title: $('#jt', m.el).value.trim(), department: $('#jd2', m.el).value.trim(), location: $('#jl', m.el).value.trim(),
        employment_type: $('#je', m.el).value, openings: +$('#jo', m.el).value || 1, jd_text: $('#jx', m.el).value.trim(), client: $('#jc', m.el).value.trim() || null };
      const sn = $('#jsn', m.el); if (sn) d.sender_id = sn.value && sn.value !== defSender?.id ? sn.value : null;
      if (!d.title) return toast('Add a job title first.', true);
      const v = ed.value(); if (v.error) return toast(v.error, true);
      Object.assign(d, { hiring_panel: v.hiring_panel, rounds: v.rounds, coordinator_ids: v.coordinator_ids });
      const tv = tpl.value(); if (tv.error) { tpl.show?.(tv.key); return toast(tv.error, true); }
      const critChanged = JSON.stringify(crit) !== crit0;
      if (critChanged) d.interview_scoring = { ...(job?.interview_scoring || {}), criteria: crit, mode: scfg.mode, formula: scfg.formula, hire: scfg.hire, maybe: scfg.maybe };
      const btn = $('#save', m.el); btn.disabled = true;
      try { let saved;
            const tplNote = async id => { if (!tv.changes.length) return ''; const bad = await saveJobTemplates(id, tv.changes);
              return bad.length ? ` but ${bad.length} email${bad.length > 1 ? 's were' : ' was'} not saved; check the job's Emails tab` : ` with ${tv.changes.length} email change${tv.changes.length > 1 ? 's' : ''}`; };
            if (job) { await api.updateJob(job.id, d); saved = { ...job, ...d }; const n = await tplNote(job.id); m.close(); toast(`Job updated${n}`, n.startsWith(' but')); route(); if (critChanged) rescoreJob(saved, scoringCfg(saved)); }
            else { saved = await api.createJob(d); const n = await tplNote(saved.id); m.close(); toast(`Job created${n}. Now write the AI screening brief.`, n.startsWith(' but')); location.hash = `#/jobs/${saved.id}?tab=brief`; }
            ensureCalLinks({ ...saved, rounds: d.rounds, cal_links: saved.cal_links || {} }, team).then(r => { const bad = r.filter(x => !x.ok);
              if (bad.length) toast(`Cal.com link for Round ${bad.map(x => x.n).join(', ')} wasn't created. Open the job's Panel and rounds tab to retry.`, true); }); }
      catch (e) { btn.disabled = false; fail(e); }
    };
  }

  async function jobDetail(el, id, params) {
    const job = await api.job(id);
    const canEdit = ['admin', 'recruiter'].includes(state.me.role);
    let tab = params.get('tab') || 'brief'; if (tab === 'rules') tab = 'brief';
    const careers = (CFG.CAREERS_URL || '').replace(/\/$/, '');
    el.innerHTML = `<div class="page-head"><div><a href="#/jobs" class="small" style="text-decoration:none">← All jobs</a><h1 style="margin-top:6px">${esc(job.title)}${job.client ? ` <span class="chip ext" style="vertical-align:middle;font-size:13px">${esc(job.client)}</span>` : ''}</h1>
        <p>${esc(job.department || '')} · ${esc(job.location || '')} · ${esc(job.employment_type || '')} · ${job.openings} opening${job.openings > 1 ? 's' : ''}</p></div>
      <div class="row">${canEdit ? `<select class="input" id="status" style="width:auto" aria-label="Job status">${['draft', 'open', 'on_hold', 'closed'].map(s => `<option value="${s}" ${job.status === s ? 'selected' : ''}>${s === 'on_hold' ? 'On hold' : s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select>
        <button class="btn" id="edit">Edit</button>` : ''}${(job.rounds || []).length ? `<button class="btn" id="jcopy" aria-haspopup="menu">${icon('cal', 16)}Copy booking link ▾</button>` : ''}${job.status === 'open' && job.slug ? `<a class="btn" href="${esc(careers)}/roles/${esc(job.slug)}" target="_blank" rel="noopener">Careers page ↗</a>` : ''}<a class="btn primary" href="#/pipeline/${job.id}">${icon('board', 16)}Open pipeline</a></div></div>
      <div class="tabs" role="tablist">${[['brief', 'AI screening'], ['team', 'Panel and rounds'], ['scoring', 'Interview scoring'], ['form', 'Application form'], ['emails', 'Emails'], ['jd', 'Job description']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div id="tabbody"></div>`;
    $$('[data-tab]', el).forEach(b => b.onclick = () => location.hash = `#/jobs/${id}?tab=${b.dataset.tab}`);
    if (canEdit) {
      $('#status').onchange = async e => { try { await api.updateJob(id, { status: e.target.value }); toast(e.target.value === 'open' ? 'Job is open and live on the careers page' : 'Status updated'); } catch (er) { fail(er); } };
      $('#edit').onclick = () => jobForm(job);
    }
    const jc = $('#jcopy'); if (jc) jc.onclick = async e => { const btn = e.currentTarget; let team = []; try { team = await api.team(); } catch (er) { team = []; } linkMenu(btn, job, team); };
    const body = $('#tabbody');
    if (tab === 'jd') { body.innerHTML = `<div class="card card-b jd">${esc(job.jd_text) || '<span class="muted">No description yet.</span>'}</div>`; return; }
    if (tab === 'team') return panelBuilder(body, job, canEdit);
    if (tab === 'scoring') return scoringBuilder(body, job, canEdit);
    if (tab === 'form') return formBuilder(body, job, canEdit);
    if (tab === 'emails') return jobEmails(body, job, canEdit);
    rulesBuilder(body, job, canEdit);
  }

  function rulesBuilder(body, job, canEdit) {
    const r = job.rules ? JSON.parse(JSON.stringify(job.rules)) : { disqualifiers: [], factors: [], pass_score: 70, review_score: 50, ai_instructions: '' };
    r.disqualifiers = r.disqualifiers || []; r.factors = r.factors || [];
    const dis = canEdit ? '' : 'disabled';
    const draw = () => {
      const total = r.factors.reduce((a, f) => a + Number(f.weight || 0), 0);
      const fixed = r.factors.length > 0;
      const weightsOk = !fixed || total === 100;
      body.innerHTML = `<div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:18px" class="rules-grid">
        <div style="display:grid;gap:18px;align-content:start">
          <div class="card"><div class="card-h"><div><h3>Screening brief for the AI</h3><div class="small muted">Describe the ideal candidate in plain English: what they must have, what makes someone great, and what to be careful about. The AI scores every applicant against this brief, the job description and their form answers.</div></div></div>
            <div class="card-b" style="display:grid;gap:8px"><textarea class="input" id="aiins" rows="10" maxlength="6000" aria-label="Screening brief for the AI" placeholder="e.g. We need someone who has done outbound cold calling for at least 2 years, ideally selling to US companies. Must have used HubSpot or Salesforce. Great candidates give numbers (dials a day, meetings booked, quota hit). Agency SDR experience counts the same as SaaS. Internships count as half. A Loom video that is confident and clear is a strong plus." ${dis}>${esc(r.ai_instructions)}</textarea>
              <div class="small muted">The AI ignores anything about age, gender, religion, caste, nationality, marital status or photos.</div></div></div>
          <details class="card" ${r.disqualifiers.length || fixed ? 'open' : ''}><summary class="card-h" style="cursor:pointer"><div><h3>Optional: fixed must-haves and criteria</h3><div class="small muted">Leave these empty and the AI picks the must-haves and 3 to 6 weighted criteria from your brief for each candidate. Add them only if you want exact, comparable scoring.</div></div></summary>
            <div class="card-b" style="display:grid;gap:16px">
              <div style="display:grid;gap:8px"><b>Must-haves</b><span class="small muted">Not meeting one flags the candidate as Disqualified for a recruiter to confirm.</span>
                ${r.disqualifiers.map((d, i) => `<div class="rule-row"><input class="input" data-dq="${i}" value="${esc(d.rule)}" placeholder="e.g. At least 2 years of B2B sales experience" ${dis}>
                ${canEdit ? `<button class="icon-btn" data-dqdel="${i}" aria-label="Remove">${icon('trash')}</button>` : ''}</div>`).join('')}
                ${canEdit ? `<button class="btn sm" id="adddq" style="justify-self:start">${icon('plus', 14)}Add must-have</button>` : ''}</div>
              <div style="display:grid;gap:10px"><b>Scoring criteria</b><span class="small muted">The AI rates each from 0 to 10; weights turn ratings into a score out of 100.</span>
                ${r.factors.map((f, i) => `<div class="factor">
                  <input class="input" data-fn="${i}" value="${esc(f.name)}" placeholder="Criterion, e.g. Cold calling" ${dis}>
                  <input class="input" data-fg="${i}" value="${esc(f.guidance)}" placeholder="What does a 10 look like? (optional)" ${dis}>
                  <div class="row" style="gap:8px;flex-wrap:nowrap"><input type="range" min="0" max="100" step="5" value="${f.weight}" data-fw="${i}" aria-label="Weight" ${dis}><span class="weight">${f.weight}%</span></div>
                  ${canEdit ? `<button class="icon-btn" data-fdel="${i}" aria-label="Remove">${icon('trash')}</button>` : '<span></span>'}</div>`).join('')}
                <div class="row" style="justify-content:space-between">${canEdit ? `<button class="btn sm" id="addf">${icon('plus', 14)}Add criterion</button>` : '<span></span>'}
                  ${fixed ? `<div class="total ${total === 100 ? 'ok' : 'bad'}">${total === 100 ? icon('check', 16) : ''}Weights total ${total}%${total === 100 ? '' : ' · must equal 100'}</div>` : '<span class="small muted">No fixed criteria: the AI chooses them.</span>'}</div></div>
            </div></details>
        </div>
        <div style="display:grid;gap:18px;align-content:start">
          <div class="card"><div class="card-h"><h3>Verdict thresholds</h3></div><div class="card-b" style="display:grid;gap:14px">
            <div class="field"><label for="ps">Pass at or above</label><div class="row" style="flex-wrap:nowrap"><input type="range" id="ps" min="40" max="95" step="5" value="${r.pass_score}" ${dis} style="flex:1;accent-color:var(--pass)"><span class="weight">${r.pass_score}</span></div></div>
            <div class="field"><label for="rs">Review at or above</label><div class="row" style="flex-wrap:nowrap"><input type="range" id="rs" min="20" max="90" step="5" value="${r.review_score}" ${dis} style="flex:1;accent-color:var(--review)"><span class="weight">${r.review_score}</span></div></div>
            <div style="display:flex;height:10px;border-radius:6px;overflow:hidden"><i style="width:${r.review_score}%;background:var(--low)"></i><i style="width:${r.pass_score - r.review_score}%;background:var(--review)"></i><i style="flex:1;background:var(--pass)"></i></div>
            <div class="row small" style="justify-content:space-between"><span class="chip v-low_fit">Low fit</span><span class="chip v-review">Review</span><span class="chip v-pass">Pass</span></div>
          </div></div>
          <div class="card card-b" style="display:grid;gap:10px">
            <div class="row" style="gap:8px">${icon('spark', 18)}<h3>How screening works</h3></div>
            <p class="small muted" style="margin:0">Every new application, from the careers site or uploaded here, is read by AI within a minute. It follows your brief, checks the must-haves, rates the criteria with quoted evidence and suggests a verdict. Recruiters make every final decision.</p>
            ${job.rules ? `<div class="small muted">Active version ${job.rules.version}</div>` : ''}
            ${canEdit ? `<button class="btn primary" id="saverules" ${weightsOk ? '' : 'disabled'}>Save screening setup</button><button class="btn" id="rescreen">${icon('refresh', 16)}Rescreen candidates</button>` : ''}
          </div>
        </div></div>`;
      if (!canEdit) return;
      $$('[data-dq]', body).forEach(n => n.oninput = () => r.disqualifiers[n.dataset.dq].rule = n.value);
      $$('[data-fn]', body).forEach(n => n.oninput = () => r.factors[n.dataset.fn].name = n.value);
      $$('[data-fg]', body).forEach(n => n.oninput = () => r.factors[n.dataset.fg].guidance = n.value);
      $$('[data-fw]', body).forEach(n => n.oninput = () => { r.factors[n.dataset.fw].weight = +n.value; draw(); $(`[data-fw="${n.dataset.fw}"]`, body).focus(); });
      $$('[data-dqdel]', body).forEach(n => n.onclick = () => { r.disqualifiers.splice(+n.dataset.dqdel, 1); draw(); });
      $$('[data-fdel]', body).forEach(n => n.onclick = () => { r.factors.splice(+n.dataset.fdel, 1); draw(); });
      $('#adddq', body).onclick = () => { r.disqualifiers.push({ id: 'd' + Date.now(), rule: '' }); draw(); };
      $('#addf', body).onclick = () => { r.factors.push({ id: 'f' + Date.now(), name: '', weight: r.factors.length ? 0 : 100, guidance: '' }); draw(); };
      $('#ps', body).oninput = e => { r.pass_score = +e.target.value; if (r.review_score >= r.pass_score) r.review_score = r.pass_score - 5; draw(); $('#ps', body).focus(); };
      $('#rs', body).oninput = e => { r.review_score = Math.min(+e.target.value, r.pass_score - 5); draw(); $('#rs', body).focus(); };
      $('#aiins', body).oninput = e => { r.ai_instructions = e.target.value; };
      $('#saverules', body).onclick = async () => {
        const clean = { disqualifiers: r.disqualifiers.filter(d => d.rule.trim()).map((d, i) => ({ id: 'd' + (i + 1), rule: d.rule.trim() })),
          factors: r.factors.filter(f => f.name.trim()).map((f, i) => ({ id: 'f' + (i + 1), name: f.name.trim(), weight: +f.weight, guidance: (f.guidance || '').trim() })),
          pass_score: r.pass_score, review_score: r.review_score, ai_instructions: (r.ai_instructions || '').trim() };
        if (clean.factors.length && clean.factors.reduce((a, f) => a + f.weight, 0) !== 100) return toast('Weights of the named criteria must total 100, or remove them to let the AI choose.', true);
        if (!clean.ai_instructions && !clean.factors.length && !(job.jd_text || '').trim()) return toast('Write a short brief (or add a job description) so the AI knows what to look for.', true);
        try { const saved = await api.saveRules(job.id, clean); job.rules = saved; Object.assign(r, JSON.parse(JSON.stringify(saved))); toast(`Screening setup saved (version ${saved.version})`); draw(); } catch (e) { fail(e); }
      };
      $('#rescreen', body).onclick = async () => { try { const n = await api.rescreenJob(job.id); toast(n ? `${n} candidates sent for rescreening` : 'No candidates in Applied or Screened to rescreen'); } catch (e) { fail(e); } };
    };
    draw();
  }

  /* Hiring panel and interview rounds: shared editor used by the New job form and the job's tab */
  const ROUND_NAMES = ['Intro call', 'Skills interview', 'Final interview'];
  // Who sends what: the booking link a candidate gets for a round with this interviewer
  const linkSource = t => !t ? '' : t.cal_account ? `${firstName(t.full_name)}'s Cal.com` : t.booking_url ? `${firstName(t.full_name)}'s booking page` : 'the ATS booking page';
  const firstName = n => String(n || '').trim().split(' ')[0];

  // Hiring panel (searchable picker) and interview rounds (one interviewer each).
  // opts.onChange fires after every edit so the job page can save automatically.
  function panelRoundsEditor(host, st, team, canEdit, opts = {}) {
    const dis = canEdit ? '' : 'disabled';
    st.panel = (st.panel || []).filter(id => team.some(t => t.id === id));
    st.coord = (st.coord || []).filter(id => team.some(t => t.id === id));
    // Rounds used to allow several interviewers; keep only the first (the one whose link is sent)
    st.rounds = JSON.parse(JSON.stringify(st.rounds || [])).map(rd => ({ name: rd.name, duration: rd.duration || 30,
      interviewer_id: (Array.isArray(rd.interviewer_ids) && rd.interviewer_ids[0]) || rd.interviewer_id || null }));
    let q = '', open = false, adding = false;
    const changed = () => opts.onChange && opts.onChange();
    const byId = id => team.find(t => t.id === id);
    const tag = t => t.company ? `<span class="chip ext" title="Outside DRG">${esc(t.company)}</span>` : '';
    const draw = () => {
      const inPanel = st.panel.map(byId).filter(Boolean);
      const ql = q.trim().toLowerCase();
      const matches = team.filter(t => t.active !== false && !st.panel.includes(t.id) &&
        (!ql || `${t.full_name} ${t.email} ${t.title || ''} ${t.company || ''}`.toLowerCase().includes(ql))).slice(0, 8);
      host.innerHTML = `<div class="field"><label for="pq">Hiring panel</label><div class="small muted">Who is involved in hiring for this role. Search for a person to add them.</div>
          ${canEdit ? `<div class="pick-box">
            <input class="input" id="pq" placeholder="Search by name or email…" autocomplete="off" value="${esc(q)}" role="combobox" aria-expanded="${open}" aria-controls="pql">
            ${open ? `<div class="pick-list" id="pql" role="listbox">${matches.map(t => `<button type="button" class="pick-opt" role="option" data-add="${t.id}">${avatar(t.full_name, 26)}<span class="grow"><b>${esc(t.full_name)}</b><span class="small muted" style="display:block">${esc(t.email)}</span></span>${tag(t)}</button>`).join('')
              || `<div class="small muted" style="padding:10px 12px">${ql ? 'No one matches.' : 'Everyone is already on the panel.'}</div>`}
              <button type="button" class="pick-opt pick-new" data-new>+ Add someone outside DRG${ql && !ql.includes('@') ? ` named "${esc(q.trim())}"` : ''}</button></div>` : ''}
          </div>` : ''}
          ${adding ? `<div class="card" style="padding:14px;display:grid;gap:10px;margin-top:6px"><b>Add someone outside DRG</b>
            <div class="grid2"><div class="field"><label for="xn">Full name</label><input class="input" id="xn" value="${esc(ql.includes('@') ? '' : q.trim())}" placeholder="Philip Thomas"></div>
              <div class="field"><label for="xe">Work email</label><input class="input" id="xe" type="email" value="${esc(ql.includes('@') ? q.trim() : '')}" placeholder="philip@techjays.com"></div></div>
            <div class="grid2"><div class="field"><label for="xc">Company</label><input class="input" id="xc" placeholder="TechJays"></div>
              <div class="field"><label for="xb">Booking link (optional)</label><input class="input" id="xb" placeholder="Calendly or Cal.com link"></div></div>
            <div class="small muted">They don't get a login. If they run a round, candidates get their booking link, or the ATS booking page if they don't have one.</div>
            <div class="row" style="gap:8px"><button type="button" class="btn primary sm" id="xsave">Add to panel</button><button type="button" class="btn sm" id="xcancel">Cancel</button></div></div>` : ''}
          <div class="panel-list">${inPanel.map(t => `<div class="row panel-pick" style="gap:10px;flex-wrap:nowrap">${avatar(t.full_name, 28)}
              <span class="grow"><b>${esc(t.full_name)}</b><span class="small muted" style="display:block">${esc(t.title || '')}${t.title ? ' · ' : ''}${esc(t.email)}</span></span>${tag(t)}
              ${!t.meeting_link && !t.booking_url && !t.cal_account ? '<span class="chip v-review" title="Add a meeting or booking link in Settings → Interview panel">No meeting link</span>' : ''}
              ${canEdit ? `<button type="button" class="btn sm ghost" data-rm="${t.id}" aria-label="Remove ${esc(t.full_name)} from the panel" title="Remove">✕</button>` : ''}</div>`).join('')
            || '<div class="small muted">No one on the panel yet.</div>'}</div>
          <a class="small" href="#/settings?tab=panel" data-close>Edit people's meeting links in Settings → Interview panel</a></div>
        <div class="field"><span class="lbl" style="font-size:13px;font-weight:600">Coordinators</span>
          <div class="small muted">Get an email whenever a candidate enters a round, together with that round's interviewer, so they can call the candidate and make sure they book. Leave empty for no round emails.</div>
          <div class="iv-picks" role="group" aria-label="Coordinators" style="margin-top:4px">${team.filter(t => t.active !== false).map(t => `<label class="iv-pick ${st.coord.includes(t.id) ? 'on' : ''}"><input type="checkbox" data-co="${t.id}" ${st.coord.includes(t.id) ? 'checked' : ''} ${dis}>${esc(t.full_name)}</label>`).join('')}</div></div>
        <div class="field" style="max-width:220px"><label for="rc">Interview rounds</label><select class="input" id="rc" ${dis}>${[0, 1, 2, 3].map(n => `<option value="${n}" ${st.rounds.length === n ? 'selected' : ''}>${n === 0 ? 'Not set' : n + (n === 1 ? ' round' : ' rounds')}</option>`).join('')}</select></div>
        <div class="small muted" style="margin-top:-6px">Moving a candidate into a round emails them the interviewer's link to book a time. Anyone else can join the call from the shared calendar.</div>
        ${st.rounds.map((rd, i) => { const t = byId(rd.interviewer_id);
          return `<div class="round-row"><span class="round-n">Round ${i + 1}</span>
          <div class="field"><label for="rn${i}">Name</label><input class="input" id="rn${i}" data-rn="${i}" value="${esc(rd.name)}" placeholder="${ROUND_NAMES[i]}" ${dis}></div>
          <div class="field"><label for="ri${i}">Interviewer</label><select class="input" id="ri${i}" data-ri="${i}" ${dis}><option value="">Choose…</option>${inPanel.map(p => `<option value="${p.id}" ${p.id === rd.interviewer_id ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select>
            <div class="small ${t ? 'muted' : ''}" ${t ? '' : 'style="color:var(--review)"'}>${t ? `Candidates get ${esc(linkSource(t))}` : inPanel.length ? 'Choose who runs this round' : 'Add people to the hiring panel first'}</div></div>
          <div class="field"><label for="rd${i}">Length</label><select class="input" id="rd${i}" data-rd="${i}" ${dis}>${[15, 30, 45, 60, 90].map(m => `<option value="${m}" ${+rd.duration === m ? 'selected' : ''}>${m} min</option>`).join('')}</select></div></div>`; }).join('')}`;
      if (!canEdit) return;
      const pq = $('#pq', host);
      pq.oninput = () => { q = pq.value; open = true; draw(); const n = $('#pq', host); n.focus(); n.setSelectionRange(q.length, q.length); };
      pq.onfocus = () => { if (!open) { open = true; draw(); const n = $('#pq', host); n.focus(); n.setSelectionRange(q.length, q.length); } };
      pq.onkeydown = e => { if (e.key === 'Escape') { open = false; draw(); }
        if (e.key === 'Enter') { e.preventDefault(); const first = $('[data-add]', host); if (first) first.click(); } };
      $$('[data-add]', host).forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => { st.panel.push(b.dataset.add); q = ''; open = false; draw(); changed(); $('#pq', host)?.focus(); }; });
      const nb = $('[data-new]', host); if (nb) { nb.onmousedown = e => e.preventDefault(); nb.onclick = () => { adding = true; open = false; draw(); const f = $('#xn', host); (f.value ? $('#xe', host) : f).focus(); }; }
      if (open) { const close = e => { if (!host.contains(e.target) || !e.target.closest('.pick-box')) { document.removeEventListener('mousedown', close); if (open) { open = false; draw(); } } };
        setTimeout(() => document.addEventListener('mousedown', close), 0); }
      $$('[data-rm]', host).forEach(b => b.onclick = () => { st.panel = st.panel.filter(x => x !== b.dataset.rm);
        st.rounds.forEach(rd => { if (rd.interviewer_id === b.dataset.rm) rd.interviewer_id = null; }); draw(); changed(); });
      if (adding) {
        $('#xcancel', host).onclick = () => { adding = false; draw(); };
        $('#xsave', host).onclick = async () => {
          const full_name = $('#xn', host).value.trim(), email = $('#xe', host).value.trim().toLowerCase(), company = $('#xc', host).value.trim(), booking_url = $('#xb', host).value.trim();
          if (!full_name) return toast('Add their name.', true);
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast('Add a valid email address.', true);
          if (booking_url && !/^https?:\/\//i.test(booking_url)) return toast('The booking link should start with https://', true);
          const known = team.find(t => (t.email || '').toLowerCase() === email);
          try {
            const m = known || await api.saveMember({ full_name, email, company: company || null, booking_url: booking_url || null, active: true });
            if (!known) team.push(m);
            if (!st.panel.includes(m.id)) st.panel.push(m.id);
            adding = false; q = ''; draw(); changed(); toast(known ? `${known.full_name} was already in the list, so they've been added to the panel` : `${m.full_name} added to the panel`);
          } catch (e) { fail(e); }
        };
      }
      $$('[data-co]', host).forEach(n => n.onchange = () => { st.coord = n.checked ? [...new Set([...st.coord, n.dataset.co])] : st.coord.filter(x => x !== n.dataset.co); draw(); changed(); });
      $('#rc', host).onchange = e => { const n = +e.target.value;
        while (st.rounds.length < n) st.rounds.push({ name: ROUND_NAMES[st.rounds.length], duration: 30, interviewer_id: st.panel.length === 1 ? st.panel[0] : null });
        st.rounds = st.rounds.slice(0, n); draw(); changed(); };
      $$('[data-rn]', host).forEach(n => n.oninput = () => { st.rounds[n.dataset.rn].name = n.value; changed(); });
      $$('[data-ri]', host).forEach(n => n.onchange = () => { st.rounds[n.dataset.ri].interviewer_id = n.value || null; draw(); changed(); });
      $$('[data-rd]', host).forEach(n => n.onchange = () => { st.rounds[n.dataset.rd].duration = +n.value; changed(); });
    };
    draw();
    return {
      value() {
        const rounds = st.rounds.map((rd, i) => ({ name: (rd.name || '').trim() || ROUND_NAMES[i], duration: +rd.duration || 30,
          interviewer_id: rd.interviewer_id || null, interviewer_ids: rd.interviewer_id ? [rd.interviewer_id] : [] }));
        const missing = rounds.findIndex(rd => !rd.interviewer_id);
        return { error: missing >= 0 ? `Choose an interviewer for Round ${missing + 1}.` : null, hiring_panel: [...st.panel], rounds, coordinator_ids: [...st.coord] };
      }
    };
  }

  // Create any missing Cal.com links for a job's rounds, in the background. Returns per-round results.
  async function ensureCalLinks(job, team, onStep) {
    if (!CFG.CALCOM_CREATE_URL) return [];
    const out = [];
    for (const [i, rd] of (job.rounds || []).entries()) {
      const n = i + 1, t = team.find(x => x.id === rd.interviewer_id), l = (job.cal_links || {})[n];
      if (!t || !t.cal_account || (l && l.url && l.account === t.cal_account)) continue;
      onStep && onStep(n, 'creating');
      try { const r = await api.createCalLink(job.id, n);
        job.cal_links = { ...(job.cal_links || {}), [n]: { url: r.booking_url, event_type_id: r.event_type_id, account: r.account } };
        out.push({ n, ok: true }); onStep && onStep(n, 'ok'); }
      catch (e) { out.push({ n, ok: false, message: e.message }); onStep && onStep(n, 'error', e.message); }
    }
    return out;
  }

  async function panelBuilder(body, job, canEdit) {
    const team = (await api.team()).filter(t => t.active !== false);
    body.innerHTML = `<div class="card" style="max-width:860px"><div class="card-h"><div><h3>Hiring panel and interview rounds</h3><div class="small muted">Choose who hires for this role, how many interview rounds there are, and who runs each one. Changes save automatically.</div></div>
        ${canEdit ? '<span class="small muted save-state" id="svst" aria-live="polite">All changes saved</span>' : ''}</div>
      <div class="card-b" style="display:grid;gap:14px"><div id="pr" style="display:grid;gap:14px"></div></div></div>`;
    const calState = {};
    let redrawCal = () => {};
    let timer = null, saving = false, again = false, linking = false, relink = false;
    const svst = $('#svst', body);
    const setState = (txt, warn) => { if (svst) { svst.textContent = txt; svst.style.color = warn ? 'var(--review)' : ''; } };
    const links = async () => {
      if (linking) { relink = true; return; }
      linking = true;
      try { do { relink = false; await ensureCalLinks(job, team, (n, s, msg) => { calState[n] = { s, msg }; redrawCal(); }); } while (relink); }
      finally { linking = false; }
    };
    const save = async () => {
      if (saving) { again = true; return; }
      saving = true; setState('Saving…');
      try {
        do { again = false; const v = ed.value();
          await api.updateJob(job.id, { hiring_panel: v.hiring_panel, rounds: v.rounds, coordinator_ids: v.coordinator_ids });
          job.hiring_panel = v.hiring_panel; job.rounds = v.rounds; job.coordinator_ids = v.coordinator_ids;
          setState(v.error ? `Saved · ${v.error}` : 'All changes saved', !!v.error); } while (again);
        redrawCal(); links();
      } catch (e) { setState('Not saved. Check your connection.', true); fail(e); }
      finally { saving = false; }
    };
    const ed = panelRoundsEditor($('#pr', body), { panel: job.hiring_panel, rounds: job.rounds, coord: job.coordinator_ids }, team, canEdit,
      { onChange: () => { setState('Saving…'); clearTimeout(timer); timer = setTimeout(save, 700); } });
    if (CFG.CALCOM_CREATE_URL) {
      const cal = document.createElement('div'); cal.className = 'card'; cal.style.maxWidth = '860px';
      const drawCal = () => {
        const all = job.cal_links || {};
        const rows = (job.rounds || []).map((rd, i) => {
          const n = i + 1, lead = team.find(t => t.id === rd.interviewer_id), l = all[n], acct = lead && lead.cal_account, cs = calState[n];
          let right;
          if (!lead) right = '<span class="small muted">Choose an interviewer above.</span>';
          else if (!acct) right = `<span class="small muted">${esc(firstName(lead.full_name))} isn't connected to Cal.com, so candidates get ${lead.booking_url ? 'their own booking link' : 'the ATS booking page'}.</span>`;
          else if (l && l.url && l.account === acct) right = `<a class="btn sm" href="${esc(l.url)}" target="_blank" rel="noopener">Open ↗</a><span class="small muted mono" style="word-break:break-all">${esc(l.url)}</span>`;
          else if (cs && cs.s === 'error') right = `<span class="small" style="color:var(--disq)">${esc(cs.msg || 'Could not create the link.')}</span>${canEdit ? `<button class="btn sm" data-retry="${n}">Try again</button>` : ''}`;
          else if (!canEdit) right = '<span class="small muted">No link yet</span>';
          else right = `<span class="small muted">Creating the link in ${esc(firstName(lead.full_name))}'s Cal.com…</span>`;
          return `<div class="row" style="gap:10px;flex-wrap:wrap;align-items:center;padding:10px 0;border-top:1px solid var(--line)"><span style="min-width:190px"><b>Round ${n}</b> · ${esc(rd.name || '')}<br><span class="small muted">${esc(lead ? lead.full_name : 'No interviewer yet')}</span></span><span class="row" style="gap:10px;flex-wrap:wrap;flex:1">${right}</span></div>`;
        }).join('');
        const label = esc(job.title + (job.client ? ` (${job.client})` : ''));
        const offCal = (job.rounds || []).map((rd, i) => ({ n: i + 1, t: team.find(x => x.id === rd.interviewer_id) })).filter(x => x.t && !x.t.cal_account);
        cal.innerHTML = `<div class="card-h"><div><h3>Cal.com booking links</h3><div class="small muted">Created automatically in the interviewer's Cal.com when you choose them for a round. Candidates moved into that round get the link with their name and email filled in, and bookings come back into the ATS.</div></div></div>
          <div class="card-b" style="display:grid;gap:8px;padding-bottom:0"><div class="cal-title">${icon('cal', 15)}<span>Shows in calendars as <b>${label} · ${esc((job.rounds || [])[0]?.name || 'Intro call')} · Candidate name</b></span></div>
            ${offCal.length ? `<div class="small" style="color:var(--review)">${offCal.map(x => `Round ${x.n}: ${esc(firstName(x.t.full_name))}`).join(', ')} ${offCal.length > 1 ? "aren't" : "isn't"} on Cal.com, so bookings through ${offCal.length > 1 ? 'their own booking pages' : 'their own booking page'} won't show the role in calendars. Connect Cal.com in Settings → Interview panel.</div>` : ''}</div>
          <div class="card-b">${rows || '<p class="small muted" style="margin:0">Set up the interview rounds above. Links are created as soon as each round has an interviewer.</p>'}</div>`;
        $$('[data-retry]', cal).forEach(b => b.onclick = () => { delete calState[+b.dataset.retry]; drawCal(); links(); });
      };
      redrawCal = drawCal; drawCal(); body.append(cal);
      if (canEdit) links();   // fill in any links still missing on rounds saved earlier
    }
  }

  /* Custom application form for one job */
  const FIELD_TYPES = [['text', 'Short answer'], ['textarea', 'Long answer'], ['url', 'Link (e.g. Loom, portfolio)'], ['email', 'Email'], ['number', 'Number'], ['select', 'Pick one'], ['file', 'File upload']];
  function formBuilder(body, job, canEdit) {
    let fields = JSON.parse(JSON.stringify(job.form_fields || []));
    const dis = canEdit ? '' : 'disabled';
    const careers = (CFG.CAREERS_URL || '').replace(/\/$/, '');
    const draw = () => {
      body.innerHTML = `<div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:18px" class="rules-grid">
        <div class="card"><div class="card-h"><div><h3>Application form</h3><div class="small muted">Name, email, phone, LinkedIn and resume are always asked. Add the questions this role needs.</div></div></div>
          <div class="card-b" style="display:grid;gap:12px">
            <div class="fixed-fields">${['Full name', 'Email', 'Phone', 'LinkedIn', 'Resume (PDF or DOCX)'].map(l => `<span class="tag">${l}</span>`).join('')}</div>
            ${fields.map((f, i) => `<div class="ff-row">
              <div class="grid2"><div class="field"><label for="fl${i}">Question</label><input class="input" id="fl${i}" data-fl="${i}" value="${esc(f.label)}" placeholder="e.g. Share a 2-minute Loom introducing yourself" ${dis}></div>
                <div class="field"><label for="ft${i}">Answer type</label><select class="input" id="ft${i}" data-ft="${i}" ${dis}>${FIELD_TYPES.map(([k, l]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
              ${f.type === 'select' ? `<div class="field"><label for="fo${i}">Choices (one per line)</label><textarea class="input" rows="3" id="fo${i}" data-fo="${i}" ${dis}>${esc((f.options || []).join('\n'))}</textarea></div>` : ''}
              <div class="field"><label for="fh${i}">Help text (optional)</label><input class="input" id="fh${i}" data-fh="${i}" value="${esc(f.help)}" ${dis}></div>
              <div class="row" style="justify-content:space-between"><label class="row small" style="gap:6px"><input type="checkbox" data-fr="${i}" ${f.required ? 'checked' : ''} ${dis}> Required</label>
                ${canEdit ? `<div class="row" style="gap:4px"><button class="icon-btn" data-fup="${i}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button><button class="icon-btn" data-fdown="${i}" aria-label="Move down" ${i === fields.length - 1 ? 'disabled' : ''}>↓</button><button class="icon-btn" data-fx="${i}" aria-label="Remove question">${icon('trash')}</button></div>` : ''}</div></div>`).join('')}
            ${canEdit ? `<div class="row" style="gap:8px"><button class="btn sm" id="addq">${icon('plus', 14)}Add question</button>
              <button class="btn sm ghost" id="addloom">+ Loom video link</button><button class="btn sm ghost" id="adddoc">+ Extra document</button></div>
              <button class="btn primary" id="saveform" style="justify-self:start">Save form</button>` : ''}</div></div>
        <div style="display:grid;gap:18px;align-content:start"><div class="card card-b" style="display:grid;gap:10px"><h3>On the careers site</h3>
          ${job.status === 'open' ? `<p class="small muted" style="margin:0">This role is live. Applicants fill in this form, and their answers and files go to the AI screening and appear on the candidate's profile.</p>
            <a class="btn" href="${esc(careers)}/roles/${esc(job.slug)}" target="_blank" rel="noopener">Open the role page ↗</a><span class="small muted mono" style="word-break:break-all">${esc(careers)}/roles/${esc(job.slug)}</span>`
            : `<p class="small muted" style="margin:0">Set the job to Open to publish it on the careers site.</p>`}</div></div></div>`;
      if (!canEdit) return;
      const bind = (attr, fn) => $$(`[data-${attr}]`, body).forEach(n => fn(n, +n.dataset[attr]));
      bind('fl', (n, i) => n.oninput = () => fields[i].label = n.value);
      bind('fh', (n, i) => n.oninput = () => fields[i].help = n.value);
      bind('fo', (n, i) => n.oninput = () => fields[i].options = n.value.split('\n').map(x => x.trim()).filter(Boolean));
      bind('fr', (n, i) => n.onchange = () => fields[i].required = n.checked);
      bind('ft', (n, i) => n.onchange = () => { fields[i].type = n.value; draw(); });
      bind('fx', (n, i) => n.onclick = () => { fields.splice(i, 1); draw(); });
      bind('fup', (n, i) => n.onclick = () => { [fields[i - 1], fields[i]] = [fields[i], fields[i - 1]]; draw(); });
      bind('fdown', (n, i) => n.onclick = () => { [fields[i + 1], fields[i]] = [fields[i], fields[i + 1]]; draw(); });
      const add = f => { fields.push({ id: 'q' + Date.now().toString(36), required: false, help: '', ...f }); draw(); };
      $('#addq', body).onclick = () => add({ label: '', type: 'text' });
      $('#addloom', body).onclick = () => add({ label: 'Loom video introducing yourself', type: 'url', help: 'Paste a link to a short Loom video (2 minutes is plenty).' });
      $('#adddoc', body).onclick = () => add({ label: 'Additional document', type: 'file', help: 'PDF, DOCX, PNG or JPG, up to 5 MB.' });
      $('#saveform', body).onclick = async () => {
        const clean = fields.map(f => ({ id: f.id, label: (f.label || '').trim(), type: f.type || 'text', required: !!f.required, help: (f.help || '').trim(),
          ...(f.type === 'select' ? { options: (f.options || []).filter(Boolean) } : {}) }));
        const bad = clean.findIndex(f => !f.label);
        if (bad >= 0) return toast(`Question ${bad + 1} needs a label.`, true);
        const noOpts = clean.findIndex(f => f.type === 'select' && f.options.length < 2);
        if (noOpts >= 0) return toast(`Question ${noOpts + 1} needs at least two choices.`, true);
        try { await api.updateJob(job.id, { form_fields: clean }); job.form_fields = clean; fields = JSON.parse(JSON.stringify(clean)); toast('Application form saved'); draw(); } catch (e) { fail(e); }
      };
    };
    draw();
  }

  /* ───────── pipeline ───────── */
  async function pipeline(el, jobId, params) {
    const allJobs = await api.jobs(); state.jobs = allJobs;
    const jobs = allJobs.filter(j => j.status !== 'closed');
    if (jobId && !jobs.some(j => j.id === jobId)) jobId = null;
    if (!jobId) jobId = jobs.find(j => j.status === 'open')?.id || jobs[0]?.id;
    if (!jobId) { el.innerHTML = `<div class="card empty">No active jobs. Create a job, or reopen a closed one from Jobs.</div>`; return; }
    const job = jobs.find(j => j.id === jobId);
    const roundsN = (job?.rounds || []).length;
    let filter = params.get('v') || 'all', sort = 'score';
    el.innerHTML = `<div class="page-head"><div><h1>Pipeline</h1><p>Drag a candidate to move them. Moving someone into a round emails them a link to book a time with that round's interviewer. <span class="legend-booked">Blue cards</span> have an interview booked.</p></div>
      <div class="board-tools"><button class="btn sm" id="copylinks" aria-haspopup="menu">${icon('cal', 15)}Copy booking link ▾</button><select class="input" id="jobsel" style="width:auto;min-width:260px" aria-label="Job">${jobs.map(j => `<option value="${j.id}" ${j.id === jobId ? 'selected' : ''}>${esc(j.title)}</option>`).join('')}</select>
        <div class="seg" role="group" aria-label="Filter by verdict">${[['all', 'All'], ['pass', 'Pass'], ['review', 'Review'], ['disqualified', 'Disq.'], ['low_fit', 'Low fit']].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="seg" role="group" aria-label="Sort"><button data-s="score" class="on">Top score</button><button data-s="iscore">Interview score</button><button data-s="new">Newest</button></div></div></div>
      <div class="board" id="board"></div>`;
    $('#jobsel').onchange = e => location.hash = `#/pipeline/${e.target.value}`;
    let team = []; try { team = await api.team(); } catch (e) { team = []; }
    $('#copylinks').onclick = e => linkMenu(e.currentTarget, job, team);
    const draw = async () => {
      let cards = await api.cards(jobId);
      if (filter !== 'all') cards = cards.filter(c => c.verdict === filter);
      cards.sort(sort === 'score' ? (a, b) => (b.score ?? -1) - (a.score ?? -1) : sort === 'iscore' ? (a, b) => (b.iscore ?? -1) - (a.iscore ?? -1) || (b.score ?? -1) - (a.score ?? -1) : (a, b) => b.created_at.localeCompare(a.created_at));
      const scfg = scoringCfg(job);
      const cols = STAGES.filter(s => !STAGE_ROUND[s.id] || STAGE_ROUND[s.id] <= Math.max(roundsN, 1) || cards.some(c => c.stage_id === s.id));
      $('#board').innerHTML = cols.map(s => { const list = cards.filter(c => c.stage_id === s.id);
        const rd = STAGE_ROUND[s.id] ? job?.rounds?.[STAGE_ROUND[s.id] - 1] : null;
        return `<section class="col" data-stage="${s.id}" aria-label="${s.name}"><div class="col-h"><span>${s.name}${rd?.name ? `<span class="small muted" style="display:block;font-weight:500">${esc(rd.name)}</span>` : ''}</span><span class="row" style="gap:6px;flex-wrap:nowrap">${STAGE_ROUND[s.id] && rd ? `<button class="col-copy" data-colcopy="${STAGE_ROUND[s.id]}" title="Copy the Round ${STAGE_ROUND[s.id]} booking link" aria-label="Copy the Round ${STAGE_ROUND[s.id]} booking link">${icon('copy', 14)}</button>` : ''}<span class="n">${list.length}</span></span></div>
          <div class="col-b">${list.map(c => `<article class="kcard${c.interview_at ? ' booked' : ''}" draggable="true" data-card="${c.id}" tabindex="0">
            <div class="top">${ring(c.score, c.verdict, 38)}<div class="grow"><b>${esc(c.full_name)}</b><span class="small muted">${c.total_exp_years != null ? c.total_exp_years + ' yrs · ' : ''}${ago(c.created_at)}</span></div></div>
            ${c.interview_at ? `<div class="booked-tag${new Date(c.interview_at) < Date.now() ? ' past' : ''}">${icon('cal', 13)}<span><b>${new Date(c.interview_at) < Date.now() ? 'Interviewed' : 'Booked'} ${fmtDate(c.interview_at)}</b>${fmtTime(c.interview_at)} ${tzShort(c.interview_at)}${c.interviewer_name ? `<br>with ${esc(c.interviewer_name)}` : ''}</span></div>` : STAGE_ROUND[c.stage_id] ? '<div class="wait-tag">Waiting for the candidate to book</div>' : ''}<div class="row" style="justify-content:space-between">${chip(c)}${c.iscore != null ? iscoreBadge(c.iscore, ivVerdictOf(scfg, c.iscore), false, c.iscore_n > 1 ? `Interview · ${c.iscore_n}` : 'Interview') : c.source === 'careers_page' ? '<span class="tag">Careers page</span>' : ''}</div>
          </article>`).join('') || '<div class="small muted" style="padding:10px 4px">No one here yet</div>'}</div></section>`; }).join('');
      $$('[data-colcopy]').forEach(b => b.onclick = e => { e.stopPropagation(); const n = +b.dataset.colcopy; copyLink(roundLink(job, n, team)?.url, `Round ${n} booking link`); });
      $$('[data-card]').forEach(k => {
        k.onclick = () => openCandidate(k.dataset.card);
        k.onkeydown = e => e.key === 'Enter' && openCandidate(k.dataset.card);
        k.ondragstart = e => { e.dataTransfer.setData('text/plain', k.dataset.card); k.classList.add('dragging'); };
        k.ondragend = () => k.classList.remove('dragging');
      });
      $$('[data-stage]').forEach(col => {
        col.ondragover = e => { e.preventDefault(); col.classList.add('drop'); };
        col.ondragleave = () => col.classList.remove('drop');
        col.ondrop = async e => { e.preventDefault(); col.classList.remove('drop');
          const id = e.dataTransfer.getData('text/plain'); const st = +col.dataset.stage;
          if (st === 7) return rejectFlow(id, draw);
          const card = cards.find(c => c.id === id); if (card && card.stage_id === st) return;
          try { await api.moveStage(id, st); } catch (er) { return fail(er); }
          if (STAGE_ROUND[st]) { const rd = job?.rounds?.[STAGE_ROUND[st] - 1];
            rd?.interviewer_id ? toast(`Moved to ${stageName(st)}. The candidate is being emailed a link to book a time.`)
              : toast(`Moved to ${stageName(st)}. No booking email was sent: set up Round ${STAGE_ROUND[st]} under the job's Panel and rounds tab.`, true); }
          else toast(`Moved to ${stageName(st)}${st === 5 || st === 6 ? '. The candidate is being emailed.' : ''}`);
          draw(); };
      });
    };
    $$('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; $$('[data-f]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    $$('[data-s]').forEach(b => b.onclick = () => { sort = b.dataset.s; $$('[data-s]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    await draw();
    state.redraw = draw;
  }

  /* ───────── candidates table ───────── */
  async function candidates(el, _a, params) {
    const [all, jobs] = await Promise.all([api.cards(), api.jobs()]);
    const title = id => jobs.find(j => j.id === id)?.title || '';
    let q = params.get('q') || '';
    const range = params.get('range'), view = params.get('view');
    let cards = all, fLabel = '';
    if (range === 'week') { cards = all.filter(c => Date.now() - new Date(c.created_at) < 7 * 864e5); fLabel = `applicants from the last 7 days (${cards.length})`; }
    if (view === 'review') { cards = all.filter(c => c.stage_id === 2 && c.verdict).sort((a, b) => (b.score || 0) - (a.score || 0)); fLabel = `candidates awaiting review, highest score first (${cards.length})`; }
    el.innerHTML = `<div class="page-head"><div><h1>Candidates</h1><p>${all.length} applications across ${jobs.length} jobs</p></div>
      <input class="input" id="cq" style="max-width:320px" placeholder="Filter by name, email or job" value="${esc(q)}" aria-label="Filter"></div>
      ${fLabel ? filterBar(fLabel, '#/candidates') : ''}
      <div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Candidate</th><th>Job</th><th>Stage</th><th>AI score</th><th>Verdict</th><th>Applied</th></tr></thead><tbody id="rows"></tbody></table></div>`;
    const draw = () => {
      const s = q.toLowerCase();
      const list = cards.filter(c => !s || [c.full_name, c.email, title(c.job_id)].join(' ').toLowerCase().includes(s));
      $('#rows').innerHTML = list.map(c => `<tr class="li" data-app="${c.id}" tabindex="0" style="display:table-row"><td><div class="row" style="flex-wrap:nowrap">${avatar(c.full_name, 30)}<div><b>${esc(c.full_name)}</b><div class="small muted">${esc(c.email || '')}</div></div></div></td>
        <td>${esc(title(c.job_id))}</td><td>${stageName(c.stage_id)}</td><td class="num">${c.score ?? '—'}</td><td>${chip(c)}</td><td class="muted">${fmtDate(c.created_at)}</td></tr>`).join('')
        || `<tr><td colspan="6" class="empty">${q ? `No candidates match "${esc(q)}".` : 'No candidates here yet.'}</td></tr>`;
      bindApps($('#rows'));
    };
    $('#cq').oninput = e => { q = e.target.value; draw(); };
    draw();
  }



  // Phone shown big, with the country code split out, plus call and WhatsApp buttons
  const DIAL_CODES = ['1','7','20','27','30','31','32','33','34','36','39','40','41','43','44','45','46','47','48','49','51','52','54','55','56','57','60','61','62','63','64','65','66','81','82','84','86','90','91','92','93','94','95','98','212','233','234','251','254','255','256','351','353','357','358','359','370','371','372','380','381','385','420','421','852','855','880','886','960','961','962','965','966','968','971','972','973','974','977','998'];
  function splitPhone(raw) {
    const t = String(raw || '').trim(), digits = t.replace(/\D/g, '');
    const m = /^\+\s*(\d{1,3})[\s-]+(.+)$/.exec(t);
    if (m) return { code: m[1], num: m[2].replace(/\D/g, ''), digits };
    if (t.startsWith('+')) { const code = [...DIAL_CODES].sort((a, b) => b.length - a.length).find(c => digits.startsWith(c)); if (code) return { code, num: digits.slice(code.length), digits }; }
    return { code: '', num: digits || t, digits };
  }
  function phoneBlock(raw) {
    const p = splitPhone(raw), full = p.code ? p.code + p.num : p.digits;
    const n = p.num;
    const pretty = !/^\d+$/.test(n) ? n : p.code === '1' && n.length === 10 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
      : p.code === '92' && n.length === 10 ? `${n.slice(0, 3)} ${n.slice(3)}` : n.length === 10 ? `${n.slice(0, 5)} ${n.slice(5)}` : n;
    return `<div class="phone-big"><span class="pcode">${p.code ? '+' + esc(p.code) : '—'}</span><span class="pnum">${esc(pretty)}</span>
      <a class="btn sm" href="tel:+${esc(full)}">Call</a><a class="btn sm" href="https://wa.me/${esc(full)}" target="_blank" rel="noopener">WhatsApp</a>
      <button type="button" class="btn sm ghost" data-copyphone="+${esc(full)}">Copy</button>${p.code ? '' : '<span class="small" style="color:var(--review)">No country code</span>'}</div>`;
  }

  /* ───────── in-app document viewer (resumes and attachments) ───────── */
  // PDFs and images open inside the ATS; Word files show the text the AI read, with a download button
  async function viewFile({ path, name, resumeId }) {
    const ext = String(name || path || '').split('.').pop().toLowerCase();
    const kind = ext === 'pdf' ? 'pdf' : ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext) ? 'img' : 'doc';
    const s = document.createElement('div'); s.className = 'scrim viewer-scrim';
    s.innerHTML = `<div class="viewer" role="dialog" aria-modal="true" aria-label="${esc(name || 'Document')}">
      <div class="viewer-h">${icon('file', 18)}<b class="grow" title="${esc(name || '')}">${esc(name || 'Document')}</b>
        <a class="btn sm" id="vdl" hidden>Download</a><a class="btn sm" id="vnew" target="_blank" rel="noopener" hidden>Open in new tab ↗</a>
        <button class="x" data-vclose aria-label="Close">${icon('x', 20)}</button></div>
      <div class="viewer-b"><div class="empty"><span class="spin"></span></div></div></div>`;
    document.body.append(s);
    let blobUrl = null;
    const close = () => { s.remove(); if (blobUrl) URL.revokeObjectURL(blobUrl); document.removeEventListener('keydown', onKey, true); };
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    s.addEventListener('click', e => { if (e.target === s || e.target.closest('[data-vclose]')) close(); });
    const body = $('.viewer-b', s);
    try {
      const url = await api.fileUrl(path);
      if (!url) { body.innerHTML = '<div class="empty">Files open in the live app (demo has sample data only).</div>'; if (kind !== 'doc' || !resumeId) return; }
      if (url) { const dl = $('#vdl', s), nw = $('#vnew', s); dl.href = url + (url.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(name || 'file'); dl.hidden = false; nw.href = url; nw.hidden = false; }
      if (kind === 'pdf') {
        const r = await fetch(url); if (!r.ok) throw new Error('The file could not be loaded.');
        blobUrl = URL.createObjectURL(new Blob([await r.blob()], { type: 'application/pdf' }));
        body.innerHTML = `<iframe class="viewer-frame" title="${esc(name || 'Resume')}" src="${blobUrl}#view=FitH"></iframe>`;
      } else if (kind === 'img') {
        body.innerHTML = `<div class="viewer-img"><img src="${esc(url)}" alt="${esc(name || '')}"></div>`;
      } else {
        const text = resumeId ? await api.resumeText(resumeId) : '';
        body.innerHTML = `<div class="viewer-text"><div class="small muted" style="margin-bottom:10px">Word documents can't be shown as-is in the browser. This is the text the AI read from it; use Download for the original file.</div>
          ${text ? `<pre>${esc(text)}</pre>` : '<div class="empty">No text could be read from this file. Download it to view.</div>'}</div>`;
      }
    } catch (e) { body.innerHTML = `<div class="empty">${esc(e.message || 'The file could not be shown.')} Use Download or Open in new tab instead.</div>`; }
  }
  /* ───────── booking links (copy / resend) ───────── */
  // The link candidates use to book a round: the round's Cal.com link if it belongs to the current interviewer, else their own booking page
  function roundLink(job, n, team) {
    const rd = (job?.rounds || [])[n - 1]; if (!rd) return null;
    const t = (team || []).find(x => x.id === rd.interviewer_id), l = (job.cal_links || {})[n];
    if (l && l.url && (!t || !t.cal_account || l.account === t.cal_account)) return { url: l.url, cal: true, who: t?.full_name || '' };
    if (t && t.booking_url) return { url: t.booking_url, cal: false, who: t.full_name };
    return null;
  }
  // Same link with the candidate's name and email filled in, tagged so the booking lands on their application
  function personalLink(link, a, n) {
    if (!link) return null;
    if (!link.cal) return link.url;
    const c = a.candidates || {}, u = new URL(link.url);
    if (c.full_name) u.searchParams.set('name', c.full_name);
    if (c.email) u.searchParams.set('email', c.email);
    u.searchParams.set('metadata[application_id]', a.id); u.searchParams.set('metadata[round]', String(n));
    return u.toString();
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (er) { ok = false; } t.remove(); return ok; }
  }
  async function copyLink(url, what) {
    if (!url) return toast('No booking link for this round yet. Choose an interviewer who is on Cal.com, or who has their own booking page.', true);
    toast(await copyText(url) ? `${what} copied` : `Copy this link: ${url}`, false);
  }
  // A small menu listing each round's link, for the pipeline and job page headers
  function linkMenu(btn, job, team) {
    document.querySelector('.link-menu')?.remove();
    const rounds = job?.rounds || [];
    const m = document.createElement('div'); m.className = 'link-menu card'; m.setAttribute('role', 'menu');
    m.innerHTML = rounds.length ? rounds.map((rd, i) => { const l = roundLink(job, i + 1, team);
      return `<button type="button" role="menuitem" data-cl="${i + 1}" ${l ? '' : 'disabled'}><span><b>Round ${i + 1}</b> · ${esc(rd.name || '')}<span class="small muted" style="display:block">${l ? `${esc(firstName(l.who))}'s ${l.cal ? 'Cal.com' : 'booking page'}` : 'No link yet'}</span></span>${icon('copy', 15)}</button>`; }).join('')
      : '<div class="small muted" style="padding:10px 12px">Set up interview rounds on the job first.</div>';
    document.body.append(m);
    const r = btn.getBoundingClientRect();
    m.style.top = (r.bottom + window.scrollY + 6) + 'px'; m.style.left = Math.max(8, Math.min(r.left + window.scrollX, window.innerWidth - m.offsetWidth - 8)) + 'px';
    $$('[data-cl]', m).forEach(b => b.onclick = () => { const n = +b.dataset.cl; copyLink(roundLink(job, n, team)?.url, `Round ${n} booking link`); m.remove(); });
    const off = e => { if (!m.contains(e.target) && e.target !== btn) { m.remove(); document.removeEventListener('mousedown', off); } };
    setTimeout(() => document.addEventListener('mousedown', off), 0);
  }
  /* ───────── candidate drawer ───────── */
  async function openCandidate(id) {
    const s = document.createElement('div'); s.className = 'scrim';
    s.innerHTML = `<aside class="drawer" role="dialog" aria-modal="true" aria-label="Candidate"><div class="empty"><span class="spin"></span></div></aside>`;
    document.body.append(s);
    const close = () => { s.remove(); document.removeEventListener('keydown', esc_); };
    const esc_ = e => e.key === 'Escape' && close();
    document.addEventListener('keydown', esc_);
    s.addEventListener('click', e => { if (e.target === s || e.target.closest('[data-close]')) close(); });
    const render = async () => {
      const [a, iscores] = await Promise.all([api.application(id), api.interviewScores(id).catch(() => [])]);
      const c = a.candidates || {}; const sc = a.screening; const name = c.full_name || a.resumes?.file_name || 'New applicant';
      const canAct = ['admin', 'recruiter', 'hiring_manager'].includes(state.me.role);
      const card = { status: a.status, verdict: sc?.verdict };
      const failedMails = [];
      [...a.emails].sort((p, q) => q.sent_at.localeCompare(p.sent_at)).forEach(m => {
        if (m.status === 'failed' && !a.emails.some(x => x.template_key === m.template_key && x.status !== 'failed' && x.sent_at > m.sent_at) && !failedMails.some(x => x.template_key === m.template_key)) failedMails.push(m); });
      $('.drawer', s).innerHTML = `
        <div class="drawer-h">
          <div class="row" style="flex-wrap:nowrap;align-items:flex-start">${avatar(name, 48)}
            <div style="flex:1;min-width:0"><h2>${esc(name)}</h2><div class="small muted">${esc(a.jobs?.title)} · ${stageName(a.stage_id)} · applied ${fmtDate(a.created_at)}</div>
              <div class="row" style="margin-top:8px;gap:6px">${chip(card)}${a.source === 'careers_page' ? '<span class="tag">Careers site</span>' : ''}${c.email ? `<span class="tag">${esc(c.email)}</span>` : ''}${c.linkedin_url ? `<a class="tag" href="${esc(c.linkedin_url)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : ''}</div></div>
            ${ring(sc?.score ?? null, sc?.verdict, 64)}<button class="x" data-close aria-label="Close">${icon('x', 20)}</button></div>
          ${c.phone ? phoneBlock(c.phone) : ''}
          ${canAct ? `<div class="row" style="gap:8px">
            <select class="input" id="mv" style="width:auto" aria-label="Move to stage">${STAGES.filter(st => st.id !== 7 && (!STAGE_ROUND[st.id] || STAGE_ROUND[st.id] <= Math.max((a.jobs?.rounds || []).length, 1) || st.id === a.stage_id)).map(st => `<option value="${st.id}" ${st.id === a.stage_id ? 'selected' : ''}>${st.name}</option>`).join('')}</select>
            <button class="btn primary sm" id="sched">${icon('cal', 15)}Schedule interview</button>
            <button class="btn sm" id="iscore">${icon('check', 15)}Interview scoring</button>
            ${STAGE_ROUND[a.stage_id] ? `<button class="btn sm" id="cplink" title="Copies this candidate's booking link with their name and email filled in">${icon('copy', 15)}Copy booking link</button>
              <button class="btn sm" id="rsend">${icon('mail', 15)}${(a.interviews || []).some(i => i.status === 'scheduled' && i.stage_id === a.stage_id) ? 'Resend confirmation' : 'Resend booking email'}</button>` : ''}
            <button class="btn sm" id="resume">${icon('file', 15)}Resume</button>
            ${['admin', 'recruiter'].includes(state.me.role) ? `<button class="btn sm" id="rescr">${icon('refresh', 15)}Rescreen</button>` : ''}
            ${a.stage_id !== 7 ? `<button class="btn danger sm" id="rej">Reject</button>` : ''}</div>` : ''}
        </div>
        <div class="drawer-b">
          ${scoringCard(a, iscores)}
          ${failedMails.length && canAct ? `<div class="card card-b warn-box" style="display:grid;gap:8px"><b>${failedMails.length === 1 ? 'An email to this candidate could not be sent' : failedMails.length + ' emails to this candidate could not be sent'}</b>
            ${failedMails.map(m => `<div class="row" style="justify-content:space-between;gap:8px"><span class="small">${esc(mailName(m.template_key))} · ${new Date(m.sent_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              ${m.template_key === 'interviewer_notice' ? '' : `<button class="btn sm" data-resend="${esc(m.template_key)}">Send again</button>`}</div>`).join('')}
            <span class="small muted">Usually this means Gmail needs reconnecting in n8n. Once it is fixed, click Send again.</span></div>` : ''}
          ${sc ? `<div class="card card-b" style="display:grid;gap:8px;border-left:3px solid ${VCOLOR[sc.verdict]}"><div class="row" style="gap:8px">${icon('spark', 16)}<span class="eyebrow">AI summary</span></div><div style="font-size:15px">${esc(sc.summary)}</div>
              <div class="small muted">Scored ${ago(sc.created_at)} · ${esc(sc.model || '')}</div></div>
            <div class="card"><div class="card-h"><h3>Must-haves</h3></div><div class="card-b">${(sc.disqualifier_results || []).map(d => {
              const col = d.result === 'met' ? 'var(--pass)' : d.result === 'not_met' ? 'var(--disq)' : 'var(--review)';
              return `<div class="check"><span class="dot" style="background:${col}">${d.result === 'met' ? '✓' : d.result === 'not_met' ? '✕' : '?'}</span><div><b>${esc(d.rule || d.id)}</b> <span class="small" style="color:${col};font-weight:600">${d.result.replace('_', ' ')}</span>${d.evidence ? `<div class="quote">${esc(d.evidence)}</div>` : ''}</div></div>`; }).join('') || '<span class="muted">No must-haves set.</span>'}</div></div>
            <div class="card"><div class="card-h"><h3>Criteria</h3><span class="small muted">rating out of 10 · weight</span></div><div class="card-b">${(sc.factor_scores || []).map(f => `
              <div class="fbar"><div class="row" style="justify-content:space-between"><b>${esc(f.name || f.id)}</b><span class="num small">${f.rating}/10 · ${f.weight}%</span></div>
                <div class="tr"><i style="width:${f.rating * 10}%;background:${f.rating >= 7 ? 'var(--pass)' : f.rating >= 5 ? 'var(--review)' : 'var(--low)'}"></i></div><div class="small muted">${esc(f.reason)}</div></div>`).join('')}</div></div>`
            : `<div class="card card-b row">${a.status === 'screening_failed' ? 'The AI could not read this resume. Please review it manually or rescreen.' : '<span class="spin"></span> The AI is reading this resume. Results appear here automatically.'}</div>`}
          ${(a.form_answers || []).length || (a.attachments || []).length ? `<div class="card"><div class="card-h"><h3>Application answers</h3></div><div class="card-b" style="display:grid;gap:12px">
            ${(a.form_answers || []).map(q => `<div><div class="small muted">${esc(q.label)}</div><div style="white-space:pre-wrap">${/^https?:\/\//i.test(q.value || '') ? `<a href="${esc(q.value)}" target="_blank" rel="noopener">${esc(q.value)} ↗</a>` : esc(q.value)}</div></div>`).join('')}
            ${(a.attachments || []).map((f, k) => `<div><div class="small muted">${esc(f.label)}</div><button class="btn sm" data-att="${k}">${icon('file', 14)}${esc(f.name || 'Open file')}</button></div>`).join('')}</div></div>` : ''}
          ${c.full_name || c.profile_summary ? `<div class="card"><div class="card-h"><h3>Profile</h3><span class="small muted">${c.total_exp_years != null ? c.total_exp_years + ' years experience' : ''}${c.location ? ' · ' + esc(c.location) : ''}</span></div><div class="card-b" style="display:grid;gap:12px">
            ${c.profile_summary ? `<div style="font-size:14.5px;line-height:1.6">${esc(c.profile_summary)}</div>` : ''}
            ${!c.profile_summary && !(c.skills || []).length && !(c.work_history || []).length ? `<div class="small muted">${a.status === 'screening_failed' ? 'The profile summary, skills and work history appear here once the AI has read the resume. Click Rescreen to try again.' : 'The AI is building this profile from the resume.'}</div>` : ''}
            ${(c.skills || []).length ? `<div class="row" style="gap:6px">${c.skills.map(k => `<span class="tag">${esc(k)}</span>`).join('')}</div>` : ''}
            ${(c.work_history || []).map(w => `<div><b>${esc(w.title)}</b> · ${esc(w.company)} <span class="small muted">${esc(w.start || '')} – ${esc(w.end || '')}</span><div class="small muted">${esc(w.summary || '')}</div></div>`).join('')}
            ${(c.education || []).map(e => `<div class="small"><b>${esc(e.degree)}</b> · ${esc(e.institution)} ${esc(e.year || '')}</div>`).join('')}</div></div>` : ''}
          ${a.interviews?.length ? `<div class="card"><div class="card-h"><h3>Interviews</h3></div><div class="list">${a.interviews.map(i => `<div class="li" style="cursor:default"><div class="grow"><b>${stageName(i.stage_id)} · ${fmtDate(i.scheduled_at)} ${fmtTime(i.scheduled_at)}</b>
            <span class="small muted">${esc(ivWho(i))} · ${i.status}${i.rating ? ` · ${'★'.repeat(i.rating)} ${(i.recommendation || '').replace('_', ' ')}` : ''}</span>${i.feedback ? `<div class="quote">${esc(i.feedback)}</div>` : ''}</div>
            ${i.status === 'scheduled' ? `<button class="btn sm" data-score="${i.id}">Scorecard</button>` : ''}</div>`).join('')}</div></div>` : ''}
          <div class="card"><div class="card-h"><h3>Activity</h3></div><div class="card-b timeline">${[...a.activity.map(x => ({ t: x.created_at, txt: x.action === 'applied' ? 'Application received' : x.action === 'screened' ? `AI screening complete${x.note ? ' · ' + x.note : ''}` : x.action === 'screening_failed' ? `AI screening could not finish${x.note ? ' · ' + x.note : ''}` : x.action === 'interview_booked' ? `Candidate booked an interview${x.note ? ' · ' + x.note : ''}` : x.action === 'email_skipped' ? (x.note || 'Email not sent') : !x.to_stage ? `${x.action.replace(/_/g, ' ')}${x.note ? ' · ' + x.note : ''}` : `Moved ${x.from_stage ? stageName(x.from_stage) + ' → ' : 'to '}${stageName(x.to_stage)}${x.note ? ` · ${x.note}` : ''}` })),
              ...a.emails.map(m => ({ t: m.sent_at, txt: `${m.status === 'failed' ? 'Email NOT sent' : 'Email sent'}: ${mailName(m.template_key)}${m.template_key === 'interviewer_notice' && m.to_email ? ' (' + m.to_email + ')' : ''}` }))].sort((p, q) => q.t.localeCompare(p.t))
              .map(x => `<div class="tl"><i></i><div><div>${esc(x.txt)}</div><div class="small muted">${new Date(x.t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div></div></div>`).join('')}</div></div>
        </div>`;
      if (!canAct) return;
      $('#mv', s).onchange = async e => { const st = +e.target.value; if (st === 7) { e.target.value = String(a.stage_id); return rejectFlow(id, () => { render(); state.redraw?.(); }); } try { await api.moveStage(id, st); toast(`Moved to ${stageName(st)}`); render(); state.redraw?.(); } catch (er) { fail(er); } };
      $('#sched', s).onclick = () => scheduleFlow(id, STAGE_ROUND[a.stage_id] ? a.stage_id : 3, () => { render(); state.redraw?.(); });
      $$('[data-copyphone]', s).forEach(b => b.onclick = async () => toast(await copyText(b.dataset.copyphone) ? 'Phone number copied' : b.dataset.copyphone));
      const cpl = $('#cplink', s);
      if (cpl) cpl.onclick = async () => { const n = STAGE_ROUND[a.stage_id]; let team = []; try { team = await api.team(); } catch (e) { team = []; }
        copyLink(personalLink(roundLink(a.jobs, n, team), a, n), `${firstName(c.full_name) || 'Candidate'}'s Round ${n} booking link`); };
      const rs = $('#rsend', s);
      if (rs) rs.onclick = async () => { const n = STAGE_ROUND[a.stage_id];
        const iv = [...(a.interviews || [])].reverse().find(i => i.status === 'scheduled' && i.stage_id === a.stage_id);
        rs.disabled = true; const label = rs.textContent;
        rs.textContent = 'Sending…';
        try { await api.resendEmail(id, iv ? 'interview_invite' : `stage_${a.stage_id}`, iv?.id);
          toast(iv ? `Interview confirmation sent to ${c.email || 'the candidate'}` : `Round ${n} booking email sent to ${c.email || 'the candidate'}`); render(); }
        catch (e) { rs.disabled = false; rs.textContent = label; fail(e); } };
      $$('[data-resend]', s).forEach(b => b.onclick = async () => { b.disabled = true;
        try { const iv = [...(a.interviews || [])].reverse().find(i => i.status === 'scheduled'); await api.resendEmail(id, b.dataset.resend, iv?.id); toast('Email sent'); render(); }
        catch (e) { b.disabled = false; fail(e); } });
      $$('[data-att]', s).forEach(b => b.onclick = () => { const f = a.attachments[+b.dataset.att]; viewFile({ path: f.path, name: f.name || f.label || String(f.path).split('/').pop() }); });
      $('#resume', s).onclick = () => { if (!a.resumes?.storage_path) return toast('No resume file for this candidate.', true); viewFile({ path: a.resumes.storage_path, name: a.resumes.file_name, resumeId: a.resumes.id }); };
      $('#rescr', s) && ($('#rescr', s).onclick = async () => { try { await api.rescreen(id); toast('Sent for rescreening'); render(); } catch (e) { fail(e); } });
      $('#rej', s) && ($('#rej', s).onclick = () => rejectFlow(id, () => { render(); state.redraw?.(); }));
      $$('[data-score]', s).forEach(b => b.onclick = () => { const iv = a.interviews.find(i => i.id === b.dataset.score);
        scoringCfg(a.jobs).criteria.length ? scoringFlow(a, render, { interview: iv }) : scorecardFlow(b.dataset.score, render); });
      $('#iscore', s).onclick = () => scoringFlow(a, render);
      $$('[data-isedit]', s).forEach(b => b.onclick = () => scoringFlow(a, render, { existing: iscores.find(x => x.id === b.dataset.isedit) }));
    };
    try { await render(); } catch (e) { fail(e); close(); }
    let rt; const unsub = api.subscribe(() => { clearTimeout(rt); rt = setTimeout(() => { if (document.body.contains(s)) render().catch(() => {}); }, 300); });
    const obs = new MutationObserver(() => { if (!document.body.contains(s)) { unsub(); obs.disconnect(); } });
    obs.observe(document.body, { childList: true });
  }

  const MAIL_NAMES = { received: 'application received', rejection: 'rejection', offer: 'offer', hired: 'welcome', interview_invite: 'interview confirmation',
    interviewer_notice: 'interviewer notice', stage_3: 'Round 1 booking link', stage_4: 'Round 2 booking link', stage_8: 'Round 3 booking link', stage_5: 'offer', stage_6: 'welcome' };
  const mailName = k => MAIL_NAMES[k] || String(k).replace(/_/g, ' ');

  function rejectFlow(id, after) {
    const m = modal('Reject candidate', `<p class="muted" style="margin:0">The candidate moves to Rejected. The reason is saved in their history, shared in the Slack alert and included in the rejection email, so write it the way you would say it to the candidate.</p>
      <div class="field"><label for="rr">Reason type</label><select class="input" id="rr"><option value="">Choose a reason…</option><option>Does not meet a must-have</option><option>Not enough relevant experience</option><option>Another candidate was a better fit</option><option>Did not pass the interview</option><option>Salary expectations do not match</option><option>Candidate withdrew</option><option>Other</option></select></div>
      <div class="field"><label for="rd">Reason for rejection <span style="color:var(--disq)">*</span></label><textarea class="input" id="rd" rows="3" maxlength="1000" placeholder="Explain why this candidate is being rejected"></textarea></div>
      <div id="rerr" class="small" style="color:var(--disq)" role="alert"></div>
      <label class="row" style="gap:8px"><input type="checkbox" id="rn" checked> Send the rejection email to the candidate</label>`,
      `<button class="btn" data-close>Cancel</button><button class="btn danger solid" id="go">Reject</button>`);
    $('#rr', m.el).focus();
    $('#go', m.el).onclick = async () => { const go = $('#go', m.el), err = $('#rerr', m.el);
      const type = $('#rr', m.el).value, detail = $('#rd', m.el).value.trim();
      if (!type) { err.textContent = 'Please choose a reason type.'; return $('#rr', m.el).focus(); }
      if (detail.length < 5) { err.textContent = 'Please write the reason for rejection (at least 5 characters).'; return $('#rd', m.el).focus(); }
      err.textContent = ''; go.disabled = true;
      try { const res = await api.reject(id, `${type}: ${detail}`, $('#rn', m.el).checked) || {}; m.close();
        res.warning ? toast(`Candidate rejected, but the email was not sent. ${res.warning}`, true) : toast(res.emailed ? 'Candidate rejected and email sent' : 'Candidate rejected'); after?.(); }
      catch (e) { go.disabled = false; fail(e); } };
  }

  async function scheduleFlow(id, stage, after) {
    const [team, a] = await Promise.all([api.team(), api.application(id)]);
    const job = (state.jobs.find(j => j.id === a.job_id)) || (await api.job(a.job_id));
    const rounds = job.rounds || [];
    const active = team.filter(t => t.active !== false);
    if (!active.length) return toast('Add interviewers in Settings → Interview panel first.', true);
    let rno = STAGE_ROUND[stage] || 1;
    const d = new Date(Date.now() + 864e5); d.setHours(11, 0, 0, 0);
    const local = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
    const m = modal('Schedule interview', `
      <p class="small muted" style="margin:0">Use this when you have already agreed a time with the candidate. Otherwise just move them to the round: they get an email to book a time themselves.</p>
      <div class="grid2"><div class="field"><label for="ss">Round</label><select class="input" id="ss">${[1, 2, 3].map(n => `<option value="${n}" ${n === rno ? 'selected' : ''}>Round ${n}${rounds[n - 1]?.name ? ' · ' + esc(rounds[n - 1].name) : ''}</option>`).join('')}</select></div>
        <div class="field"><label for="sd">Length</label><select class="input" id="sd">${[15, 30, 45, 60, 90].map(x => `<option value="${x}">${x} min</option>`).join('')}</select></div></div>
      <div class="field"><label for="st">Date and time (your computer's time zone)</label><input class="input" type="datetime-local" id="st" value="${local}"></div>
      <div class="field"><label for="si">Interviewer</label><select class="input" id="si">${active.map(t => `<option value="${t.id}">${esc(t.full_name)}${t.title ? ' · ' + esc(t.title) : ''}</option>`).join('')}</select></div>
      <div class="field"><label for="sl">Meeting link</label><input class="input" id="sl" placeholder="https://meet.google.com/… or Zoom link"><div class="small" id="slh" style="color:var(--review)"></div></div>
      <p class="small muted" style="margin:0">A confirmation email with a calendar invite goes to the candidate and the interviewer. Anyone else can join from the shared calendar.</p>`,
      `<button class="btn" data-close>Cancel</button><button class="btn primary" id="go">Schedule and send invite</button>`);
    const fill = () => { const rd = rounds[rno - 1] || {};
      if (rd.interviewer_id && active.some(t => t.id === rd.interviewer_id)) $('#si', m.el).value = rd.interviewer_id;
      $('#sd', m.el).value = String(rd.duration || 30);
      const t = active.find(x => x.id === $('#si', m.el).value); $('#sl', m.el).value = t?.meeting_link || ''; slHint(t); };
    fill();
    function slHint(t) { $('#slh', m.el).textContent = !t || t.meeting_link ? '' : `${t.full_name} has no meeting link saved${t.booking_url ? ' (only a booking page, which candidates use to pick a time, not to join the call)' : ''}. Paste a Google Meet or Zoom link here, or add one in Settings → Interview panel.`; }
    $('#ss', m.el).onchange = e => { rno = +e.target.value; fill(); };
    $('#si', m.el).onchange = () => { const t = active.find(x => x.id === $('#si', m.el).value); $('#sl', m.el).value = t?.meeting_link || ''; slHint(t); };
    $('#go', m.el).onclick = async () => {
      const when = new Date($('#st', m.el).value);
      if (isNaN(when)) return toast('Choose a date and time.', true);
      const go = $('#go', m.el); go.disabled = true;
      try { const row = await api.schedule({ application_id: id, stage_id: ROUND_STAGE[rno], round_no: rno, team_member_id: $('#si', m.el).value, co_interviewer_ids: [],
          scheduled_at: when.toISOString(), duration_min: +$('#sd', m.el).value, meeting_link: $('#sl', m.el).value.trim() || null,
          candidate_tz: Intl.DateTimeFormat().resolvedOptions().timeZone }, a.stage_id);
        m.close(); toast(row.warning ? `Interview saved. ${row.warning}` : 'Interview scheduled and invite sent', !!row.warning); after?.(); }
      catch (e) { go.disabled = false; fail(e); } };
  }

  function scorecardFlow(ivid, after) {
    let rating = 0;
    const m = modal('Interview scorecard', `
      <div class="field"><label>Overall rating</label><div class="stars" id="stars">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n} stars">★</button>`).join('')}</div></div>
      <div class="field"><label for="rec">Recommendation</label><div class="seg" id="rec" role="group">${[['strong_yes', 'Strong yes'], ['yes', 'Yes'], ['no', 'No'], ['strong_no', 'Strong no']].map(([k, l]) => `<button type="button" data-r="${k}">${l}</button>`).join('')}</div></div>
      <div class="field"><label for="fb">Feedback</label><textarea class="input" id="fb" placeholder="Strengths, concerns, and anything the next interviewer should probe."></textarea></div>`,
      `<button class="btn" data-close>Cancel</button><button class="btn primary" id="go">Submit scorecard</button>`);
    let rec = null;
    $$('[data-n]', m.el).forEach(b => b.onclick = () => { rating = +b.dataset.n; $$('[data-n]', m.el).forEach(x => x.classList.toggle('on', +x.dataset.n <= rating)); });
    $$('[data-r]', m.el).forEach(b => b.onclick = () => { rec = b.dataset.r; $$('[data-r]', m.el).forEach(x => x.classList.toggle('on', x === b)); });
    $('#go', m.el).onclick = async () => {
      if (!rating || !rec) return toast('Add a rating and a recommendation.', true);
      try { await api.scorecard(ivid, { rating, recommendation: rec, feedback: $('#fb', m.el).value.trim() }); m.close(); toast('Scorecard submitted'); after?.(); } catch (e) { fail(e); } };
  }

  /* ───────── interview scoring ───────── */
  const SCORE_PRESETS = [['Attitude', 'Energy, ownership and how they handle pushback'], ['Experience with plays', 'How they have built and run outbound plays'],
    ['Signal detection', 'Spotting buying signals and acting on them'], ['Communication', 'Clear, confident, listens well'], ['Role knowledge', 'Knows the job, the tools and the numbers'],
    ['Coachability', 'Takes feedback and adjusts quickly'], ['Culture fit', 'Fits how the team works']];
  const RATE_WORDS = ['', 'Poor', 'Weak', 'OK', 'Good', 'Excellent'];
  const IVERDICT = { hire: ['Hire', 'var(--pass)'], maybe: ['Maybe', 'var(--review)'], no: ['No hire', 'var(--disq)'] };
  const critKey = (name, taken) => { let k = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 28) || 'point';
    if (/^\d/.test(k)) k = 'p_' + k; let n = k, i = 2; while (taken.includes(n)) n = `${k}_${i++}`; return n; };
  function scoringCfg(job) { const c = job?.interview_scoring || {};
    return { criteria: (c.criteria || []).map(x => ({ key: x.key, name: x.name || x.key, hint: x.hint || '', weight: x.weight > 0 ? +x.weight : 1, min: +x.min || 0 })),
      mode: c.mode === 'formula' ? 'formula' : 'weighted', formula: c.formula || '', hire: c.hire ?? 70, maybe: c.maybe ?? 50 }; }

  // Small safe calculator for custom formulas: numbers, criterion names, + - * / ( ) and min, max, avg, round
  function evalFormula(expr, vars) {
    const toks = []; const re = /\s*(\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|[-+*/(),])/y; let m, pos = 0; const src = String(expr || '').trim();
    if (!src) throw new Error('Write a formula first.');
    while (pos < src.length) { re.lastIndex = pos; m = re.exec(src); if (!m) throw new Error(`Can't read "${src.slice(pos).trim().slice(0, 12)}"`); toks.push(m[1]); pos = re.lastIndex; while (pos < src.length && src[pos] === ' ') pos++; }
    let i = 0; const peek = () => toks[i], next = () => toks[i++];
    const FN = { min: a => Math.min(...a), max: a => Math.max(...a), avg: a => a.reduce((t, x) => t + x, 0) / a.length, round: a => Math.round(a[0]) };
    const expr_ = () => { let v = term(); while (peek() === '+' || peek() === '-') { const o = next(); const r = term(); v = o === '+' ? v + r : v - r; } return v; };
    const term = () => { let v = factor(); while (peek() === '*' || peek() === '/') { const o = next(); const r = factor(); v = o === '*' ? v * r : (r === 0 ? 0 : v / r); } return v; };
    const factor = () => { const t = next();
      if (t === undefined) throw new Error('The formula ends too early.');
      if (t === '-') return -factor();
      if (t === '(') { const v = expr_(); if (next() !== ')') throw new Error('A bracket is not closed.'); return v; }
      if (/^\d/.test(t)) return +t;
      if (/^[A-Za-z_]/.test(t)) {
        if (peek() === '(') { next(); const f = FN[t.toLowerCase()]; if (!f) throw new Error(`Unknown function "${t}". Use min, max, avg or round.`);
          const args = [expr_()]; while (peek() === ',') { next(); args.push(expr_()); } if (next() !== ')') throw new Error('A bracket is not closed.'); return f(args); }
        if (!(t in vars)) throw new Error(`"${t}" is not one of this job's criteria.`); return vars[t]; }
      throw new Error(`Unexpected "${t}".`); };
    const v = expr_(); if (i < toks.length) throw new Error(`Unexpected "${toks[i]}".`);
    if (!isFinite(v)) throw new Error('The formula does not give a number.'); return v;
  }
  function computeScore(cfg, ratings) {
    const cs = cfg.criteria; if (!cs.length) return { score: null, verdict: null, flags: [], missing: [] };
    const missing = cs.filter(c => !(ratings[c.key] >= 1)).map(c => c.name);
    if (missing.length) return { score: null, verdict: null, flags: [], missing };
    let score;
    if (cfg.mode === 'formula') { const vars = Object.fromEntries(cs.map(c => [c.key, +ratings[c.key]])); score = evalFormula(cfg.formula, vars); }
    else { const tw = cs.reduce((t, c) => t + c.weight, 0) || 1; score = cs.reduce((t, c) => t + c.weight * ratings[c.key], 0) / tw / 5 * 100; }
    score = Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
    const flags = cs.filter(c => c.min && ratings[c.key] < c.min).map(c => c.name);
    const verdict = flags.length ? 'no' : score >= cfg.hire ? 'hire' : score >= cfg.maybe ? 'maybe' : 'no';
    return { score, verdict, flags, missing };
  }
  const ivVerdictOf = (cfg, score) => score == null ? null : score >= cfg.hire ? 'hire' : score >= cfg.maybe ? 'maybe' : 'no';
  const iscoreBadge = (score, v, big, label) => score == null ? '' : `<span class="iscore${big ? ' big' : ''}" style="--c:${IVERDICT[v]?.[1] || 'var(--muted)'}" title="Interview score ${Math.round(score)}/100"><b>${Math.round(score)}</b>${big ? '<i>/100</i>' : ''}<span>${label ?? (big ? IVERDICT[v]?.[0] || '' : 'Interview')}</span></span>`;

  async function rescoreJob(job, cfg) {
    let rows = []; try { rows = await api.jobInterviewScores(job.id); } catch (e) { return; }
    for (const r of rows) { let res; try { res = computeScore(cfg, r.ratings || {}); } catch (e) { continue; }
      if (res.score != null && +r.score !== res.score) { try { await api.saveInterviewScore({ id: r.id, score: res.score, verdict: res.verdict }); } catch (e) { /* keep going */ } } }
  }

  // Job page → Interview scoring tab
  function scoringBuilder(body, job, canEdit) {
    const cfg = scoringCfg(job); const dis = canEdit ? '' : 'disabled';
    let tryR = {}; let saveT, err = '';
    const draw = () => {
      const cs = cfg.criteria; const tw = cs.reduce((t, c) => t + c.weight, 0) || 1;
      const used = cs.map(c => c.name.toLowerCase());
      let res = { score: null }; err = '';
      try { if (cfg.mode === 'formula' && cs.length) evalFormula(cfg.formula, Object.fromEntries(cs.map(c => [c.key, 3]))); res = computeScore(cfg, tryR); } catch (e) { err = e.message; }
      body.innerHTML = `<div class="sc-wrap">
        <div class="card"><div class="card-h"><div><h3>What interviewers score</h3><div class="small muted">Each point is rated 1 to 5 on the candidate's profile (<b>Interview scoring</b> button). Add the points that matter for this role.</div></div><span class="save-state" id="svst"></span></div>
          <div class="card-b" style="display:grid;gap:12px">
            ${cs.length ? `<div class="sc-head small muted"><span>Point</span><span>What good looks like</span><span>Weight</span><span>Must score at least</span><span></span></div>` : ''}
            ${cs.map((c, i) => `<div class="sc-row" data-i="${i}">
              <input class="input" data-f="name" value="${esc(c.name)}" aria-label="Point name" ${dis}>
              <input class="input" data-f="hint" value="${esc(c.hint)}" placeholder="Optional guidance for the interviewer" aria-label="What good looks like" ${dis}>
              <div class="sc-w"><input class="input" type="number" min="1" max="100" data-f="weight" value="${c.weight}" aria-label="Weight" ${dis} ${cfg.mode === 'formula' ? 'disabled title="Weights are set inside your custom formula"' : ''}><span class="small muted">${cfg.mode === 'formula' ? '' : Math.round(c.weight / tw * 100) + '%'}</span></div>
              <select class="input" data-f="min" aria-label="Minimum" ${dis}>${[[0, 'No minimum'], [2, '2 or more'], [3, '3 or more'], [4, '4 or more']].map(([v, l]) => `<option value="${v}" ${c.min === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
              ${canEdit ? `<button class="x" data-del="${i}" aria-label="Remove ${esc(c.name)}" title="Remove">${icon('x', 16)}</button>` : '<span></span>'}
              <code class="sc-key small muted">${esc(c.key)}</code></div>`).join('') || '<div class="small muted">No points yet. Pick from the suggestions below or add your own.</div>'}
            ${canEdit ? `<div class="row" style="gap:6px">${SCORE_PRESETS.filter(([n]) => !used.includes(n.toLowerCase())).map(([n]) => `<button class="btn sm" data-pre="${esc(n)}">${icon('plus', 13)}${esc(n)}</button>`).join('')}</div>
              <div class="row" style="gap:8px"><input class="input" id="scnew" placeholder="Add your own point, e.g. Objection handling" style="max-width:360px"><button class="btn sm primary" id="scadd">Add</button></div>` : ''}
          </div></div>
        <div class="card"><div class="card-h"><div><h3>How the final score is worked out</h3><div class="small muted">Every scorecard gets a score out of 100. If several people score the candidate, the profile shows the average.</div></div></div>
          <div class="card-b" style="display:grid;gap:14px">
            <div class="sc-modes">
              <label class="sc-mode ${cfg.mode === 'weighted' ? 'on' : ''}"><input type="radio" name="scm" value="weighted" ${cfg.mode === 'weighted' ? 'checked' : ''} ${dis}><span><b>Weighted average</b><span class="small muted">Recommended. Each point counts by its weight. All 5s = 100.</span></span></label>
              <label class="sc-mode ${cfg.mode === 'formula' ? 'on' : ''}"><input type="radio" name="scm" value="formula" ${cfg.mode === 'formula' ? 'checked' : ''} ${dis}><span><b>Custom formula</b><span class="small muted">Write your own logic using the point names.</span></span></label></div>
            ${cfg.mode === 'formula' ? `<div class="field"><label for="scf">Formula (result out of 100)</label>
              <textarea class="input mono" id="scf" rows="2" ${dis} placeholder="(attitude * 2 + experience_with_plays * 2 + signal_detection) / 25 * 100">${esc(cfg.formula)}</textarea>
              <div class="row" style="gap:6px">${cs.map(c => `<button type="button" class="tag sc-ins" data-ins="${esc(c.key)}" ${dis}>${esc(c.key)}</button>`).join('')}<span class="small muted">+ − × ÷ ( ) and min( ), max( ), avg( ), round( ). Each point is a number from 1 to 5.</span></div>
              <div class="small" style="color:var(--disq)" role="alert">${esc(err)}</div></div>` : ''}
            <div class="grid2"><div class="field"><label for="sch">Hire when the score is at least</label><input class="input" type="number" id="sch" min="1" max="100" value="${cfg.hire}" ${dis}></div>
              <div class="field"><label for="scy">Maybe when the score is at least</label><input class="input" type="number" id="scy" min="0" max="100" value="${cfg.maybe}" ${dis}></div></div>
            <div class="small muted">Below the Maybe line is <b>No hire</b>. A point marked "must score at least" that is missed also makes it <b>No hire</b>, whatever the total.</div>
          </div></div>
        ${cs.length ? `<div class="card"><div class="card-h"><div><h3>Try it</h3><div class="small muted">Rate an imaginary candidate to check the formula gives the result you expect.</div></div>${res.score != null ? iscoreBadge(res.score, res.verdict, true) : ''}</div>
          <div class="card-b sc-try">${cs.map(c => `<div class="sc-try-row"><span>${esc(c.name)}</span><div class="rate" role="group" aria-label="${esc(c.name)}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-try="${c.key}" data-n="${n}" class="${tryR[c.key] === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>`).join('')}
            ${res.flags?.length ? `<div class="small" style="color:var(--disq)">Below the minimum on ${esc(res.flags.join(', '))}</div>` : ''}${res.score == null && !err ? '<div class="small muted">Rate every point to see the score.</div>' : ''}</div></div>` : ''}
      </div>`;
      if (!canEdit) return;
      const st = $('#svst', body);
      // Redraw after the current event finishes (a change event can fire while the field is losing focus)
      const save = (redraw = true) => { if (redraw) return void setTimeout(() => { draw(); persist(); }, 0); persist(); };
      const persist = () => { const s2 = $('#svst', body); if (err && cfg.mode === 'formula') { s2.textContent = 'Not saved: fix the formula'; return; }
        s2.textContent = 'Saving…'; clearTimeout(saveT);
        saveT = setTimeout(async () => { const v = { criteria: cfg.criteria, mode: cfg.mode, formula: cfg.formula, hire: cfg.hire, maybe: cfg.maybe };
          try { await api.updateJob(job.id, { interview_scoring: v }); job.interview_scoring = v; const x = $('#svst', body); if (x) x.textContent = 'All changes saved'; rescoreJob(job, cfg); }
          catch (e) { const x = $('#svst', body); if (x) x.textContent = 'Not saved'; fail(e); } }, 700); };
      $$('.sc-row', body).forEach(row => { const c = cfg.criteria[+row.dataset.i];
        $$('[data-f]', row).forEach(inp => inp.onchange = () => { const f = inp.dataset.f;
          if (f === 'name') { const v = inp.value.trim(); if (!v) { inp.value = c.name; return; } c.name = v; }
          else if (f === 'hint') { c.hint = inp.value.trim(); return save(false); }
          else if (f === 'weight') c.weight = Math.max(1, Math.min(100, +inp.value || 1));
          else if (f === 'min') c.min = +inp.value;
          save(); }); });
      $$('[data-del]', body).forEach(b => b.onclick = () => { const c = cfg.criteria[+b.dataset.del];
        if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.classList.add('armed'); b.title = 'Click again to remove'; toast(`Click × again to remove "${c.name}". Scores already given for it stay in old scorecards.`); return; }
        cfg.criteria.splice(+b.dataset.del, 1); delete tryR[c.key]; save(); });
      const add = name => { name = String(name).trim(); if (!name) return; if (cfg.criteria.some(c => c.name.toLowerCase() === name.toLowerCase())) return toast('That point is already on the list.', true);
        const pre = SCORE_PRESETS.find(p => p[0].toLowerCase() === name.toLowerCase());
        cfg.criteria.push({ key: critKey(name, cfg.criteria.map(c => c.key)), name, hint: pre ? pre[1] : '', weight: 1, min: 0 }); save(); };
      $$('[data-pre]', body).forEach(b => b.onclick = () => add(b.dataset.pre));
      const nw = $('#scnew', body); $('#scadd', body).onclick = () => add(nw.value); nw.onkeydown = e => { if (e.key === 'Enter') add(nw.value); };
      $$('input[name=scm]', body).forEach(r => r.onchange = () => { cfg.mode = r.value;
        if (cfg.mode === 'formula' && !cfg.formula && cfg.criteria.length) { const tw = cfg.criteria.reduce((t, c) => t + c.weight, 0);
          cfg.formula = `(${cfg.criteria.map(c => c.weight === 1 ? c.key : `${c.key} * ${c.weight}`).join(' + ')}) / ${tw * 5} * 100`; }
        save(); });
      const f = $('#scf', body); if (f) { f.onchange = () => { cfg.formula = f.value.trim(); save(); };
        $$('[data-ins]', body).forEach(b => b.onclick = () => { const p = f.selectionStart ?? f.value.length; f.value = f.value.slice(0, p) + b.dataset.ins + f.value.slice(f.selectionEnd ?? p); cfg.formula = f.value.trim(); save(); }); }
      $('#sch', body).onchange = e => { cfg.hire = Math.max(1, Math.min(100, +e.target.value || 70)); if (cfg.maybe > cfg.hire) cfg.maybe = cfg.hire; save(); };
      $('#scy', body).onchange = e => { cfg.maybe = Math.max(0, Math.min(cfg.hire, +e.target.value || 0)); save(); };
      $$('[data-try]', body).forEach(b => b.onclick = () => { tryR[b.dataset.try] = +b.dataset.n; const y = window.scrollY; draw(); window.scrollTo(0, y); });
      if (st && !st.textContent) st.textContent = cfg.criteria.length ? 'Changes save automatically' : '';
    };
    draw();
  }

  // Candidate profile → Interview scoring
  async function scoringFlow(a, after, opts = {}) {
    const job = a.jobs || {}; const cfg = scoringCfg(job);
    const canSetup = ['admin', 'recruiter'].includes(state.me.role);
    if (!cfg.criteria.length) {
      const m = modal('Interview scoring', `<p style="margin:0">This job has no scoring points yet. ${canSetup ? 'Add the points interviewers should rate (for example Attitude, Experience with plays, Signal detection) on the job\'s <b>Interview scoring</b> tab.' : 'Ask a recruiter to add them on the job\'s Interview scoring tab.'}</p>`,
        `<button class="btn" data-close>Close</button>${canSetup ? '<button class="btn primary" id="gojob">Set up scoring</button>' : ''}`);
      const g = $('#gojob', m.el); if (g) g.onclick = () => { m.close(); $$('.scrim').forEach(x => x.remove()); location.hash = `#/jobs/${job.id}?tab=scoring`; };
      return;
    }
    let team = []; try { team = (await api.team()).filter(t => t.active !== false); } catch (e) { team = []; }
    const rounds = job.rounds || []; const nR = Math.max(rounds.length, 1);
    const me = team.find(t => (t.email || '').toLowerCase() === (state.me.email || '').toLowerCase());
    const ex = opts.existing || null;
    const iv0 = opts.interview || null;
    let rno = ex?.round_no || iv0?.round_no || STAGE_ROUND[iv0?.stage_id] || STAGE_ROUND[a.stage_id] || 1;
    const leadOf = n => rounds[n - 1]?.interviewer_id || null;
    let who = ex?.member_id || iv0?.team_member_id || me?.id || leadOf(rno) || team[0]?.id || '';
    const ratings = { ...(ex?.ratings || {}) }; let rec = ex?.recommendation || null; let recTouched = !!ex?.recommendation;
    const m = modal(`Interview scoring · ${a.candidates?.full_name || 'Candidate'}`, `
      <div class="grid2"><div class="field"><label for="isr">Round</label><select class="input" id="isr">${Array.from({ length: nR }, (_, k) => k + 1).map(n => `<option value="${n}" ${n === rno ? 'selected' : ''}>Round ${n}${rounds[n - 1]?.name ? ' · ' + esc(rounds[n - 1].name) : ''}</option>`).join('')}</select></div>
        <div class="field"><label for="isw">Scored by</label><select class="input" id="isw">${team.map(t => `<option value="${t.id}" ${t.id === who ? 'selected' : ''}>${esc(t.full_name)}${t.company ? ' · ' + esc(t.company) : ''}</option>`).join('')}<option value="" ${!who ? 'selected' : ''}>${esc(state.me.full_name || 'Me')}</option></select></div></div>
      <div class="is-list">${cfg.criteria.map(c => `<div class="is-row"><div class="is-name"><b>${esc(c.name)}</b>${c.min ? `<span class="tag">needs ${c.min}+</span>` : ''}${cfg.mode === 'weighted' ? `<span class="small muted">${Math.round(c.weight / cfg.criteria.reduce((t, x) => t + x.weight, 0) * 100)}%</span>` : ''}${c.hint ? `<span class="small muted" style="display:block">${esc(c.hint)}</span>` : ''}</div>
        <div class="rate" role="radiogroup" aria-label="${esc(c.name)}">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" data-k="${c.key}" data-n="${n}" title="${RATE_WORDS[n]}"><b>${n}</b><span>${RATE_WORDS[n]}</span></button>`).join('')}</div></div>`).join('')}</div>
      <div class="field"><label for="isn">Notes</label><textarea class="input" id="isn" rows="3" placeholder="Why these scores? Strengths, concerns, anything the next interviewer should probe.">${esc(ex?.notes || '')}</textarea></div>
      <div class="field"><label>Your recommendation</label><div class="seg" id="isrec" role="group">${[['strong_yes', 'Strong yes'], ['yes', 'Yes'], ['no', 'No'], ['strong_no', 'Strong no']].map(([k, l]) => `<button type="button" data-r="${k}">${l}</button>`).join('')}</div></div>
      <div class="is-result" id="isres" aria-live="polite"></div>`,
      `${ex ? '<button class="btn danger" id="isdel" style="margin-right:auto">Delete</button>' : ''}<button class="btn" data-close>Cancel</button><button class="btn primary" id="go">${ex ? 'Save changes' : 'Save score'}</button>`);
    m.el.querySelector('.modal').classList.add('wide');
    const recFor = r => r.score == null ? null : r.verdict === 'hire' ? (r.score >= Math.max(cfg.hire + 15, 85) ? 'strong_yes' : 'yes') : r.verdict === 'maybe' ? null : (r.score < cfg.maybe / 2 ? 'strong_no' : 'no');
    const paint = () => { let r; try { r = computeScore(cfg, ratings); } catch (e) { r = { score: null, err: e.message, flags: [], missing: [] }; }
      $$('[data-k]', m.el).forEach(b => { const on = ratings[b.dataset.k] === +b.dataset.n; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
      if (!recTouched) rec = recFor(r);
      $$('[data-r]', m.el).forEach(b => b.classList.toggle('on', b.dataset.r === rec));
      $('#isres', m.el).innerHTML = r.err ? `<span class="small" style="color:var(--disq)">The job's scoring formula has a problem: ${esc(r.err)}</span>`
        : r.score == null ? `<span class="small muted">Rate ${r.missing.length === cfg.criteria.length ? 'each point' : r.missing.length + ' more point' + (r.missing.length > 1 ? 's' : '')} to see the final score.</span>`
        : `${iscoreBadge(r.score, r.verdict, true)}<span class="small">${r.flags.length ? `<b style="color:var(--disq)">No hire:</b> below the minimum on ${esc(r.flags.join(', '))}.` : `Hire at ${cfg.hire}+, Maybe at ${cfg.maybe}+.`}</span>`;
      return r; };
    $$('[data-k]', m.el).forEach(b => b.onclick = () => { ratings[b.dataset.k] = +b.dataset.n; paint(); });
    $$('[data-r]', m.el).forEach(b => b.onclick = () => { rec = rec === b.dataset.r ? null : b.dataset.r; recTouched = true; paint(); });
    $('#isr', m.el).onchange = e => { rno = +e.target.value; if (!ex && !iv0 && !me && leadOf(rno)) $('#isw', m.el).value = leadOf(rno); };
    paint();
    const del = $('#isdel', m.el);
    if (del) del.onclick = async () => { if (del.dataset.armed !== '1') { del.dataset.armed = '1'; del.textContent = 'Click again to delete'; return; }
      try { await api.deleteInterviewScore(ex.id); m.close(); toast('Scorecard deleted'); after?.(); } catch (e) { fail(e); } };
    $('#go', m.el).onclick = async () => {
      const r = paint(); if (r.err) return toast('Fix the scoring formula on the job first.', true);
      if (r.score == null) return toast(`Rate every point first: ${r.missing.join(', ')}.`, true);
      const go = $('#go', m.el); go.disabled = true;
      const wid = $('#isw', m.el).value; const wm = team.find(t => t.id === wid);
      const iv = iv0 || [...(a.interviews || [])].reverse().find(i => (i.round_no || STAGE_ROUND[i.stage_id]) === rno && i.status !== 'cancelled');
      const notes = $('#isn', m.el).value.trim();
      try {
        await api.saveInterviewScore({ ...(ex ? { id: ex.id } : {}), application_id: a.id, job_id: job.id || a.job_id, interview_id: iv?.id || null, round_no: rno,
          member_id: wid || null, scorer_name: wm?.full_name || state.me.full_name || null, ratings, notes: notes || null, score: r.score, verdict: r.verdict, recommendation: rec });
        if (iv && iv.status === 'scheduled') { const vals = Object.values(ratings); const avg = Math.round(vals.reduce((t, x) => t + x, 0) / vals.length);
          try { await api.scorecard(iv.id, { rating: Math.max(1, Math.min(5, avg)), recommendation: rec || recFor(r) || 'no', feedback: [`Interview score ${Math.round(r.score)}/100 (${IVERDICT[r.verdict][0]})`, notes].filter(Boolean).join('\n\n') }); } catch (e) { /* the score itself is saved */ } }
        m.close(); toast(`Score saved: ${Math.round(r.score)}/100 · ${IVERDICT[r.verdict][0]}`); after?.(); state.redraw?.();
      } catch (e) { go.disabled = false; fail(e); }
    };
  }

  // The summary card at the top of the candidate profile
  function scoringCard(a, scores) {
    const cfg = scoringCfg(a.jobs); const xs = scores.filter(x => x.score != null);
    if (!xs.length) return cfg.criteria.length ? `<div class="card card-b is-empty row" style="gap:10px">${icon('check', 16)}<span class="grow small">No interview scores yet. Click <b>Interview scoring</b> above after an interview to rate ${cfg.criteria.map(c => esc(c.name)).slice(0, 3).join(', ')}${cfg.criteria.length > 3 ? '…' : ''}.</span></div>` : '';
    const avg = xs.reduce((t, x) => t + +x.score, 0) / xs.length; const v = xs.some(x => x.verdict === 'no' && (x.ratings && cfg.criteria.some(c => c.min && x.ratings[c.key] < c.min))) ? 'no' : ivVerdictOf(cfg, avg);
    const crit = [...cfg.criteria, ...[...new Set(xs.flatMap(x => Object.keys(x.ratings || {})))].filter(k => !cfg.criteria.some(c => c.key === k)).map(k => ({ key: k, name: k.replace(/_/g, ' '), old: true }))];
    const mine = x => x.scored_by === state.me.id || ['admin', 'recruiter'].includes(state.me.role);
    return `<div class="card is-card" style="border-left:3px solid ${IVERDICT[v][1]}"><div class="card-h"><div class="row" style="gap:12px">${iscoreBadge(avg, v, true)}<div><h3>Interview score</h3><div class="small muted">${xs.length === 1 ? 'From 1 scorecard' : `Average of ${xs.length} scorecards`} · ${cfg.mode === 'formula' ? 'custom formula' : 'weighted average'}</div></div></div></div>
      <div class="card-b" style="display:grid;gap:14px">
        <div class="is-bars">${crit.map(c => { const vals = xs.map(x => +(x.ratings || {})[c.key]).filter(n => n >= 1); if (!vals.length) return '';
          const av = vals.reduce((t, n) => t + n, 0) / vals.length;
          return `<div class="fbar"><div class="row" style="justify-content:space-between"><b>${esc(c.name)}${c.old ? ' <span class="small muted">(removed)</span>' : ''}</b><span class="num small">${av.toFixed(1)}/5</span></div><div class="tr"><i style="width:${av * 20}%;background:${av >= 4 ? 'var(--pass)' : av >= 3 ? 'var(--review)' : 'var(--low)'}"></i></div></div>`; }).join('')}</div>
        <div class="list is-each">${scores.map(x => `<div class="li" style="cursor:default"><div class="grow"><b>${esc(x.scorer_name || 'Interviewer')}</b><div class="small muted">Round ${x.round_no || '–'} · ${fmtDate(x.updated_at || x.created_at)}${x.recommendation ? ' · Recommends: ' + x.recommendation.replace('_', ' ') : ''}</div>
            <div class="small muted">${crit.filter(c => (x.ratings || {})[c.key]).map(c => `${esc(c.name)} ${x.ratings[c.key]}`).join(' · ')}</div>${x.notes ? `<div class="quote">${esc(x.notes)}</div>` : ''}</div>
          ${iscoreBadge(x.score, x.verdict, false, IVERDICT[x.verdict]?.[0] || '')}${mine(x) ? `<button class="btn sm" data-isedit="${x.id}">Edit</button>` : ''}</div>`).join('')}</div>
      </div></div>`;
  }

  /* ───────── upload ───────── */
  let libsLoaded = false;
  const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.append(s); });
  async function extractText(file) {
    if (api.mode === 'demo') return '';
    if (!libsLoaded) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js');
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      libsLoaded = true;
    }
    const buf = await file.arrayBuffer();
    if (/\.pdf$/i.test(file.name)) {
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise; let t = '';
      for (let i = 1; i <= pdf.numPages; i++) t += (await (await pdf.getPage(i)).getTextContent()).items.map(x => x.str).join(' ') + '\n';
      return t;
    }
    return (await mammoth.extractRawText({ arrayBuffer: buf })).value;
  }
  window.ATS.extractText = extractText;

  async function upload(el, jobId) {
    const jobs = (state.jobs = await api.jobs()).filter(j => j.status !== 'closed');
    jobId = jobId || jobs.find(j => j.status === 'open')?.id || jobs[0]?.id;
    el.innerHTML = `<div class="page-head"><div><h1>Add candidates</h1><p>Drop resumes and the AI screens each one against the job's rules, usually within a minute.</p></div></div>
      <div class="card card-b" style="display:grid;gap:16px">
        <div class="field" style="max-width:420px"><label for="uj">Job</label><select class="input" id="uj">${jobs.map(j => `<option value="${j.id}" ${j.id === jobId ? 'selected' : ''}>${esc(j.title)}${j.rules === null ? ' (no rules yet)' : ''}</option>`).join('')}</select></div>
        <label class="drop-zone" id="dz" tabindex="0">${icon('upload', 40)}<b style="font-size:16px">Drop PDF or DOCX resumes here</b><span class="muted small">or click to choose files · up to 5 MB each · many at once</span>
          <input type="file" id="uf" accept=".pdf,.docx" multiple hidden></label>
      </div>
      <div class="card" id="uplist" hidden><div class="card-h"><h3>Uploads</h3><a class="btn sm" id="topipe" href="#/pipeline">View in pipeline →</a></div><div id="uprows"></div></div>`;
    const dz = $('#dz'), inp = $('#uf');
    $('#uj').onchange = e => { jobId = e.target.value; $('#topipe').href = `#/pipeline/${jobId}`; };
    $('#topipe').href = `#/pipeline/${jobId}`;
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove('over'); handle([...e.dataTransfer.files]); };
    dz.onkeydown = e => (e.key === 'Enter' || e.key === ' ') && inp.click();
    inp.onchange = () => handle([...inp.files]);
    async function handle(files) {
      if (!jobId) return toast('Create a job first.', true);
      $('#uplist').hidden = false;
      for (const f of files) {
        const row = document.createElement('div'); row.className = 'up-row';
        row.innerHTML = `<div class="row" style="flex-wrap:nowrap">${icon('file')}<b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</b></div><div class="prog"><i style="width:10%"></i></div><span class="small muted">Reading…</span>`;
        $('#uprows').prepend(row);
        const set = (w, t, cls) => { $('i', row).style.width = w + '%'; const s = $('span.small', row); s.textContent = t; if (cls) s.className = 'small ' + cls; };
        if (!/\.(pdf|docx)$/i.test(f.name)) { set(100, 'Only PDF or DOCX', ''); $('span.small', row).style.color = 'var(--disq)'; continue; }
        if (f.size > 5 * 1048576) { set(100, 'Over 5 MB', ''); $('span.small', row).style.color = 'var(--disq)'; continue; }
        try { const text = await extractText(f); set(45, 'Uploading…');
          await api.upload(jobId, f, text); set(100, 'Sent to AI screening'); $('span.small', row).style.color = 'var(--pass)'; }
        catch (e) { set(100, 'Failed'); $('span.small', row).style.color = 'var(--disq)'; fail(e); }
      }
    }
  }

  /* ───────── interviews ───────── */
  async function interviews(el, _a, params) {
    const all = await api.interviews();
    const mine = state.me.role === 'interviewer';
    const myEmail = (state.me.email || '').toLowerCase();
    let list = mine ? all.filter(i => i.interviewer_id === state.me.id || (i.member?.email || '').toLowerCase() === myEmail) : all;
    const todayOnly = params?.get('day') === 'today';
    let view = params?.get('view') || (todayOnly ? 'today' : 'upcoming'), who = 'all';
    const now = () => Date.now();
    const endOf = i => new Date(i.scheduled_at).getTime() + (i.duration_min || 30) * 6e4;
    // What state an interview is in, in plain words
    const status = i => {
      if (i.status !== 'scheduled') return { k: 'done', t: i.status === 'cancelled' ? 'Cancelled' : 'Done', c: i.status === 'cancelled' ? 'muted' : 'ok' };
      const st = new Date(i.scheduled_at).getTime(), en = endOf(i), n = now();
      if (n >= st && n <= en) return { k: 'live', t: 'Happening now', c: 'live' };
      if (n > en) return { k: 'score', t: 'Add your scorecard', c: 'warn' };
      const m = Math.round((st - n) / 6e4);
      const t0 = new Date(); t0.setHours(0, 0, 0, 0); const d0 = new Date(i.scheduled_at); d0.setHours(0, 0, 0, 0); const days = Math.round((d0 - t0) / 864e5);
      return { k: 'soon', t: m < 60 ? `Starts in ${m} min` : days === 0 ? `Starts in ${Math.floor(m / 60)} h ${m % 60} min` : days === 1 ? 'Tomorrow' : `In ${days} days`, c: m <= 15 ? 'live' : 'info' };
    };
    const roundOf = i => { const n = i.round_no || STAGE_ROUND[i.stage_id] || 1; const rd = (i.applications?.jobs?.rounds || [])[n - 1];
      return `Round ${n}${rd?.name ? ' · ' + rd.name : ''}`; };
    const jobOf = i => { const j = i.applications?.jobs || {}; return (j.title || '') + (j.client ? ` (${j.client})` : ''); };
    const nameOf = i => i.applications?.candidates?.full_name || i.applications?.resumes?.file_name || 'Candidate';
    const people = [...new Set(list.map(ivWho).filter(Boolean))].sort();
    const dayLabel = k => { const d = new Date(k), t = new Date(); t.setHours(0, 0, 0, 0); const diff = Math.round((d - t) / 864e5);
      const nice = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
      return diff === 0 ? `Today · ${nice}` : diff === 1 ? `Tomorrow · ${nice}` : nice; };
    let timer = null;
    const draw = () => {
      const pool = list.filter(i => who === 'all' || ivWho(i) === who);
      const scheduled = pool.filter(i => i.status === 'scheduled').sort((x, y) => x.scheduled_at.localeCompare(y.scheduled_at));
      const toScore = scheduled.filter(i => status(i).k === 'score');
      const upcoming = scheduled.filter(i => status(i).k !== 'score');
      const today = upcoming.filter(i => new Date(i.scheduled_at).toDateString() === new Date().toDateString());
      const week = upcoming.filter(i => new Date(i.scheduled_at).getTime() - now() < 7 * 864e5);
      const done = pool.filter(i => i.status !== 'scheduled').sort((x, y) => y.scheduled_at.localeCompare(x.scheduled_at));
      const next = upcoming[0];
      const shown = view === 'score' ? toScore : view === 'done' ? done : view === 'today' ? today : upcoming;
      const byDay = {}; shown.forEach(i => { const k = new Date(i.scheduled_at).toDateString(); (byDay[k] = byDay[k] || []).push(i); });
      const card = i => { const s = status(i), n = nameOf(i);
        return `<article class="iv-card ${s.k}" data-app="${i.application_id}" tabindex="0">
          <div class="iv-time"><b>${fmtTime(i.scheduled_at)}</b><span>${tzShort(i.scheduled_at)} · ${i.duration_min || 30} min</span></div>
          <div class="iv-main">${avatar(n, 40)}<div class="iv-who"><b>${esc(n)}</b>
              <span class="small muted">${esc(jobOf(i))}</span>
              <span class="iv-tags"><span class="iv-tag round">${esc(roundOf(i))}</span>${ivWho(i) ? `<span class="iv-tag">${icon('people', 12)}${esc(ivWho(i))}</span>` : ''}${i.status === 'scheduled' && !i.meeting_link ? '<span class="iv-tag warn">No meeting link</span>' : ''}</span></div></div>
          <div class="iv-side"><span class="iv-status ${s.c}">${s.k === 'live' ? '<i class="dot"></i>' : ''}${esc(s.t)}</span>
            ${s.k === 'done' && i.rating ? `<span class="iv-stars" title="${i.rating} out of 5">${'★'.repeat(i.rating)}<span class="muted">${'★'.repeat(5 - i.rating)}</span></span>` : ''}
            <div class="iv-actions">${i.meeting_link && s.k !== 'done' ? `<a class="btn sm ${s.k === 'live' ? 'primary' : ''}" href="${esc(i.meeting_link)}" target="_blank" rel="noopener" data-stop>${icon('cal', 14)}Join</a>` : ''}
              ${i.status === 'scheduled' ? `<button class="btn sm ${s.k === 'score' ? 'primary' : ''}" data-score="${i.id}">${icon('check', 14)}Scorecard</button>` : ''}
              <button class="btn sm ghost" data-open="${i.application_id}">Profile</button></div></div></article>`; };
      const tile = (k, n, label, hint) => `<button class="iv-tile ${view === k ? 'on' : ''} ${k === 'score' && n ? 'warn' : ''}" data-view="${k}"><b>${n}</b><span>${label}</span><small>${hint}</small></button>`;
      el.innerHTML = `<div class="page-head"><div><h1>${mine ? 'My interviews' : 'Interviews'}</h1>
          <p>Candidates pick their own time from the email link. Each booking appears here, and a reminder goes out at 08:00 IST the day before.</p></div>
          ${!mine && people.length > 1 ? `<select class="input" id="ivwho" style="width:auto;min-width:200px" aria-label="Interviewer"><option value="all">Everyone's interviews</option>${people.map(p => `<option ${p === who ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>` : ''}</div>
        ${next ? (() => { const s = status(next); return `<section class="iv-next ${s.k === 'live' ? 'live' : ''}"><div class="iv-next-l"><span class="eyebrow">${s.k === 'live' ? 'Happening now' : 'Next interview'}</span>
            <h2>${esc(nameOf(next))}</h2><div class="muted">${esc(jobOf(next))} · ${esc(roundOf(next))}${ivWho(next) ? ' · with ' + esc(ivWho(next)) : ''}</div>
            <div class="iv-next-when">${icon('cal', 16)}<b>${new Date(next.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${fmtTime(next.scheduled_at)} ${tzShort(next.scheduled_at)}</b><span class="iv-status ${s.c}">${s.k === 'live' ? '<i class="dot"></i>' : ''}${esc(s.t)}</span></div></div>
          <div class="iv-next-r">${next.meeting_link ? `<a class="btn primary" href="${esc(next.meeting_link)}" target="_blank" rel="noopener">${icon('cal', 16)}Join meeting</a>` : '<span class="small muted">No meeting link yet</span>'}
            <button class="btn" data-open="${next.application_id}">Open profile and resume</button></div></section>`; })() : ''}
        <div class="iv-tiles">${tile('today', today.length, 'Today', 'interviews today')}${tile('upcoming', upcoming.length, 'Coming up', week.length + ' in the next 7 days')}${tile('score', toScore.length, 'Need a scorecard', 'time has passed')}${tile('done', done.length, 'Done', 'with scorecards')}</div>
        ${view === 'score' && toScore.length ? '<div class="card card-b small" style="margin-bottom:12px;border-left:3px solid var(--review)">These interviews have finished but nobody has added a scorecard yet. Click <b>Scorecard</b> to rate the candidate, or open their profile to move them on.</div>' : ''}
        <div class="iv-list">${Object.keys(byDay).map(k => `<div class="iv-day">${esc(dayLabel(k))}<span>${byDay[k].length}</span></div>${byDay[k].map(card).join('')}`).join('')
          || `<div class="card empty">${view === 'score' ? 'All caught up: every finished interview has a scorecard.' : view === 'done' ? 'No finished interviews yet.' : view === 'today' ? 'No interviews today.' : 'No upcoming interviews. Move a candidate into a round and they get a link to book.'}</div>`}</div>`;
      $$('[data-view]', el).forEach(b => b.onclick = () => { view = b.dataset.view; draw(); });
      const ws = $('#ivwho', el); if (ws) ws.onchange = () => { who = ws.value; draw(); };
      $$('[data-score]', el).forEach(b => b.onclick = async e => { e.stopPropagation(); const aid = b.closest('[data-app]')?.dataset.app;
        if (aid) { try { const a = await api.application(aid); if (scoringCfg(a.jobs).criteria.length) return scoringFlow(a, () => route(), { interview: a.interviews.find(i => i.id === b.dataset.score) }); } catch (er) { /* fall back */ } }
        scorecardFlow(b.dataset.score, () => route()); });
      $$('[data-stop]', el).forEach(b => b.onclick = e => e.stopPropagation());
      $$('[data-open]', el).forEach(b => b.onclick = e => { e.stopPropagation(); openCandidate(b.dataset.open); });
      if (!mine) $$('.iv-card[data-app]', el).forEach(k => { k.onclick = () => openCandidate(k.dataset.app); k.onkeydown = e => e.key === 'Enter' && openCandidate(k.dataset.app); });
    };
    draw();
    // keep "Starts in…" fresh while this page is open
    const route0 = state.run;
    timer = setInterval(() => { if (state.run !== route0 || !document.body.contains(el)) return clearInterval(timer); if (!document.querySelector('.scrim')) draw(); }, 60000);
  }

  /* ───────── settings ───────── */
  const BASE_PH = ['candidate_name', 'job_title', 'sender_name'];
  const ROUND_PH = [...BASE_PH, 'round_name', 'round_number', 'interviewer_name', 'duration', 'booking_link'];
  const TEMPLATE_INFO = {
    received: { title: 'Applied', when: 'Sent when a candidate applies on the careers site or you upload their resume.', ph: BASE_PH },
    screened: { title: 'Screened', when: 'Sent when a candidate moves to Screened. Off by default: the AI moves every new applicant to Screened, so switching this on emails everyone once they are scored.', ph: BASE_PH },
    round_1: { title: 'Round 1', when: "Sent when a candidate is moved to Round 1. Includes the link to book a time with Round 1's interviewer (set on each job under Panel and rounds).", ph: ROUND_PH, need: 'booking_link' },
    round_2: { title: 'Round 2', when: "Sent when a candidate is moved to Round 2, with the booking link for Round 2's interviewer.", ph: ROUND_PH, need: 'booking_link' },
    round_3: { title: 'Round 3', when: "Sent when a candidate is moved to Round 3, with the booking link for Round 3's interviewer.", ph: ROUND_PH, need: 'booking_link' },
    offer: { title: 'Offer', when: 'Sent when a candidate is moved to Offer.', ph: BASE_PH },
    hired: { title: 'Hired', when: 'Sent when a candidate is moved to Hired.', ph: BASE_PH },
    rejection: { title: 'Rejected', when: 'Sent when you reject a candidate with "Send the rejection email" ticked. {{rejection_reason}} is the reason entered in the reject pop-up.', ph: [...BASE_PH, 'rejection_reason'] },
    interview_invite: { title: 'Interview confirmed', when: 'Sent to the candidate after they book a time (or you schedule the interview), with the calendar invite attached.', ph: [...BASE_PH, 'round_name', 'interviewer_name', 'interview_time', 'duration', 'meeting_link'] }
  };
  const SAMPLE = { candidate_name: 'Priya', job_title: 'Sales Development Representative', round_name: 'Intro call', round_number: '1', interviewer_name: 'Jay Khunt',
    duration: '30', booking_link: 'https://careers.dollarrevenuegroup.com/book/…', interview_time: 'Tuesday 3 November 2026, 11:00 AM (India Standard Time)', meeting_link: 'https://meet.google.com/abc-defg-hij',
    rejection_reason: 'Not enough relevant experience: we need at least 1 year of hands-on Clay work for this role.', sender_name: 'DRG Talent Team' };
  const fillSample = s => String(s || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => SAMPLE[k] ?? '');
  async function templateSettings(sb) {
    const ts = (await api.templates()).filter(t => t.key !== 'round_invite');
    const stageOrder = ['received', 'screened', 'round_1', 'round_2', 'round_3', 'offer', 'hired', 'rejection', 'interview_invite'];
    ts.sort((a, b) => (stageOrder.indexOf(a.key) + 1 || 99) - (stageOrder.indexOf(b.key) + 1 || 99));
    sb.innerHTML = `<div id="senders"></div><div class="card card-b small muted" style="margin-bottom:14px">These are the default emails for every job. Each pipeline stage has its own email, and it goes out automatically when a candidate enters that stage. Click a placeholder to insert it; it is filled in for each candidate. Switch a stage off to stop its email. A job can have its own wording and sender on its <b>Emails</b> tab.</div>
      <div style="display:grid;gap:14px">${ts.map(t => { const info = TEMPLATE_INFO[t.key] || { title: t.label || t.key, when: '', ph: BASE_PH }; const on = t.enabled !== false;
        return `<div class="card tpl ${on ? '' : 'off'}" data-tpl="${t.key}"><div class="card-h"><div><div class="eyebrow">${info.title === 'Interview confirmed' ? 'After booking' : 'Stage'}</div><h3>${esc(info.title)}</h3><div class="small muted" style="max-width:70ch">${esc(info.when)}</div></div>
          <label class="switch" title="${on ? 'Sending automatically' : 'Switched off'}"><input type="checkbox" data-on="${t.key}" ${on ? 'checked' : ''}><span></span><b class="small">${on ? 'On' : 'Off'}</b></label></div>
          <div class="card-b" style="display:grid;gap:10px">
            <div class="field"><label for="ts-${t.key}">Subject</label><input class="input" id="ts-${t.key}" data-subj="${t.key}" value="${esc(t.subject)}"></div>
            <div class="field"><label for="tb-${t.key}">Message</label><textarea class="input" rows="9" id="tb-${t.key}" data-body="${t.key}">${esc(t.body)}</textarea></div>
            <div class="row" style="gap:6px"><span class="small muted">Insert:</span>${info.ph.map(p => `<button type="button" class="tag ph" data-ph="${p}" data-for="${t.key}">{{${p}}}</button>`).join('')}</div>
            <div class="row" style="justify-content:space-between"><button type="button" class="btn sm ghost" data-prev="${t.key}">Preview</button><button class="btn sm primary" data-save="${t.key}">Save</button></div>
            <div class="preview" data-preview="${t.key}" hidden></div></div></div>`; }).join('')}</div>`;
    senderSettings($('#senders', sb));
    let lastField = {};
    $$('[data-subj],[data-body]', sb).forEach(f => f.onfocus = () => { lastField[f.dataset.subj || f.dataset.body] = f; });
    $$('[data-ph]', sb).forEach(b => b.onclick = () => {
      const k = b.dataset.for, f = lastField[k] || $(`[data-body="${k}"]`, sb), ins = `{{${b.dataset.ph}}}`;
      const st = f.selectionStart ?? f.value.length, en = f.selectionEnd ?? f.value.length;
      f.value = f.value.slice(0, st) + ins + f.value.slice(en); f.focus(); f.selectionStart = f.selectionEnd = st + ins.length; });
    $$('[data-prev]', sb).forEach(b => b.onclick = () => { const k = b.dataset.prev, box = $(`[data-preview="${k}"]`, sb);
      box.hidden = !box.hidden; b.textContent = box.hidden ? 'Preview' : 'Hide preview';
      box.innerHTML = `<div class="small muted">Example with sample details</div><b>${esc(fillSample($(`[data-subj="${k}"]`, sb).value))}</b><div style="white-space:pre-wrap;margin-top:8px">${esc(fillSample($(`[data-body="${k}"]`, sb).value))}</div>`; });
    $$('[data-save]', sb).forEach(b => b.onclick = async () => { const k = b.dataset.save, info = TEMPLATE_INFO[k] || {};
      const subj = $(`[data-subj="${k}"]`, sb).value.trim(), body = $(`[data-body="${k}"]`, sb).value.trim();
      if (!subj || !body) return toast('Add a subject and a message.', true);
      if (info.need && !body.includes(`{{${info.need}}}`)) return toast(`Keep {{${info.need}}} in the message, or candidates cannot book their interview.`, true);
      b.disabled = true; try { await api.saveTemplate(k, subj, body); toast(`${info.title || k} email saved`); } catch (e) { fail(e); } finally { b.disabled = false; } });
    $$('[data-on]', sb).forEach(c => c.onchange = async () => { const k = c.dataset.on, card = c.closest('.tpl');
      try { await api.saveTemplate(k, null, null, c.checked); card.classList.toggle('off', !c.checked); $('b', c.parentElement).textContent = c.checked ? 'On' : 'Off';
        toast(`${(TEMPLATE_INFO[k] || {}).title || k} email ${c.checked ? 'switched on' : 'switched off'}`); } catch (e) { c.checked = !c.checked; fail(e); } });
  }
  // Label for a sender in dropdowns and lists
  const senderLabel = s => s.from_email ? `${s.from_name} · ${s.from_email}` : `${s.from_name} · hiring mailbox (default)`;

  // Settings → Email templates: who emails can come from
  async function senderSettings(host) {
    let senders = [];
    try { senders = await api.senders(); } catch (e) { host.innerHTML = ''; return; }
    const isAdmin = state.me?.role === 'admin';
    let editing = null;   // sender id, 'new', or null
    const draw = () => {
      host.innerHTML = `<div class="card" style="margin-bottom:14px"><div class="card-h"><div><h3>Email senders</h3><div class="small muted" style="max-width:72ch">Each job can send its candidate emails from one of these. The default is the hiring mailbox n8n is signed in to.</div></div>
          ${isAdmin && editing !== 'new' ? '<button class="btn sm" id="snew">Add a sender</button>' : ''}</div>
        <div class="card-b" style="display:grid;gap:10px">
          ${senders.map(s => editing === s.id ? form(s) : `<div class="row" style="gap:10px;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--line)">
              <span class="grow"><b>${esc(s.from_name)}</b>${s.is_default ? ' <span class="chip v-pass">Default</span>' : ''}${s.active === false ? ' <span class="chip">Hidden</span>' : ''}
                <span class="small muted" style="display:block">${s.from_email ? esc(s.from_email) : 'Hiring mailbox'}${s.reply_to ? ` · replies go to ${esc(s.reply_to)}` : ''}</span></span>
              ${isAdmin ? `<button class="btn sm ghost" data-sedit="${s.id}">Edit</button>` : ''}</div>`).join('')}
          ${editing === 'new' ? form({}) : ''}
          <details class="small muted"><summary style="cursor:pointer">How to send from another address, e.g. zaina@techjays.com</summary>
            <ol style="margin:8px 0 0 18px;display:grid;gap:4px">
              <li>Open the hiring mailbox in Gmail → Settings → <b>Accounts</b> → <b>Send mail as</b> → <b>Add another email address</b>.</li>
              <li>Enter the name and address. Google sends a confirmation code to that inbox; the owner of the address (e.g. Zaina) confirms it.</li>
              <li>Add the same address here and choose it on the job's <b>Emails</b> tab.</li>
            </ol>
            <p style="margin:8px 0 0">Until it's confirmed in Gmail, emails still go out from the hiring mailbox address, using this sender's name and reply-to address.</p></details>
        </div></div>`;
      const nb = $('#snew', host); if (nb) nb.onclick = () => { editing = 'new'; draw(); $('#sfn', host).focus(); };
      $$('[data-sedit]', host).forEach(b => b.onclick = () => { editing = b.dataset.sedit; draw(); });
      const cancel = $('#scancel', host); if (cancel) cancel.onclick = () => { editing = null; draw(); };
      const save = $('#ssave', host); if (save) save.onclick = async () => {
        const cur = senders.find(s => s.id === editing) || {};
        const d = { from_name: $('#sfn', host).value.trim() };
        if (!cur.is_default) { d.from_email = $('#sfe', host).value.trim().toLowerCase() || null; d.reply_to = $('#srt', host).value.trim().toLowerCase() || null; d.active = $('#sac', host).checked; }
        const em = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!d.from_name) return toast('Add the name candidates will see, e.g. TechJays Talent Team.', true);
        if (!cur.is_default && (!d.from_email || !em.test(d.from_email))) return toast('Add the email address it should come from.', true);
        if (d.reply_to && !em.test(d.reply_to)) return toast('The reply-to address is not a valid email.', true);
        save.disabled = true;
        try { const row = await api.saveSender(cur.id ? { id: cur.id, ...d } : d);
          senders = cur.id ? senders.map(s => s.id === cur.id ? row : s) : [...senders, row]; editing = null; draw(); toast('Sender saved'); }
        catch (e) { save.disabled = false; fail(/duplicate|unique/i.test(e.message) ? new Error('That address is already a sender.') : e); }
      };
    };
    const form = s => `<div class="card" style="padding:14px;display:grid;gap:10px">
        <div class="grid2"><div class="field"><label for="sfn">Name candidates see</label><input class="input" id="sfn" value="${esc(s.from_name || '')}" placeholder="TechJays Talent Team"></div>
          ${s.is_default ? '<div class="field"><span class="lbl">Address</span><div class="small muted" style="padding-top:10px">The hiring mailbox n8n is signed in to</div></div>'
            : `<div class="field"><label for="sfe">From address</label><input class="input" id="sfe" type="email" value="${esc(s.from_email || '')}" placeholder="zaina@techjays.com"></div>`}</div>
        ${s.is_default ? '' : `<div class="grid2"><div class="field"><label for="srt">Replies go to (optional)</label><input class="input" id="srt" type="email" value="${esc(s.reply_to || '')}" placeholder="Same as the From address"></div>
          <label class="row" style="gap:8px;align-self:end;padding-bottom:10px"><input type="checkbox" id="sac" ${s.active === false ? '' : 'checked'}> Show in the job's sender list</label></div>`}
        <div class="row" style="gap:8px"><button class="btn primary sm" id="ssave">Save sender</button><button class="btn sm" id="scancel">Cancel</button></div></div>`;
    draw();
  }

  // Job → Emails tab: the job's sender, and its own versions of the default templates
  async function jobEmails(body, job, canEdit) {
    const [defs, own0, senders] = await Promise.all([api.templates(), api.jobTemplates(job.id), api.senders().catch(() => [])]);
    let own = Object.fromEntries((own0 || []).map(t => [t.key, t]));
    const stageOrder = ['received', 'screened', 'round_1', 'round_2', 'round_3', 'offer', 'hired', 'rejection', 'interview_invite'];
    const ts = defs.filter(t => t.key !== 'round_invite').sort((a, b) => (stageOrder.indexOf(a.key) + 1 || 99) - (stageOrder.indexOf(b.key) + 1 || 99));
    const dis = canEdit ? '' : 'disabled';
    const active = senders.filter(s => s.active !== false || s.id === job.sender_id);
    const cur = () => senders.find(s => s.id === job.sender_id) || senders.find(s => s.is_default) || { from_name: 'DRG Talent Team' };
    const senderNote = () => { const s = cur(); return s.from_email
      ? `Candidates see <b>${esc(s.from_name)}</b> &lt;${esc(s.from_email)}&gt;${s.reply_to ? ` and replies go to ${esc(s.reply_to)}` : ''}. ${esc(s.from_email)} must be set up as a "Send mail as" address on the hiring mailbox (Settings → Email templates explains how); until then emails go out from the hiring mailbox address with this name.`
      : `Candidates see <b>${esc(s.from_name)}</b> from the hiring mailbox.`; };
    const card = t => { const info = TEMPLATE_INFO[t.key] || { title: t.key, when: '', ph: BASE_PH }, o = own[t.key], src = o || t, on = (o ? o.enabled : t.enabled) !== false;
      return `<details class="card tpl ${on ? '' : 'off'}" data-jt="${t.key}"><summary class="card-h" style="cursor:pointer;list-style:none">
          <div><h3>${esc(info.title)} ${o ? '<span class="chip v-pass">Custom for this job</span>' : '<span class="chip">Default</span>'}${on ? '' : ' <span class="chip v-review">Off for this job</span>'}</h3>
            <div class="small muted" style="max-width:70ch">${esc(info.when)}</div></div><span class="small muted">${canEdit ? 'Edit' : 'View'} ▾</span></summary>
        <div class="card-b" style="display:grid;gap:10px">
          <div class="field"><label for="js-${t.key}">Subject</label><input class="input" id="js-${t.key}" data-subj="${t.key}" value="${esc(src.subject)}" ${dis}></div>
          <div class="field"><label for="jb-${t.key}">Message</label><textarea class="input" rows="9" id="jb-${t.key}" data-body="${t.key}" ${dis}>${esc(src.body)}</textarea></div>
          ${canEdit ? `<div class="row" style="gap:6px"><span class="small muted">Insert:</span>${[...info.ph, 'sender_name'].filter((p, i, a) => a.indexOf(p) === i).map(p => `<button type="button" class="tag ph" data-ph="${p}" data-for="${t.key}">{{${p}}}</button>`).join('')}</div>` : ''}
          <label class="row" style="gap:8px"><input type="checkbox" data-jon="${t.key}" ${on ? 'checked' : ''} ${dis}> Send this email for this job</label>
          <div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><button type="button" class="btn sm ghost" data-prev="${t.key}">Preview</button>
            ${canEdit ? `<span class="row" style="gap:8px">${o ? `<button type="button" class="btn sm" data-reset="${t.key}">Reset to default</button>` : ''}<button type="button" class="btn sm primary" data-save="${t.key}">Save for this job</button></span>` : ''}</div>
          <div class="preview" data-preview="${t.key}" hidden></div></div></details>`; };
    const draw = (openKey) => {
      body.innerHTML = `<div style="display:grid;gap:14px;max-width:860px">
        <div class="card"><div class="card-h"><div><h3>Sender</h3><div class="small muted">Who candidates for this job get emails from.</div></div></div>
          <div class="card-b" style="display:grid;gap:8px"><select class="input" id="jsnd" style="max-width:520px" ${dis}>${active.map(s => `<option value="${s.id}" ${s.id === (job.sender_id || cur().id) ? 'selected' : ''}>${esc(senderLabel(s))}</option>`).join('')}</select>
            <div class="small muted" id="jsndn">${senderNote()}</div>
            ${state.me?.role === 'admin' ? '<a class="small" href="#/settings?tab=emails">Add or edit senders in Settings → Email templates</a>' : ''}</div></div>
        <div class="card card-b small muted">These emails start as copies of the defaults in Settings → Email templates. Change any of them here and only this job uses your version; the rest keep following the defaults.</div>
        ${ts.map(card).join('')}</div>`;
      if (openKey) { const d = $(`[data-jt="${openKey}"]`, body); if (d) d.open = true; }
      const sel = $('#jsnd', body);
      if (sel && canEdit) sel.onchange = async () => { const prev = job.sender_id; job.sender_id = sel.value;
        try { await api.updateJob(job.id, { sender_id: sel.value }); $('#jsndn', body).innerHTML = senderNote(); toast(`Emails for this job now come from ${cur().from_name}`); }
        catch (e) { job.sender_id = prev; sel.value = prev || cur().id; fail(e); } };
      let lastField = {};
      $$('[data-subj],[data-body]', body).forEach(f => f.onfocus = () => { lastField[f.dataset.subj || f.dataset.body] = f; });
      $$('[data-ph]', body).forEach(b => b.onclick = () => {
        const k = b.dataset.for, f = lastField[k] || $(`[data-body="${k}"]`, body), ins = `{{${b.dataset.ph}}}`;
        const st = f.selectionStart ?? f.value.length, en = f.selectionEnd ?? f.value.length;
        f.value = f.value.slice(0, st) + ins + f.value.slice(en); f.focus(); f.selectionStart = f.selectionEnd = st + ins.length; });
      $$('[data-prev]', body).forEach(b => b.onclick = () => { const k = b.dataset.prev, box = $(`[data-preview="${k}"]`, body);
        const smp = s => fillSample(String(s).replace(/\{\{\s*job_title\s*\}\}/g, job.title).replace(/\{\{\s*sender_name\s*\}\}/g, cur().from_name));
        box.hidden = !box.hidden; b.textContent = box.hidden ? 'Preview' : 'Hide preview';
        box.innerHTML = `<div class="small muted">Example with sample details · from ${esc(cur().from_name)}</div><b>${esc(smp($(`[data-subj="${k}"]`, body).value))}</b><div style="white-space:pre-wrap;margin-top:8px">${esc(smp($(`[data-body="${k}"]`, body).value))}</div>`; });
      if (!canEdit) return;
      $$('[data-save]', body).forEach(b => b.onclick = async () => { const k = b.dataset.save, info = TEMPLATE_INFO[k] || {};
        const subject = $(`[data-subj="${k}"]`, body).value.trim(), text = $(`[data-body="${k}"]`, body).value.trim(), enabled = $(`[data-jon="${k}"]`, body).checked;
        if (!subject || !text) return toast('Add a subject and a message.', true);
        if (info.need && enabled && !text.includes(`{{${info.need}}}`)) return toast(`Keep {{${info.need}}} in the message, or candidates cannot book their interview.`, true);
        b.disabled = true;
        try { own[k] = await api.saveJobTemplate(job.id, k, { subject, body: text, enabled }); draw(k); toast(`${info.title || k} email saved for this job`); }
        catch (e) { b.disabled = false; fail(e); } });
      $$('[data-reset]', body).forEach(b => b.onclick = async () => { const k = b.dataset.reset, info = TEMPLATE_INFO[k] || {};
        if (!confirmReset(info.title || k)) return;
        b.disabled = true;
        try { await api.resetJobTemplate(job.id, k); delete own[k]; draw(k); toast(`${info.title || k} email is back to the default`); }
        catch (e) { b.disabled = false; fail(e); } });
    };
    draw();
  }
  // Job create/edit form → Candidate emails: pick Default or a version just for this job. Nothing is saved until the job is saved.
  async function jobTemplatesEditor(host, job, getSender, getTitle) {
    let defs = [], own0 = [];
    try { [defs, own0] = await Promise.all([api.templates(), job?.id ? api.jobTemplates(job.id) : []]); } catch (e) { host.innerHTML = '<div class="small muted">Could not load the email templates. You can still set them later on the job\'s Emails tab.</div>'; return { value: () => ({ changes: [] }) }; }
    const own = Object.fromEntries((own0 || []).map(t => [t.key, t]));
    const order = ['received', 'screened', 'round_1', 'round_2', 'round_3', 'offer', 'hired', 'rejection', 'interview_invite'];
    const ts = defs.filter(t => t.key !== 'round_invite').sort((a, b) => (order.indexOf(a.key) + 1 || 99) - (order.indexOf(b.key) + 1 || 99));
    const st = Object.fromEntries(ts.map(t => { const o = own[t.key];
      // A job row that only switches an email off (same wording as the default) still counts as "Default"
      return [t.key, { custom: !!o && (o.subject !== t.subject || o.body !== t.body), subject: (o || t).subject || '', body: (o || t).body || '', enabled: (o ? o.enabled : t.enabled) !== false, defOn: t.enabled !== false }]; }));
    const open = new Set();
    const draw = () => {
      const nCustom = ts.filter(t => st[t.key].custom || st[t.key].enabled !== st[t.key].defOn).length;
      host.innerHTML = `<div class="small muted">Every email starts on the default from Settings → Email templates. Switch one to <b>Custom for this job</b> to write this job's own version; the others keep following the defaults.${nCustom ? ` <b>${nCustom} customised for this job.</b>` : ''}</div>
        <div class="jt-list">${ts.map(t => { const s = st[t.key], info = TEMPLATE_INFO[t.key] || { title: t.key, when: '', ph: BASE_PH };
          return `<div class="jt-item ${open.has(t.key) ? 'open' : ''} ${s.enabled ? '' : 'off'}" data-k="${t.key}">
            <div class="jt-row"><button type="button" class="jt-tog" data-open="${t.key}" aria-expanded="${open.has(t.key)}"><span class="jt-car">${open.has(t.key) ? '▾' : '▸'}</span><span><b>${esc(info.title)}</b>${s.custom ? ' <span class="chip v-pass">Custom</span>' : ''}${s.enabled ? '' : ' <span class="chip v-review">Off</span>'}<span class="small muted" style="display:block">${esc(info.when)}</span></span></button>
              <div class="seg sm" role="group" aria-label="${esc(info.title)} email"><button type="button" data-mode="def" class="${s.custom ? '' : 'on'}">Default</button><button type="button" data-mode="cus" class="${s.custom ? 'on' : ''}">Custom for this job</button></div>
              <label class="row small" style="gap:6px;white-space:nowrap"><input type="checkbox" data-on ${s.enabled ? 'checked' : ''}> Send</label></div>
            ${open.has(t.key) ? `<div class="jt-body">
              <div class="field"><label>Subject</label><input class="input" data-subj value="${esc(s.subject)}" ${s.custom ? '' : 'disabled'}></div>
              <div class="field"><label>Message</label><textarea class="input" rows="8" data-body ${s.custom ? '' : 'disabled'}>${esc(s.body)}</textarea></div>
              ${s.custom ? `<div class="row" style="gap:6px"><span class="small muted">Insert:</span>${[...info.ph, 'sender_name'].filter((p, i, a) => a.indexOf(p) === i).map(p => `<button type="button" class="tag ph" data-ph="${p}">{{${p}}}</button>`).join('')}</div>`
                : '<div class="small muted">This is the default wording. Choose <b>Custom for this job</b> to change it for this job only.</div>'}
              <div><button type="button" class="btn sm ghost" data-prev>Preview</button><div class="preview" data-preview hidden></div></div></div>` : ''}</div>`; }).join('')}</div>`;
      $$('.jt-item', host).forEach(el => { const k = el.dataset.k, s = st[k], def = ts.find(t => t.key === k);
        $('[data-open]', el).onclick = () => { open.has(k) ? open.delete(k) : open.add(k); draw(); };
        $$('[data-mode]', el).forEach(b => b.onclick = () => { const c = b.dataset.mode === 'cus'; if (c === s.custom) return;
          s.custom = c; if (!c) { s.subject = def.subject || ''; s.body = def.body || ''; } open.add(k); draw();
          if (c) $('[data-body]', $(`.jt-item[data-k="${k}"]`, host))?.focus(); });
        $('[data-on]', el).onchange = e => { s.enabled = e.target.checked; draw(); };
        const subj = $('[data-subj]', el), body = $('[data-body]', el); let last = body;
        if (subj) { subj.oninput = () => s.subject = subj.value; subj.onfocus = () => last = subj; }
        if (body) { body.oninput = () => s.body = body.value; body.onfocus = () => last = body; }
        $$('[data-ph]', el).forEach(b => b.onclick = () => { const f = last || body, ins = `{{${b.dataset.ph}}}`, a = f.selectionStart ?? f.value.length, z = f.selectionEnd ?? a;
          f.value = f.value.slice(0, a) + ins + f.value.slice(z); f.dispatchEvent(new Event('input')); f.focus(); f.selectionStart = f.selectionEnd = a + ins.length; });
        const pv = $('[data-prev]', el); if (pv) pv.onclick = () => { const box = $('[data-preview]', el);
          const smp = x => fillSample(String(x).replace(/\{\{\s*job_title\s*\}\}/g, getTitle() || SAMPLE.job_title).replace(/\{\{\s*sender_name\s*\}\}/g, getSender()));
          box.hidden = !box.hidden; pv.textContent = box.hidden ? 'Preview' : 'Hide preview';
          box.innerHTML = `<div class="small muted">Example with sample details · from ${esc(getSender())}</div><b>${esc(smp(s.subject))}</b><div style="white-space:pre-wrap;margin-top:8px">${esc(smp(s.body))}</div>`; }; });
    };
    draw();
    return {
      value() {
        const changes = [];
        for (const t of ts) { const s = st[t.key], o = own[t.key], info = TEMPLATE_INFO[t.key] || {};
          const needRow = s.custom || s.enabled !== s.defOn;
          if (needRow) {
            const subject = (s.custom ? s.subject : t.subject || '').trim(), body = (s.custom ? s.body : t.body || '').trim();
            if (!subject || !body) return { error: `The ${info.title || t.key} email needs a subject and a message.`, key: t.key };
            if (info.need && s.enabled && !body.includes(`{{${info.need}}}`)) return { error: `Keep {{${info.need}}} in the ${info.title} email, or candidates cannot book their interview.`, key: t.key };
            if (!o || o.subject !== subject || o.body !== body || (o.enabled !== false) !== s.enabled) changes.push({ key: t.key, data: { subject, body, enabled: s.enabled } });
          } else if (o) changes.push({ key: t.key, reset: true });
        }
        return { changes };
      },
      show(key) { open.add(key); draw(); $(`.jt-item[data-k="${key}"]`, host)?.scrollIntoView({ block: 'center' }); }
    };
  }
  async function saveJobTemplates(jobId, changes) {
    const bad = [];
    for (const c of changes) { try { c.reset ? await api.resetJobTemplate(jobId, c.key) : await api.saveJobTemplate(jobId, c.key, c.data); } catch (e) { bad.push(c.key); } }
    return bad;
  }
  // Ask before throwing away a job's own version of an email: click twice (no browser dialog)
  let resetPending = null;
  function confirmReset(title) {
    if (resetPending === title) { resetPending = null; return true; }
    resetPending = title; setTimeout(() => { if (resetPending === title) resetPending = null; }, 6000);
    toast(`Click "Reset to default" again to replace this job's ${title} email with the default.`); return false;
  }
  const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun']];
  async function panelSettings(sb) {
    const team = await api.team();
    const FILTERS = [['all', 'Everyone'], ['cal', 'Connected to Cal.com'], ['nocal', 'Not connected to Cal.com'], ['nolink', 'No meeting link'], ['ext', 'Outside DRG'], ['inactive', 'Inactive']];
    const calOn = t => !!(t.cal_key_id || t.cal_account);
    const match = (t, f) => f === 'cal' ? calOn(t) : f === 'nocal' ? !calOn(t) && t.active !== false : f === 'nolink' ? !t.meeting_link && t.active !== false
      : f === 'ext' ? !!t.company : f === 'inactive' ? t.active === false : true;
    let filter = 'all', q = '', open = false, focusId = null;
    const hours = t => { const av = t.availability || {}; const days = Object.keys(av.days || {}).filter(k => (av.days[k] || []).length).sort();
      if (!days.length) return 'No hours set';
      const names = days.map(k => DAYS.find(d => d[0] === +k)?.[1]);
      const run = days.length === 5 && days.join('') === '12345' ? 'Mon–Fri' : names.join(', ');
      return `${run} · ${(av.days[days[0]][0] || []).join('–')}`; };
    const card = t => { const cal = t.cal_key_id ? `<span class="pill ok">${icon('check', 12)}Cal.com · ${esc(t.cal_username || 'connected')}</span>`
        : t.cal_account ? `<span class="pill ok">${icon('check', 12)}Cal.com · via n8n</span>` : '<span class="pill">Cal.com not connected</span>';
      return `<article class="pm-card ${t.active === false ? 'off' : ''} ${t.id === focusId ? 'focus' : ''}" id="pm-${t.id}">
        <div class="pm-head">${avatar(t.full_name, 42)}<div class="pm-who"><b>${esc(t.full_name)}</b><span class="small muted">${esc(t.title || 'Interviewer')}</span></div>
          ${t.company ? `<span class="chip ext">${esc(t.company)}</span>` : ''}${t.active === false ? '<span class="chip">Inactive</span>' : ''}</div>
        <div class="pm-mail small muted">${icon('mail', 14)}<span>${esc(t.email)}</span></div>
        <dl class="pm-facts">
          <div><dt>${icon('cal', 14)}Hours</dt><dd>${esc(hours(t))}</dd></div>
          <div><dt>${icon('dash', 14)}Time zone</dt><dd>${esc(t.timezone || 'Asia/Kolkata')}</dd></div>
          <div><dt>${icon('people', 14)}Meeting link</dt><dd>${t.meeting_link ? `<a href="${esc(t.meeting_link)}" target="_blank" rel="noopener">Open ↗</a>` : '<span style="color:var(--review)">Missing</span>'}${t.booking_url ? ' · <span class="muted">own booking page</span>' : ''}</dd></div>
        </dl>
        <div class="pm-foot">${cal}<span class="grow"></span><button class="btn sm" data-em="${t.id}">Edit</button>
          ${CFG.CALCOM_CONNECT_URL ? `<button class="btn sm ${calOn(t) ? '' : 'primary'}" data-cal="${t.id}">${calOn(t) ? 'Cal.com' : 'Connect Cal.com'}</button>` : ''}</div></article>`; };
    const draw = () => {
      const ql = q.trim().toLowerCase();
      const list = team.filter(t => match(t, filter) && (!ql || `${t.full_name} ${t.email} ${t.title || ''} ${t.company || ''}`.toLowerCase().includes(ql)));
      const sugg = ql ? team.filter(t => `${t.full_name} ${t.email}`.toLowerCase().includes(ql)).slice(0, 8) : team.slice(0, 8);
      const n = { all: team.length, cal: team.filter(calOn).length, nolink: team.filter(t => !t.meeting_link && t.active !== false).length, ext: team.filter(t => t.company).length };
      sb.innerHTML = `<div class="card pm-top"><div class="card-h"><div><h3>Interview panel</h3><div class="small muted">People who interview candidates. They don't need a login: candidates book a time from their weekly hours, and invites use their meeting link.</div></div>
          <button class="btn primary sm" id="addm">${icon('plus', 14)}Add person</button></div>
        <div class="card-b" style="display:grid;gap:14px">
          <div class="pm-stats"><span><b>${n.all}</b> people</span><span><b>${n.cal}</b> on Cal.com</span><span class="${n.nolink ? 'warn' : ''}"><b>${n.nolink}</b> missing a meeting link</span>${n.ext ? `<span><b>${n.ext}</b> outside DRG</span>` : ''}</div>
          <div class="pm-tools">
            <div class="pick-box grow"><span class="pm-search-ic">${icon('search', 16)}</span><input class="input" id="pmq" placeholder="Find a person by name or email…" autocomplete="off" value="${esc(q)}" role="combobox" aria-expanded="${open}" aria-controls="pml">
              ${open ? `<div class="pick-list" id="pml" role="listbox">${sugg.map(t => `<button type="button" class="pick-opt" role="option" data-go="${t.id}">${avatar(t.full_name, 26)}<span class="grow"><b>${esc(t.full_name)}</b><span class="small muted" style="display:block">${esc(t.email)}</span></span>${calOn(t) ? '<span class="pill ok sm">Cal.com</span>' : ''}</button>`).join('')
                || '<div class="small muted" style="padding:10px 12px">No one matches.</div>'}</div>` : ''}</div>
            <select class="input" id="pmf" aria-label="Show" style="max-width:240px">${FILTERS.map(([k, l]) => `<option value="${k}" ${k === filter ? 'selected' : ''}>${l}</option>`).join('')}</select>
          </div></div></div>
        <div class="pm-grid">${list.map(card).join('') || `<div class="card empty" style="grid-column:1/-1">${team.length ? 'No one matches this filter.' : 'No one yet. Add the people who run interviews.'}</div>`}</div>`;
      $('#addm', sb).onclick = () => memberForm(null, () => panelSettings(sb));
      $$('[data-em]', sb).forEach(b => b.onclick = () => memberForm(team.find(t => t.id === b.dataset.em), () => panelSettings(sb)));
      $$('[data-cal]', sb).forEach(b => b.onclick = () => calConnectForm(team.find(t => t.id === b.dataset.cal), () => panelSettings(sb)));
      $('#pmf', sb).onchange = e => { filter = e.target.value; focusId = null; draw(); };
      const inp = $('#pmq', sb);
      const keep = () => { const x = $('#pmq', sb); x.focus(); x.setSelectionRange(q.length, q.length); };
      inp.oninput = () => { q = inp.value; open = true; focusId = null; draw(); keep(); };
      inp.onfocus = () => { if (!open) { open = true; draw(); keep(); } };
      inp.onkeydown = e => { if (e.key === 'Escape') { open = false; draw(); } if (e.key === 'Enter') { e.preventDefault(); $('[data-go]', sb)?.click(); } };
      $$('[data-go]', sb).forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => {
        const t = team.find(x => x.id === b.dataset.go); q = ''; open = false; filter = 'all'; focusId = t.id; draw();
        const el = $(`#pm-${t.id}`, sb); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }; });
      if (open) { const close = e => { if (!e.target.closest || !e.target.closest('.pm-tools .pick-box')) { document.removeEventListener('mousedown', close); if (open) { open = false; draw(); } } };
        setTimeout(() => document.addEventListener('mousedown', close), 0); }
    };
    draw();
  }
  // Connect an interviewer's Cal.com: their API key is checked, stored encrypted, and the booking webhook is added for them
  function calConnectForm(t, after) {
    const first = String(t.full_name || '').split(' ')[0];
    const stored = !!t.cal_key_id, legacy = !stored && !!t.cal_account;
    const m = modal(`Cal.com · ${t.full_name}`, `
      ${stored ? `<div class="card" style="padding:12px 14px"><span class="chip v-pass">Connected</span> as <b>${esc(t.cal_username || '')}</b>${t.cal_connected_at ? `<span class="small muted"> · since ${fmtDate(t.cal_connected_at)}</span>` : ''}
          <div class="small muted" style="margin-top:6px">Booking links for rounds ${esc(first)} runs are created in this Cal.com account. Paste a new key below to replace it.</div></div>`
        : legacy ? `<div class="card" style="padding:12px 14px"><span class="chip v-pass">Connected</span> <span class="small muted">through a credential in n8n. Paste ${esc(first)}'s key here to manage it from the ATS instead.</span></div>` : ''}
      <ol class="small" style="margin:0 0 0 18px;display:grid;gap:6px">
        <li>${esc(first)} signs in to Cal.com and opens <a href="https://app.cal.com/settings/developer/api-keys" target="_blank" rel="noopener">Settings → Developer → API keys ↗</a>.</li>
        <li>Click <b>Add</b>, name it "DRG ATS", choose <b>Never expires</b>, and copy the key (it starts with <span class="mono">cal_live_</span>).</li>
        <li>Paste it here. The ATS checks it, stores it encrypted, and adds the booking webhook to ${esc(first)}'s Cal.com automatically.</li></ol>
      <div class="field"><label for="ck">Cal.com API key</label><input class="input mono" id="ck" type="password" autocomplete="off" spellcheck="false" placeholder="cal_live_…"></div>
      <p class="small muted" style="margin:0">The key is only used to create interview booking links and to send bookings back to the ATS. It is never shown again after saving.</p>`,
      `${stored ? '<button class="btn ghost" id="cdis" style="margin-right:auto;color:var(--disq)">Disconnect</button>' : ''}<button class="btn" data-close>Cancel</button><button class="btn primary" id="cgo">${stored || legacy ? 'Save new key' : 'Connect Cal.com'}</button>`);
    const go = $('#cgo', m.el);
    go.onclick = async () => {
      const key = $('#ck', m.el).value.trim();
      if (!/^cal_(live|test)_[A-Za-z0-9]+$/.test(key)) return toast("Paste the Cal.com API key. It starts with cal_live_.", true);
      go.disabled = true; go.textContent = 'Checking…';
      try { const r = await api.connectCal(t.id, key); m.close(); toast(r.message || 'Cal.com connected', r.webhook === false); after?.(); }
      catch (e) { go.disabled = false; go.textContent = stored || legacy ? 'Save new key' : 'Connect Cal.com'; fail(e); }
    };
    const dis = $('#cdis', m.el);
    if (dis) dis.onclick = async () => {
      if (dis.dataset.sure !== '1') { dis.dataset.sure = '1'; dis.textContent = 'Click again to disconnect'; return; }
      dis.disabled = true;
      try { const r = await api.disconnectCal(t.id); m.close(); toast(r.message || 'Disconnected'); after?.(); }
      catch (e) { dis.disabled = false; fail(e); }
    };
    setTimeout(() => $('#ck', m.el)?.focus(), 50);
  }

  // People with a non-DRG email are outside DRG; their company comes from the domain unless typed in
  const DRG_DOMAINS = ['dollarrevenuegroup.com'];
  const KNOWN_COMPANIES = { 'techjays.com': 'TechJays', 'gomarketpros.com': 'GoMarketPros' };
  function companyFromEmail(email) {
    const dom = String(email || '').toLowerCase().split('@')[1] || '';
    if (!dom || DRG_DOMAINS.includes(dom) || /^(gmail|googlemail|outlook|hotmail|yahoo|icloud|proton(mail)?)\./.test(dom)) return null;
    if (KNOWN_COMPANIES[dom]) return KNOWN_COMPANIES[dom];
    const base = dom.split('.')[0]; return base ? base.charAt(0).toUpperCase() + base.slice(1) : null;
  }
  function memberForm(t, after) {
    const av = t?.availability || { slot: 30, days: { 1: [['10:00', '18:00']], 2: [['10:00', '18:00']], 3: [['10:00', '18:00']], 4: [['10:00', '18:00']], 5: [['10:00', '18:00']] } };
    const on = Object.keys(av.days || {}).filter(k => (av.days[k] || []).length).map(Number);
    const first = (av.days[on[0]] || [['10:00', '18:00']])[0];
    const tzs = [...new Set([t?.timezone || 'Asia/Kolkata', ...TZS])];
    const m = modal(t ? 'Edit interviewer' : 'Add interviewer', `
      <div class="grid2"><div class="field"><label for="mn">Full name</label><input class="input" id="mn" value="${esc(t?.full_name)}"></div>
        <div class="field"><label for="me">Email</label><input class="input" id="me" type="email" value="${esc(t?.email)}"></div></div>
      <div class="grid2"><div class="field"><label for="mco">Company</label><input class="input" id="mco" value="${esc(t?.company || '')}" placeholder="Dollar Revenue Group" list="mcos"><datalist id="mcos"><option value="TechJays"></option></datalist>
          <div class="small muted" id="mcoh">Leave blank for DRG staff. Anyone from another company shows as <b>Outside DRG</b>.</div></div>
        <label class="row small" style="gap:8px;align-self:end;padding-bottom:12px"><input type="checkbox" id="msnd"> Also add as an email sender (jobs can send candidate emails from this address)</label></div>
      <div class="grid2"><div class="field"><label for="mt">Job title</label><input class="input" id="mt" value="${esc(t?.title)}" placeholder="e.g. Head of Sales"></div>
        <div class="field"><label for="mz">Time zone</label><select class="input" id="mz">${tzs.map(z => `<option ${z === (t?.timezone || 'Asia/Kolkata') ? 'selected' : ''}>${z}</option>`).join('')}</select></div></div>
      <div class="field"><label>Days available for interviews</label><div class="seg" id="md">${DAYS.map(([k, l]) => `<button type="button" data-d="${k}" class="${on.includes(k) ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="grid2"><div class="field"><label for="mf">From</label><input class="input" type="time" id="mf" value="${first[0]}"></div><div class="field"><label for="mu">Until</label><input class="input" type="time" id="mu" value="${first[1]}"></div></div>
      <div class="field"><label for="ms">Offer start times every</label><select class="input" id="ms">${[15, 30, 60].map(x => `<option value="${x}" ${+av.slot === x ? 'selected' : ''}>${x} minutes</option>`).join('')}</select></div>
      <div class="field"><label for="ml">Meeting link (Google Meet, Zoom, Teams)</label><input class="input" id="ml" value="${esc(t?.meeting_link)}" placeholder="Their personal meeting room link"></div>
      <div class="field"><label for="mb">Own booking page (optional)</label><input class="input" id="mb" value="${esc(t?.booking_url)}" placeholder="e.g. a Calendly link. If set, candidates book there instead."></div>
      ${t ? `<label class="row small" style="gap:8px"><input type="checkbox" id="ma" ${t.active !== false ? 'checked' : ''}> Active (can be chosen for interviews)</label>` : ''}`,
      `<button class="btn" data-close>Cancel</button><button class="btn primary" id="go">${t ? 'Save' : 'Add person'}</button>`);
    $$('[data-d]', m.el).forEach(b => b.onclick = () => b.classList.toggle('on'));
    $('#go', m.el).onclick = async () => {
      const name = $('#mn', m.el).value.trim(), email = $('#me', m.el).value.trim().toLowerCase();
      if (!name || !/^\S+@\S+\.\S+$/.test(email)) return toast('Add a name and a valid email.', true);
      const from = $('#mf', m.el).value, until = $('#mu', m.el).value;
      if (!from || !until || from >= until) return toast('The end time must be after the start time.', true);
      const days = {}; $$('[data-d].on', m.el).forEach(b => days[b.dataset.d] = [[from, until]]);
      if (!Object.keys(days).length) return toast('Pick at least one day.', true);
      const link = $('#ml', m.el).value.trim(), book = $('#mb', m.el).value.trim();
      if ([link, book].some(u => u && !/^https:\/\//i.test(u))) return toast('Links must start with https://', true);
      const company = $('#mco', m.el).value.trim() || companyFromEmail(email);
      try { await api.saveMember({ ...(t ? { id: t.id } : {}), full_name: name, email, company, title: $('#mt', m.el).value.trim() || null, timezone: $('#mz', m.el).value,
          availability: { slot: +$('#ms', m.el).value, days }, meeting_link: link || null, booking_url: book || null, ...(t ? { active: $('#ma', m.el).checked } : {}) });
        if ($('#msnd', m.el).checked) { try { await api.saveSender({ from_name: company ? `${name.split(' ')[0]} · ${company}` : name, from_email: email, active: true }); toast(`${email} added as an email sender`); }
          catch (er) { toast(/duplicate|unique/i.test(er.message) ? `${email} is already an email sender` : 'Saved, but the sender could not be added: ' + er.message, true); } }
        m.close(); toast(t ? 'Saved' : 'Added to the interview panel'); after?.(); } catch (e) { fail(/duplicate/i.test(e.message) ? new Error('Someone with this email is already on the panel.') : e); } };
    // Suggest the company from the email domain (techjays.com → TechJays)
    const me_ = $('#me', m.el), mco = $('#mco', m.el);
    me_.addEventListener('change', () => { if (!mco.value.trim()) { const c = companyFromEmail(me_.value.trim()); if (c) mco.value = c; } });
  }

  async function settings(el, _a, params) {
    const tab = params.get('tab') || 'panel';
    el.innerHTML = `<div class="page-head"><div><h1>Settings</h1><p>Interview panel, team access, candidate emails and automation connections.</p></div></div>
      <div class="tabs">${[['panel', 'Interview panel'], ['team', 'Logins'], ['emails', 'Email templates'], ['auto', 'Automation']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="sb"></div>`;
    $$('[data-t]', el).forEach(b => b.onclick = () => location.hash = `#/settings?tab=${b.dataset.t}`);
    const sb = $('#sb');
    if (tab === 'panel') return panelSettings(sb);
    if (tab === 'team') {
      const ps = await api.profiles();
      sb.innerHTML = `<div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Person</th><th>Email</th><th>Role</th></tr></thead><tbody>${ps.map(p => `<tr><td><div class="row" style="flex-wrap:nowrap">${avatar(p.full_name, 30)}<b>${esc(p.full_name)}</b></div></td><td class="muted">${esc(p.email)}</td>
        <td><select class="input" data-role="${p.id}" style="width:auto" ${p.id === state.me.id ? 'disabled' : ''} aria-label="Role">${['admin', 'recruiter', 'hiring_manager', 'interviewer'].map(r => `<option value="${r}" ${p.role === r ? 'selected' : ''}>${r.replace('_', ' ')}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
        <p class="small muted">To add someone, invite them from Supabase → Authentication → Users. They appear here after their first sign-in, as a recruiter by default.</p>`;
      $$('[data-role]', sb).forEach(s => s.onchange = async () => { try { await api.setRole(s.dataset.role, s.value); toast('Role updated'); } catch (e) { fail(e); } });
    } else if (tab === 'emails') {
      await templateSettings(sb);
    } else {
      const st = await api.settings(); const cfg = window.ATS_CONFIG || {};
      const okc = v => v ? '<span class="chip v-pass">Connected</span>' : '<span class="chip v-review">Not set</span>';
      sb.innerHTML = `<div class="card"><div class="card-h"><h3>n8n connections</h3></div><div class="card-b" style="display:grid;gap:14px">
        ${st.map(s => `<div class="field"><label for="set-${s.key}">${esc(s.description || s.key)}</label><div class="row" style="flex-wrap:nowrap"><input class="input" id="set-${s.key}" data-set="${s.key}" value="${esc(s.value || '')}" ${s.key === 'n8n_webhook_secret' ? 'type="password"' : ''}><button class="btn sm" data-ss="${s.key}">Save</button></div></div>`).join('')}
        <div class="small muted">The database calls n8n the instant an application is saved or a candidate changes stage; it sends the secret in the <span class="mono">x-ats-secret</span> header. Paste the Slack incoming-webhook URL above to get a message for every careers-site application.</div></div></div>
        <div class="card tbl-wrap"><table class="tbl"><thead><tr><th>Web app setting (config.js)</th><th>Status</th></tr></thead><tbody>
          <tr><td>Supabase project</td><td>${okc(cfg.SUPABASE_URL)}</td></tr><tr><td>Workflow 4 · Email request webhook</td><td>${okc(cfg.N8N_SEND_EMAIL_URL)}</td></tr><tr><td>Workflow 3 · Careers apply webhook</td><td>${okc(cfg.N8N_APPLY_URL)}</td></tr><tr><td>Workflow 11 · Interview booking</td><td>${okc(cfg.N8N_BOOK_URL)}</td></tr><tr><td>Careers site</td><td>${cfg.CAREERS_URL ? `<a href="${esc(cfg.CAREERS_URL)}" target="_blank" rel="noopener">${esc(cfg.CAREERS_URL)}</a>` : okc(0)}</td></tr></tbody></table></div>`;
      $$('[data-ss]', sb).forEach(b => b.onclick = async () => { try { await api.saveSetting(b.dataset.ss, $(`[data-set="${b.dataset.ss}"]`, sb).value.trim() || null); toast('Saved'); } catch (e) { fail(e); } });
    }
  }

  /* ───────── login ───────── */
  function login() {
    app.innerHTML = `<div class="login"><div class="login-art"><div class="brand"><div class="brand-mark">${LOGO}</div><div><div class="brand-name">DRG ATS</div><div class="brand-sub">Applicant tracking</div></div></div>
      <div><h1>Every resume read. Every decision yours.</h1><p>AI screens each applicant against your rules within a minute and shows its evidence. Your team decides who moves forward.</p></div>
      <div style="display:grid;gap:14px"><div class="feature"><i>1</i><div><b>Set the bar per role</b>Must-haves and weighted criteria for every job.</div></div>
        <div class="feature"><i>2</i><div><b>Screen in seconds</b>Scores, verdicts and quoted evidence on every resume.</div></div>
        <div class="feature"><i>3</i><div><b>Run the whole pipeline</b>Interviews, scorecards and emails in one place.</div></div></div></div>
      <div class="login-form"><form class="card" id="lf"><div><h2>Sign in</h2><p class="muted small" style="margin:6px 0 0">Use the email your admin invited.</p></div>
        <div class="field"><label for="le">Work email</label><input class="input" id="le" type="email" required autocomplete="email"></div>
        <div class="field"><label for="lp">Password</label><input class="input" id="lp" type="password" autocomplete="current-password"></div>
        <button class="btn primary" style="justify-content:center">Sign in</button>
        <button type="button" class="btn ghost" id="ml" style="justify-content:center">Email me a sign-in link instead</button>
        <div id="lmsg" class="small muted" role="status"></div></form></div></div>`;
    $('#lf').onsubmit = async e => { e.preventDefault();
      try { await api.signIn($('#le').value.trim(), $('#lp').value); boot(); } catch (er) { $('#lmsg').textContent = er.message; $('#lmsg').style.color = 'var(--disq)'; } };
    $('#ml').onclick = async () => { const em = $('#le').value.trim(); if (!em) return $('#le').focus();
      try { await api.magicLink(em); $('#lmsg').textContent = 'Check your inbox for the sign-in link.'; $('#lmsg').style.color = 'var(--pass)'; } catch (er) { $('#lmsg').textContent = er.message; } };
  }

  /* ───────── boot ───────── */
  let timer;
  async function boot() {
    try {
      const s = await api.session();
      if (!s) return login();
      state.me = await api.me();
      if (!state.me) return login();
      shell(); await route();
      state.unsub?.();
      state.unsub = api.subscribe(() => { clearTimeout(timer); timer = setTimeout(() => {
        if (state.route === 'pipeline') state.redraw?.(); else if (['dashboard', 'candidates'].includes(state.route)) route(); refreshBadge(); }, 400); });
    } catch (e) { fail(e); login(); }
  }
  window.addEventListener('hashchange', () => { state.redraw = null; route(); });
  api.onAuth(s => { if (s && !state.me) boot(); });
  boot();
})();
