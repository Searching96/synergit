// Assembler: content.json -> Synergit.docx (format mirrors BaoCao reference)
const G = require("./gen.js");
const R = require("./build-docx.js");
const {
  fs, path, Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Footer, PageNumber, FRONT, BACK, FONT, ImageRun, pngSize, LevelFormat, LevelSuffix,
  Table, TableRow, TableCell, WidthType, BorderStyle, HeightRule, SimpleField,
  Bookmark, InternalHyperlink, PageReference, Tab,
  REPORT_ROOT,
} = G;
const { data, pPara, pBullets, pNumbered, pBracketedNumbered, pTable, pFigure, setChapter, BLUE } = R;

const isReal = t => !FRONT.has(t) && !BACK.has(t);

// ----- cover: leading paragraphs before first chapter -----
let firstChapter = data.findIndex(b => b.type === "chapter");
const coverBlocks = data.slice(0, firstChapter);
const bodyBlocks = data.slice(firstChapter);

function coverParagraphs(){
  const t = coverBlocks.map(b => b.text);
  const C = (text, sz, opts={}) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing:{ before: opts.before||0, after: opts.after||0, line: 312 },
    children:[ new TextRun({ text, bold:true, size: sz, font: FONT }) ],
  });
  const blank = (after=0) => new Paragraph({ spacing:{ after }, children:[
    new TextRun({ text:"", font: FONT, size: 28 }) ] });
  const borderedCover = content => new Table({
    width:{ size: 100, type: WidthType.PERCENTAGE },
    borders:{
      top:{ style: BorderStyle.DOUBLE, size: 8, color: "000000" },
      bottom:{ style: BorderStyle.DOUBLE, size: 8, color: "000000" },
      left:{ style: BorderStyle.DOUBLE, size: 8, color: "000000" },
      right:{ style: BorderStyle.DOUBLE, size: 8, color: "000000" },
      insideHorizontal:{ style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical:{ style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows:[new TableRow({
      height:{ value: 14200, rule: HeightRule.EXACT },
      children:[new TableCell({
        borders:{
          top:{ style: BorderStyle.DOUBLE, size: 8, color: "000000" },
          bottom:{ style: BorderStyle.DOUBLE, size: 8, color: "000000" },
          left:{ style: BorderStyle.DOUBLE, size: 8, color: "000000" },
          right:{ style: BorderStyle.DOUBLE, size: 8, color: "000000" },
        },
        margins:{ top: 720, bottom: 360, left: 360, right: 360 },
        children: content,
      })],
    })],
  });
  const out = [];
  // --- School header (14pt bold center) ---
  out.push(C(t[0], 28, { before: 120 }));
  out.push(C(t[1], 32));
  out.push(C(t[2], 32, { after: 120 }));
  // --- Logo (~3cm height) — looks for logo_truong.png (underscore) or
  //     logo-truong.png (hyphen) inside synergit-report/image/. ---
  const logo = [
    path.join(REPORT_ROOT, 'image', 'logo_truong.png'),
    path.join(REPORT_ROOT, 'image', 'logo-truong.png'),
    path.join(__dirname, 'latex', 'image', 'logo_truong.png'),
    path.join(__dirname, 'latex', 'image', 'logo-truong.png'),
    path.resolve(REPORT_ROOT, '..', 'latex', 'image', 'logo_truong.png'),
    path.resolve(REPORT_ROOT, '..', 'latex', 'image', 'logo-truong.png'),
  ]
    .find(p => fs.existsSync(p));
  if (logo){
    out.push(new Paragraph({ alignment: AlignmentType.CENTER,
      spacing:{ before: 200, after: 200 },
      children:[ new ImageRun({ data: fs.readFileSync(logo),
        transformation:{ width: 140, height: 114 } }) ] }));
  } else out.push(blank(200));
  // --- Report / subject (16pt bold center) ---
  out.push(C(t[3], 32, { before: 120 }));   // BÁO CÁO
  out.push(C(t[4], 32, { after: 360 }));    // ĐỒ ÁN 2
  // --- Project name + title ---
  out.push(C(t[5], 40, { before: 120, after: 120 }));  // SYNERGIT
  out.push(C(t[6], 32, { after: 120 }));               // full title
  // spacer
  out.push(blank(240));
  // --- Info block: left-aligned bold 14pt with indent ---
  // For Synergit (1-person): t[7..N-1] are GVHD/Lop/SV(s); t[N] is the date.
  // The build-content.js cover supports both 1-person (3 info lines) and
  // 2-person (4 info lines) layouts; index of the date is `t.length - 1`.
  const dateIdx = t.length - 1;
  for (let i = 7; i < dateIdx; i++) {
    const isLast = i === dateIdx - 1;
    out.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      indent:{ left: 2400 },
      spacing:{ after: isLast ? 120 : 100, line: 360 },
      children:[ new TextRun({ text: t[i], bold:true, size:28, font: FONT }) ],
    }));
  }
  // big spacer then date at bottom
  out.push(blank(0)); out.push(blank(0)); out.push(blank(0)); out.push(blank(0));
  out.push(C(t[dateIdx], 28, { before: 480 }));
  return [borderedCover(out)];
}

