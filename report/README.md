# Báo cáo LaTeX — Synergit

Báo cáo đồ án môn học (tiếng Việt) cho đề tài **Synergit — Ứng dụng quản lý quy
trình phát triển phần mềm tích hợp quản lý mã nguồn dự án áp dụng kiến trúc
Microservices**, trình bày theo cấu trúc 5 chương.

## Cách biên dịch

Tài liệu dùng **XeLaTeX** (vì có tiếng Việt qua `fontspec`). Khuyến nghị dùng
[Tectonic](https://tectonic-typesetting.github.io/) — tự tải gói/font cần thiết:

```bash
cd synergit-report
tectonic -X compile main.tex
```

Hoặc dùng XeLaTeX của TeX Live/MiKTeX (chạy 2–3 lần để cập nhật mục lục):

```bash
xelatex main.tex && xelatex main.tex && xelatex main.tex
```

> ⚠️ Không dùng `pdflatex` — tài liệu dựa trên `fontspec`/XeLaTeX cho tiếng Việt.

Kết quả: `main.pdf`.

## Cấu trúc thư mục

```
synergit-report/
├── main.tex                 # File chính: trang bìa, mục lục, include các phần
├── preamble.tex             # Gói, font, kiểu trình bày, các lệnh tiện ích
├── frontmatter/
│   ├── assignment.tex       # Bảng phân công công việc
│   ├── acknowledgement.tex  # Lời cảm ơn
│   ├── abstract.tex         # Tóm tắt đề tài
│   └── abbreviations.tex    # Danh mục từ viết tắt
├── chapters/
│   ├── ch1.tex              # Giới thiệu đề tài
│   ├── ch2.tex              # Cơ sở lý thuyết
│   ├── ch3.tex              # Phân tích thiết kế hệ thống
│   ├── ch3-usecases.tex     # Đặc tả các usecase
│   ├── ch3-dbtables.tex     # Đặc tả chi tiết các bảng CSDL
│   ├── ch4.tex              # Xây dựng website
│   ├── ch5.tex              # Kết luận
│   └── references.tex       # Tài liệu tham khảo
├── figures/
│   ├── architecture.tex     # Sơ đồ kiến trúc microservices (TikZ)
│   ├── sitemap.tex          # Sơ đồ sitemap (TikZ)
│   ├── usecase.tex          # Sơ đồ usecase tổng quát (TikZ)
│   ├── erd-auth.tex         # ERD schema auth (TikZ)
│   ├── erd-repository.tex   # ERD schema repository (TikZ)
│   ├── erd-pullrequest.tex  # ERD schema pull request (TikZ)
│   ├── erd-issue.tex        # ERD schema issue (TikZ)
│   ├── erd-insights.tex     # ERD schema insights (TikZ)
│   ├── repo-state-fsm.tex   # Máy trạng thái repo/PR (TikZ)
│   └── checkout-flow.tex    # Luồng tạo PR và merge (TikZ)
├── image/                   # Ảnh chụp màn hình, logo (đặt sau khi có thật)
└── diagram/                 # Sơ đồ vẽ ngoài (nếu có)
```

## Việc cần bạn chỉnh sửa

- **Trang bìa**: sửa các `\newcommand` ở đầu `main.tex` (trường, GVHD, lớp, sinh viên thực hiện…).
- **Bảng phân công**: điền MSSV/họ tên trong `frontmatter/assignment.tex`.
- **Ảnh chụp màn hình & logo (skeleton tự động):** Mọi ảnh dùng lệnh
  `\figauto{<đường dẫn>}{<caption>}{<chiều cao tối đa>}`. Lệnh này tự kiểm tra:
  - Nếu **đã có** file ảnh đúng tên → tự chèn ảnh.
  - Nếu **chưa có** → hiện khung placeholder ghi rõ tên file cần bỏ vào.

Các sơ đồ (sitemap, kiến trúc, ERD, FSM, luồng PR) được vẽ trực tiếp bằng TikZ
nên build ra PDF không cần ảnh ngoài.
