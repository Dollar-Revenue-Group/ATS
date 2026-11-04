/* DRG careers site: role list, role page with application form, and interview booking */
(function () {
  const cfg = window.CAREERS_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const view = document.getElementById('view');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (q, el = document) => el.querySelector(q);
  // Country calling codes for the phone field: [ISO, name, code]. India and Pakistan first, the rest A–Z.
  const DIAL = [['IN','India','91'],['PK','Pakistan','92'],['US','United States','1'],['GB','United Kingdom','44'],['AE','United Arab Emirates','971'],
    ['AF','Afghanistan','93'],['AR','Argentina','54'],['AU','Australia','61'],['AT','Austria','43'],['BH','Bahrain','973'],['BD','Bangladesh','880'],['BE','Belgium','32'],
    ['BR','Brazil','55'],['BG','Bulgaria','359'],['KH','Cambodia','855'],['CA','Canada','1'],['CL','Chile','56'],['CN','China','86'],['CO','Colombia','57'],['HR','Croatia','385'],
    ['CY','Cyprus','357'],['CZ','Czechia','420'],['DK','Denmark','45'],['EG','Egypt','20'],['EE','Estonia','372'],['ET','Ethiopia','251'],['FI','Finland','358'],['FR','France','33'],
    ['DE','Germany','49'],['GH','Ghana','233'],['GR','Greece','30'],['HK','Hong Kong','852'],['HU','Hungary','36'],['ID','Indonesia','62'],['IE','Ireland','353'],['IL','Israel','972'],
    ['IT','Italy','39'],['JP','Japan','81'],['JO','Jordan','962'],['KZ','Kazakhstan','7'],['KE','Kenya','254'],['KW','Kuwait','965'],['LV','Latvia','371'],['LB','Lebanon','961'],
    ['LT','Lithuania','370'],['MY','Malaysia','60'],['MV','Maldives','960'],['MX','Mexico','52'],['MA','Morocco','212'],['NP','Nepal','977'],['NL','Netherlands','31'],
    ['NZ','New Zealand','64'],['NG','Nigeria','234'],['NO','Norway','47'],['OM','Oman','968'],['PH','Philippines','63'],['PL','Poland','48'],['PT','Portugal','351'],
    ['QA','Qatar','974'],['RO','Romania','40'],['SA','Saudi Arabia','966'],['RS','Serbia','381'],['SG','Singapore','65'],['SK','Slovakia','421'],['ZA','South Africa','27'],
    ['KR','South Korea','82'],['ES','Spain','34'],['LK','Sri Lanka','94'],['SE','Sweden','46'],['CH','Switzerland','41'],['TW','Taiwan','886'],['TZ','Tanzania','255'],
    ['TH','Thailand','66'],['TR','Türkiye','90'],['UG','Uganda','256'],['UA','Ukraine','380'],['UZ','Uzbekistan','998'],['VN','Vietnam','84']];
  // Amount-with-currency questions: currency list, and each country's usual currency (for the default choice)
  const CURRENCIES = [['USD', 'US dollar'], ['INR', 'Indian rupee'], ['PKR', 'Pakistani rupee'], ['EUR', 'Euro'], ['GBP', 'British pound'], ['AED', 'UAE dirham'],
    ['CAD', 'Canadian dollar'], ['AUD', 'Australian dollar'], ['SGD', 'Singapore dollar'], ['SAR', 'Saudi riyal'], ['QAR', 'Qatari riyal'], ['KWD', 'Kuwaiti dinar'],
    ['BHD', 'Bahraini dinar'], ['OMR', 'Omani rial'], ['BDT', 'Bangladeshi taka'], ['LKR', 'Sri Lankan rupee'], ['NPR', 'Nepalese rupee'], ['PHP', 'Philippine peso'],
    ['MYR', 'Malaysian ringgit'], ['IDR', 'Indonesian rupiah'], ['THB', 'Thai baht'], ['VND', 'Vietnamese dong'], ['NGN', 'Nigerian naira'], ['KES', 'Kenyan shilling'],
    ['ZAR', 'South African rand'], ['EGP', 'Egyptian pound'], ['TRY', 'Turkish lira'], ['NZD', 'New Zealand dollar'], ['CHF', 'Swiss franc'], ['JPY', 'Japanese yen'],
    ['CNY', 'Chinese yuan'], ['HKD', 'Hong Kong dollar'], ['BRL', 'Brazilian real'], ['MXN', 'Mexican peso'], ['PLN', 'Polish zloty'], ['SEK', 'Swedish krona']];
  const COUNTRY_CUR = { IN: 'INR', PK: 'PKR', US: 'USD', GB: 'GBP', AE: 'AED', CA: 'CAD', AU: 'AUD', SG: 'SGD', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
    BD: 'BDT', LK: 'LKR', NP: 'NPR', PH: 'PHP', MY: 'MYR', ID: 'IDR', TH: 'THB', VN: 'VND', NG: 'NGN', KE: 'KES', ZA: 'ZAR', EG: 'EGP', TR: 'TRY', NZ: 'NZD', CH: 'CHF',
    JP: 'JPY', CN: 'CNY', HK: 'HKD', BR: 'BRL', MX: 'MXN', PL: 'PLN', SE: 'SEK', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', IE: 'EUR', BE: 'EUR', AT: 'EUR',
    PT: 'EUR', FI: 'EUR', GR: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', SK: 'EUR', CY: 'EUR', HR: 'EUR' };
  // CTC in India is usually quoted per year; elsewhere per month (the applicant can change it)
  const perFor = cur => cur === 'INR' ? 'year' : 'month';
  const curOptions = sel => CURRENCIES.map(([c, n]) => `<option value="${c}" ${c === sel ? 'selected' : ''}>${c} · ${n}</option>`).join('');
  const flag = iso => String.fromCodePoint(...[...iso].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  const guessCountry = () => { let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    const m = { 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK', 'Asia/Dubai': 'AE', 'Europe/London': 'GB', 'Asia/Dhaka': 'BD', 'Asia/Colombo': 'LK',
      'Asia/Kathmandu': 'NP', 'Asia/Manila': 'PH', 'Asia/Singapore': 'SG', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA' };
    if (m[tz]) return m[tz]; if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax)/.test(tz)) return 'CA'; if (/^America\//.test(tz)) return 'US';
    if (/^Australia\//.test(tz)) return 'AU'; return 'IN'; };
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const MB5 = 5 * 1048576;
  const DOC_TYPES = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
  const ext = n => (String(n).match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';
  const myTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();

  function setHero(title, sub, eyebrow) {
    const cta = $('#hero-cta'); if (cta) cta.hidden = true;
    $('#hero-title').textContent = title;
    const el = $('#hero-sub');
    if (Array.isArray(sub)) { el.className = 'hero-meta'; el.innerHTML = sub.filter(Boolean).map(esc).map(x => `<span>${x}</span>`).join('<span class="dot" aria-hidden="true"></span>'); }
    else { el.className = ''; el.textContent = sub; }
    const eb = $('#hero-eyebrow'); if (eb) eb.textContent = eyebrow || 'Careers';
  }
  function setMeta(title, desc) {
    document.title = title;
    $('meta[name="description"]').setAttribute('content', desc);
  }
  function go(path) { history.pushState({}, '', path); route(); }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-link]');
    if (a && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); go(a.getAttribute('href')); }
  });
  window.addEventListener('popstate', route);

  /* ───────── role list ───────── */
  async function listPage() {
    setHero('Build revenue engines with us.', 'We help B2B companies grow pipeline. Join a team that values clear thinking, fast learning and measurable results.');
    setMeta('Careers at DRG · Dollar Revenue Group', 'Open roles at Dollar Revenue Group.');
    const { data, error } = await sb.rpc('public_jobs');
    if (error) throw error;
    const jobs = data || [];
    const depts = [...new Set(jobs.map(j => j.department).filter(Boolean))];
    let dept = '';
    const draw = () => {
      const shown = jobs.filter(j => !dept || j.department === dept);
      view.innerHTML = `${depts.length > 1 ? `<div class="filters" role="group" aria-label="Filter by team"><div class="seg">${['', ...depts].map(d => `<button data-d="${esc(d)}" class="${d === dept ? 'on' : ''}">${esc(d || 'All teams')}</button>`).join('')}</div></div>` : ''}
        ${shown.map(j => `<a class="card role" href="/roles/${encodeURIComponent(j.slug)}" data-link><div><h2>${esc(j.title)}</h2>
          <div class="meta small muted">${j.department ? `<span class="tag">${esc(j.department)}</span>` : ''}${j.location ? `<span>${esc(j.location)}</span>` : ''}${j.employment_type ? `<span>· ${esc(j.employment_type)}</span>` : ''}</div></div>
          <span class="btn primary">View and apply</span></a>`).join('') || '<div class="card empty">There are no open roles right now. Please check back soon.</div>'}`;
      $$('[data-d]').forEach(b => b.onclick = () => { dept = b.dataset.d; draw(); });
    };
    draw();
  }

  /* ───────── resume text ───────── */
  const loadScript = src => new Promise((res, rej) => { const t = document.createElement('script'); t.src = src; t.onload = res; t.onerror = () => rej(new Error('load')); document.head.append(t); });
  let libs = null;
  async function extractText(file) {
    if (!libs) libs = (async () => {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    })();
    await libs;
    const buf = await file.arrayBuffer();
    if (ext(file.name) === 'pdf') {
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise; let t = '';
      for (let i = 1; i <= pdf.numPages; i++) t += (await (await pdf.getPage(i)).getTextContent()).items.map(x => x.str).join(' ') + '\n';
      return t;
    }
    return (await window.mammoth.extractRawText({ arrayBuffer: buf })).value;
  }
  async function uploadFile(jobId, file) {
    const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80);
    const id = (crypto.randomUUID && crypto.randomUUID()) || (Date.now() + '-' + Math.random().toString(36).slice(2));
    const path = `careers/${jobId}/${id}-${safe}`;
    const { error } = await sb.storage.from('resumes').upload(path, file, { contentType: DOC_TYPES[ext(file.name)] || file.type, upsert: false });
    if (error) throw new Error('Your file could not be uploaded. Please try again.');
    return { path, name: file.name };
  }


  /* ───────── job description formatting ───────── */
  const titleCase = t => t.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()).replace(/\bDrg\b/g, 'DRG').replace(/\bAi\b/g, 'AI').replace(/\bGtm\b/g, 'GTM').replace(/\bYou'll\b/g, "You'll").replace(/\bWe're\b/g, "We're").replace(/ (The|To|A|An|Of|And|For|In|On|With) /g, m => m.toLowerCase());
  const inline = t => esc(t)
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:)])/g, '<a href="$1">$1</a>')
    .replace(/^(Must have:)/, '<strong class="must">$1</strong>');
  function jdHtml(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const facts = []; let i = 0;
    while (i < lines.length && /^[A-Z][A-Za-z ]{2,30}:\s*\S/.test(lines[i]) && !/^[A-Z ]+$/.test(lines[i])) {
      const k = lines[i].indexOf(':'); facts.push([lines[i].slice(0, k).trim(), lines[i].slice(k + 1).trim()]); i++;
    }
    const sections = []; let cur = { title: '', blocks: [] }, list = null, para = [];
    const flushPara = () => { if (para.length) { cur.blocks.push(`<p>${para.map(inline).join(' ')}</p>`); para = []; } };
    const flushList = () => { if (list) { cur.blocks.push(`<ul class="jd-list">${list.map(x => `<li>${inline(x)}</li>`).join('')}</ul>`); list = null; } };
    for (; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) { flushPara(); flushList(); continue; }
      if (/^[A-Z0-9 '&’\-]{4,}$/.test(l) && /[A-Z]{3}/.test(l)) { flushPara(); flushList(); if (cur.title || cur.blocks.length) sections.push(cur); cur = { title: l, blocks: [] }; continue; }
      if (/^[•\-\*]\s+/.test(l)) { flushPara(); (list = list || []).push(l.replace(/^[•\-\*]\s+/, '')); continue; }
      if (/^https?:\/\/\S+$/.test(l)) { flushPara(); flushList(); continue; }
      flushList(); para.push(l);
    }
    flushPara(); flushList(); if (cur.title || cur.blocks.length) sections.push(cur);
    const factsHtml = facts.length ? `<dl class="jd-facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
    const body = sections.map(sec => {
      const apply = /how to apply/i.test(sec.title);
      if (apply) return `<section class="jd-sec jd-apply"><h3>${esc(titleCase(sec.title))}</h3><p>Fill in the application form below. It takes about 3 minutes.</p><a class="btn primary" href="#af" data-scroll="af">Apply now</a></section>`;
      return `<section class="jd-sec">${sec.title ? `<h3>${esc(titleCase(sec.title))}</h3>` : ''}${sec.blocks.join('')}</section>`;
    }).join('');
    return factsHtml + body;
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-scroll]'); if (!a) return;
    e.preventDefault(); const t = document.getElementById(a.dataset.scroll); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => $('#fn')?.focus({ preventScroll: true }), 500); }
  });

  /* ───────── role page and application form ───────── */
  const fieldHtml = f => {
    const id = 'q_' + f.id, req = f.required ? ' <span class="req" aria-hidden="true">*</span>' : '';
    const help = f.help ? `<div class="help" id="${id}_h">${esc(f.help)}</div>` : '';
    const aria = `${f.required ? 'required aria-required="true"' : ''} ${f.help ? `aria-describedby="${id}_h"` : ''}`;
    if (f.type === 'textarea') return `<div class="field"><label for="${id}">${esc(f.label)}${req}</label>${help}<textarea class="input" id="${id}" data-q="${esc(f.id)}" rows="4" maxlength="4000" ${aria}></textarea></div>`;
    if (f.type === 'select') return `<div class="field"><label for="${id}">${esc(f.label)}${req}</label>${help}<select class="input" id="${id}" data-q="${esc(f.id)}" ${aria}><option value="">Choose…</option>${(f.options || []).map(o => `<option>${esc(o)}</option>`).join('')}</select></div>`;
    if (f.type === 'money') return `<div class="field"><label for="${id}">${esc(f.label)}${req}</label>${help}
      <div class="money-row"><select class="input" data-cur="${esc(f.id)}" aria-label="${esc(f.label)} currency">${curOptions(COUNTRY_CUR[guessCountry()] || 'USD')}</select>
        <input class="input" id="${id}" data-q="${esc(f.id)}" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 1200000" maxlength="20" ${aria}>
        <select class="input" data-per="${esc(f.id)}" aria-label="${esc(f.label)} period">${['month', 'year'].map(x => `<option value="${x}" ${x === perFor(COUNTRY_CUR[guessCountry()] || 'USD') ? 'selected' : ''}>per ${x}</option>`).join('')}</select></div></div>`;
    if (f.type === 'file') return `<div class="field"><span class="lbl" style="font-weight:600;font-size:13px">${esc(f.label)}${req}</span>${help}
      <label class="file-pick"><input type="file" data-file="${esc(f.id)}" accept=".pdf,.docx,.png,.jpg,.jpeg" ${aria}><span>📎</span><b data-fname="${esc(f.id)}">Choose a file</b><span class="small muted">PDF, DOCX, PNG or JPG · up to 5 MB</span></label></div>`;
    const type = { url: 'url', email: 'email', number: 'number' }[f.type] || 'text';
    const ph = f.type === 'url' ? 'https://' : '';
    return `<div class="field"><label for="${id}">${esc(f.label)}${req}</label>${help}<input class="input" id="${id}" data-q="${esc(f.id)}" type="${type}" placeholder="${ph}" maxlength="${f.type === 'text' ? 500 : 2000}" ${aria}></div>`;
  };

  async function rolePage(slug) {
    const { data: j, error } = await sb.rpc('public_job', { p_slug: slug });
    if (error) throw error;
    if (!j) {
      setHero('This role is closed.', 'It may have been filled. Take a look at our other open roles.');
      view.innerHTML = `<div class="card empty">This role is no longer open. <a href="/" data-link>See open roles</a></div>`; return;
    }
    setHero(j.title, [j.department, j.location, j.employment_type], 'Open role');
    $('#hero-cta').hidden = false;
    setMeta(`${j.title} · Careers at DRG`, `${j.title} at Dollar Revenue Group. ${String(j.jd_text || '').slice(0, 140)}`);
    addJobPosting(j);
    const fields = j.form_fields || [];
    view.innerHTML = `<a href="/" data-link class="small" style="text-decoration:none">← All roles</a>
      <article class="card panel jd-card"><div class="jd">${j.jd_text ? jdHtml(j.jd_text) : '<p class="muted">Details coming soon.</p>'}</div></article>
      <form class="card panel" id="af" novalidate><div><h2>Apply for this role</h2><p class="small muted" style="margin:6px 0 0">Fields marked <span class="req">*</span> are required. It takes about 3 minutes.</p></div>
        <div class="grid2"><div class="field"><label for="fn">Full name <span class="req">*</span></label><input class="input" id="fn" required autocomplete="name" maxlength="120"></div>
          <div class="field"><label for="em">Email <span class="req">*</span></label><input class="input" id="em" type="email" required autocomplete="email" maxlength="200"></div></div>
        <div class="field"><label for="ph">Phone / WhatsApp <span class="req">*</span></label>
            <div class="phone-row"><select class="input" id="pcc" aria-label="Country code" autocomplete="tel-country-code">${DIAL.map(([iso, name, code]) => `<option value="${iso}" ${iso === guessCountry() ? 'selected' : ''}>${flag(iso)} +${code} ${esc(name)}</option>`).join('')}</select>
              <input class="input" id="ph" type="tel" required autocomplete="tel-national" inputmode="tel" maxlength="20" placeholder="98765 43210"></div>
            <span class="small muted">Choose your country code, then your number without the leading 0.</span></div>
          <div class="field"><label for="li">LinkedIn profile <span class="req">*</span></label><input class="input" id="li" type="url" required placeholder="https://linkedin.com/in/…" maxlength="300"></div>
        <div class="field"><span style="font-weight:600;font-size:13px">Resume <span class="req">*</span></span>
          <label class="file-pick"><input type="file" id="cv" accept=".pdf,.docx" required><span>📄</span><b id="cvname">Choose your resume</b><span class="small muted">PDF or DOCX · up to 5 MB</span></label></div>
        ${fields.map(fieldHtml).join('')}
        <div style="position:absolute;left:-9999px" aria-hidden="true"><label for="website">Website</label><input id="website" tabindex="-1" autocomplete="off"></div>
        <label class="row small" style="gap:8px;flex-wrap:nowrap;align-items:flex-start"><input type="checkbox" id="ok" style="margin-top:3px"> I agree that DRG may store my details and documents to assess my application.</label>
        <div id="msg" class="small" role="status" aria-live="polite"></div>
        <button class="btn primary" id="sub" style="justify-self:start">Submit application</button></form>`;
    const f = $('#af'), msg = $('#msg'), sub = $('#sub');
    // Currency follows the phone country until the applicant picks one themselves
    const syncPer = c => { const pr = $(`[data-per="${c.dataset.cur}"]`, f); if (pr && !pr.dataset.picked) pr.value = perFor(c.value); };
    $$('[data-per]', f).forEach(pr => pr.onchange = () => { pr.dataset.picked = '1'; });
    $$('[data-cur]', f).forEach(c => c.onchange = () => { c.dataset.picked = '1'; syncPer(c); });
    $('#pcc').addEventListener('change', () => { const cur = COUNTRY_CUR[$('#pcc').value]; if (cur) $$('[data-cur]', f).forEach(c => { if (!c.dataset.picked) { c.value = cur; syncPer(c); } }); });
    $('#cv').onchange = e => { $('#cvname').textContent = e.target.files[0]?.name || 'Choose your resume'; };
    $$('[data-file]', f).forEach(i => i.onchange = () => { $(`[data-fname="${i.dataset.file}"]`, f).textContent = i.files[0]?.name || 'Choose a file'; });
    const err = (t, focus) => { msg.textContent = t; msg.className = 'small err-msg'; focus?.focus(); };
    f.onsubmit = async e => {
      e.preventDefault();
      const name = $('#fn').value.trim(), email = $('#em').value.trim().toLowerCase(), cv = $('#cv').files[0];
      if (!name) return err('Please add your full name.', $('#fn'));
      if (!/^\S+@\S+\.\S+$/.test(email)) return err('Please add a valid email address.', $('#em'));
      const cc = (DIAL.find(d => d[0] === $('#pcc').value) || DIAL[0])[2];
      let digits = $('#ph').value.replace(/\D/g, '');
      if (digits.startsWith(cc) && digits.length > 10) digits = digits.slice(cc.length);   // they typed the code again
      digits = digits.replace(/^0+/, '');                                                // drop the trunk 0 (e.g. 0300… in Pakistan)
      if (digits.length < 6 || digits.length > 14) return err('Please add your phone number, without the country code.', $('#ph'));
      const phone = '+' + cc + ' ' + digits;
      const li = $('#li').value.trim();
      if (!li) return err('Please add your LinkedIn profile link.', $('#li'));
      if (!/^https?:\/\/\S+\.\S+/i.test(li)) return err('Your LinkedIn link should start with https://', $('#li'));
      if (!cv) return err('Please attach your resume.', $('#cv'));
      if (!['pdf', 'docx'].includes(ext(cv.name))) return err('Your resume must be a PDF or DOCX file.', $('#cv'));
      if (cv.size > MB5) return err('Your resume must be under 5 MB.', $('#cv'));
      const answers = {}; const files = [];
      for (const q of fields) {
        if (q.type === 'file') {
          const inp = $(`[data-file="${q.id}"]`, f); const file = inp.files[0];
          if (!file) { if (q.required) return err(`Please attach: ${q.label}`, inp); continue; }
          if (!['pdf', 'docx', 'png', 'jpg', 'jpeg'].includes(ext(file.name))) return err(`${q.label}: please use a PDF, DOCX, PNG or JPG file.`, inp);
          if (file.size > MB5) return err(`${q.label}: the file must be under 5 MB.`, inp);
          files.push({ field_id: q.id, file });
        } else {
          const inp = $(`[data-q="${q.id}"]`, f); const v = inp.value.trim();
          if (!v) { if (q.required) return err(`Please answer: ${q.label}`, inp); continue; }
          if (q.type === 'url' && !/^https?:\/\/\S+\.\S+/i.test(v)) return err(`${q.label}: please paste a full link starting with https://`, inp);
          if (q.type === 'email' && !/^\S+@\S+\.\S+$/.test(v)) return err(`${q.label}: please add a valid email.`, inp);
          if (q.type === 'money') {
            const n = v.replace(/[\s,]/g, '');
            if (!/^\d+(\.\d+)?$/.test(n) || !(+n > 0)) return err(`${q.label}: please enter the amount as a number, for example 1200000.`, inp);
            answers[q.id] = `${+n} ${$(`[data-cur="${q.id}"]`, f).value} / ${$(`[data-per="${q.id}"]`, f)?.value || 'month'}`; continue;
          }
          answers[q.id] = v;
        }
      }
      if (!$('#ok').checked) return err('Please tick the consent box to continue.', $('#ok'));
      sub.disabled = true; msg.className = 'small muted';
      try {
        msg.textContent = 'Reading your resume…';
        const raw_text = await extractText(cv).catch(() => '');
        msg.textContent = 'Uploading your files…';
        const resume = await uploadFile(j.id, cv);
        const attachments = [];
        for (const x of files) attachments.push({ field_id: x.field_id, ...(await uploadFile(j.id, x.file)) });
        msg.textContent = 'Sending your application…';
        const r = await fetch(cfg.APPLY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ website: $('#website').value, consent: true, job_id: j.id, full_name: name, email, phone, linkedin_url: li,
            resume, raw_text, answers, attachments }) });
        const res = await r.json().catch(() => ({}));
        if (!r.ok || res.ok === false) throw new Error(res.message || 'Something went wrong. Please try again in a few minutes.');
        setHero('Application received.', `Thank you for applying for ${j.title}.`, 'Application');
        view.innerHTML = `<div class="card done"><span class="chip v-pass">Application received</span>
          <h2>Thank you, ${esc(name.split(' ')[0])}.</h2><p class="muted" style="margin:0;max-width:56ch">We've received your application for ${esc(j.title)} and sent a confirmation to ${esc(email)}. Our team reviews every application and will be in touch.</p>
          <a class="btn" href="/" data-link>See other roles</a></div>`;
        window.scrollTo(0, 0);
      } catch (ex) { err(ex.message); sub.disabled = false; }
    };
  }
  function addJobPosting(j) {
    $$('script[data-jp]').forEach(s => s.remove());
    const s = document.createElement('script'); s.type = 'application/ld+json'; s.dataset.jp = '1';
    s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'JobPosting', title: j.title, description: esc(j.jd_text || j.title).replace(/\n/g, '<br>'),
      datePosted: String(j.created_at || '').slice(0, 10), employmentType: String(j.employment_type || '').toUpperCase().replace(/[^A-Z]/g, '_'),
      hiringOrganization: { '@type': 'Organization', name: 'Dollar Revenue Group', sameAs: 'https://dollarrevenuegroup.com' },
      jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: j.location || '' } } });
    document.head.append(s);
  }

  /* ───────── interview booking ───────── */
  async function bookPage(token) {
    setHero('Book your interview.', 'Pick a time that suits you. Times are shown in your own time zone.');
    setMeta('Book your interview · DRG', 'Pick a time for your interview with DRG.');
    const r = await fetch(`${cfg.BOOKING_URL}?token=${encodeURIComponent(token)}`);
    const d = await r.json().catch(() => ({ ok: false }));
    if (!d.ok) {
      if (d.booked && d.start) return bookedView(d.start, myTz, d.message);
      view.innerHTML = `<div class="card done"><span class="chip v-review">Link not valid</span><h2>We couldn't open this booking link.</h2><p class="muted" style="margin:0">${esc(d.message || 'The link may have expired.')} Reply to the email you received and we'll send a new one.</p></div>`; return;
    }
    setHero(`Book your ${d.round_name || 'interview'}.`, `${d.job_title} · ${d.duration} minutes with ${d.interviewer_name}${d.interviewer_title ? ', ' + d.interviewer_title : ''}.`);
    let tz = myTz, chosenDay = null, chosen = null;
    const zones = [...new Set([myTz, 'Asia/Kolkata', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney', 'UTC'])];
    const dayKey = (iso, z) => new Intl.DateTimeFormat('en-CA', { timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
    const timeLabel = (iso, z) => new Intl.DateTimeFormat(undefined, { timeZone: z, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
    const draw = () => {
      const byDay = {}; d.slots.forEach(s => (byDay[dayKey(s, tz)] = byDay[dayKey(s, tz)] || []).push(s));
      const days = Object.keys(byDay).sort();
      if (!chosenDay || !byDay[chosenDay]) chosenDay = days[0];
      view.innerHTML = `<div class="card panel">
        <div class="book-head"><h2>Hi ${esc(d.candidate_first || 'there')}, choose a time</h2><p class="muted" style="margin:0">Round ${esc(d.round_number)} · ${esc(d.round_name)} for ${esc(d.job_title)} · ${esc(d.duration)} minutes with ${esc(d.interviewer_name)}</p></div>
        <div class="tz-row"><label for="tz" class="small" style="font-weight:600">Your time zone</label><select class="input" id="tz" style="width:auto">${zones.map(z => `<option ${z === tz ? 'selected' : ''}>${esc(z)}</option>`).join('')}</select></div>
        ${days.length ? `<div class="days" role="listbox" aria-label="Day">${days.map(k => { const dt = new Date(byDay[k][0]);
            const f = o => new Intl.DateTimeFormat(undefined, { timeZone: tz, ...o }).format(dt);
            return `<button class="day ${k === chosenDay ? 'on' : ''}" data-day="${k}" role="option" aria-selected="${k === chosenDay}"><span>${f({ weekday: 'short' })}</span><b>${f({ day: 'numeric' })}</b><span>${f({ month: 'short' })}</span></button>`; }).join('')}</div>
          <div class="slots" role="listbox" aria-label="Time">${byDay[chosenDay].map(s => `<button class="slot ${s === chosen ? 'on' : ''}" data-slot="${s}" role="option" aria-selected="${s === chosen}">${timeLabel(s, tz)}</button>`).join('')}</div>`
          : '<div class="empty">No times are free in the next three weeks. Please reply to the email you received and we will find a time with you.</div>'}
        ${chosen ? `<div class="confirm"><div><b>${new Intl.DateTimeFormat(undefined, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).format(new Date(chosen))}</b><div class="small">${esc(tz)} · ${esc(d.duration)} minutes</div></div>
          <button class="btn primary" id="bk">Confirm this time</button></div>` : ''}
        <div id="bmsg" class="small" role="status" aria-live="polite"></div></div>`;
      $('#tz').onchange = e => { tz = e.target.value; draw(); };
      $$('[data-day]').forEach(b => b.onclick = () => { chosenDay = b.dataset.day; chosen = null; draw(); });
      $$('[data-slot]').forEach(b => b.onclick = () => { chosen = b.dataset.slot; draw(); $('#bk')?.focus(); });
      $('#bk') && ($('#bk').onclick = async () => {
        const btn = $('#bk'); btn.disabled = true; btn.textContent = 'Booking…';
        try {
          const rr = await fetch(cfg.BOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, start: chosen, tz }) });
          const res = await rr.json().catch(() => ({ ok: false }));
          if (res.ok) return bookedView(res.start, tz, res.message, d);
          if (res.taken && Array.isArray(res.slots)) { d.slots = res.slots; chosen = null; draw(); $('#bmsg').textContent = res.message; $('#bmsg').className = 'small err-msg'; return; }
          throw new Error(res.message || 'We could not book that time. Please try again.');
        } catch (ex) { btn.disabled = false; btn.textContent = 'Confirm this time'; $('#bmsg').textContent = ex.message; $('#bmsg').className = 'small err-msg'; }
      });
    };
    draw();
  }
  function bookedView(start, tz, message, d) {
    const when = new Intl.DateTimeFormat(undefined, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(start));
    setHero('You are booked in.', 'A confirmation with a calendar invite is on its way to your email.');
    view.innerHTML = `<div class="card done"><span class="chip v-pass">Interview booked</span><h2>${esc(when)}</h2>
      ${d ? `<p class="muted" style="margin:0">${esc(d.round_name)} for ${esc(d.job_title)} with ${esc(d.interviewer_name)} · ${esc(d.duration)} minutes</p>` : ''}
      <p class="muted" style="margin:0;max-width:60ch">${esc(message || 'Check your email for the calendar invite.')} If you need to change the time, reply to that email.</p></div>`;
    window.scrollTo(0, 0);
  }

  /* ───────── router ───────── */
  async function route() {
    const p = location.pathname.replace(/\/+$/, '') || '/';
    view.innerHTML = '<div class="card empty"><span class="spin"></span></div>';
    try {
      let m;
      if ((m = p.match(/^\/roles\/([^/]+)$/))) await rolePage(decodeURIComponent(m[1]));
      else if ((m = p.match(/^\/book\/([^/]+)$/))) await bookPage(decodeURIComponent(m[1]));
      else await listPage();
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="card empty">Something went wrong loading this page. Please refresh, or try again in a few minutes.</div>`;
    }
    window.scrollTo(0, 0);
  }
  route();
})();
