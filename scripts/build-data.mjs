// Converts data/data.csv (the consolidated sheet) into src/data/records.json.
// Re-run `npm run build:data` whenever the CSV is replaced.
import fs from 'fs';

const src = process.argv[2] || 'data/data.csv';
const text = fs.readFileSync(src, 'utf8').replace(/^\uFEFF/, '');
const first = text.split(/\r?\n/, 1)[0];
const delim = [',', ';', '\t'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];

function parse(t) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}

const clean = v => { const s = String(v ?? '').replace(/\u00a0/g, ' ').trim(); return s === '' ? null : s; };
const warnings = [];
const num = (v, label, n) => {
  const s = clean(v); if (s === null) return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const m = s.match(/\d+/);
  warnings.push(`row ${n}: ${label} "${s}" ${m ? 'cleaned to ' + m[0] : 'is not a number, left empty'}`);
  return m ? parseInt(m[0], 10) : null;
};

const data = parse(text);
const header = data[0].map(h => String(h ?? '').trim().toUpperCase());
const col = n => header.indexOf(n);
const C = { sno: 0, rapport: col('RAPPORT'), year: col('YEAR'), month: col('MONTH'), country: col('COUNTRY'), code: col('CODE'),
  client: col('CLIENT NAME'), category: col('CATEGORY'), num: col('IMAGE NUMBER'), page: col('DOCUMENT PAGE'),
  folder: col('FOLDER NAME'), iname: col('IMAGE NAME'), link: col('IMAGE LINK') };
const missing = Object.entries(C).filter(([, i]) => i < 0).map(([k]) => k);
if (missing.length) { console.error('Columns not found in the CSV header: ' + missing.join(', ')); process.exit(1); }

const out = [];
data.slice(2).forEach((r, i) => {            // row 2 is the French header
  const link = clean(r[C.link]);
  if (!link) return;
  const n = i + 3;
  out.push({
    Id: out.length + 1, ReportCode: clean(r[C.folder])?.toUpperCase() ?? null, Rapport: clean(r[C.rapport]),
    year: num(r[C.year], 'YEAR', n), month: num(r[C.month], 'MONTH', n), country: clean(r[C.country]), code: clean(r[C.code]),
    client: clean(r[C.client]), category: clean(r[C.category]), image: num(r[C.num], 'IMAGE NUMBER', n),
    page: num(r[C.page], 'DOCUMENT PAGE', n), name: clean(r[C.iname]), link,
  });
});
fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/records.json', JSON.stringify(out));
const per = {}; out.forEach(r => (per[r.ReportCode] = (per[r.ReportCode] || 0) + 1));
console.log(`Wrote src/data/records.json – ${out.length} records`, per, `| distinct images: ${new Set(out.map(r => r.link)).size}`);
warnings.forEach(w => console.log('  ' + w));
