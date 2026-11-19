import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getFilters, getStats, queryRecords } from './api.js';

const T = {
  en: {
    project: 'PROJECT CHAMP26', records: 'Records', images: 'images',
    allFields: 'All fields', year: 'Year', month: 'Month', client: 'Client name', country: 'Country',
    image: 'Image Number', page: 'Document Page',
    placeholder: 'Type to search…', searchIn: 'Search in', sortBy: l => `Sort: ${l}`, sortAria: 'Sort by',
    asc: '↑ Asc', desc: '↓ Desc', toggleDir: 'Toggle direction',
    empty: 'No records match. Try a different year, month, client or country.',
    error: e => `Couldn’t load records: ${e}. Check that the API is running and the database is reachable.`,
    previous: 'Previous', next: 'Next', of: 'of', goTo: 'Go to page', go: 'Go',
    noImage: 'No image selected', prevImg: '‹ Prev', nextImg: 'Next ›', open: 'Open ↗',
    zoomOut: 'Zoom out', zoomIn: 'Zoom in', fit: 'Fit',
    loadingImage: 'Loading image…', imgFailed: 'This image didn’t load. Use “Open” to try the link directly.', loadingImages: 'Loading images…',
    dashSub: 'Overview of your CHAMP26 archives', nRecords: 'NUMBER OF RECORDS', nRecordsDesc: 'Total records in the archives', viewRecords: 'View records',
    nImages: 'NUMBER OF IMAGES', nImagesDesc: 'Unique images in the archives', viewImages: 'View images', imagesWord: 'images',
    nFolders: 'NUMBER OF FOLDERS', nFoldersDesc: 'Total folders in the archives', viewFolders: 'View folders', folderIndex: 'Folder index', loading: 'Loading…',
    qc: 'QC form', qcTitle: 'Quality check', record: 'Record', comment: 'Comment', commentPh: 'Write a comment…', save: 'Save', cancel: 'Cancel', close: 'Close',
    qcSub: 'Review the record and add your comment', secDetails: 'Record details', secComment: 'QC comment',
    qcNote: 'Template preview – nothing is saved yet.',
    layout: 'Layout', layoutDataLeft: 'Default', layoutImageLeft: 'Customized',
    language: 'Language', dashboard: 'Dashboard', folder: 'Folder', all: 'All', clear: 'Clear filters',
    placeholderAll: 'Search e.g. 1986 france dupont…', soon: 'Dashboard coming soon.',
  },
  fr: {
    project: 'PROJET CHAMP26', records: 'Enregistrements', images: 'images',
    allFields: 'Tous les champs', year: 'Année', month: 'Mois', client: 'Nom du client', country: 'Pays',
    image: 'Numéro d’image', page: 'Page du document',
    placeholder: 'Saisir pour rechercher…', searchIn: 'Rechercher dans', sortBy: l => `Trier : ${l}`, sortAria: 'Trier par',
    asc: '↑ Croiss.', desc: '↓ Décr.', toggleDir: 'Inverser l’ordre',
    empty: 'Aucun enregistrement trouvé. Essayez une autre année, un autre mois, client ou pays.',
    error: e => `Impossible de charger les enregistrements : ${e}. Vérifiez que l’API fonctionne et que la base de données est accessible.`,
    previous: 'Précédent', next: 'Suivant', of: 'sur', goTo: 'Aller à la page', go: 'Aller',
    noImage: 'Aucune image sélectionnée', prevImg: '‹ Préc.', nextImg: 'Suiv. ›', open: 'Ouvrir ↗',
    zoomOut: 'Zoom arrière', zoomIn: 'Zoom avant', fit: 'Ajuster',
    loadingImage: 'Chargement de l’image…', imgFailed: 'Cette image n’a pas pu être chargée. Utilisez « Ouvrir » pour essayer le lien directement.', loadingImages: 'Chargement des images…',
    dashSub: 'Aperçu de vos archives CHAMP26', nRecords: 'NOMBRE D’ENREGISTREMENTS', nRecordsDesc: 'Total des enregistrements dans les archives', viewRecords: 'Voir les enregistrements',
    nImages: 'NOMBRE D’IMAGES', nImagesDesc: 'Images uniques dans les archives', viewImages: 'Voir les images', imagesWord: 'images',
    nFolders: 'NOMBRE DE DOSSIERS', nFoldersDesc: 'Total des dossiers dans les archives', viewFolders: 'Voir les dossiers', folderIndex: 'Index des dossiers', loading: 'Chargement…',
    qc: 'Fiche QC', qcTitle: 'Contrôle qualité', record: 'Enregistrement', comment: 'Commentaire', commentPh: 'Écrire un commentaire…', save: 'Enregistrer', cancel: 'Annuler', close: 'Fermer',
    qcSub: 'Vérifiez l’enregistrement et ajoutez votre commentaire', secDetails: 'Informations de l’enregistrement', secComment: 'Commentaire QC',
    qcNote: 'Aperçu du modèle – rien n’est enregistré pour l’instant.',
    layout: 'Disposition', layoutDataLeft: 'Par défaut', layoutImageLeft: 'Personnalisé',
    language: 'Langue', dashboard: 'Tableau de bord', folder: 'Dossier', all: 'Tous', clear: 'Effacer les filtres',
    placeholderAll: 'Rechercher ex. 1986 france dupont…', soon: 'Le tableau de bord arrive bientôt.',
  },
};

