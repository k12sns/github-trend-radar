import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const repositories = [
  { name: 'lancedb / lancedb', description: 'Modern vector database for LLM era', language: 'Rust', color: '#4778d7', gained: '+1,342', confidence: 93, stars: '23.4k', contributors: '1.9k', verdict: 'LanceDB is gaining strong developer adoption as a production-ready vector database with columnar storage, ACID transactions, and native multi-modal search. Momentum is driven by enterprise interest and integrations across the LLM stack.' },
  { name: 'astral-sh / uv', description: 'Extremely fast Python package installer', language: 'Rust', color: '#4778d7', gained: '+1,102', confidence: 91, stars: '42.8k', contributors: '736', verdict: 'uv continues to consolidate Python tooling with a fast, reliable workflow that replaces several legacy tools without adding operational complexity.' },
  { name: 'open-webui / open-webui', description: 'User-friendly WebUI for LLMs', language: 'Python', color: '#f5b414', gained: '+886', confidence: 89, stars: '65.1k', contributors: '511', verdict: 'Open WebUI shows durable usage signals across local and hosted model workflows, with clear evidence of an active contributor base.' },
  { name: 'zettaedge / zed', description: 'High-performance code editor', language: 'Go', color: '#f26e1e', gained: '+742', confidence: 87, stars: '58.2k', contributors: '882', verdict: 'Zed is converting performance claims into a real editor workflow, with consistent contribution velocity and growing developer adoption.' },
  { name: 'turso-io / libsql', description: 'SQLite for the distributed era', language: 'Go', color: '#f26e1e', gained: '+612', confidence: 84, stars: '14.9k', contributors: '314', verdict: 'libSQL remains a credible edge data layer, backed by an understandable technical wedge and steady ecosystem activity.' },
  { name: 'huggingface / smolagents', description: 'Tiny but powerful AI agents', language: 'Python', color: '#f5b414', gained: '+523', confidence: 82, stars: '18.7k', contributors: '126', verdict: 'Small, composable agent primitives are attracting practical experimentation rather than purely promotional interest.' },
  { name: 'ollama / ollama', description: 'Run LLMs locally', language: 'C++', color: '#b23ad5', gained: '+487', confidence: 81, stars: '134k', contributors: '611', verdict: 'Local model execution continues to show broad utility, especially for private development loops and offline iteration.' },
  { name: 'supabase / supabase', description: 'The open source Firebase alternative', language: 'TypeScript', color: '#4778d7', gained: '+412', confidence: 79, stars: '82.1k', contributors: '1.4k', verdict: 'Supabase has strong adoption signals, though its maturity makes it more of a platform trend than a new technical frontier.' },
  { name: 'grafana / tempo', description: 'High volume distributed tracing', language: 'Go', color: '#f26e1e', gained: '+398', confidence: 78, stars: '4.1k', contributors: '215', verdict: 'Tempo benefits from observability demand and a clear role in cost-conscious tracing architectures.' },
  { name: 'tinygrad / tinygrad', description: 'You like pytorch? You like tinygrad!', language: 'Python', color: '#f5b414', gained: '+342', confidence: 76, stars: '22.9k', contributors: '192', verdict: 'Tinygrad remains a technically legible learning and experimentation project with unusually strong community interest.' }
];

