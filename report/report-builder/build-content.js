// LaTeX -> content.json for Synergit DOCX builder
// Reads from the PARENT folder (synergit-report/) so the bundle stays self-contained.
// Usage: node build-content.js
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
// The bundle lives inside synergit-report/. The LaTeX source is the parent
// folder. Override with SYNERGIT_LATEX_DIR env var if needed.
const LATEX = process.env.SYNERGIT_LATEX_DIR
  ? path.resolve(process.env.SYNERGIT_LATEX_DIR)
  : path.resolve(ROOT, '..');
const MAIN = path.join(LATEX, 'main.tex');

function read(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; }
function stripComments(s) { return s.split('\n').map(l => l.replace(/(^|[^\\])%.*/, '$1')).join('\n'); }
function firstBrace(s) { const m = /\{([^{}]*)\}/.exec(s); return m ? cleanInline(m[1]) : ''; }
function braced(s, cmd) {
  const re = new RegExp('\\\\' + cmd + '\\{');
  const m = re.exec(s); if (!m) return '';
  let i = m.index + m[0].length, d = 1, out = '';
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) break; }
    out += c;
  }
  return cleanInline(out);
}
function macroMap(main) {
  const out = {};
  for (const m of main.matchAll(/\\newcommand\{\\([^}]+)\}\{([\s\S]*?)\}/g)) out[m[1]] = cleanInline(m[2]);
  return out;
}
function texPath(input) {
  let p = input.trim();
  if (!p.endsWith('.tex')) p += '.tex';
  return path.join(LATEX, p);
}
function applyVars(s, vars) {
  return s.replace(/\\([A-Za-z][A-Za-z0-9]*)/g, (m, k) => vars[k] ?? m);
}
function expandInputs(s, seen = new Set()) {
  return s.replace(/\\input\{([^}]+)\}/g, (_, p) => {
    const file = texPath(p);
    if (seen.has(file)) return '';
    seen.add(file);
    return '\n' + expandInputs(stripComments(read(file)), seen) + '\n';
  });
}

// Build cover blocks supporting 1-person OR 2-person teams.
// Synergit defaults to 1 person (no \SVHai/\MSSVHai), but the parser
// gracefully includes the second SV when those macros exist.
function coverBlocks(vars) {
  const studentLines = [`Sinh viên thực hiện : ${vars.SVMot} -- ${vars.MSSVMot}`];
  if (vars.SVHai && vars.MSSVHai) {
    studentLines.push(`${vars.SVHai} -- ${vars.MSSVHai}`);
  }
  return [
    vars.BoGiaoDuc, vars.TruongDH, vars.Khoa,
    'BÁO CÁO', vars.TenMonHoc, vars.TenDeTaiNgan,
    (vars.TenDeTai || '').replace(/\\\\/g, ' ')
      .replace(/^\\+\s*/g, '')
      .replace(/(^|\n)\\+\s*/g, '$1')
      .replace(/\\(?=\s|$)/g, '')
      .replace(/^.*\|(?=\*\*|[A-Za-zÀ-ỹ0-9])/s, '')
      .replace(/§AMP§/g, '&'),
    `Giảng viên hướng dẫn : ${vars.GVHD}`,
    `Lớp : ${vars.Lop}`,
    ...studentLines,
    vars.DiaDiemThoiGian,
  ].filter(Boolean).map(text => ({ type: 'paragraph', text }));
}

