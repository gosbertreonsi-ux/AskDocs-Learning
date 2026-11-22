/** Read-only local security smoke checks; optional existing test accounts. */
const base = process.env.ASKDOCS_BASE_URL ?? 'http://127.0.0.1:3000';
const url = new URL(base);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') {
  console.error('STOP: This lesson only tests local HTTP AskDocs, never a public deployment.');
  process.exit(2);
}

let failed = 0;
let skipped = 0;
function report(name, ok, actual) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} (${actual})`);
  if (!ok) failed++;
}
async function request(path, options = {}) {
  return fetch(new URL(path, base), { redirect: 'manual', ...options });
}

try {
  const home = await request('/login');
  report('Login page accessible', home.status === 200, home.status);
  report('Content-type sniffing disabled', home.headers.get('x-content-type-options') === 'nosniff', home.headers.get('x-content-type-options') ?? 'missing');
  report('Frame embedding prohibited', home.headers.get('x-frame-options') === 'DENY', home.headers.get('x-frame-options') ?? 'missing');

  for (const path of ['/api/auth/me', '/api/messages', '/api/documents']) {
    const res = await request(path);
    report(`${path} denies anonymous access`, res.status === 401, res.status);
  }
  const wrongOrigin = await request('/api/messages', {
    method: 'POST',
    headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Hello' }),
  });
  report('Cross-origin mutation blocked', wrongOrigin.status === 403, wrongOrigin.status);

  // OPTIONAL: provide two *existing, disposable local test accounts* in env.
  // This does not register users or modify any documents.
  const aEmail = process.env.ASKDOCS_TEST_EMAIL_A;
  const aPassword = process.env.ASKDOCS_TEST_PASSWORD_A;
  const bEmail = process.env.ASKDOCS_TEST_EMAIL_B;
  const bPassword = process.env.ASKDOCS_TEST_PASSWORD_B;
  if (aEmail && aPassword && bEmail && bPassword) {
    async function login(email, password) {
      const res = await request('/api/auth/login', {
        method: 'POST',
        headers: { Origin: base, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.status !== 200) throw new Error(`Test account login returned ${res.status}`);
      const cookie = res.headers.get('set-cookie')?.split(';')[0];
      if (!cookie?.startsWith('askdocs_auth=')) throw new Error('Missing secure session cookie');
      return cookie;
    }
    const cookieA = await login(aEmail, aPassword);
    const cookieB = await login(bEmail, bPassword);
    const docsA = await request('/api/documents', { headers: { Cookie: cookieA } });
    const docsB = await request('/api/documents', { headers: { Cookie: cookieB } });
    report('Both accounts can access own document lists', docsA.status === 200 && docsB.status === 200, `${docsA.status}/${docsB.status}`);
    if (docsA.ok && docsB.ok) {
      const listA = await docsA.json();
      const listB = await docsB.json();
      const first = Array.isArray(listA) ? listA.find(d => typeof d.id === 'string') : null;
      if (first) {
        report('B cannot list A document', !listB.some(d => d.id === first.id), 'cross-account listing');
        const forbiddenDoc = await request(`/documents/${encodeURIComponent(first.id)}`, { headers: { Cookie: cookieB } });
        report('B cannot view A document details', forbiddenDoc.status === 404, forbiddenDoc.status);
      } else {
        console.log('SKIP cross-account document ownership: account A has no uploaded document');
        skipped++;
      }
    }
  } else {
    console.log('SKIP two-account ownership test: no existing test credentials supplied');
    skipped++;
  }
} catch (error) {
  console.error('FAIL Test could not complete:', error instanceof Error ? error.message : String(error));
  failed++;
}
console.log(`Security smoke: ${failed} failed; ${skipped} skipped.`);
process.exitCode = failed ? 1 : 0;
