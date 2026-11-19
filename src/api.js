// In-browser replacement for the old Node/SQL Server API.
// Same behaviour as the server: search, filters, sorting (blanks last) and paging – all on the bundled records.
import RECORDS from './data/records.json';

const text = v => String(v ?? '').toLowerCase();
const cmp = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'fr', { sensitivity: 'accent' }));
const uniq = key => [...new Set(RECORDS.map(r => r[key]).filter(v => v !== null && v !== ''))].sort(cmp);

const SORT_COL = { year: 'year', month: 'month', country: 'country', client: 'client', report: 'ReportCode', image: 'image', page: 'page', name: 'name' };
const TIE = ['year', 'month', 'ReportCode', 'image'];
const SEARCH_FIELDS = ['year', 'month', 'country', 'client'];
const FILTER_COL = { report: 'ReportCode', year: 'year', month: 'month', country: 'country', client: 'client' };

export function getFilters() {
  return { reports: uniq('ReportCode'), years: uniq('year'), months: uniq('month'), countries: uniq('country'), clients: uniq('client') };
}

export function getStats() {
  const per = {};
  RECORDS.forEach(r => { const f = (per[r.ReportCode] ??= { report: r.ReportCode, n: 0, links: new Set() }); f.n++; f.links.add(r.link); });
  return {
    total: RECORDS.length,
    images: new Set(RECORDS.map(r => r.link)).size,
    folders: Object.values(per).sort((a, b) => cmp(a.report, b.report)).map(f => ({ report: f.report, n: f.n, images: f.links.size })),
  };
}

// conds: [{ field: 'all'|'year'|'month'|'country'|'client', q }]  – every condition must match (AND)
export function queryRecords({ conds = [], sort = 'year', dir = 'asc', page = 1, size = 15, filters = {} }) {
  const terms = conds.filter(c => c && String(c.q ?? '').trim()).slice(0, 6)
    .map(c => ({ fields: SEARCH_FIELDS.includes(c.field) ? [c.field] : SEARCH_FIELDS, q: String(c.q).trim().toLowerCase() }));
  const active = Object.entries(filters).filter(([k, v]) => v !== '' && v !== undefined && FILTER_COL[k]);

  let rows = RECORDS.filter(r =>
    terms.every(t => t.fields.some(f => text(r[f]).includes(t.q))) &&
    active.every(([k, v]) => String(r[FILTER_COL[k]] ?? '') === String(v)));

  const col = SORT_COL[sort] || 'year';
  const ties = TIE.filter(k => k !== col);
  rows = [...rows].sort((a, b) => {
    const an = a[col] == null, bn = b[col] == null;
    if (an !== bn) return an ? 1 : -1;                       // blanks always last
    if (!an) { const c = cmp(a[col], b[col]); if (c) return dir === 'desc' ? -c : c; }
    for (const k of ties) {
      const x = a[k], y = b[k];
      if ((x == null) !== (y == null)) return x == null ? -1 : 1;
      if (x != null) { const c = cmp(x, y); if (c) return c; }
    }
    return 0;
  });

  const p = Math.max(1, +page || 1), s = Math.min(200, +size || 50);
  return { total: rows.length, rows: rows.slice((p - 1) * s, p * s) };
}
