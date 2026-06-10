// Synergit report generator — renders content.json into a .docx
// Format profile mirrors the BaoCao reference (A4, Times New Roman 13pt,
// Chương N: / N.M / N.M.K auto-numbered headings, italic captions).
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  ImageRun, LevelFormat, LevelSuffix, PageBreak, Footer, PageNumber,
  SimpleField, VerticalAlign, HeightRule, Bookmark, InternalHyperlink, PageReference, Tab,
} = require("docx");

const ROOT = __dirname;
// Bundle is shipped as a sub-folder of the LaTeX report; reference the parent.
const REPORT_ROOT = path.resolve(ROOT, "..");
const IMG = path.join(REPORT_ROOT, "image");
const DIA = path.join(REPORT_ROOT, "diagram");

// ---- Figure caption -> image file + max display width (px) ----
// Captions must match EXACTLY the {caption} argument of \figauto in .tex files
// (after \cleanInline normalisation: \texttt{x} -> `x`, etc.).
const FIG = {
  // ─── Chương 1 — Sitemap ───────────────────────────────────────────
  "Sơ đồ sitemap tổng quát của hệ thống Synergit": [path.join(DIA, "sitemap.png"), 480],

  // ─── Chương 3 — Architecture, Usecase, ERD, FSM, Flow ────────────
  "Sơ đồ Usecase tổng quát của hệ thống Synergit": [path.join(DIA, "usecase.png"), 500],
  "Sơ đồ kiến trúc Microservices của hệ thống Synergit": [path.join(DIA, "architecture.png"), 520],
  "Luồng tạo và merge Pull Request: từ Compare → Tạo PR → Merge (sạch hoặc qua resolve conflict)": [path.join(DIA, "checkout-flow.png"), 500],
  "ERD bounded context Identity – Bảng `core.users`": [path.join(DIA, "erd-auth.png"), 360],
  "ERD bounded context Repository Catalog (`repositories`, `collaborators`, `labels`, `stars`)": [path.join(DIA, "erd-repository.png"), 500],
  "ERD bounded context Pull Request (PR + sự kiện + labels + assignees)": [path.join(DIA, "erd-pullrequest.png"), 500],
  "ERD bounded context Issue (issue + comments + sự kiện + labels + assignees)": [path.join(DIA, "erd-issue.png"), 500],
  "ERD schema `insights` (snapshot phân tích cho từng repository, tham chiếu mềm tới schema `core`)": [path.join(DIA, "erd-insights.png"), 460],
  "Máy trạng thái (FSM) vòng đời Pull Request": [path.join(DIA, "repo-state-fsm.png"), 480],
  "Máy trạng thái (FSM) vòng đời Issue (lý do đóng: COMPLETED / NOT_PLANNED / DUPLICATE)": [path.join(DIA, "issue-fsm.png"), 380],

  // ─── Chương 4 — Auth ─────────────────────────────────────────────
  "Giao diện trang đăng nhập": [path.join(IMG, "synergit-dang-nhap.png"), 460],
  "Giao diện trang đăng ký tài khoản": [path.join(IMG, "synergit-dang-ky.png"), 460],

  // ─── Chương 4 — Dashboard / Repo creation ────────────────────────
  "Giao diện Dashboard liệt kê repository": [path.join(IMG, "synergit-dashboard.png"), 500],
  "Giao diện tạo repository mới": [path.join(IMG, "synergit-tao-repo.png"), 480],

  // ─── Chương 4 — Code browser ─────────────────────────────────────
  "Giao diện trang Code – File explorer + Commit history": [path.join(IMG, "synergit-code-browser.png"), 540],
  "Giao diện xem nội dung file kèm syntax highlight": [path.join(IMG, "synergit-file-content.png"), 500],

  // ─── Chương 4 — Branches / Commits ───────────────────────────────
  "Giao diện trang Branches": [path.join(IMG, "synergit-branches.png"), 500],
  "Giao diện danh sách commit": [path.join(IMG, "synergit-commits.png"), 480],
  "Giao diện chi tiết commit kèm diff theo file": [path.join(IMG, "synergit-commit-diff.png"), 540],

  // ─── Chương 4 — Pull Requests ────────────────────────────────────
  "Giao diện danh sách Pull Request (Board)": [path.join(IMG, "synergit-pr-board.png"), 520],
  "Giao diện so sánh hai branch (Compare)": [path.join(IMG, "synergit-compare.png"), 500],
  "Giao diện chi tiết Pull Request kèm event timeline": [path.join(IMG, "synergit-pr-detail.png"), 540],
  "Giao diện panel Merge với commit message tuỳ chỉnh": [path.join(IMG, "synergit-pr-merge.png"), 460],
  "Giao diện resolve conflict": [path.join(IMG, "synergit-resolve.png"), 500],

  // ─── Chương 4 — Issues ───────────────────────────────────────────
  "Giao diện danh sách Issue (Board)": [path.join(IMG, "synergit-issue-board.png"), 500],
  "Giao diện chi tiết Issue với comment và timeline": [path.join(IMG, "synergit-issue-detail.png"), 520],

  // ─── Chương 4 — Insights ─────────────────────────────────────────
  "Giao diện Repo Insights": [path.join(IMG, "synergit-repo-insights.png"), 520],

  // ─── Chương 4 — Profile ──────────────────────────────────────────
  "Giao diện Profile kèm Contribution Graph 365 ngày": [path.join(IMG, "synergit-profile-overview.png"), 540],
  "Giao diện Profile – Tab Repositories": [path.join(IMG, "synergit-profile-repos.png"), 480],

  // ─── Chương 4 — Settings ─────────────────────────────────────────
  "Giao diện trang Settings – Account (đổi username)": [path.join(IMG, "synergit-settings.png"), 480],
};

const FRONT = new Set(["Bảng phân công công việc", "Lời cảm ơn", "Danh mục từ viết tắt", "TÓM TẮT ĐỀ TÀI"]);
const BACK  = new Set(["TÀI LIỆU THAM KHẢO"]);
const FONT = "Times New Roman";

// PNG dimensions from IHDR
function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
// inline Markdown-ish parser: **bold**, *italic*, _italic_, `code`
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|(?<!\*)\*[^*]+\*(?!\*)|_[^_]+_)/g;
  let last = 0;
  const push = (value, extra = {}) => {
    if (value) out.push(new TextRun({ text: value, font: FONT, ...base, ...extra }));
  };
  for (const m of String(text).matchAll(re)) {
    push(String(text).slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) push(token.slice(2, -2), { bold: true });
    else if (token.startsWith("`")) push(token.slice(1, -1), { font: "Consolas", size: base.size || 24 });
    else push(token.slice(1, -1), { italics: true });
    last = m.index + token.length;
  }
  push(String(text).slice(last));
  if (out.length === 0) out.push(new TextRun({ text: "", font: FONT, ...base }));
  return out;
}
module.exports = {
  fs, path, Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  ImageRun, LevelFormat, LevelSuffix, PageBreak, Footer, PageNumber, SimpleField,
  VerticalAlign, HeightRule, Bookmark, InternalHyperlink, PageReference, Tab,
  FIG, FRONT, BACK, FONT, pngSize, runs,
  REPORT_ROOT, IMG, DIA,
};
