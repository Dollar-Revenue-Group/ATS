/* DRG ATS · data layer
   Two interchangeable back ends with the same methods:
   - LiveApi: Supabase (database, storage, auth, realtime) + n8n webhooks
   - DemoApi: in-memory sample data, used when config.js has no Supabase URL or the URL has ?demo */
(function () {
  const STAGES = [
    { id: 1, name: 'Applied', position: 1 }, { id: 2, name: 'Screened', position: 2 }, { id: 9, name: 'Manual Screened', position: 3 },
    { id: 3, name: 'Round 1', position: 4 }, { id: 4, name: 'Round 2', position: 5 }, { id: 8, name: 'Round 3', position: 6 },
    { id: 10, name: 'Round 4', position: 7 }, { id: 11, name: 'Round 5', position: 8 },
    { id: 5, name: 'Offer', position: 9 }, { id: 6, name: 'Hired', position: 10, is_terminal: true },
    { id: 7, name: 'Rejected', position: 11, is_terminal: true }
  ];
  // Interview rounds map to pipeline stages
  const ROUND_STAGE = { 1: 3, 2: 4, 3: 8, 4: 10, 5: 11 };
  const STAGE_ROUND = { 3: 1, 4: 2, 8: 3, 10: 4, 11: 5 };

  /* ───────────── Live back end ───────────── */
  function LiveApi(cfg) {
    // In-memory lock: pages served by n8n run in a sandbox where the browser Locks API is blocked
    const locks = {};
    const lock = async (name, _timeout, fn) => { const prev = locks[name] || Promise.resolve(); let done; const mine = new Promise(r => done = r);
      locks[name] = prev.then(() => mine); await prev; try { return await fn(); } finally { done(); } };
    const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { lock } });
    const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
    let me = null;
    let liveCh = null; const liveSubs = new Set();

    async function callN8n(url, body) {
      if (!url) throw new Error('The n8n webhook URL is not set in config.js yet.');
      const { data: { session } } = await sb.auth.getSession();
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify(body)
      });
      const res = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(res.message || `Automation request failed (${r.status}). Check that n8n is running.`);
      return res;
    }

    return {
      mode: 'live', sb,
      async session() { const { data } = await sb.auth.getSession(); return data.session; },
      async signIn(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); },
      async magicLink(email) {
        ok(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.href.split('#')[0] } }));
      },
      async signOut() { await sb.auth.signOut(); me = null; },
      onAuth(cb) { sb.auth.onAuthStateChange((_e, s) => cb(s)); },
      async me() {
        if (me) return me;
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return null;
        me = ok(await sb.from('profiles').select('*').eq('id', user.id).single());
        return me;
      },
      async stages() { return ok(await sb.from('pipeline_stages').select('*').order('position')); },

      async jobs() {
        const [jr, ar] = await Promise.all([sb.from('jobs').select('*').order('created_at', { ascending: false }), sb.from('applications').select('job_id,stage_id,created_at')]);
        const jobs = ok(jr), apps = ok(ar);
        return jobs.map(j => {
          const mine = apps.filter(a => a.job_id === j.id);
          const byStage = {}; mine.forEach(a => byStage[a.stage_id] = (byStage[a.stage_id] || 0) + 1);
          return { ...j, total: mine.length, byStage };
        });
      },
      async connectCal(memberId, apiKey) {
        const res = await callN8n(cfg.CALCOM_CONNECT_URL, { member_id: memberId, action: 'connect', api_key: apiKey });
        if (!res || res.ok === false) throw new Error((res && res.message) || 'Could not connect Cal.com.');
        return res;
      },
      async interviewQuestions(appId) { return ok(await sb.from('interview_questions').select('*').eq('application_id', appId).order('created_at', { ascending: false })); },
      async generateQuestions(appId, round, focus) {
        const res = await callN8n(cfg.N8N_QUESTIONS_URL, { application_id: appId, round_no: round, focus: focus || '' });
        if (!res || res.ok === false || !res.set) throw new Error((res && res.message) || 'Could not write interview questions.');
        return res;
      },
      async deleteQuestions(id) { ok(await sb.from('interview_questions').delete().eq('id', id)); },
      async disconnectCal(memberId) {
        const res = await callN8n(cfg.CALCOM_CONNECT_URL, { member_id: memberId, action: 'disconnect' });
        if (!res || res.ok === false) throw new Error((res && res.message) || 'Could not disconnect Cal.com.');
        return res;
      },
      async createCalLink(jobId, round) {
        const res = await callN8n(cfg.CALCOM_CREATE_URL, { job_id: jobId, round: round || 1 });
        if (!res || res.ok === false) throw new Error((res && res.message) || 'Could not create the Cal.com link.');
        return res;
      },
      async job(id) {
        const [jr, rr] = await Promise.all([sb.from('jobs').select('*').eq('id', id).single(),
          sb.from('screening_rules').select('*').eq('job_id', id).eq('is_active', true).order('version', { ascending: false }).limit(1)]);
        const job = ok(jr), rules = ok(rr);
        return { ...job, rules: rules[0] || null };
      },
      async createJob(data) {
        const u = await this.me();
        return ok(await sb.from('jobs').insert({ ...data, created_by: u.id }).select().single());
      },
      async updateJob(id, data) { return ok(await sb.from('jobs').update(data).eq('id', id).select().single()); },
      async saveRules(jobId, rules) {
        const u = await this.me();
        const last = ok(await sb.from('screening_rules').select('version').eq('job_id', jobId)
          .order('version', { ascending: false }).limit(1));
        const version = (last[0]?.version || 0) + 1;
        ok(await sb.from('screening_rules').update({ is_active: false }).eq('job_id', jobId));
        return ok(await sb.from('screening_rules').insert({ job_id: jobId, version, ...rules, is_active: true, created_by: u.id }).select().single());
      },
      async rescreenJob(jobId) {
        const rows = ok(await sb.from('applications').update({ status: 'screening_queued' })
          .eq('job_id', jobId).in('stage_id', [1, 2]).select('id'));
        return rows.length;
      },

      async cards(jobId) {
        let q = sb.from('application_cards').select('*').order('created_at', { ascending: false });
        if (jobId) q = q.eq('job_id', jobId);
        return ok(await q).map(c => c.candidate_id && c.full_name !== c.file_name ? c : { ...c, full_name: String(c.full_name).replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' ') });
      },
      async application(id) {
        // All five reads run in parallel so the candidate drawer opens in one round trip
        const [appRes, scr, ivs, act, mails] = await Promise.all([
          sb.from('applications').select('*, jobs(id,title,client,rounds,cal_links,interview_scoring), candidates(*), resumes(id,file_name,storage_path,uploaded_at)').eq('id', id).single(),
          sb.from('ai_screenings').select('*').eq('application_id', id).order('created_at', { ascending: false }).limit(1),
          sb.from('interviews').select('*, interviewer:profiles!interviews_interviewer_id_fkey(full_name,email), member:team_members(full_name,email)').eq('application_id', id).order('scheduled_at'),
          sb.from('activity_log').select('*').eq('application_id', id).order('created_at', { ascending: false }),
          sb.from('email_log').select('*').eq('application_id', id).order('sent_at', { ascending: false })
        ]);
        const app = ok(appRes);
        return { ...app, screening: ok(scr)[0] || null, interviews: ok(ivs), activity: ok(act), emails: ok(mails) };
      },
      async resumeUrl(path) {
        const d = ok(await sb.storage.from('resumes').createSignedUrl(path, 600));
        return d.signedUrl;
      },
      async fileUrl(path) { return this.resumeUrl(path); },
      async resumeText(resumeId) { const r = ok(await sb.from('resumes').select('raw_text').eq('id', resumeId).maybeSingle()); return r?.raw_text || ''; },
      async moveStage(appId, stageId, reason) {
        const status = stageId === 7 ? 'rejected' : stageId === 6 ? 'hired' : 'active';
        ok(await sb.from('applications').update({ stage_id: stageId, status, rejection_reason: reason || null }).eq('id', appId));
      },
      async reject(appId, reason, notify) {
        await this.moveStage(appId, 7, reason);
        if (!notify) return {};
        try {
          const res = await callN8n(cfg.N8N_SEND_EMAIL_URL, { application_id: appId, template_key: 'rejection' });
          return res && res.ok === false ? { warning: res.message || 'The rejection email was not sent.' } : { emailed: true };
        } catch (e) { return { warning: e.message }; }
      },
      async rescreen(appId) { ok(await sb.from('applications').update({ status: 'screening_queued' }).eq('id', appId)); },
      async resendEmail(appId, logKey, interviewId) {
        const m = /^stage_(\d+)$/.exec(logKey);
        const body = m ? { application_id: appId, template_key: 'stage', extra: { stage_id: +m[1] } }
          : { application_id: appId, template_key: logKey, interview_id: interviewId || null };
        const res = await callN8n(cfg.N8N_SEND_EMAIL_URL, body);
        if (res && res.ok === false) throw new Error(res.message || 'The email was not sent.');
        return res;
      },
      async upload(jobId, file, raw_text) {
        const u = await this.me();
        const safe = file.name.replace(/[^\w.\-]+/g, '_');
        const path = `${jobId}/${crypto.randomUUID()}-${safe}`;
        ok(await sb.storage.from('resumes').upload(path, file, { contentType: file.type }));
        const resume = ok(await sb.from('resumes').insert({ storage_path: path, file_name: file.name, raw_text, uploaded_by: u.id }).select().single());
        return ok(await sb.from('applications').insert({ job_id: jobId, resume_id: resume.id, stage_id: 1, status: 'screening_queued' }).select().single());
      },

      async interviews() {
        return ok(await sb.from('interviews')
          .select('*, interviewer:profiles!interviews_interviewer_id_fkey(full_name,email), member:team_members(full_name,email), applications(id, job_id, jobs(title,client,rounds,interview_scoring), candidates(full_name,email,phone), resumes(file_name))')
          .order('scheduled_at'));
      },
      async schedule(iv, currentStage) {
        // The interview is saved first, so the stage move does not also send a "book a time" email
        const row = ok(await sb.from('interviews').insert(iv).select().single());
        if (currentStage !== iv.stage_id) await this.moveStage(iv.application_id, iv.stage_id);
        try {
          const res = await callN8n(cfg.N8N_SEND_EMAIL_URL, { application_id: iv.application_id, template_key: 'interview_invite', interview_id: row.id });
          if (res && res.ok === false) row.warning = res.message || 'The invite email was not sent.';
        } catch (e) { row.warning = e.message; }
        return row;
      },
      async scorecard(id, data) { ok(await sb.from('interviews').update({ ...data, status: 'completed' }).eq('id', id)); },

      async profiles() { return ok(await sb.from('profiles').select('*').order('full_name')); },
      async team() { return ok(await sb.from('team_members').select('*').order('full_name')); },
      async saveMember(m) {
        const { id, ...d } = m;
        return id ? ok(await sb.from('team_members').update(d).eq('id', id).select().single())
                  : ok(await sb.from('team_members').insert(d).select().single());
      },
      async setRole(id, role) { ok(await sb.from('profiles').update({ role }).eq('id', id)); },
      async senders() { return ok(await sb.from('email_senders').select('*').order('is_default', { ascending: false }).order('from_name')); },
      async saveSender(s) {
        const { id, ...d } = s;
        return id ? ok(await sb.from('email_senders').update(d).eq('id', id).select().single())
                  : ok(await sb.from('email_senders').insert(d).select().single());
      },
      async jobTemplates(jobId) { return ok(await sb.from('job_email_templates').select('*').eq('job_id', jobId)); },
      async saveJobTemplate(jobId, key, d) {
        return ok(await sb.from('job_email_templates').upsert({ job_id: jobId, key, ...d, updated_at: new Date().toISOString() }, { onConflict: 'job_id,key' }).select().single());
      },
      async resetJobTemplate(jobId, key) { ok(await sb.from('job_email_templates').delete().eq('job_id', jobId).eq('key', key)); },
      async interviewScores(appId) { return ok(await sb.from('interview_scores').select('*').eq('application_id', appId).order('created_at')); },
      async jobInterviewScores(jobId) { return ok(await sb.from('interview_scores').select('id,ratings,score').eq('job_id', jobId)); },
      async saveInterviewScore(r) {
        const { id, ...d } = r; d.updated_at = new Date().toISOString();
        return id ? ok(await sb.from('interview_scores').update(d).eq('id', id).select().single())
                  : ok(await sb.from('interview_scores').insert(d).select().single());
      },
      async deleteInterviewScore(id) { ok(await sb.from('interview_scores').delete().eq('id', id)); },
      async templates() { return ok(await sb.from('email_templates').select('*').order('sort').order('key')); },
      async saveTemplate(key, subject, body, enabled) {
        const d = { updated_at: new Date().toISOString() };
        if (subject != null) d.subject = subject;
        if (body != null) d.body = body;
        if (typeof enabled === 'boolean') d.enabled = enabled;
        ok(await sb.from('email_templates').update(d).eq('key', key));
      },
      async settings() { return ok(await sb.from('app_settings').select('*').order('key')); },
      async saveSetting(key, value) { ok(await sb.from('app_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)); },

      subscribe(cb) {
        liveSubs.add(cb);
        if (!liveCh) liveCh = sb.channel('ats-live')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, p => liveSubs.forEach(f => { try { f(p); } catch (e) { console.error(e); } }))
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_screenings' }, p => liveSubs.forEach(f => { try { f(p); } catch (e) { console.error(e); } }))
          .subscribe();
        return () => { liveSubs.delete(cb); };
      },

      /* careers page */
      async openJobs() { return ok(await sb.from('jobs').select('id,title,department,location,employment_type,jd_text,created_at').eq('status', 'open').order('created_at', { ascending: false })); },
      async apply(payload) {
        if (!cfg.N8N_APPLY_URL) throw new Error('Applications are not open yet. Please try again later.');
        const r = await fetch(cfg.N8N_APPLY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const res = await r.json().catch(() => ({}));
        if (!r.ok || res.ok === false) throw new Error(res.message || 'Something went wrong. Please try again.');
        return res;
      }
    };
  }

  /* ───────────── Demo back end ───────────── */
  function DemoApi() {
    const now = Date.now(), day = 864e5;
    const iso = t => new Date(t).toISOString();
    let seq = 1000; const id = p => `${p}-${++seq}`;
    const listeners = new Set(); const emit = () => listeners.forEach(f => f());

    const people = [
      { id: 'u1', full_name: 'Jay Khunt', email: 'jay@drg.example', role: 'admin' },
      { id: 'u2', full_name: 'Ananya Rao', email: 'ananya@drg.example', role: 'recruiter' },
      { id: 'u3', full_name: 'Vikram Bhatt', email: 'vikram@drg.example', role: 'hiring_manager' },
      { id: 'u4', full_name: 'Meera Iyer', email: 'meera@drg.example', role: 'interviewer' },
      { id: 'u5', full_name: 'Rohan Desai', email: 'rohan@drg.example', role: 'interviewer' }
    ];
    const sdrRules = {
      disqualifiers: [
        { id: 'd1', rule: 'At least 2 years of B2B sales or SDR experience' },
        { id: 'd2', rule: 'Has used a CRM such as HubSpot or Salesforce' }
      ],
      factors: [
        { id: 'f1', name: 'Outbound prospecting and cold calling', weight: 35, guidance: '10 = daily cold calling with numbers' },
        { id: 'f2', name: 'Quota or target attainment', weight: 25, guidance: '10 = exceeded quota with figures' },
        { id: 'f3', name: 'Relevant industry (SaaS, agency)', weight: 20, guidance: '' },
        { id: 'f4', name: 'Clarity of written communication', weight: 20, guidance: '' }
      ], pass_score: 70, review_score: 50
    };
    const genericRules = (a, b, c, d) => ({
      disqualifiers: [{ id: 'd1', rule: a }],
      factors: [
        { id: 'f1', name: b, weight: 40, guidance: '' }, { id: 'f2', name: c, weight: 35, guidance: '' },
        { id: 'f3', name: d, weight: 25, guidance: '' }
      ], pass_score: 70, review_score: 50
    });
    const jobs = [
      { id: 'j1', title: 'Sales Development Representative', department: 'Sales', location: 'Ahmedabad · Hybrid', employment_type: 'Full-time', status: 'open', openings: 2, hiring_manager_id: 'u3', created_at: iso(now - 21 * day),
        jd_text: 'We are hiring an SDR to open conversations with B2B decision makers for our clients.\n\nWhat you will do\n• Run outbound calls, email and LinkedIn sequences\n• Book qualified meetings for Account Executives\n• Keep HubSpot clean and up to date\n\nWhat you bring\n• 2+ years in B2B sales or SDR roles\n• Comfort with daily cold calling\n• Clear written English', rules: { id: 'r1', version: 3, ...sdrRules }, interview_scoring: { criteria: [{ key: 'attitude', name: 'Attitude', hint: 'Energy, ownership and how they handle pushback', weight: 2, min: 3 }, { key: 'experience_with_plays', name: 'Experience with plays', hint: 'How they have built and run outbound plays', weight: 2, min: 0 }, { key: 'signal_detection', name: 'Signal detection', hint: 'Spotting buying signals and acting on them', weight: 1, min: 0 }], mode: 'weighted', formula: '', hire: 70, maybe: 50 } },
      { id: 'j2', title: 'Account Executive', department: 'Sales', location: 'Remote · India', employment_type: 'Full-time', status: 'open', openings: 1, hiring_manager_id: 'u3', created_at: iso(now - 14 * day),
        jd_text: 'Own the full sales cycle for mid-market SaaS deals, from discovery to close.', rules: { id: 'r2', version: 1, ...genericRules('3+ years closing B2B deals', 'Closing record with numbers', 'Mid-market SaaS experience', 'Discovery and demo skills') } },
      { id: 'j3', title: 'Marketing Operations Specialist', department: 'Marketing', location: 'Ahmedabad', employment_type: 'Full-time', status: 'open', openings: 1, hiring_manager_id: 'u3', created_at: iso(now - 9 * day),
        jd_text: 'Run our marketing automation, reporting and campaign operations in HubSpot.', rules: { id: 'r3', version: 1, ...genericRules('Hands-on HubSpot or Marketo experience', 'Marketing automation builds', 'Reporting and dashboards', 'Campaign operations') } },
      { id: 'j4', title: 'Customer Success Manager', department: 'Client Services', location: 'Remote · India', employment_type: 'Full-time', status: 'draft', openings: 1, hiring_manager_id: 'u3', created_at: iso(now - 2 * day),
        jd_text: 'Look after a portfolio of agency clients and grow their accounts.', rules: null }
    ];
    const names = ['Aarav Mehta', 'Diya Shah', 'Kabir Nair', 'Isha Kulkarni', 'Arjun Patel', 'Sara Fernandes', 'Vivaan Joshi', 'Ananya Pillai', 'Reyansh Gupta', 'Myra Kapoor', 'Advait Reddy', 'Kiara Sinha', 'Neel Trivedi', 'Tara Menon', 'Yash Agarwal', 'Zoya Qureshi', 'Krish Bansal', 'Riya Chatterjee', 'Dev Malhotra', 'Aditi Verma', 'Om Shetty', 'Nisha Rawat'];
    const plan = [ // job, stage, score, verdict
      ['j1', 1, null, null], ['j1', 2, 86, 'pass'], ['j1', 2, 74, 'pass'], ['j1', 2, 62, 'review'], ['j1', 2, 41, 'low_fit'], ['j1', 2, 58, 'disqualified'],
      ['j1', 3, 81, 'pass'], ['j1', 3, 77, 'pass'], ['j1', 4, 90, 'pass'], ['j1', 5, 88, 'pass'], ['j1', 7, 35, 'low_fit'],
      ['j2', 2, 79, 'pass'], ['j2', 2, 55, 'review'], ['j2', 3, 84, 'pass'], ['j2', 1, null, null], ['j2', 7, 48, 'disqualified'],
      ['j3', 2, 72, 'pass'], ['j3', 2, 66, 'review'], ['j3', 3, 80, 'pass'], ['j3', 6, 92, 'pass'], ['j3', 1, null, null], ['j1', 2, 69, 'review']
    ];
    const reasons = {
      pass: ['Two years of daily cold calling with 60+ dials a day and clear meeting numbers.', 'Exceeded quota in 5 of 6 quarters; figures given.', 'SaaS and agency background matches the role.', 'Resume is concise and well written.'],
      review: ['Some outbound work, but mostly inbound follow-up.', 'Mentions targets but gives no figures.', 'Adjacent industry (fintech).', 'Clear, though long.'],
      low_fit: ['Little evidence of outbound prospecting.', 'No targets mentioned.', 'Retail background.', 'Several unclear sections.']
    };
    const candidates = [], applications = [], screenings = [], resumes = [], activity = [], emails = [], interviews = []; const iscores = []; const qsets = [];
    plan.forEach(([jobId, stage, score, verdict], i) => {
      const n = names[i]; const created = now - (20 - i * 0.8) * day;
      const cid = `c${i}`, aid = `a${i}`, rid = `rs${i}`;
      const email = n.toLowerCase().replace(/[^a-z]+/g, '.') + '@mail.example';
      candidates.push({ id: cid, _name: n, full_name: score == null ? null : n, email: score == null ? null : email, phone: '+91 98' + String(10000000 + i * 734521).slice(0, 8),
        location: ['Ahmedabad', 'Pune', 'Bengaluru', 'Mumbai', 'Surat'][i % 5], linkedin_url: 'https://linkedin.com/in/example',
        source: i % 3 === 0 ? 'careers_page' : 'upload', total_exp_years: score == null ? null : 1 + (i * 7) % 6,
        skills: ['HubSpot', 'Cold calling', 'Outbound', 'Salesforce', 'LinkedIn Sales Navigator', 'Apollo'].slice(0, 2 + i % 4),
        work_history: [{ company: ['Acme SaaS', 'Northwind Agency', 'BrightLeads', 'Zenith Tech'][i % 4], title: 'SDR', start: '2022', end: 'Present', summary: 'Outbound prospecting for US mid-market.' },
          { company: 'Globex Services', title: 'Sales Associate', start: '2020', end: '2022', summary: 'Inside sales and lead qualification.' }],
        education: [{ institution: 'Gujarat University', degree: 'BBA', year: '2020' }] });
      const fileName = n.split(' ')[0] + '_' + n.split(' ')[1] + '_Resume.pdf';
      resumes.push({ id: rid, file_name: fileName, storage_path: `demo/${fileName}`, uploaded_at: iso(created) });
      const status = score == null ? 'screening' : stage === 7 ? 'rejected' : stage === 6 ? 'hired' : stage > 2 ? 'active' : 'screened';
      applications.push({ id: aid, job_id: jobId, candidate_id: cid, resume_id: rid, stage_id: stage, status, created_at: iso(created), updated_at: iso(created + day),
        rejection_reason: stage === 7 ? 'Does not meet the must-have experience' : null });
      activity.push({ id: id('act'), application_id: aid, action: 'applied', to_stage: 1, created_at: iso(created) });
      if (score != null) {
        const job = jobs.find(j => j.id === jobId); const r = job.rules;
        const band = verdict === 'pass' ? 'pass' : verdict === 'low_fit' ? 'low_fit' : 'review';
        const fs = r.factors.map((f, k) => ({ id: f.id, name: f.name, weight: f.weight, rating: Math.max(1, Math.min(10, Math.round(score / 10 + ((k + i) % 3) - 1))), reason: reasons[band][k % 4] }));
        score = Math.round(fs.reduce((t, f) => t + f.weight * f.rating / 10, 0));
        if (verdict !== 'disqualified') verdict = score >= r.pass_score ? 'pass' : score >= r.review_score ? 'review' : 'low_fit';
        const dq = r.disqualifiers.map((d, k) => ({ id: d.id, rule: d.rule,
          result: verdict === 'disqualified' && k === 0 ? 'not_met' : verdict === 'review' && k === 1 && i % 2 ? 'unclear' : 'met',
          evidence: verdict === 'disqualified' && k === 0 ? 'Total sales experience is 14 months (Jan 2024 to Feb 2025).' : k === 0 ? '3 years as SDR at Acme SaaS (2022 to present).' : 'Lists "HubSpot (daily use)" under tools.' }));
        screenings.push({ id: id('s'), application_id: aid, rules_id: r.id, score, verdict, factor_scores: fs, disqualifier_results: dq,
          summary: verdict === 'pass' ? `${n.split(' ')[0]} has strong outbound experience with clear numbers and the CRM skills the role needs. A good fit for a first-round call.`
            : verdict === 'disqualified' ? `Promising communication, but sales experience falls short of the 2-year must-have.`
            : verdict === 'review' ? `Relevant background, but the resume leaves key questions open. Worth a quick recruiter look.`
            : `Limited evidence of outbound sales; the background is mostly in other areas.`,
          model: 'gpt-4o-mini', tokens_used: 3100 + i * 37, created_at: iso(created + 60e3) });
        activity.push({ id: id('act'), application_id: aid, action: 'screened', note: `AI score ${score}`, created_at: iso(created + 60e3) });
        emails.push({ id: id('e'), application_id: aid, template_key: 'received', to_email: email, subject: `We received your application for ${job.title}`, status: 'sent', sent_at: iso(created + 62e3) });
      }
      if (stage >= 3 && stage !== 7) activity.push({ id: id('act'), application_id: aid, action: 'stage_changed', from_stage: 2, to_stage: stage, created_at: iso(created + 2 * day) });
    });
    // interviews: upcoming and done
    const at = (d, h, m) => { const x = new Date(now + d * day); x.setHours(h, m, 0, 0); return iso(x); };
    [['a6', 3, 'u4', at(0, 15, 30), 'scheduled'], ['a7', 3, 'u5', at(1, 11, 0), 'scheduled'], ['a8', 4, 'u3', at(1, 16, 0), 'scheduled'],
     ['a13', 3, 'u4', at(2, 12, 0), 'scheduled'], ['a18', 3, 'u5', at(3, 10, 30), 'scheduled'], ['a8', 3, 'u4', at(-3, 14, 0), 'completed'], ['a9', 4, 'u3', at(-2, 17, 0), 'completed']]
      .forEach(([aid, st, who, when, status]) => interviews.push({ id: id('iv'), application_id: aid, stage_id: st, interviewer_id: who, scheduled_at: when, duration_min: 45,
        meeting_link: 'https://meet.google.com/abc-defg-hij', status, rating: status === 'completed' ? 4 : null, recommendation: status === 'completed' ? 'yes' : null,
        feedback: status === 'completed' ? 'Confident on the phone, handled objections well. Good fit for the team.' : null, created_at: iso(now - 4 * day) }));
    const templates = [
      { key: 'manual_screened', subject: 'Your application for {{job_title}}', body: 'Hi {{candidate_name}},\n\nThanks for applying. We have reviewed your profile and will be in touch about next steps shortly.\n\n{{sender_name}}', enabled: true },
      { key: 'round_1', subject: 'Book your {{round_name}} for {{job_title}}', body: 'Hi {{candidate_name}},\n\nGood news: we would like to meet you. Please pick a time that suits you:\n{{booking_link}}\n\n{{sender_name}}', enabled: true },
      { key: 'received', subject: 'We received your application for {{job_title}}', body: 'Hi {{candidate_name}},\n\nThank you for applying for the {{job_title}} role at DRG. Our team is reviewing your application and will be in touch soon.\n\nBest regards,\nDRG Talent Team' },
      { key: 'interview_invite', subject: 'Interview for {{job_title}} on {{interview_time}}', body: 'Hi {{candidate_name}},\n\nWe would like to invite you to an interview for the {{job_title}} role on {{interview_time}} (IST).\n\nJoin here: {{meeting_link}}\n\nBest regards,\nDRG Talent Team' },
      { key: 'rejection', subject: 'Your application for {{job_title}}', body: 'Hi {{candidate_name}},\n\nThank you for your interest in the {{job_title}} role at DRG. After careful review, we have decided to move forward with other candidates.\n\nWe wish you the very best.\n\nDRG Talent Team' },
      { key: 'offer', subject: 'Your offer for {{job_title}} at DRG', body: 'Hi {{candidate_name}},\n\nWe are delighted to offer you the {{job_title}} role at DRG. Your offer details will follow shortly.\n\nWelcome aboard,\nDRG Talent Team' }
    ];
    const settings = [
      { key: 'n8n_new_application_url', value: 'https://automation.drg.example/webhook/ats/new-application', description: 'n8n Workflow 1 webhook URL' },
      { key: 'n8n_webhook_secret', value: '••••••••••••', description: 'Shared secret sent as x-ats-secret to n8n' }
    ];
    const team = people.slice(0, 4).map((p, k) => ({ id: 'tm-' + p.id, cal_account: k < 2 ? 'demo' : null, full_name: p.full_name, email: p.email, title: p.role.replace('_', ' '), timezone: 'Asia/Kolkata',
      meeting_link: 'https://meet.google.com/abc-defg-hij', booking_url: null, active: true, availability: { slot: 30, days: { 1: [['10:00', '18:00']], 2: [['10:00', '18:00']], 3: [['10:00', '18:00']], 4: [['10:00', '18:00']], 5: [['10:00', '18:00']] } } }));
    const senders = [{ id: 'snd-default', from_name: 'DRG Talent Team', from_email: null, reply_to: null, is_default: true, active: true }];
    const jobTpls = [];
    let signedIn = true;
    const wait = (ms = 120) => new Promise(r => setTimeout(r, ms));
    const cardOf = a => {
      const c = candidates.find(x => x.id === a.candidate_id) || {}; const r = resumes.find(x => x.id === a.resume_id) || {};
      const s = screenings.filter(x => x.application_id === a.id).sort((p, q) => q.created_at.localeCompare(p.created_at))[0] || {};
      return { id: a.id, job_id: a.job_id, stage_id: a.stage_id, status: a.status, created_at: a.created_at, updated_at: a.updated_at, candidate_id: a.candidate_id,
        full_name: c.full_name || (r.file_name || 'New applicant').replace(/\.(pdf|docx)$/i, '').replace(/[_-]+/g, ' '), email: c.email, total_exp_years: c.total_exp_years, source: c.source, file_name: r.file_name,
        score: s.score ?? null, verdict: s.verdict ?? null, summary: s.summary ?? null,
        ...(() => { const xs = iscores.filter(x => x.application_id === a.id && x.score != null); return xs.length ? { iscore: Math.round(xs.reduce((t, x) => t + +x.score, 0) / xs.length), iscore_n: xs.length } : {}; })(),
        ...(() => { const iv = interviews.filter(i => i.application_id === a.id && i.status === 'scheduled' && i.stage_id === a.stage_id).sort((p, q) => p.scheduled_at.localeCompare(q.scheduled_at))[0];
          return iv ? { interview_at: iv.scheduled_at, interview_stage: iv.stage_id, interviewer_name: (people.find(p => p.id === iv.interviewer_id) || {}).full_name || null } : {}; })() };
    };
    function fakeScreen(a) {
      setTimeout(() => {
        const job = jobs.find(j => j.id === a.job_id); const r = job.rules; const c = candidates.find(x => x.id === a.candidate_id);
        const score = 52 + Math.floor(Math.random() * 40); const verdict = score >= (r?.pass_score || 70) ? 'pass' : 'review';
        const nm = c._name || names[Math.floor(Math.random() * names.length)];
        Object.assign(c, { full_name: nm, email: nm.toLowerCase().replace(/[^a-z]+/g, '.') + '@mail.example', total_exp_years: 2 + Math.floor(Math.random() * 4) });
        screenings.push({ id: id('s'), application_id: a.id, rules_id: r?.id, score, verdict,
          factor_scores: (r?.factors || []).map(f => ({ ...f, rating: Math.round(score / 10), reason: 'Relevant experience described with specific examples.' })),
          disqualifier_results: (r?.disqualifiers || []).map(d => ({ ...d, result: 'met', evidence: 'Stated clearly in the work history.' })),
          summary: 'Solid background for the role with relevant tools and measurable results.', model: 'gpt-4o-mini', tokens_used: 3200, created_at: iso(Date.now()) });
        a.status = 'screened'; a.stage_id = 2; emit();
      }, 2600 + Math.random() * 1500);
    }

    applications.filter(a => a.status === 'screening').forEach(fakeScreen);

    return {
      mode: 'demo',
      async session() { return signedIn ? { user: { id: 'u1' } } : null; },
      async signIn() { signedIn = true; }, async magicLink() { signedIn = true; },
      async signOut() { signedIn = false; }, onAuth() {},
      async me() { return signedIn ? people[0] : null; },
      async stages() { return STAGES; },
      async jobs() {
        await wait();
        return jobs.map(j => { const mine = applications.filter(a => a.job_id === j.id); const byStage = {};
          mine.forEach(a => byStage[a.stage_id] = (byStage[a.stage_id] || 0) + 1); return { ...j, total: mine.length, byStage }; });
      },
      async job(jid) { await wait(); const j = jobs.find(x => x.id === jid); return { ...j, rules: j.rules ? { ...j.rules } : null }; },
      async createJob(d) { const j = { id: id('j'), status: 'draft', openings: 1, created_at: iso(Date.now()), rules: null, ...d }; jobs.unshift(j); return j; },
      async updateJob(jid, d) { Object.assign(jobs.find(x => x.id === jid), d); },
      async saveRules(jid, r) { const j = jobs.find(x => x.id === jid); j.rules = { id: id('r'), version: (j.rules?.version || 0) + 1, ...r }; return j.rules; },
      async rescreenJob(jid) { const list = applications.filter(a => a.job_id === jid && a.stage_id <= 2); list.forEach(a => { a.status = 'screening'; fakeScreen(a); }); emit(); return list.length; },
      async cards(jid) { await wait(); return applications.filter(a => !jid || a.job_id === jid).map(cardOf).sort((p, q) => q.created_at.localeCompare(p.created_at)); },
      async application(aid) {
        await wait();
        const a = applications.find(x => x.id === aid); const job = jobs.find(j => j.id === a.job_id);
        return { ...a, jobs: { id: job.id, title: job.title, client: job.client, rounds: job.rounds, cal_links: job.cal_links, interview_scoring: job.interview_scoring }, candidates: candidates.find(c => c.id === a.candidate_id), resumes: resumes.find(r => r.id === a.resume_id),
          screening: screenings.filter(s => s.application_id === aid).sort((p, q) => q.created_at.localeCompare(p.created_at))[0] || null,
          interviews: interviews.filter(i => i.application_id === aid).map(i => ({ ...i, interviewer: people.find(p => p.id === i.interviewer_id) })),
          activity: activity.filter(x => x.application_id === aid).sort((p, q) => q.created_at.localeCompare(p.created_at)),
          emails: emails.filter(e => e.application_id === aid) };
      },
      async resumeUrl() { return null; },
      async moveStage(aid, st, reason) {
        const a = applications.find(x => x.id === aid);
        activity.push({ id: id('act'), application_id: aid, action: 'stage_changed', from_stage: a.stage_id, to_stage: st, note: reason || null, created_at: iso(Date.now()) });
        Object.assign(a, { stage_id: st, status: st === 7 ? 'rejected' : st === 6 ? 'hired' : 'active', rejection_reason: reason || null, updated_at: iso(Date.now()) }); emit();
      },
      async reject(aid, reason, notify) {
        await this.moveStage(aid, 7, reason);
        if (notify) { const c = candidates.find(x => x.id === applications.find(a => a.id === aid).candidate_id); emails.push({ id: id('e'), application_id: aid, template_key: 'rejection', to_email: c?.email, subject: 'Your application', status: 'sent', sent_at: iso(Date.now()) }); }
      },
      async rescreen(aid) { const a = applications.find(x => x.id === aid); a.status = 'screening'; emit(); fakeScreen(a); },
      async resendEmail() { await wait(400); return { ok: true }; },
      async upload(jid, file) {
        await wait(500 + Math.random() * 600);
        const c = { id: id('c'), full_name: null, email: null, source: 'upload', skills: [], work_history: [], education: [] };
        const r = { id: id('rs'), file_name: file.name, storage_path: 'demo/' + file.name, uploaded_at: iso(Date.now()) };
        const a = { id: id('a'), job_id: jid, candidate_id: c.id, resume_id: r.id, stage_id: 1, status: 'screening', created_at: iso(Date.now()), updated_at: iso(Date.now()) };
        candidates.push(c); resumes.push(r); applications.push(a);
        activity.push({ id: id('act'), application_id: a.id, action: 'applied', to_stage: 1, created_at: iso(Date.now()) });
        emit(); fakeScreen(a); return a;
      },
      async interviews() {
        await wait();
        return interviews.map(i => { const a = applications.find(x => x.id === i.application_id); const c = candidates.find(x => x.id === a.candidate_id);
          return { ...i, interviewer: people.find(p => p.id === i.interviewer_id), applications: { id: a.id, job_id: a.job_id, jobs: (({ title, client, rounds, interview_scoring }) => ({ title, client, rounds, interview_scoring }))(jobs.find(j => j.id === a.job_id)), candidates: c, resumes: resumes.find(r => r.id === a.resume_id) } }; })
          .sort((p, q) => p.scheduled_at.localeCompare(q.scheduled_at));
      },
      async schedule(iv, currentStage) {
        const row = { id: id('iv'), status: 'scheduled', meeting_link: 'https://meet.google.com/new-demo-link', created_at: iso(Date.now()), ...iv };
        row.member = team.find(t => t.id === iv.team_member_id);
        interviews.push(row); if (currentStage !== iv.stage_id) await this.moveStage(iv.application_id, iv.stage_id);
        emails.push({ id: id('e'), application_id: iv.application_id, template_key: 'interview_invite', status: 'sent', subject: 'Interview invite', sent_at: iso(Date.now()) });
        return row;
      },
      async scorecard(ivid, d) { Object.assign(interviews.find(i => i.id === ivid), d, { status: 'completed' }); emit(); },
      async profiles() { return people; },
      async team() { return team; },
      async interviewQuestions(aid) { return qsets.filter(x => x.application_id === aid).sort((p, q) => q.created_at.localeCompare(p.created_at)); },
      async generateQuestions(aid, round, focus) { await wait(); await wait();
        const items = [['General', 'Walk me through your current role and what a typical week of outbound looks like.', 'Warms up and checks how they describe their own work.', 'Clear daily activity numbers and the tools they use.', 'Which part of that week do you enjoy most?'],
          ['Attitude', 'Tell me about a time a prospect pushed back hard. What did you do next?', 'Checks resilience and ownership.', 'Stays calm, gets curious, turns the objection into a next step.', 'What would you do differently now?'],
          ['Experience with plays', 'Your resume says you booked meetings for US mid-market. Walk me through one outbound play you built end to end.', 'Checks that they can design a play, not just follow one.', 'Target list, trigger, message, channel mix and results with numbers.', 'How did you decide when to stop the play?'],
          ['Signal detection', 'How do you spot that an account is ready to talk? Give me a recent example.', 'Checks how they read buying signals.', 'Concrete signals (hiring, funding, tech changes) and how fast they acted on them.', 'Which signal turned out to be a false alarm?']]
          .map(([area, question, why, look_for, follow_up]) => ({ area, question, why, look_for, follow_up }));
        const set = { id: id('iq'), application_id: aid, round_no: round, focus: focus || null, questions: { intro: 'Find out whether they can build outbound plays and read buying signals, not just run a sequence.', items }, model: 'demo', created_by: people[0].id, created_by_name: people[0].full_name, created_at: new Date().toISOString() };
        qsets.push(set); return { ok: true, message: items.length + ' questions ready', set }; },
      async deleteQuestions(qid) { const i = qsets.findIndex(x => x.id === qid); if (i >= 0) qsets.splice(i, 1); },
      async connectCal(mid, key) { const t = team.find(x => x.id === mid); Object.assign(t, { cal_key_id: 'demo', cal_username: 'demo-' + t.full_name.split(' ')[0].toLowerCase(), cal_account: t.cal_account || 'demo', cal_connected_at: iso(Date.now()) }); return { ok: true, message: 'Connected (demo)', webhook: true }; },
      async disconnectCal(mid) { Object.assign(team.find(x => x.id === mid), { cal_key_id: null, cal_account: null, cal_connected_at: null }); return { ok: true, message: 'Disconnected (demo)' }; },
      async createCalLink(jobId, round) { await new Promise(r => setTimeout(r, 400)); return { ok: true, booking_url: `https://cal.com/demo/drg-${jobId}-r${round}-interview`, event_type_id: 1, account: 'demo', message: 'Demo link' }; },
      async saveMember(m) { if (m.id) { Object.assign(team.find(t => t.id === m.id), m); return m; } const t = { id: id('tm'), active: true, ...m }; team.push(t); return t; },
      async fileUrl() { return null; },
      async resumeText() { return 'Sample resume text (demo).\n\nExperience\n- 3 years as an SDR at Acme SaaS\n- HubSpot, Apollo, Clay'; },
      async setRole(uid, role) { people.find(p => p.id === uid).role = role; },
      async templates() { return templates; },
      async senders() { return senders; },
      async saveSender(s) { if (s.id) { const x = senders.find(y => y.id === s.id); Object.assign(x, s); return x; } const x = { id: id('snd'), active: true, is_default: false, ...s }; senders.push(x); return x; },
      async jobTemplates(jobId) { return jobTpls.filter(t => t.job_id === jobId); },
      async saveJobTemplate(jobId, key, dd) { let t = jobTpls.find(x => x.job_id === jobId && x.key === key); if (!t) { t = { job_id: jobId, key }; jobTpls.push(t); } Object.assign(t, dd); return t; },
      async resetJobTemplate(jobId, key) { const i = jobTpls.findIndex(x => x.job_id === jobId && x.key === key); if (i >= 0) jobTpls.splice(i, 1); },
      async interviewScores(aid) { return iscores.filter(x => x.application_id === aid); },
      async jobInterviewScores(jid) { return iscores.filter(x => x.job_id === jid); },
      async saveInterviewScore(r) { let x = r.id && iscores.find(y => y.id === r.id); if (!x) { x = { id: id('isc'), scored_by: people[0].id, created_at: new Date().toISOString() }; iscores.push(x); } Object.assign(x, r, { updated_at: new Date().toISOString() }); emit(); return x; },
      async deleteInterviewScore(sid) { const i = iscores.findIndex(x => x.id === sid); if (i >= 0) iscores.splice(i, 1); emit(); },
      async saveTemplate(key, subject, body, enabled) { const t = templates.find(x => x.key === key); if (subject != null) t.subject = subject; if (body != null) t.body = body; if (typeof enabled === 'boolean') t.enabled = enabled; },
      async settings() { return settings; },
      async saveSetting(key, value) { settings.find(s => s.key === key).value = value; },
      subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); },
      async openJobs() { return jobs.filter(j => j.status === 'open'); },
      async apply() { await wait(900); return { ok: true }; }
    };
  }

  const cfg = window.ATS_CONFIG || {};
  const demo = /[?&]demo\b/.test(location.search) || !cfg.SUPABASE_URL || !window.supabase;
  // Speed: reuse the team, sender and template lists for 60 seconds, and share one request when several parts of a page ask at once.
  // Any change made in the app (saving a person, sender, template, role or Cal.com connection) clears the cache straight away.
  function withCache(api) {
    const TTL = 60000, store = {};
    const cached = (name, fn) => async (...args) => {
      const k = name + JSON.stringify(args), hit = store[k];
      if (hit && Date.now() - hit.t < TTL) return hit.p;
      const p = fn.apply(api, args); store[k] = { t: Date.now(), p };
      p.catch(() => { delete store[k]; }); return p;
    };
    const clear = () => Object.keys(store).forEach(k => delete store[k]);
    ['team', 'senders', 'templates', 'profiles'].forEach(n => { if (typeof api[n] === 'function') api[n] = cached(n, api[n]); });
    Object.keys(api).forEach(n => {
      if (typeof api[n] !== 'function' || !/^(save|delete|reset|set[A-Z]|connect|disconnect|create|update|invite|remove)/.test(n)) return;
      const f = api[n]; api[n] = async (...args) => { try { return await f.apply(api, args); } finally { clear(); } };
    });
    api.clearCache = clear;
    window.addEventListener('focus', clear);
    return api;
  }
  window.ATS = { STAGES, ROUND_STAGE, STAGE_ROUND, api: demo ? DemoApi() : withCache(LiveApi(cfg)) };
})();
