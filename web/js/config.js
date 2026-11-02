// DRG ATS · configuration
// The anon key is public by design; row-level security in Supabase protects the data.
// Never put the service_role key or the OpenAI key in this file.
(function () {
  // When the app is served by n8n (…/webhook/ats/app) the workflow webhooks live on the same host
  const onN8n = /\/webhook(-test)?\//.test(location.pathname);
  const N8N = onN8n ? location.origin : 'https://n8n-bkfvq-u78038.vm.elestio.app';
  const hook = p => `${N8N}/webhook/${p}`;
  window.ATS_CONFIG = {
    SUPABASE_URL: 'https://pdjxpiadgoaxfzexmcpi.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkanhwaWFkZ29heGZ6ZXhtY3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMjAxMjksImV4cCI6MjEwNjg5NjEyOX0.ZisHgJUj-vDIxEyJ2r6_BvZQZIsbXmEze0pHVdpKjmg',
    // If you host the app elsewhere (e.g. Netlify), put your n8n webhook URLs here
    N8N_SEND_EMAIL_URL: hook('ats/send-email'), // Workflow 4
    N8N_APPLY_URL: hook('ats/apply'),           // Workflow 3
    N8N_BOOKING_URL: hook('ats/booking'),       // Workflow 11 · free times (GET ?token=)
    N8N_BOOK_URL: hook('ats/book'),             // Workflow 11 · book a time (POST)
    CALCOM_CREATE_URL: hook('ats/calcom-create-link-test'), // Workflow 15 · creates a round's Cal.com link
    CALCOM_CONNECT_URL: hook('ats/calcom-connect'),        // Workflow 16 · connects an interviewer's Cal.com
    CAREERS_URL: 'https://careers.dollarrevenuegroup.com' // public careers site
  };
  // Staging branch deploys (staging--drg-ats.netlify.app) and local copies show a label so nobody mistakes them for the live site.
  // They use the same database and workflows as the live site, so test candidates and emails are real.
  const h = location.hostname;
  window.ATS_ENV = /^staging--/.test(h) ? 'staging' : /^(localhost|127\.0\.0\.1)$/.test(h) ? 'local' : 'live';
  if (window.ATS_ENV !== 'live') document.addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('div');
    b.textContent = (window.ATS_ENV === 'staging' ? 'STAGING' : 'LOCAL TEST') + ' · not the live site · real data';
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:10px;z-index:9999;background:#D9E021;color:#191919;font:700 12px/1 system-ui;padding:8px 14px;border-radius:20px;letter-spacing:.06em;pointer-events:none';
    document.body.append(b);
  });
})();
