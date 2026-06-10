// Renders content.json -> Synergit.docx using the format profile in gen.js
const G = require("./gen.js");
const {
  fs, path, Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, LevelFormat,
  LevelSuffix, Footer, PageNumber, VerticalAlign, Bookmark, FIG, FRONT, BACK, FONT,
  pngSize, runs,
} = G;

const data = JSON.parse(fs.readFileSync(path.join(G.REPORT_ROOT, "content.json"), "utf8"));

// ---------- styling constants (mirror reference docx) ----------
const BLUE = "4F81BD";        // heading 2/3 accent (matches reference)
const HDR_SHADE = "F6F8FA";   // soft grey header row (matches LaTeX sgCream)
const BORDER = { style: BorderStyle.SINGLE, size: 4, color: "D0D7DE" };
const CELL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const CODE_RE = /(^|\n)\s*(\/\/|func |const |router\.|response\.|var )/;

function isCode(t){ return CODE_RE.test(t); }

// paragraph text with \n -> line breaks
// Insert zero-width break opportunities so long identifiers (auth.user_roles,
// notification.user_notifications) wrap inside narrow table cells instead of clipping.
function softWrap(text){
  return String(text).replace(/([._\/])(?=\S)/g, "$1\u200B");
}
function multilineRuns(text, base={}){
  const lines = String(text).split("\n");
  const out = [];
  lines.forEach((ln, i) => {
    if (i > 0) out.push(new TextRun({ break: 1, font: base.font || FONT }));
    runs(softWrap(ln), base).forEach(r => out.push(r));
  });
  return out;
}

// ---------- block renderers ----------
function pPara(text, left=0, firstLine=0, alignment=AlignmentType.LEFT){
  if (isCode(text)){
    return new Paragraph({
      spacing:{ after: 120, line: 360 },
      indent:{ left },
      shading:{ type:"clear", fill:"F3F3F3" },
      border:{ top:BORDER,bottom:BORDER,left:BORDER,right:BORDER },
      children: multilineRuns(text, { font:"Consolas", size:18 }),
    });
  }
  return new Paragraph({
    alignment,
    spacing:{ after: 0, line: 360 },
    indent:{ left, firstLine },
    children: multilineRuns(text),
  });
}

function pBullets(items, left=0){
  return items.map(it => new Paragraph({
    bullet:{ level: 0 },
    alignment: AlignmentType.LEFT,
    indent:{ left: left + 420, hanging: 240 },
    spacing:{ after: 20, line: 360 },
    children: runs(it),
  }));
}

function pNumbered(items, left=0){
  return items.map((it, i) => new Paragraph({
    alignment: AlignmentType.LEFT,
    indent:{ left: left + 520, hanging: 280 },
    spacing:{ after: 20, line: 360 },
    children: [
      new TextRun({ text: `${i + 1}. `, font: FONT }),
      ...runs(it),
    ],
  }));
}

function pBracketedNumbered(items, left=0){
  return items.map((it, i) => new Paragraph({
    alignment: AlignmentType.LEFT,
    indent:{ left: left + 520, hanging: 360 },
    spacing:{ after: 20, line: 360 },
    children: [
      new TextRun({ text: `[${i + 1}] `, font: FONT }),
      ...runs(it),
    ],
  }));
}

let curChap = 0, tblN = 0, figN = 0;
function setChapter(n){ curChap = n; tblN = 0; figN = 0; }
function caption(prefix, text, number, anchor){
  const label = number ? `${prefix} ${curChap}.${number}: ` : `${prefix} `;
  const capStyle = prefix === "Bảng" ? "ChuThichBang" : "ChuThichHinh";
  const children = [
    new TextRun({ text: label, italics:true, font:FONT, size:24 }),
    ...runs(text, { italics:true, size:24 }),
  ];
  return new Paragraph({
    style: capStyle,
    alignment: AlignmentType.CENTER,
    spacing:{ before: 120, after: 160 },
    keepNext: true,
    children: anchor ? [new Bookmark({ id: anchor, children })] : children,
  });
}

function colWidths(header, ncol){
  if (ncol === 2) return [28, 72];
  if (header && header[0] === "STT" && ncol === 4) return [8, 26, 24, 42];
  if (header && header[0] === "STT" && ncol === 3) return [8, 32, 60];
  if (ncol === 5) return [24, 20, 19, 19, 18];
  return Array(ncol).fill(Math.floor(100/ncol));
}

function tableCell(text, { headerRow=false, width }={}){
  return new TableCell({
    width:{ size: width, type: WidthType.PERCENTAGE },
    borders: CELL_BORDERS,
    shading: headerRow ? { type:"clear", fill: HDR_SHADE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins:{ top:40, bottom:40, left:80, right:80 },
    children:[ new Paragraph({
      alignment: headerRow ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing:{ after: 0, line: 360 },
      children: multilineRuns(text, headerRow ? { bold:true } : {}),
    })],
  });
}

function pTable(block){
  const out = [];
  if (block.caption){
    tblN++;
    out.push(caption("Bảng", block.caption, tblN, block.anchor));
  }
  const ncol = (block.header || block.rows[0]).length;
  const widths = colWidths(block.header, ncol);
  const rows = [];
  if (block.header){
    rows.push(new TableRow({ tableHeader:true, children:
      block.header.map((h,i)=> tableCell(h,{ headerRow:true, width:widths[i] })) }));
  }
  for (const r of block.rows){
    rows.push(new TableRow({ children:
      r.map((c,i)=> tableCell(c,{ width:widths[i] || Math.floor(100 / r.length) })) }));
  }
  out.push(new Table({
    style: "TableGrid",
    width:{ size: 100, type: WidthType.PERCENTAGE },
    borders:{ top:BORDER,bottom:BORDER,left:BORDER,right:BORDER,
      insideHorizontal:BORDER, insideVertical:BORDER },
    rows,
  }));
  out.push(new Paragraph({ spacing:{ after: 80 }, children:[] }));
  return out;
}

function pFigure(block){
  const out = [];
  figN++;
  const map = FIG[block.caption];
  if (map && fs.existsSync(map[0])){
    const [file, maxW] = map;
    const { w, h } = pngSize(file);
    const dispW = Math.min(maxW, w);
    const dispH = Math.round(dispW * h / w);
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:{ before: 120, after: 60 },
      keepNext: true,
      children:[ new ImageRun({
        data: fs.readFileSync(file),
        transformation:{ width: dispW, height: dispH },
      })],
    }));
  } else {
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:{ before:120, after:60 },
      children:[ new TextRun({ text:"[Hình]", italics:true, font:FONT, color:"999999" }) ],
    }));
  }
  out.push(caption("Hình", block.caption, figN, block.anchor));
  return out;
}
module.exports = { data, pPara, pBullets, pNumbered, pBracketedNumbered, pTable, pFigure, caption, setChapter,
  multilineRuns, BLUE };