const COLUMNS = ['year', 'month', 'country', 'client', 'image', 'page'];
const FIELDS = ['all', 'year', 'month', 'client', 'country'];
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTHS_FR = ['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
const SIZE = 15;
const MIN_ZOOM = 0.25, MAX_ZOOM = 5;

// "dec" / "décembre" -> 12 so people can search months by name
function monthNumber(text) {
  const t = text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (t.length < 3) return null;
  const i = MONTHS.findIndex(m => m.startsWith(t));
  const j = MONTHS_FR.findIndex(m => m.startsWith(t));
  return i >= 0 ? i + 1 : j >= 0 ? j + 1 : null;
}

const FlagUS = () => (
  <svg viewBox="0 0 20 14" width="18" height="13" aria-hidden="true">
    <rect width="20" height="14" fill="#fff" />
    {[0, 2, 4, 6, 8, 10, 12].map(n => <rect key={n} y={n * 14 / 13} width="20" height={14 / 13} fill="#d9262c" />)}
    <rect width="9" height={14 * 7 / 13} fill="#2b3f8f" />
  </svg>
);
const FlagFR = () => (
  <svg viewBox="0 0 20 14" width="18" height="13" aria-hidden="true">
    <rect width="7" height="14" fill="#2a3f94" /><rect x="7" width="6" height="14" fill="#fff" /><rect x="13" width="7" height="14" fill="#e03a3e" />
  </svg>
);

export default function App() {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('lang') === 'fr' ? 'fr' : 'en'; } catch { return 'en'; } });
  const [view, setView] = useState('dashboard');
  // which side the data table / the image sit on – kept for the whole browser session
  const [layout, setLayout] = useState(() => { try { return sessionStorage.getItem('layout') === 'image-left' ? 'image-left' : 'data-left'; } catch { return 'data-left'; } });
  const chooseLayout = v => { setLayout(v); try { sessionStorage.setItem('layout', v); } catch {} };
  const [stats, setStats] = useState(null);
  const [qc, setQc] = useState(null); // QC pop-up template: null = closed
  const [opts, setOpts] = useState({ reports: [], years: [], months: [], countries: [], clients: [] });
  const [filters, setFilters] = useState({ report: '', year: '', month: '', country: '', client: '' });
  const t = T[lang];
  const [q, setQ] = useState('');
  const [field, setField] = useState('all');
  const [sort, setSort] = useState('year');
  const [dir, setDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [goVal, setGoVal] = useState('1');
  const [data, setData] = useState({ total: 0, rows: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [nat, setNat] = useState(null);
  const [fit, setFit] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const rowRefs = useRef([]);
  const stageRef = useRef(null);
  const zoomRef = useRef(1);
  const anchor = useRef(null);
  const drag = useRef(null);
  zoomRef.current = zoom;

  const chooseLang = l => { setLang(l); try { localStorage.setItem('lang', l); } catch {} };
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { setOpts(getFilters()); }, []);
  useEffect(() => { setStats(getStats()); }, []);
  // open the records, optionally limited to one folder (CHAMP01..04)
  const openImages = report => {
    setFilters({ report: report || '', year: '', month: '', country: '', client: '' });
    setQ(''); setField('all'); setPage(1); setView('images');
  };
  const openQc = r => r && setQc({ rec: r, year: r.year ?? '', month: r.month ?? '', country: r.country ?? '', client: r.client ?? '', comment: '' });
  const closeQc = () => setQc(null);
  useEffect(() => {
    if (!qc) return;
    const onEsc = e => e.key === 'Escape' && setQc(null);
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [!!qc]);
  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1); };
  const anyFilter = Object.values(filters).some(Boolean);
  const monthName = m => { const n = new Date(2000, m - 1, 1).toLocaleString(lang, { month: 'long' }); return `${m} · ${n.charAt(0).toUpperCase() + n.slice(1)}`; };

  useEffect(() => {
    const ctl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      // "All fields": several words (space, + or comma) must ALL match, e.g. "1986 france" or "france dupont"
      const terms = field === 'all' ? q.split(/[+\s,]+/).filter(Boolean).slice(0, 6) : q.trim() ? [q.trim()] : [];
      const payload = terms.map(x => ({ field, q: field === 'month' ? String(monthNumber(x) ?? x) : x }));
      try {
        setData(queryRecords({ conds: payload, sort, dir, page, size: SIZE, filters })); setSel(0);
      } catch (e) { setError(e.message); }
      setLoading(false);
    }, 250);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [q, field, sort, dir, page, filters]);

  const current = data.rows[sel];
  useEffect(() => { setGoVal(String(page)); }, [page]);
  useEffect(() => {
    setNat(null); setFit(0); setImgFailed(false); setZoom(1); zoomRef.current = 1;
    stageRef.current?.scrollTo(0, 0);
  }, [current?.link]);
  useEffect(() => { rowRefs.current[sel]?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !nat) return;
    const calc = () => setFit(nat.w * Math.min(el.clientWidth / nat.w, el.clientHeight / nat.h));
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nat]);

  // zoom to an absolute level, keeping the point (cx, cy) of the panel fixed
  const zoomTo = (target, cx, cy) => {
    const el = stageRef.current;
    const z = zoomRef.current;
    const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +target.toFixed(3)));
    if (!el || nz === z) return;
    const mx = cx ?? el.clientWidth / 2, my = cy ?? el.clientHeight / 2;
    anchor.current = { fx: (el.scrollLeft + mx) / el.scrollWidth, fy: (el.scrollTop + my) / el.scrollHeight, mx, my };
    zoomRef.current = nz;
    setZoom(nz);
  };
  const zoomBy = (factor, cx, cy) => zoomTo(zoomRef.current * factor, cx, cy);
  useLayoutEffect(() => {
    const a = anchor.current, el = stageRef.current;
    if (!a || !el) return;
    anchor.current = null;
    el.scrollLeft = a.fx * el.scrollWidth - a.mx;
    el.scrollTop = a.fy * el.scrollHeight - a.my;
  }, [zoom]);
  const resetFit = () => { zoomRef.current = 1; setZoom(1); stageRef.current?.scrollTo(0, 0); };

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return; // the viewer isn't on screen while the dashboard is showing
    const onWheel = e => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [view]);

  // left-button drag moves (pans) the image; zoom is the mouse wheel or the − / + buttons
  const onDown = e => {
    if (e.button !== 0) return;
    const el = stageRef.current;
    drag.current = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop };
    el.setPointerCapture(e.pointerId);
  };
  const onMove = e => {
    const d = drag.current, el = stageRef.current;
    if (!d) return;
    el.scrollLeft = d.l - (e.clientX - d.x);
    el.scrollTop = d.t - (e.clientY - d.y);
  };
  const onUp = () => { drag.current = null; };

  const pages = Math.max(1, Math.ceil(data.total / SIZE));
  const from = data.total ? (page - 1) * SIZE + 1 : 0;
  const to = Math.min(page * SIZE, data.total);
  const submitGo = () => {
    const n = parseInt(goVal, 10);
    if (Number.isNaN(n)) return;
    setPage(Math.min(pages, Math.max(1, n)));
  };

  const go = d => setSel(s => Math.min(data.rows.length - 1, Math.max(0, s + d)));
  const onKey = e => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  };
  const headerSort = key => {
    if (sort === key) setDir(d => (d === 'asc' ? 'desc' : 'asc')); else { setSort(key); setDir('asc'); }
    setPage(1);
  };
  const thumbStart = Math.max(0, Math.min(sel - 2, data.rows.length - 5));
  const thumbs = data.rows.slice(thumbStart, thumbStart + 5);

  return (
    <div className="app" onKeyDown={onKey} tabIndex={0}>
      <header className="top">
        <div className="brand">
          <img src="/logo-circle.png" alt="Aurexus" />
          <b>Medusa</b>
        </div>
        <nav className="menu" aria-label="Main">
          <button className={view === 'dashboard' ? 'on' : ''} onClick={() => setView('dashboard')}>{t.dashboard}</button>
          <button className={view === 'images' ? 'on' : ''} onClick={() => setView('images')}>Images</button>
        </nav>
        {view === 'images' && (
          <div className="layout-pick" role="group" aria-label={t.layout}>
            {[['data-left', t.layoutDataLeft], ['image-left', t.layoutImageLeft]].map(([v, label]) => (
              <button key={v} className={layout === v ? 'on' : ''} aria-pressed={layout === v} aria-label={label} title={label} onClick={() => chooseLayout(v)}>
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                  <rect className="blk" x={v === 'data-left' ? 2 : 13} y="3" width="9" height="18" rx="1.6" />
                  <rect className="sq" x={v === 'data-left' ? 13 : 2} y="3" width="9" height="8.5" rx="1.6" />
                  <rect className="sq" x={v === 'data-left' ? 13 : 2} y="12.5" width="9" height="8.5" rx="1.6" />
                </svg>
              </button>
            ))}
          </div>
        )}
        <img className="top-logo" src="/logo-wide.png" alt="Aurexus" />
        <span className="badge">{t.project}</span>
        <div className="langpill" role="group" aria-label={t.language}>
          <button className={lang === 'fr' ? 'on' : ''} aria-pressed={lang === 'fr'} onClick={() => chooseLang('fr')}><FlagFR />FR</button>
          <button className={lang === 'en' ? 'on' : ''} aria-pressed={lang === 'en'} onClick={() => chooseLang('en')}><FlagUS />EN</button>
        </div>
      </header>

      {view === 'dashboard' ? (
        <main className="dash">
          <h1>{t.dashboard}</h1>
          <p className="sub">{t.dashSub}</p>
          <div className="dgrid">
            <div className="stack">
            <div className="stat">
              <div className="ico"><svg viewBox="0 0 40 40" width="42" height="42" aria-hidden="true"><path d="M9 3h16l8 8v26H9z" fill="currentColor" /><path d="M25 3l8 8h-8z" fill="currentColor" opacity=".55" /><path d="M14 18h14M14 23h14M14 28h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg></div>
              <div className="body"><span className="lbl">{t.nRecords}</span><b className="num">{stats ? stats.total.toLocaleString() : '–'}</b><span className="desc">{t.nRecordsDesc}</span></div>
              <button className="go" onClick={() => openImages('')}><span className="arrow">›</span><span>{t.viewRecords}</span></button>
            </div>
            <div className="stat">
              <div className="ico"><svg viewBox="0 0 40 40" width="42" height="42" aria-hidden="true"><rect x="5" y="8" width="30" height="24" rx="3" fill="currentColor" /><circle cx="14" cy="16.5" r="3" fill="#fff" /><path d="M8 29l8-8 6 6 5-5 5 7z" fill="#fff" /></svg></div>
              <div className="body"><span className="lbl">{t.nImages}</span><b className="num">{stats ? stats.images.toLocaleString() : '–'}</b><span className="desc">{t.nImagesDesc}</span></div>
              <button className="go" onClick={() => openImages('')}><span className="arrow">›</span><span>{t.viewImages}</span></button>
            </div>
            <div className="stat">
              <div className="ico"><svg viewBox="0 0 40 40" width="42" height="42" aria-hidden="true"><path d="M4 14l16-8 16 8v18H4z" fill="currentColor" /><path d="M4 14h32v6H4z" fill="currentColor" opacity=".55" /><rect x="15" y="22" width="10" height="4" rx="1" fill="#fff" /></svg></div>
              <div className="body"><span className="lbl">{t.nFolders}</span><b className="num">{stats ? stats.folders.length : '–'}</b><span className="desc">{t.nFoldersDesc}</span></div>
              <button className="go" onClick={() => openImages('')}><span className="arrow">›</span><span>{t.viewFolders}</span></button>
            </div>
            </div>
          <div className="index">
            <div className="index-h"><span className="ico-sm"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h7M9 16h7" /></svg></span><h2>{t.folderIndex}</h2></div>
            {!stats && <div className="row muted">{t.loading}</div>}
            {stats && stats.folders.map(f => (
              <button key={f.report} className="row" onClick={() => openImages(f.report)}>
                <span>{f.report}</span>
                <span className="right"><span className="sub2">{f.images.toLocaleString()} {t.imagesWord}</span><span className="pill">{f.n.toLocaleString()}</span></span>
              </button>
            ))}
          </div>
          </div>
        </main>
      ) : (
      <main className={'main' + (layout === 'image-left' ? ' swap' : '')}>
        <section className="card list">
          <div className="card-h">{t.records} <small>({data.total.toLocaleString()} {t.images})</small></div>
          <div className="tools">
            <select value={field} onChange={e => { setField(e.target.value); setPage(1); }} aria-label={t.searchIn}>
              {FIELDS.map(f => <option key={f} value={f}>{f === 'all' ? t.allFields : t[f]}</option>)}
            </select>
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder={field === 'all' ? t.placeholderAll : t.placeholder} aria-label={t.searchIn} />
            <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} aria-label={t.sortAria}>
              {COLUMNS.map(k => <option key={k} value={k}>{t.sortBy(t[k])}</option>)}
            </select>
            <button onClick={() => setDir(d => (d === 'asc' ? 'desc' : 'asc'))} title={t.toggleDir}>{dir === 'asc' ? t.asc : t.desc}</button>
          </div>
          <div className="filters">
            {[
              ['report', t.folder, opts.reports, v => v],
              ['year', t.year, opts.years, v => v],
              ['month', t.month, opts.months, monthName],
              ['country', t.country, opts.countries, v => v],
              ['client', t.client, opts.clients, v => v],
            ].map(([k, label, list, fmt]) => (
              <select key={k} value={filters[k]} className={filters[k] ? 'active' : ''} onChange={e => setFilter(k, e.target.value)} aria-label={label}>
                <option value="">{label}: {t.all}</option>
                {list.map(v => <option key={v} value={v}>{fmt(v)}</option>)}
              </select>
            ))}
            {anyFilter && <button className="clear" onClick={() => { setFilters({ report: '', year: '', month: '', country: '', client: '' }); setPage(1); }}>{t.clear}</button>}
          </div>
          <div className="tbl-wrap">
            <table>
              <thead><tr>
                {COLUMNS.map(k => (
                  <th key={k} onClick={() => headerSort(k)} aria-sort={sort === k ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    {t[k]}{sort === k ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={r.Id} ref={el => (rowRefs.current[i] = el)} className={i === sel ? 'sel' : ''} onClick={() => setSel(i)} onDoubleClick={() => openQc(r)}>
                    <td>{r.year}</td><td>{r.month}</td><td>{r.country}</td><td>{r.client}</td><td>{r.image}</td><td>{r.page}</td>
                  </tr>
                ))}
                {!loading && !error && data.rows.length === 0 && <tr><td colSpan={6} className="empty">{t.empty}</td></tr>}
              </tbody>
            </table>
            {error && <div className="err">{t.error(error)}</div>}
          </div>
          <div className="pager">
            <button className="nav" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t.previous}</button>
            <span className="range">{from}–{to} {t.of} {data.total.toLocaleString()}</span>
            <button className="nav" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>{t.next}</button>
            <span className="grow" />
            <div className="goto">
              <label htmlFor="goto">{t.goTo}</label>
              <input id="goto" type="number" min="1" max={pages} value={goVal}
                onChange={e => setGoVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitGo()} />
              <span>/ {pages}</span>
              <button className="nav" onClick={submitGo}>{t.go}</button>
            </div>
          </div>
        </section>

        <section className="card viewer">
          <div className="vbar">
            <span className="vname">{current ? `${current.name} · ${current.country ?? ''}` : t.noImage}</span>
            <span className="grow" />
            <button onClick={() => go(-1)} disabled={sel <= 0}>{t.prevImg}</button>
            <button onClick={() => go(1)} disabled={sel >= data.rows.length - 1}>{t.nextImg}</button>
            <button onClick={() => openQc(current)} disabled={!current}>{t.qc}</button>
            {current && <a className="btn" href={current.link} target="_blank" rel="noreferrer">{t.open}</a>}
          </div>
          <div className="stagewrap">
            <div ref={stageRef} className="stage"
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <div className="stage-in">
                {current && !imgFailed && (
                  <img key={current.link} src={current.link} alt={current.name} draggable={false}
                    style={{ width: fit ? fit * zoom : 'auto', maxWidth: fit ? 'none' : '100%', maxHeight: fit ? 'none' : '100%', opacity: fit ? 1 : 0 }}
                    onLoad={e => setNat({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                    onError={() => setImgFailed(true)} />
                )}
              </div>
            </div>
            {current && !fit && !imgFailed && <div className="msg">{t.loadingImage}</div>}
            {imgFailed && <div className="msg">{t.imgFailed}</div>}
            <div className="zoombox">
              <button onClick={() => zoomBy(1 / 1.25)} disabled={zoom <= MIN_ZOOM} aria-label={t.zoomOut}>−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button className="pri" onClick={() => zoomBy(1.25)} disabled={zoom >= MAX_ZOOM} aria-label={t.zoomIn}>+</button>
              <button onClick={resetFit} disabled={zoom === 1}>{t.fit}</button>
            </div>
          </div>
          <div className="thumbs">
            <span>{fit || !current ? '' : t.loadingImages}</span>
            {thumbs.map((r, i) => (
              <button key={r.Id} className={thumbStart + i === sel ? 'on' : ''} onClick={() => setSel(thumbStart + i)} title={r.name}>
                <img src={r.link} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      </main>
      )}
      {qc && (
        <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && closeQc()}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="qc-title" onKeyDown={e => e.stopPropagation()}>
            <div className="modal-h">
              <span className="qc-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2V5a1 1 0 0 1 1-1z" /><path d="M9 14l2 2 4-4" /></svg>
              </span>
              <div className="titles">
                <h2 id="qc-title">{t.qcTitle}</h2>
                <p>{t.qcSub}</p>
              </div>
              <button className="x" onClick={closeQc} aria-label={t.close}>×</button>
            </div>

            <div className="qc-rec">
              <div><small>{t.record}</small><b>{qc.rec.name}</b></div>
              <div><small>{t.folder}</small><span className="chip">{qc.rec.ReportCode}</span></div>
            </div>

            <h3 className="sec">{t.secDetails}</h3>
            <div className="qc-grid">
              <label>{t.year}<input type="number" autoFocus value={qc.year} onChange={e => setQc({ ...qc, year: e.target.value })} /></label>
              <label>{t.month}
                <select value={qc.month} onChange={e => setQc({ ...qc, month: e.target.value })}>
                  <option value="" />
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{monthName(m)}</option>)}
                </select>
              </label>
              <label>{t.country}<input value={qc.country} onChange={e => setQc({ ...qc, country: e.target.value })} /></label>
              <label>{t.client}<input value={qc.client} onChange={e => setQc({ ...qc, client: e.target.value })} /></label>
            </div>

            <h3 className="sec">{t.secComment}</h3>
            <div className="qc-grid">
              <label className="full">
                <textarea rows={4} maxLength={500} aria-label={t.comment} placeholder={t.commentPh} value={qc.comment} onChange={e => setQc({ ...qc, comment: e.target.value })} />
                <span className="count">{qc.comment.length} / 500</span>
              </label>
            </div>

            <div className="modal-f">
              <span className="note">{t.qcNote}</span>
              <button onClick={closeQc}>{t.cancel}</button>
              <button className="save" onClick={closeQc}>{t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
