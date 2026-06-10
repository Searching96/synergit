#!/usr/bin/env node
// =============================================================================
//  render-diagrams.mjs — Render every TikZ figure from synergit-report/figures/
//  into PNG files under synergit-report/diagram/ so the DOCX builder can
//  embed them.
//
//  Pipeline per figure:
//      figures/<name>.tex
//          → extract \begin{tikzpicture}…\end{tikzpicture} block(s)
//          → wrap in a minimal `standalone` document
//          → tectonic compile  → temp PDF
//          → pdf-to-png-converter → diagram/<name>.png  (300 dpi)
//
//  Some files (e.g. repo-state-fsm.tex) contain MULTIPLE tikzpicture blocks
//  (PR FSM + Issue FSM in this case). Those are split into separate PNGs via
//  the SPLITS map below; each output name must match a key in gen.js's FIG map.
//
//  Usage:
//      npm install                      # gets pdf-to-png-converter
//      node render-diagrams.mjs         # renders every figures/*.tex
//      node render-diagrams.mjs erd-auth repo-state-fsm   # only specific stems
//
//  Requirements:
//      • tectonic.exe in synergit-report/  (or set $env:SYNERGIT_TECTONIC=...)
//      • Node ≥ 18, pdf-to-png-converter package
// =============================================================================

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORT  = resolve(__dirname, '..');
const FIGS    = join(REPORT, 'figures');
const OUT_DIR = join(REPORT, 'diagram');
const TMP     = join(__dirname, '.tmp-figs');
const TECTONIC = process.env.SYNERGIT_TECTONIC || join(REPORT, 'tectonic.exe');

// Common preamble — mirrors the bits of synergit-report/preamble.tex that the
// figures depend on (TikZ libraries, colors, custom ERD styles).
const PREAMBLE = String.raw`
\usepackage{tikz}
\usetikzlibrary{shapes.geometric, arrows.meta, positioning, fit, calc, backgrounds, matrix}
\usepackage{xcolor}
\usepackage{amssymb}
\usepackage{amsmath}
\definecolor{sgBlue}{HTML}{0969DA}
\definecolor{sgInk}{HTML}{1F2328}
\definecolor{sgCream}{HTML}{F6F8FA}
\definecolor{sgLine}{HTML}{D0D7DE}
\definecolor{sgAccent}{HTML}{2DA44E}
\tikzset{
  erdent/.style={draw=sgBlue, fill=sgCream, rounded corners, align=left,
                 inner sep=4pt, font=\scriptsize, text width=3.05cm},
  erdext/.style={draw=sgLine, dashed, fill=white, rounded corners, align=center,
                 inner sep=4pt, font=\scriptsize\itshape, text width=2.6cm},
  erdrel/.style={draw=sgLine, thick},
  erdsoft/.style={draw=sgLine, thick, dashed},
  erdcard/.style={font=\scriptsize, text=sgBlue, fill=white, inner sep=1pt},
}
`;

// Files that contain MORE THAN ONE \begin{tikzpicture} block, split into the
// listed output PNG names (in order). All other files use stem.png by default.
const SPLITS = {
  'repo-state-fsm': ['repo-state-fsm', 'issue-fsm'],
};

const onlyArgs = process.argv.slice(2).map(a => a.replace(/\.tex$/, ''));

// ─── Helpers ──────────────────────────────────────────────────────────────
async function ensureCleanTmp() {
  if (existsSync(TMP)) await rm(TMP, { recursive: true, force: true });
  await mkdir(TMP, { recursive: true });
}

function extractTikzBlocks(src) {
  const re = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g;
  return [...src.matchAll(re)].map(m => m[0]);
}

async function loadPdfToPng() {
  try {
    const mod = await import('mupdf');
    return mod;
  } catch (err) {
    console.error('✗ Missing dependency: mupdf');
    console.error('  Install it inside the bundle:');
    console.error('      cd synergit-report/report-builder');
    console.error('      npm install');
    throw err;
  }
}

async function renderOne(mupdf, name, tikzBlock) {
  const tex =
    `\\documentclass[border=8pt]{standalone}\n` +
    PREAMBLE.trim() + '\n' +
    `\\begin{document}\n` +
    tikzBlock + '\n' +
    `\\end{document}\n`;
  const texFile = join(TMP, `${name}.tex`);
  await writeFile(texFile, tex, 'utf8');

  // Compile to PDF
  execFileSync(TECTONIC, ['-X', 'compile', '--outdir', TMP, texFile], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Convert PDF → PNG via mupdf (pure WASM, no native deps)
  const pdfFile = join(TMP, `${name}.pdf`);
  const pdfBuffer = await readFile(pdfFile);
  const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
  const page = doc.loadPage(0);
  // Scale 3x for ~300 dpi at default 100 dpi rendering
  const pixmap = page.toPixmap(mupdf.Matrix.scale(3, 3), mupdf.ColorSpace.DeviceRGB);
  const png = pixmap.asPNG();
  pixmap.destroy();
  page.destroy();
  doc.destroy();

  await writeFile(join(OUT_DIR, `${name}.png`), Buffer.from(png));
  console.log(`  ✓ ${name}.png (${(png.length / 1024).toFixed(1)} KB)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(TECTONIC)) {
    console.error(`✗ tectonic.exe not found at ${TECTONIC}`);
    console.error(`  Place tectonic.exe in synergit-report/, or set SYNERGIT_TECTONIC.`);
    process.exit(1);
  }

  const pdfToPng = await loadPdfToPng();

  await mkdir(OUT_DIR, { recursive: true });
  await ensureCleanTmp();

  let files = (await readdir(FIGS)).filter(f => f.endsWith('.tex'));
  if (onlyArgs.length) {
    files = files.filter(f => onlyArgs.includes(basename(f, '.tex')));
    if (!files.length) {
      console.error(`✗ no figures matched ${onlyArgs.join(', ')}`);
      process.exit(1);
    }
  }
  console.log(`Synergit diagram renderer · ${files.length} file(s) → ${OUT_DIR}`);

  let ok = 0, fail = 0;
  for (const f of files) {
    const stem = basename(f, '.tex');
    const src = await readFile(join(FIGS, f), 'utf8');
    const blocks = extractTikzBlocks(src);
    if (!blocks.length) {
      console.log(`  · ${stem}: no tikzpicture, skip`);
      continue;
    }
    const outNames = SPLITS[stem] || [stem];
    for (let i = 0; i < blocks.length; i++) {
      const outName = outNames[i] || `${stem}-${i + 1}`;
      try {
        await renderOne(pdfToPng, outName, blocks[i]);
        ok++;
      } catch (err) {
        const msg = String(err.message || err).split('\n')[0];
        console.log(`  ✗ ${outName}: ${msg}`);
        fail++;
      }
    }
  }

  await rm(TMP, { recursive: true, force: true });
  console.log(`\n→ ${ok} rendered, ${fail} failed.`);
  if (fail) process.exit(1);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