// ----- headings with manual numbering -----
let chap = 0, sec1 = 0, sec2 = 0;
function headingParagraph(block){
  if (block.type === "chapter"){
    sec1 = 0; sec2 = 0;
    let title = block.text;
    const real = isReal(title);
    if (real){ chap++; title = title.toUpperCase(); setChapter(chap); }
    else { setChapter(0); }
    return new Paragraph({
      style: "Heading1",
      heading: HeadingLevel.HEADING_1,
      numbering: real ? { reference: "synergitHeadings", level: 0 } : undefined,
      alignment: AlignmentType.CENTER,
      indent:{ left: 403, hanging: 403 },
      spacing:{ before: 0, after: 360, line: 360 },
      pageBreakBefore: true,
      keepNext: true,
      children:[
        block.anchor
          ? new Bookmark({ id: block.anchor, children:[ new TextRun({ text: title, bold:true, size:30, color:"000000", font:FONT }) ] })
          : new TextRun({ text: title, bold:true, size:30, color:"000000", font:FONT }),
      ],
    });
  }
  // section
  if (block.level === 1){ sec1++; sec2 = 0; }
  else { sec2++; }
  const sz = block.level === 1 ? 27 : 26;
  const isSubSub = block.text.startsWith("Schema ") || block.text.startsWith("Bảng ") || block.text.startsWith("ERD ");
  const style = block.level === 1 ? "Heading2" : "Heading3";
  const indent = block.level === 1 ? { left: 403, hanging: 403 } : (isSubSub ? { left: 403, firstLine: 317 } : { left: 964, hanging: 510 });
  const numLevel = block.level === 1 ? 1 : (isSubSub ? 3 : 2);
  const headingRuns = require("./build-docx.js").multilineRuns(block.text, { bold:block.level===1, italics:block.level!==1, size:sz, color:"000000" });
  return new Paragraph({
    style,
    numbering: { reference: "synergitHeadings", level: numLevel },
    indent,
    spacing:{ before: 160, after: 100, line: 360 },
    keepNext: true,
    children: block.anchor ? [new Bookmark({ id: block.anchor, children: headingRuns })] : headingRuns,
  });
}

function listTitle(text){
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    pageBreakBefore: true,
    spacing:{ before: 0, after: 240, line: 360 },
    children:[ new TextRun({ text, bold:true, size:30, font:FONT }) ],
  });
}

function listLine(text, left=0, anchor){
  const titleRun = new TextRun({ text, size:26, font:FONT });
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent:{ left },
    tabStops:[{ type: "right", position: 9000, leader: "dot" }],
    spacing:{ after: 40, line: 360 },
    children:[
      anchor ? new InternalHyperlink({ anchor, children:[titleRun] }) : titleRun,
      new Tab(),
      anchor ? new PageReference(anchor) : new TextRun({ text: "", font:FONT }),
    ],
  });
}

function generatedFrontLists(){
  const out = [];
  const toc = [];
  const figures = [];
  const tables = [];
  let c = 0, s1 = 0, s2 = 0, fig = 0, tbl = 0, seq = 0;

  for (const b of bodyBlocks){
    if (b.type === "chapter"){
      s1 = 0; s2 = 0; fig = 0; tbl = 0;
      b.anchor = `toc_${++seq}`;
      if (isReal(b.text)){
        c++;
        toc.push({ text: `Chương ${c}: ${b.text.toUpperCase()}`, left: 0, anchor: b.anchor });
      } else {
        toc.push({ text: b.text, left: 0, anchor: b.anchor });
      }
    } else if (b.type === "section"){
      b.anchor = `toc_${++seq}`;
      if (b.level === 1){
        s1++; s2 = 0;
        toc.push({ text: `${c}.${s1}. ${b.text}`, left: 360, anchor: b.anchor });
      } else {
        s2++;
        toc.push({ text: `${c}.${s1}.${s2}. ${b.text}`, left: 720, anchor: b.anchor });
      }
    } else if (b.type === "figure"){
      b.anchor = `fig_${++seq}`;
      fig++;
      figures.push({ text: `Hình ${c}.${fig}: ${b.caption}`, anchor: b.anchor });
    } else if (b.type === "table"){
      b.anchor = `tbl_${++seq}`;
      tbl++;
      tables.push({ text: `Bảng ${c}.${tbl}: ${b.caption}`, anchor: b.anchor });
    }
  }

  out.push(listTitle("MỤC LỤC"));
  toc.forEach(x => out.push(listLine(x.text, x.left, x.anchor)));
  out.push(listTitle("MỤC LỤC HÌNH ẢNH"));
  figures.forEach(x => out.push(listLine(x.text, 360, x.anchor)));
  out.push(listTitle("MỤC LỤC BẢNG"));
  tables.forEach(x => out.push(listLine(x.text, 360, x.anchor)));
  return out;
}

