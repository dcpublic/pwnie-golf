/* Pwnie Golf SPA — hash router, zero dependencies.
   All user/API content is rendered via textContent — never innerHTML — to keep XSS on hole 5 where it belongs. */

const app = document.getElementById('app');

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

function clear() { app.replaceChildren(); }
function flash(text, isError = false) {
  return el('div', { class: `flash${isError ? ' error' : ''}`, role: 'status' }, text);
}

/* ---------- pages ---------- */

function homePage() {
  clear();
  app.append(
    el('h1', {}, 'whoami'),
    el('p', {}, 'Welcome to Pwnie Golf: 18 holes of artisanal, hand-rolled, security-themed mini-golf. Every hole is a vulnerability. Every putt is an exploit. Every scorecard is a pentest report your friends will actually read.'),
    el('p', {}, 'No memberships. No collared shirts. No rules against hoodies in July.'),
    el('div', { class: 'card' },
      el('h3', {}, 'TODAY ON THE COURSE'),
      el('p', {}, 'Hole 10 ("Zero Day") bounty still unclaimed — 12 years running. The ducks on hole 6 received a firmware update and are calmer now. The Gibson is fully operational.')
    ),
    el('p', {}, el('a', { href: '#/book' }, '>> initiate handshake: book a tee time'), el('span', { class: 'blink' }, ' █'))
  );
}

async function coursePage() {
  clear();
  app.append(el('h1', {}, 'ls -la ./course'), el('p', {}, 'Loading holes…'));
  try {
    const { holes } = await api('/api/holes');
    clear();
    app.append(el('h1', {}, 'ls -la ./course'));
    const grid = el('div', { class: 'grid' });
    for (const h of holes) {
      grid.append(el('div', { class: 'card' },
        el('h3', {}, `${String(h.number).padStart(2, '0')} · ${h.name}`),
        el('div', { class: 'meta' }, `par ${h.par}`),
        el('p', {}, h.concept)
      ));
    }
    app.append(grid);
  } catch (err) {
    clear();
    app.append(el('h1', {}, 'ls -la ./course'), flash(`Failed to load course: ${err.message}`, true));
  }
}

function aboutPage() {
  clear();
  app.append(
    el('h1', {}, 'cat ABOUT.md'),
    el('h2', {}, '# The Legend of Pwnie Golf'),
    el('p', {}, 'In 1998, three sysadmins were fired from the same ISP on the same day for "unauthorized creativity." With their severance, a pallet of decommissioned mainframes, and a foreclosed putt-putt course off Route 443, they built what the zines called "the only golf course with a responsible disclosure policy."'),
    el('p', {}, 'The founders — known to this day only as root, daemon, and nobody — laid every hole by hand. The windmill on 9 came from a farm auction; the tape drives on 18 came from somewhere we are legally advised to describe as "an auction."'),
    el('h2', {}, '# Mission Statement'),
    el('p', {}, 'We believe golf, like software, was ruined by enterprise. We are returning it to the garage. Pwnie Golf exists to prove that the shortest path between a ball and a cup is a well-crafted exploit chain.'),
    el('h2', {}, '# Company Values'),
    el('div', { class: 'card' }, el('p', {}, '1. Full disclosure: every hole’s gimmick is documented. Reading the docs is your problem.')),
    el('div', { class: 'card' }, el('p', {}, '2. Least privilege: nobody gets a gimme. Not even nobody, and he co-founded the place.')),
    el('div', { class: 'card' }, el('p', {}, '3. Defense in depth: the rough on hole 14 is technically three roughs.')),
    el('div', { class: 'card' }, el('p', {}, '4. Zero trust: scorecards are notarized by two independent witnesses and a duck.')),
    el('h2', {}, '# FAQ'),
    el('p', {}, 'Q: Is the Gibson a real mainframe? A: It runs our reservation system, so unfortunately yes.'),
    el('p', {}, 'Q: Dress code? A: Hoodies encouraged. Fingerless gloves are considered formal wear.'),
    el('p', {}, 'Q: Can I bring my own putter? A: BYOD is permitted after it clears a supply-chain inspection at the front desk.')
  );
}

