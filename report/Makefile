# ===========================================================================
#  Makefile — biên dịch báo cáo LaTeX Synergit
#  Yêu cầu: tectonic (khuyến nghị)  —  brew install tectonic
#  Tuỳ chọn: fswatch (cho `make watch`) — brew install fswatch
# ===========================================================================

MAIN   := main
ENGINE := tectonic
# Mọi file nguồn — thay đổi bất kỳ file nào sẽ kích hoạt biên dịch lại.
SRC    := $(MAIN).tex preamble.tex \
          $(wildcard chapters/*.tex) \
          $(wildcard frontmatter/*.tex) \
          $(wildcard figures/*.tex) \
          $(wildcard image/*) $(wildcard diagram/*)

.PHONY: all pdf watch view clean distclean xelatex help

all: pdf

## pdf      : Biên dịch ra main.pdf (chỉ build lại khi nguồn thay đổi)
pdf: $(MAIN).pdf

$(MAIN).pdf: $(SRC)
	$(ENGINE) -X compile $(MAIN).tex
	@echo "✓ Đã tạo $(MAIN).pdf"

## watch    : Tự động biên dịch lại mỗi khi sửa & lưu file .tex (Ctrl-C để dừng)
watch:
	@if command -v fswatch >/dev/null 2>&1; then \
		echo "Đang theo dõi thay đổi (fswatch)... Ctrl-C để dừng."; \
		$(MAKE) --no-print-directory pdf; \
		fswatch -o $(SRC) | while read _; do \
			clear; echo "→ Phát hiện thay đổi, biên dịch lại..."; \
			$(MAKE) --no-print-directory pdf || true; \
		done; \
	else \
		echo "fswatch chưa cài (brew install fswatch). Dùng chế độ polling mỗi 2s..."; \
		while true; do \
			$(MAKE) --no-print-directory -q pdf || $(MAKE) --no-print-directory pdf || true; \
			sleep 2; \
		done; \
	fi

## view     : Biên dịch rồi mở file PDF
view: pdf
	open $(MAIN).pdf

## xelatex  : Biên dịch bằng XeLaTeX (TeX Live/MiKTeX) thay cho tectonic, chạy 3 lần
xelatex:
	xelatex -interaction=nonstopmode $(MAIN).tex
	xelatex -interaction=nonstopmode $(MAIN).tex
	xelatex -interaction=nonstopmode $(MAIN).tex

## clean    : Xoá các file phụ trợ (.aux, .log, .toc, ...)
clean:
	rm -f $(MAIN).aux $(MAIN).log $(MAIN).toc $(MAIN).lof $(MAIN).lot \
	      $(MAIN).out $(MAIN).synctex.gz \
	      chapters/*.aux frontmatter/*.aux figures/*.aux

## distclean: Xoá cả file phụ trợ lẫn main.pdf
distclean: clean
	rm -f $(MAIN).pdf

## help     : Hiện danh sách lệnh
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## //'