// ----- build body children -----
const children = [];
let bodyLeft = 0;
let currentChapter = "";
coverParagraphs().forEach(p => children.push(p));
generatedFrontLists().forEach(p => children.push(p));
for (const b of bodyBlocks){
  switch(b.type){
    case "chapter":
      currentChapter = b.text;
      bodyLeft = 0;
      children.push(headingParagraph(b));
      break;
    case "section":
      children.push(headingParagraph(b));
      bodyLeft = b.level === 1 ? 403 : 964;
      break;
    case "paragraph": {
      const indentFrontMatter = currentChapter === "Lời cảm ơn" || currentChapter === "TÓM TẮT ĐỀ TÀI";
      const alignment = b.align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT;
      children.push(pPara(b.text, bodyLeft, indentFrontMatter ? 720 : 0, alignment));
      break;
    }
    case "bullets": pBullets(b.items, bodyLeft).forEach(p=>children.push(p)); break;
    case "numbered": {
      const renderer = currentChapter === "TÀI LIỆU THAM KHẢO" ? pBracketedNumbered : pNumbered;
      renderer(b.items, bodyLeft).forEach(p=>children.push(p));
      break;
    }
    case "table": pTable(b).forEach(x=>children.push(x)); break;
    case "figure": pFigure(b).forEach(x=>children.push(x)); break;
  }
}

// ----- document -----
const doc = new Document({
  creator: "Synergit",
  title: "SYNERGIT – Báo cáo Đồ án 2",
  numbering: {
    config: [{
      reference: "synergitHeadings",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "Chương %1:", suffix: LevelSuffix.NOTHING, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 403, hanging: 403 } } } },
        { level: 1, format: LevelFormat.DECIMAL, text: "%1.%2.", suffix: LevelSuffix.SPACE, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 403, hanging: 403 } } } },
        { level: 2, format: LevelFormat.DECIMAL, text: "%1.%2.%3.", suffix: LevelSuffix.SPACE, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 964, hanging: 510 } } } },
        { level: 3, format: LevelFormat.DECIMAL, text: "%1.%2.%3.%4.", suffix: LevelSuffix.SPACE, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 403, firstLine: 317 } } } },
      ],
    }, {
      reference: "synergitNumbered",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", suffix: LevelSuffix.SPACE, alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 520, hanging: 280 } } } },
      ],
    }],
  },
  styles:{
    default:{
      document:{ run:{ font: FONT, size: 26 },
        paragraph:{ spacing:{ line: 360, after: 120 }, indent:{ firstLine: 0 } } },
    },
    paragraphStyles:[
      { id:"Heading1", name:"Heading 1", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ bold:true, size:30, color:"000000", font:FONT },
        paragraph:{ alignment: AlignmentType.CENTER, spacing:{ before:0, after:360, line:360 },
          indent:{ left:403, hanging:403 }, keepNext:true, pageBreakBefore:true } },
      { id:"Heading2", name:"Heading 2", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ bold:true, size:27, color:"000000", font:FONT },
        paragraph:{ spacing:{ before:160, after:100, line:360 }, keepNext:true,
          indent:{ left:403, hanging:403 } } },
      { id:"Heading3", name:"Heading 3", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ italics:true, size:26, color:"000000", font:FONT },
        paragraph:{ spacing:{ before:160, after:100, line:360 }, keepNext:true } },
      { id:"ChuThichBang", name:"Chú thích bảng", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ italics:true, size:24, color:"000000", font:FONT },
        paragraph:{ alignment: AlignmentType.CENTER, spacing:{ before:120, after:160, line:312 }, keepNext:true } },
      { id:"ChuThichHinh", name:"Chú thích hình", basedOn:"Normal", next:"Normal", quickFormat:true,
        run:{ italics:true, size:24, color:"000000", font:FONT },
        paragraph:{ alignment: AlignmentType.CENTER, spacing:{ before:120, after:160, line:312 }, keepNext:true } },
    ],
  },
  sections:[{
    properties:{
      page:{
        size:{ width: 11907, height: 16839 },
        margin:{ top:1134, right:1134, bottom:1134, left:1701, header:720, footer:720 },
      },
    },
    footers:{
      default: new Footer({ children:[ new Paragraph({
        alignment: AlignmentType.CENTER,
        children:[ new TextRun({ children:[ PageNumber.CURRENT ], font:FONT, size:24 }) ],
      })]}),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = path.join(REPORT_ROOT, "Synergit.docx");
  fs.writeFileSync(out, buf);
  console.log("✓ WROTE", out, buf.length, "bytes;", children.length, "body elements");
}).catch(e => { console.error("✗ ERROR", e); process.exit(1); });