function bookPage() {
  clear();
  const status = el('div');
  const slotSelect = el('select', { id: 'timeSlot', name: 'timeSlot', required: '' });
  const dateInput = el('input', { id: 'date', name: 'date', type: 'date', required: '' });

  async function refreshSlots() {
    slotSelect.replaceChildren(el('option', { value: '' }, 'scanning ports…'));
    if (!dateInput.value) return;
    try {
      const { availableSlots } = await api(`/api/reservations?date=${encodeURIComponent(dateInput.value)}`);
      slotSelect.replaceChildren(
        ...(availableSlots.length
          ? availableSlots.map((s) => el('option', { value: s }, `${s} — open`))
          : [el('option', { value: '' }, 'no open slots (fully pwned)')])
      );
    } catch {
      slotSelect.replaceChildren(el('option', { value: '' }, 'scan failed'));
    }
  }
  dateInput.addEventListener('change', refreshSlots);

  const form = el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      status.replaceChildren(flash('Negotiating tee time…'));
      const data = Object.fromEntries(new FormData(form).entries());
      data.partySize = Number(data.partySize);
      try {
        const { reservation } = await api('/api/reservations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        status.replaceChildren(flash(`ACCESS GRANTED — ${reservation.name}, party of ${reservation.partySize}, ${reservation.timeSlot}. Bring a hoodie.`));
        form.reset();
        refreshSlots();
      } catch (err) {
        status.replaceChildren(flash(`ACCESS DENIED — ${err.message}`, true));
      }
    },
  },
    el('label', { for: 'name' }, 'handle / name'),
    el('input', { id: 'name', name: 'name', required: '', maxlength: '60', placeholder: 'crashoverride' }),
    el('label', { for: 'email' }, 'email'),
    el('input', { id: 'email', name: 'email', type: 'email', required: '', maxlength: '120', placeholder: 'zerocool@ellingson.example' }),
    el('label', { for: 'partySize' }, 'party size (1-6)'),
    el('input', { id: 'partySize', name: 'partySize', type: 'number', min: '1', max: '6', value: '2', required: '' }),
    el('label', { for: 'date' }, 'date'),
    dateInput,
    el('label', { for: 'timeSlot' }, 'tee time'),
    slotSelect,
    el('button', { type: 'submit' }, 'EXECUTE')
  );

  app.append(el('h1', {}, './book_tee_time'), el('p', {}, 'Pick a date to port-scan for open slots. One party per slot — we take collision resistance seriously.'), status, form);
}

async function guestbookPage() {
  clear();
  const status = el('div');
  const list = el('div');

  async function refresh() {
    try {
      const { signatures } = await api('/api/guestbook');
      list.replaceChildren(
        ...signatures.map((s) => el('div', { class: 'sig' },
          el('span', { class: 'handle' }, s.handle),
          el('span', { class: 'when' }, new Date(s.createdAt).toLocaleDateString()),
          el('p', { class: 'msg' }, s.message)
        ))
      );
    } catch (err) {
      list.replaceChildren(flash(`Failed to load guestbook: ${err.message}`, true));
    }
  }

  const form = el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        await api('/api/guestbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        status.replaceChildren(flash('Signature committed to the ledger.'));
        form.reset();
        refresh();
      } catch (err) {
        status.replaceChildren(flash(`Rejected: ${err.message}`, true));
      }
    },
  },
    el('label', { for: 'handle' }, 'handle'),
    el('input', { id: 'handle', name: 'handle', required: '', maxlength: '40', placeholder: 'acidburn' }),
    el('label', { for: 'message' }, 'message'),
    el('textarea', { id: 'message', name: 'message', required: '', maxlength: '280', rows: '3', placeholder: 'mess with the best…' }),
    el('button', { type: 'submit' }, 'SIGN')
  );

  app.append(el('h1', {}, 'tail -f ./guestbook'), status, form, el('h2', {}, '# Recent signatures'), list);
  refresh();
}

/* ---------- router ---------- */

const routes = {
  '/': homePage,
  '/course': coursePage,
  '/about': aboutPage,
  '/book': bookPage,
  '/guestbook': guestbookPage,
};

function navigate() {
  const path = location.hash.replace(/^#/, '') || '/';
  const page = routes[path] || homePage;
  document.querySelectorAll('nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === path);
  });
  page();
}

window.addEventListener('hashchange', navigate);
navigate();
