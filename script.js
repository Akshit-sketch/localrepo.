(function() {
  'use strict';

  const htmlEl = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const yearEl = document.getElementById('year');
  const indicesGrid = document.getElementById('indices-grid');
  const tickerTrack = document.getElementById('ticker-track');
  const moversTbody = document.getElementById('movers-tbody');
  const moversSearch = document.getElementById('movers-search');
  const watchlistForm = document.getElementById('watchlist-form');
  const watchlistInput = document.getElementById('watch-symbol');
  const watchlistItemsEl = document.getElementById('watchlist-items');
  const newsList = document.getElementById('news-list');

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    htmlEl.setAttribute('data-theme', savedTheme);
    if (themeToggle) themeToggle.setAttribute('aria-pressed', savedTheme === 'dark' ? 'true' : 'false');
  } else {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    htmlEl.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    if (themeToggle) themeToggle.setAttribute('aria-pressed', prefersDark ? 'true' : 'false');
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = htmlEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      htmlEl.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      themeToggle.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
      themeToggle.querySelector('.toggle-icon').textContent = next === 'dark' ? '🌙' : '☀️';
    });
  }

  // Helpers
  const formatPrice = (v) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatChange = (v) => (v > 0 ? '+' : '') + Number(v).toFixed(2);
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  // Mock Data Generators
  const randomWalk = (v) => v + (Math.random() - 0.5) * v * 0.01;

  const indices = [
    { symbol: 'S&P 500', value: 5123.54, change: -12.31 },
    { symbol: 'Dow 30', value: 39245.87, change: 85.12 },
    { symbol: 'Nasdaq', value: 16234.12, change: 140.55 },
    { symbol: 'Russell 2000', value: 2025.32, change: -6.77 }
  ];

  const baseSymbols = [
    ['AAPL','Apple Inc.'], ['MSFT','Microsoft Corp.'], ['GOOGL','Alphabet Class A'], ['AMZN','Amazon.com Inc.'], ['NVDA','NVIDIA Corp.'], ['TSLA','Tesla Inc.'], ['META','Meta Platforms'], ['NFLX','Netflix Inc.'], ['AMD','Advanced Micro Devices'], ['INTC','Intel Corp.'], ['ORCL','Oracle Corp.'], ['CRM','Salesforce Inc.'], ['NKE','NIKE Inc.'], ['BA','Boeing Co.'], ['JPM','JPMorgan Chase & Co.'], ['XOM','Exxon Mobil'], ['CVX','Chevron Corp.'], ['V','Visa Inc.'], ['MA','Mastercard Inc.'], ['KO','Coca-Cola Co.']
  ];

  let movers = baseSymbols.slice(0, 14).map(([sym, name]) => ({
    symbol: sym,
    name,
    price: 50 + Math.random() * 400,
    change: (Math.random() - 0.5) * 10,
  })).map((m) => ({ ...m, percent: (m.change / (m.price - m.change)) * 100 }));

  // Indices UI
  function renderIndices() {
    if (!indicesGrid) return;
    indicesGrid.innerHTML = indices.map((idx) => {
      const deltaClass = idx.change >= 0 ? 'up' : 'down';
      const pct = (idx.change / (idx.value - idx.change)) * 100;
      return `
        <article class="index-card" tabindex="0" aria-label="${idx.symbol} ${formatPrice(idx.value)} ${formatChange(idx.change)} (${formatChange(pct)}%)">
          <h4>${idx.symbol}</h4>
          <div class="value">${formatPrice(idx.value)}</div>
          <div class="delta ${deltaClass}">${formatChange(idx.change)} (${formatChange(pct)}%)</div>
        </article>
      `;
    }).join('');
  }
  renderIndices();
  setInterval(() => {
    for (const idx of indices) {
      const next = randomWalk(idx.value);
      idx.change = next - idx.value;
      idx.value = next;
    }
    renderIndices();
  }, 5000);

  // Ticker
  const tickerSymbols = baseSymbols.slice(0, 12).map(([s, name]) => ({ symbol: s, name, price: 100 + Math.random() * 200, percent: (Math.random() - 0.5) * 2 }));
  function renderTicker() {
    if (!tickerTrack) return;
    const content = tickerSymbols.map((t) => {
      const chgClass = t.percent >= 0 ? 'up' : 'down';
      return `<span class="ticker-item"><strong>${t.symbol}</strong><span class="price">${formatPrice(t.price)}</span><span class="change ${chgClass}">${formatChange(t.percent)}%</span></span>`;
    }).join('');
    // duplicate for seamless scroll
    tickerTrack.innerHTML = content + content;
  }
  renderTicker();
  setInterval(() => {
    tickerSymbols.forEach((t) => {
      const newPrice = randomWalk(t.price);
      t.percent = ((newPrice - t.price) / t.price) * 100;
      t.price = newPrice;
    });
    renderTicker();
  }, 4000);

  // Movers Table
  let sortState = { key: 'percent', dir: 'desc' };

  function renderMoversTable() {
    if (!moversTbody) return;
    let filtered = movers;
    const q = (moversSearch?.value || '').trim().toLowerCase();
    if (q) {
      filtered = movers.filter((m) => m.symbol.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    }
    const dir = sortState.dir === 'asc' ? 1 : -1;
    filtered = filtered.slice().sort((a, b) => {
      const ka = a[sortState.key];
      const kb = b[sortState.key];
      if (ka < kb) return -1 * dir;
      if (ka > kb) return 1 * dir;
      return 0;
    });

    moversTbody.innerHTML = filtered.map((m) => {
      const ch = m.change >= 0 ? 'chg-up' : 'chg-down';
      const pct = (m.change / (m.price - m.change)) * 100;
      const watched = isWatched(m.symbol);
      return `
        <tr>
          <td>${m.symbol}</td>
          <td>${m.name}</td>
          <td class="numeric">${formatPrice(m.price)}</td>
          <td class="numeric ${ch}">${formatChange(m.change)}</td>
          <td class="numeric ${ch}">${formatChange(pct)}%</td>
          <td class="actions-col"><button class="watch-btn ${watched ? 'active' : ''}" data-symbol="${m.symbol}">${watched ? 'Watching' : 'Watch'}</button></td>
        </tr>
      `;
    }).join('');
  }
  renderMoversTable();

  function attachMoversEvents() {
    const table = document.getElementById('movers-table');
    if (!table) return;
    const ths = Array.from(table.querySelectorAll('thead th[data-key]'));
    ths.forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-key');
        if (!key) return;
        if (sortState.key === key) {
          sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
          sortState.key = key;
          sortState.dir = 'asc';
        }
        ths.forEach((el) => el.setAttribute('aria-sort', 'none'));
        th.setAttribute('aria-sort', sortState.dir === 'asc' ? 'ascending' : 'descending');
        renderMoversTable();
      });
    });

    table.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest('.watch-btn');
      if (btn && btn instanceof HTMLElement) {
        const sym = btn.getAttribute('data-symbol');
        if (!sym) return;
        toggleWatch(sym);
        btn.classList.toggle('active');
        btn.textContent = isWatched(sym) ? 'Watching' : 'Watch';
        renderWatchlist();
      }
    });
  }
  attachMoversEvents();

  if (moversSearch) {
    moversSearch.addEventListener('input', () => renderMoversTable());
  }

  setInterval(() => {
    // update movers with random walk
    movers = movers.map((m) => {
      const next = randomWalk(m.price);
      const change = next - m.price;
      return { ...m, price: next, change, percent: (change / (m.price)) * 100 };
    });
    renderMoversTable();
    renderWatchlist();
  }, 4500);

  // Watchlist
  function getWatchlist() {
    try {
      return JSON.parse(localStorage.getItem('watchlist') || '[]');
    } catch { return []; }
  }
  function setWatchlist(list) {
    localStorage.setItem('watchlist', JSON.stringify(list));
  }
  function isWatched(symbol) {
    return getWatchlist().includes(symbol);
  }
  function toggleWatch(symbol) {
    const list = getWatchlist();
    const idx = list.indexOf(symbol);
    if (idx >= 0) { list.splice(idx, 1); }
    else { list.push(symbol); }
    setWatchlist(list);
  }
  function addWatch(symbol) {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    if (!isWatched(sym)) setWatchlist([...getWatchlist(), sym]);
  }
  function removeWatch(symbol) {
    setWatchlist(getWatchlist().filter((s) => s !== symbol));
  }
  function renderWatchlist() {
    if (!watchlistItemsEl) return;
    const list = getWatchlist();
    const priceMap = new Map(movers.map((m) => [m.symbol, m.price]));
    watchlistItemsEl.innerHTML = list.map((sym) => {
      const price = priceMap.get(sym) ?? (100 + Math.random()*100);
      return `
        <li class="watch-item" data-symbol="${sym}">
          <strong>${sym}</strong>
          <span class="price">${formatPrice(price)}</span>
          <button data-action="remove" aria-label="Remove ${sym}">Remove</button>
        </li>
      `;
    }).join('');
  }
  renderWatchlist();

  if (watchlistForm) {
    watchlistForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = watchlistInput?.value || '';
      if (value) {
        addWatch(value);
        if (watchlistInput) watchlistInput.value = '';
        renderWatchlist();
        renderMoversTable();
      }
    });
  }
  if (watchlistItemsEl) {
    watchlistItemsEl.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const li = target.closest('.watch-item');
      if (!li) return;
      const sym = li.getAttribute('data-symbol');
      if (!sym) return;
      if (target.getAttribute('data-action') === 'remove') {
        removeWatch(sym);
        renderWatchlist();
        renderMoversTable();
      }
    });
  }

  // News
  const mockNews = [
    { title: 'Tech stocks rally as AI optimism grows', source: 'MarketWatch', time: '2h ago', body: 'Semiconductors led gains after upbeat guidance from major chipmakers.' },
    { title: 'Oil slips amid demand concerns', source: 'Reuters', time: '3h ago', body: 'Crude prices eased after inventory data showed a surprise build.' },
    { title: 'Central bank signals patient stance', source: 'Bloomberg', time: '4h ago', body: 'Officials emphasized data dependence as inflation trends cool.' },
  ];
  function renderNews() {
    if (!newsList) return;
    newsList.innerHTML = mockNews.map((n) => `
      <li class="news-card">
        <details>
          <summary>
            <strong>${n.title}</strong>
            <div class="news-meta">${n.source} • ${n.time}</div>
          </summary>
          <p>${n.body}</p>
        </details>
      </li>
    `).join('');
  }
  renderNews();
})();

