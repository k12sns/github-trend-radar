import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const demoItems = [
  { full_name: 'example/fast-tool', name: 'example / fast-tool', domains: ['Developer Tools'], roles: ['Runtime'], description: 'A small, fast runtime for modern JavaScript workloads.', language: 'Rust', gained: '+1,248', stars: 12400, url: 'https://github.com' },
  { full_name: 'example/vector-store', name: 'example / vector-store', domains: ['Data'], roles: ['Search'], description: 'An embedded vector store for applications that need local semantic search.', language: 'Python', gained: '+842', stars: 9200, url: 'https://github.com' },
];

function formatStars(value) {
  return new Intl.NumberFormat('en-US').format(value || 0);
}

function App() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [windowKey, setWindowKey] = useState('3d');

  useEffect(() => {
    fetch('/data/latest.json', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Report unavailable')))
      .then((payload) => { setItems(payload.items || []); setLoaded(true); })
      .catch(() => { setItems([]); setLoaded(true); });
  }, []);

  const displayItems = items.length ? items : (loaded ? [] : demoItems);
  const rankedItems = [...displayItems].sort((a, b) => (b.trend_windows?.[windowKey]?.stars || parseInt(b.gained?.replace(/[^0-9]/g, ''), 10) || 0) - (a.trend_windows?.[windowKey]?.stars || parseInt(a.gained?.replace(/[^0-9]/g, ''), 10) || 0));
  const selectedItem = rankedItems[selected] || rankedItems[0];
  const reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const tagsFor = (item) => [...(item?.domains || []), ...(item?.roles || [])];
  const selectedWindow = selectedItem?.trend_windows?.[windowKey] || { stars: parseInt(selectedItem?.gained?.replace(/[^0-9]/g, ''), 10) || 0, observed: 1, days: 1 };

  return <div className="site-shell">
    <header className="masthead">
      <a className="wordmark" href="/">HERMES</a>
      <span className="issue">DAILY TREND RADAR&nbsp; / &nbsp;{reportDate}</span>
      <nav><a href="#about">ABOUT</a><a href="#archive">ARCHIVE</a></nav>
    </header>

    <main className="page">
      <section className="page-intro">
        <h1>What is rising today?</h1>
        <div className="intro-line"><p>Repositories gaining attention on GitHub.</p><div className="window-switcher" aria-label="Trend window">{[['3d','3 DAYS'],['5d','5 DAYS'],['7d','7 DAYS']].map(([key, label]) => <button className={windowKey === key ? 'active' : ''} onClick={() => { setWindowKey(key); setSelected(0); }} key={key}>{label}</button>)}</div></div>
      </section>

      {displayItems.length ? <section className="radar-layout" aria-label="Daily GitHub trends">
        <div className="trend-list">
          <div className="list-heading"><span>#</span><span>REPOSITORY</span><span>ROLE / CATEGORY</span><span>DESCRIPTION</span><span>STARS / {windowKey.toUpperCase()}</span></div>
          {rankedItems.map((item, index) => <button className={`trend-row ${selected === index ? 'is-selected' : ''}`} key={item.full_name} onClick={() => setSelected(index)}>
            <span className="rank">{index + 1}</span>
            <span className="repository"><strong>{item.name || item.full_name}</strong><small>{item.language || 'Open source'}</small></span>
            <span className="category">{tagsFor(item).join(' · ') || item.language || 'Open Source'}</span>
            <span className="description">{item.description}</span>
            <span className="stars"><strong>+{(item.trend_windows?.[windowKey]?.stars || parseInt(item.gained?.replace(/[^0-9]/g, ''), 10) || 0).toLocaleString('en-US')}</strong><small>↑</small></span>
          </button>)}
        </div>
        {selectedItem && <aside className="detail">
          <div className="detail-label">SELECTED REPOSITORY</div>
          <h2>{selectedItem.name || selectedItem.full_name}</h2>
          <div className="detail-category">{tagsFor(selectedItem).join(' · ') || selectedItem.language || 'OPEN SOURCE'}</div>
          <p className="detail-description">{selectedItem.description}</p>
          <dl>
            <div><dt>TOTAL STARS</dt><dd>{formatStars(selectedItem.stars)}</dd></div>
            <div><dt>STARS / {windowKey.toUpperCase()}</dt><dd className="accent">+{selectedWindow.stars.toLocaleString('en-US')} ↑</dd></div>
            <div><dt>LANGUAGE</dt><dd>{selectedItem.language || '—'}</dd></div>
            <div><dt>APPEARED</dt><dd>{selectedWindow.observed} / {selectedWindow.days} DAYS</dd></div>
          </dl>
          <a className="github-link" href={selectedItem.url} target="_blank" rel="noreferrer">VIEW ON GITHUB <span>↗</span></a>
        </aside>}
      </section> : <section className="empty-state"><h2>No report yet.</h2><p>The next GitHub Trending report will appear here after the scheduled run.</p></section>}
    </main>

    <footer className="archive" id="archive"><span>ARCHIVE:</span><a>11 AUG 2026</a><a>10 AUG 2026</a><a>09 AUG 2026</a><a>08 AUG 2026</a><a>07 AUG 2026</a><a>06 AUG 2026</a><a>VIEW ALL REPORTS <b>→</b></a></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