function Icon({ type }) {
  const paths = { home: 'M3 10 12 3l9 7v10H3z M9 21v-6h6v6', pulse: 'M3 12h4l2-7 4 14 2-7h6', file: 'M6 2h9l4 4v16H6z M15 2v5h5 M9 12h6M9 16h6', database: 'M4 5c0-2 16-2 16 0v14c0 2-16 2-16 0z M4 5c0 2 16 2 16 0 M4 12c0 2 16 2 16 0', gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m9.9 9.9 1.4 1.4m0-12.7-1.4 1.4m-9.9 9.9-1.4 1.4' };
  return <svg viewBox="0 0 24 24" className="icon"><path d={paths[type] || paths.file}/></svg>;
}

function App() {
  const [selected, setSelected] = useState(0);
  const [activeNav, setActiveNav] = useState('Overview');
  const [exported, setExported] = useState(false);
  const repo = repositories[selected];
  const chartPoints = useMemo(() => '0,111 25,105 50,107 75,100 100,98 125,91 150,93 175,80 200,78 225,66 250,68 275,58 300,58 325,49 350,47 375,38 400,37 425,28 450,24 475,16 500,11', []);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">⌁</span><div><strong>Hermes</strong><small>SCOUT</small></div></div>
      <nav>{['Overview','Signals','Reports','Sources'].map((item, i) => <button className={activeNav === item ? 'nav-item active' : 'nav-item'} onClick={() => setActiveNav(item)} key={item}><Icon type={['home','pulse','file','database'][i]}/>{item}</button>)}</nav>
      <div className="sidebar-bottom"><button className="nav-item"><Icon type="gear"/>Settings</button><span>v1.2.0</span></div>
    </aside>
    <main className="main">
      <header className="topbar"><span>Daily GitHub Trend Intelligence</span><div className="sync"><i/> In sync <small>Next run in 02:13:45</small></div><time>▣ &nbsp; May 10, 2025 <em>(Sat)</em></time></header>
      <section className="content">
        <div className="intro"><div><h1>Signal over noise.</h1><p>We analyze millions of GitHub events to surface high-confidence technology<br/>signals so you can focus on what matters.</p></div><button className="export" onClick={() => setExported(true)}>⇩ &nbsp; {exported ? 'Report ready' : 'Export report'} <span>⌄</span></button></div>
        <div className="metrics"><Metric icon="‹/›" label="PROJECTS SCREENED" value="12,842" change="+18%"/><Metric icon="◎" label="HIGH-CONFIDENCE SIGNALS" value="27" change="+12%"/><Metric icon="▽" label="NOISE REMOVED" value="98.7%" change="+0.6pp"/></div>
        <div className="report-grid">
          <section className="ranking"><div className="table-head"><span>#</span><span>REPOSITORY</span><span>LANGUAGE</span><span>STARS GAINED (24H)</span><span>CONFIDENCE ⓘ</span></div>{repositories.map((item, i) => <button className={selected === i ? 'repo-row selected' : 'repo-row'} key={item.name} onClick={() => setSelected(i)}><span>{i + 1}</span><span className="repo-name"><b>▣ &nbsp;{item.name}</b><small>{item.description}</small></span><span><i className="dot" style={{background:item.color}}/> {item.language}</span><span className="gained">{item.gained}</span><span className="score"><b>{item.confidence}</b><i><u style={{width:`${item.confidence}%`}}/></i></span></button>)}<button className="full-ranking">View full ranking (27)　›</button></section>
          <section className="detail"><div className="detail-head"><div><h2>▣ &nbsp;{repo.name}</h2><p>{repo.description}</p></div><a href={`https://github.com/${repo.name}`} target="_blank">View on GitHub ↗</a></div><div className="repo-meta"><span><i className="dot" style={{background:repo.color}}/> {repo.language}</span><span>☆ {repo.stars}</span><span>♧ {repo.contributors}</span><span>◉ Apache-2.0</span><span>Created Jan 2023</span><span>Updated 2h ago</span></div><div className="verdict"><div><h3>TECHNICAL VERDICT ⓘ</h3><mark>HIGH CONFIDENCE</mark><p>{repo.verdict}</p></div><strong>{repo.confidence}<small>/100</small></strong></div><div className="evidence-chart"><div className="evidence"><h3>EVIDENCE</h3>{[['☆','Stars gained (24h)',repo.gained,'Top 1% of repos in '+repo.language],['♧','Contributors (30d)','+78','Up 69% vs prior 30 days'],['↯','Commit activity (7d)','412','Up 56% vs prior 7 days'],['↯','Issues closed (7d)','96','Up 71% vs prior 7 days'],['↯','Pull requests merged (7d)','61','Up 57% vs prior 7 days']].map(([ic,label,value,sub])=><div className="evidence-row" key={label}><span>{ic}</span><div><b>{label}</b><small>{sub}</small></div><strong>{value}</strong></div>)}<footer>More signals　›</footer></div><div className="chart"><h3>SIGNAL STRENGTH (30D) ⓘ</h3><div className="chart-box"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span><svg viewBox="0 0 500 130" preserveAspectRatio="none"><polygon points={`${chartPoints} 500,130 0,130`} /><polyline points={chartPoints}/><circle cx="500" cy="11" r="4"/></svg></div><div className="chart-labels"><span>Apr 11</span><span>Apr 18</span><span>Apr 25</span><span>May 02</span><span>May 09</span></div><small>Consistent acceleration in developer interest and activity.</small></div></div></section>
        </div>
      </section>
      <footer className="history"><b>REPORT HISTORY</b>{['May 10|Sat','May 09|Fri','May 08|Thu','May 07|Wed','May 06|Tue','May 05|Mon','May 04|Sun','May 03|Sat','May 02|Fri','May 01|Thu'].map((d,i)=>{const [day,week]=d.split('|');return <button className={i===0?'selected':''} key={d}>{day}<small>{week}</small></button>})}<button className="calendar">▣</button><small className="updated">All times in UTC · Data refreshed May 10, 2025 08:00 UTC</small></footer>
    </main>
  </div>
}
function Metric({icon,label,value,change}) { return <div className="metric"><span className="metric-icon">{icon}</span><div><small>{label}</small><strong>{value}</strong></div><span className="change">{change}<small>vs May 9</small></span></div> }

createRoot(document.getElementById('root')).render(<App/>);