function cleanInline(s) {
  return String(s || '')
    .replace(/\\textbf\{([^{}]*)\}/g, '**$1**')
    .replace(/\\textit\{([^{}]*)\}/g, '*$1*')
    .replace(/\\emph\{([^{}]*)\}/g, '*$1*')
    .replace(/\\texttt\{([^{}]*)\}/g, '`$1`')
    .replace(/``/g, '“').replace(/''/g, '”')
    .replace(/---/g, '—').replace(/--/g, '–')
    .replace(/\\ldots/g, '…')
    .replace(/\\&/g, '§AMP§').replace(/\\%/g, '%').replace(/\\_/g, '_')
    .replace(/\\#/g, '#').replace(/\\\$/g, '$')
    .replace(/\$\\rightarrow\$/g, '→').replace(/\\rightarrow/g, '→')
    .replace(/\$\\to\$/g, '→').replace(/\\to/g, '→')
    .replace(/\\hspace\{[^}]+\}/g, '')
    .replace(/\\\\\[[^\]]+\]/g, ' ')
    .replace(/\\noindent/g, '')
    .replace(/\\(?:setstretch|fontsize|selectfont|vspace|vfill|centering|bfseries|itshape|small|scriptsize|footnotesize|color|rowcolor|arraystretch|renewcommand)\*?(\[[^\]]*\])?(\{[^{}]*\})*/g, '')
    .replace(/\\begin\{(?:flushright|center)\}|\\end\{(?:flushright|center)\}/g, '')
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\\\\/g, ' ')
    .replace(/^\\+\s*/g, '')
    .replace(/(^|\n)\\+\s*/g, '$1')
    .replace(/\\(?=\s|$)/g, '')
    .replace(/^.*\|(?=\*\*|[A-Za-zÀ-ỹ0-9])/s, '')
    .replace(/§AMP§/g, '&')
    .replace(/[ \t]+/g, ' ')
    .trim();
}
function splitTopRows(body) {
  return body.split(/\\\\\s*(?:\\hline)?/g).map(x => x.trim()).filter(Boolean);
}
function parseTable(raw) {
  const custom = /^\\begin\{(ucspec|dbtable)\}\{([^}]*)\}\{([^}]*)\}/.exec(raw.trim());
  const cap = custom ? cleanInline(custom[3]) : (braced(raw, 'caption') || 'Bảng dữ liệu');
  let body = raw
    .replace(/^\\begin\{(?:ucspec|dbtable)\}\{[^}]*\}\{[^}]*\}\s*/g, '')
    .replace(/\\end\{(?:ucspec|dbtable)\}/g, '')
    .replace(/\caption\{[\s\S]*?\}[^\n]*/g, '')
    .replace(/\label\{[^}]+\}/g, '')
    .replace(/\endfirsthead[\s\S]*?\endhead/g, '')
    .replace(/\begin\{(?:longtable|tabular)\}(?:\[[^\]]*\])?\{[\s\S]*?\}\s*/g, '')
    .replace(/\end\{(?:longtable|tabular)\}/g, '')
    .replace(/\multicolumn\{\d+\}\{[^}]+\}\{([^{}]*)\}/g, '$1')
    .replace(/\hline|\rowcolor\{[^}]+\}/g, '');
  const rows = body.split(/\\\\/g)
    .map(r => r.trim())
    .filter(r => r.includes('&'))
    .map(r => r.split(/(?<!\\)&/g).map(c => cleanInline(c)))
    .filter(r => r.length > 1 && r.some(Boolean));
  if (!rows.length) return null;
  if (custom && custom[1] === 'ucspec') {
    return { type: 'table', caption: cap, header: ['Trường', 'Giá trị'], rows };
  }
  if (custom && custom[1] === 'dbtable') {
    return { type: 'table', caption: cap, header: ['STT', 'Tên trường', 'Kiểu dữ liệu', 'Mô tả'], rows };
  }
  const header = rows[0].map(x => x.replace(/^.*\|/, '').trim()).filter(Boolean);
  return { type: 'table', caption: cap, header: header.length === rows[0].length ? header : rows[0], rows: rows.slice(1) };
}
function parseItems(body) {
  return [...body.matchAll(/\\item\s+([\s\S]*?)(?=\\item|$)/g)].map(m => cleanInline(m[1])).filter(Boolean);
}
function pushPara(out, buf) {
  const t = cleanInline(buf.join(' '));
  if (t) out.push({ type: 'paragraph', text: t });
  buf.length = 0;
}
function parse(tex) {
  const out = [];
  let s = stripComments(tex)
    .replace(/\\clearpage|\\pagenumbering\{[^}]+\}|\\tableofcontents|\\listoftables|\\listoffigures/g, '')
    .replace(/\\addcontentsline\{[^}]+\}\{[^}]+\}\{[^}]+\}/g, '');

  const token = /(\\chapter\*?\{[^}]+\}|\\section\{[^}]+\}|\\subsection\{[^}]+\}|\\subsubsection\{[^}]+\}|\\figauto\{[^}]+\}\{[^}]+\}\{[^}]+\}|\\begin\{flushright\}[\s\S]*?\\end\{flushright\}|\\begin\{itemize\}[\s\S]*?\\end\{itemize\}|\\begin\{enumerate\}[\s\S]*?\\end\{enumerate\}|\\begin\{lstlisting\}[\s\S]*?\\end\{lstlisting\}|\\begin\{longtable\}[\s\S]*?\\end\{longtable\}|\\begin\{tabular\}[\s\S]*?\\end\{tabular\}|\\begin\{ucspec\}[\s\S]*?\\end\{ucspec\}|\\begin\{dbtable\}[\s\S]*?\\end\{dbtable\}|\\begin\{figure\}[\s\S]*?\\end\{figure\})/g;
  let last = 0, buf = [];
  for (const m of s.matchAll(token)) {
    const before = s.slice(last, m.index).trim();
    if (before) before.split(/\n\s*\n/).forEach(p => { if (p.trim()) out.push({ type: 'paragraph', text: cleanInline(p) }); });
    const x = m[0];
    if (x.startsWith('\\chapter')) out.push({ type: 'chapter', text: firstBrace(x) });
    else if (x.startsWith('\\section')) out.push({ type: 'section', level: 1, text: firstBrace(x) });
    else if (x.startsWith('\\subsection')) out.push({ type: 'section', level: 2, text: firstBrace(x) });
    else if (x.startsWith('\\subsubsection')) out.push({ type: 'section', level: 2, text: firstBrace(x) });
    else if (x.startsWith('\\figauto')) {
      const parts = [...x.matchAll(/\{([^{}]*)\}/g)].map(z => cleanInline(z[1]));
      out.push({ type: 'figure', caption: parts[1] || parts[0] || 'Hình minh hoạ' });
    } else if (x.startsWith('\\begin{figure}')) {
      const cap = braced(x, 'caption'); if (cap) out.push({ type: 'figure', caption: cap });
    } else if (x.startsWith('\\begin{flushright}')) {
      const body = x.replace(/^.*?\\begin\{flushright\}/s, '').replace(/\\end\{flushright\}.*$/s, '');
      body.split(/\\\\(?:\[[^\]]+\])?/g)
        .map(p => cleanInline(p))
        .filter(Boolean)
        .forEach(text => out.push({ type: 'paragraph', text, align: 'right' }));
    } else if (x.startsWith('\\begin{itemize}')) {
      const items = parseItems(x.replace(/^.*?\\begin\{itemize\}/s, '').replace(/\\end\{itemize\}.*$/s, ''));
      if (items.length) out.push({ type: 'bullets', items });
    } else if (x.startsWith('\\begin{enumerate}')) {
      const items = parseItems(x.replace(/^.*?\\begin\{enumerate\}/s, '').replace(/\\end\{enumerate\}.*$/s, ''));
      if (items.length) out.push({ type: 'numbered', items });
    } else if (x.startsWith('\\begin{lstlisting}')) {
      const code = x.replace(/^.*?\n/, '').replace(/\\end\{lstlisting\}[\s\S]*$/, '').trim();
      if (code) out.push({ type: 'paragraph', text: code });
    } else {
      const tbl = parseTable(x); if (tbl) out.push(tbl);
    }
    last = m.index + x.length;
  }
  const tail = s.slice(last).trim();
  if (tail) tail.split(/\n\s*\n/).forEach(p => { if (p.trim()) out.push({ type: 'paragraph', text: cleanInline(p) }); });
  return out.filter(b => {
    if (b.text && /^(?:[0-9.]+|titlepage|minipage|tabular|flushright|center)$/i.test(b.text.trim())) return false;
    return b.text !== '' || b.items || b.rows || b.caption;
  });
}

if (!fs.existsSync(MAIN)) {
  console.error(`✗ main.tex not found at ${MAIN}`);
  console.error(`  Run from inside the bundle, or set SYNERGIT_LATEX_DIR to your synergit-report/ folder.`);
  process.exit(1);
}
console.log(`→ Reading LaTeX from ${LATEX}`);

const main = stripComments(read(MAIN));
const vars = macroMap(main);
const body = main.replace(/[\s\S]*?\\begin\{document\}/, '').replace(/\\end\{document\}[\s\S]*/, '').replace(/\\begin\{titlepage\}[\s\S]*?\\end\{titlepage\}/, '');
const expanded = applyVars(expandInputs(applyVars(body, vars)), vars);
const frontHeads = new Set(['Bảng phân công công việc', 'Lời cảm ơn', 'Danh mục từ viết tắt', 'TÓM TẮT ĐỀ TÀI', 'TÀI LIỆU THAM KHẢO']);
const parsed = parse(expanded).map(b => (b.type === 'paragraph' && frontHeads.has(b.text)) ? { type: 'chapter', text: b.text } : b);
const data = [...coverBlocks(vars), ...parsed];
const outPath = path.join(LATEX, 'content.json');
fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
console.log('✓ WROTE', outPath, 'with', data.length, 'blocks');
