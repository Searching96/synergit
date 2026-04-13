import type { KeyboardEvent } from "react";

type SetTextValue = (value: string) => void;

function hasSelection(textarea: HTMLTextAreaElement): boolean {
  return textarea.selectionStart !== textarea.selectionEnd;
}

function getCurrentLineBounds(value: string, cursorPosition: number): { lineStart: number; lineEnd: number } {
  const safeCursor = Math.max(0, Math.min(cursorPosition, value.length));
  const lineStart = value.lastIndexOf("\n", Math.max(0, safeCursor - 1)) + 1;
  const nextBreak = value.indexOf("\n", safeCursor);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  return { lineStart, lineEnd };
}

function leadingIndentation(line: string): string {
  return (line.match(/^[\t ]*/) || [""])[0];
}

function insertTabAtCursor(textarea: HTMLTextAreaElement, setValue: SetTextValue): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const updated = `${value.slice(0, start)}\t${value.slice(end)}`;

  setValue(updated);

  requestAnimationFrame(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1;
  });
}

function insertLineBelowAtCursor(textarea: HTMLTextAreaElement, setValue: SetTextValue): boolean {
  if (hasSelection(textarea)) {
    return false;
  }

  const value = textarea.value;
  const { lineStart, lineEnd } = getCurrentLineBounds(value, textarea.selectionStart);
  const currentLine = value.slice(lineStart, lineEnd);
  const indentation = leadingIndentation(currentLine);

  const updated = `${value.slice(0, lineEnd)}\n${indentation}${value.slice(lineEnd)}`;
  const nextCursor = lineEnd + 1 + indentation.length;

  setValue(updated);

  requestAnimationFrame(() => {
    textarea.selectionStart = textarea.selectionEnd = nextCursor;
  });

  return true;
}

function cutCurrentLineAtCursor(textarea: HTMLTextAreaElement, setValue: SetTextValue): boolean {
  if (hasSelection(textarea)) {
    return false;
  }

  const value = textarea.value;
  if (value.length === 0) {
    return false;
  }

  const { lineStart, lineEnd } = getCurrentLineBounds(value, textarea.selectionStart);
  const cutEnd = lineEnd < value.length ? lineEnd + 1 : lineEnd;
  const cutChunk = value.slice(lineStart, cutEnd);
  const updated = `${value.slice(0, lineStart)}${value.slice(cutEnd)}`;
  const nextCursor = Math.min(lineStart, updated.length);

  setValue(updated);

  requestAnimationFrame(() => {
    textarea.selectionStart = textarea.selectionEnd = nextCursor;
  });

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(cutChunk).catch(() => undefined);
  }

  return true;
}

function outdentSelectionOrLine(textarea: HTMLTextAreaElement, setValue: SetTextValue): boolean {
  const value = textarea.value;
  if (!value.length) {
    return false;
  }

  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;
  const hasSelectedText = selectionStart !== selectionEnd;

  const startLineStart = getCurrentLineBounds(value, selectionStart).lineStart;
  const lastSelectedIndex = hasSelectedText ? Math.max(selectionStart, selectionEnd - 1) : selectionStart;
  const endLineBounds = getCurrentLineBounds(value, lastSelectedIndex);

  const blockStart = startLineStart;
  const blockEnd = endLineBounds.lineEnd;
  const blockText = value.slice(blockStart, blockEnd);
  const lines = blockText.split("\n");

  const removeIndentLength = (line: string): number => {
    if (line.startsWith("\t")) {
      return 1;
    }

    let leadingSpaces = 0;
    while (leadingSpaces < line.length && line.charAt(leadingSpaces) === " " && leadingSpaces < 2) {
      leadingSpaces += 1;
    }

    return leadingSpaces;
  };

  let removedBeforeSelectionStart = 0;
  let removedBeforeSelectionEnd = 0;
  let cursor = blockStart;

  const updatedLines = lines.map((line) => {
    const removeCount = removeIndentLength(line);
    const lineStart = cursor;
    const lineEnd = lineStart + line.length;

    if (lineStart < selectionStart) {
      const charsBeforeStart = Math.max(0, Math.min(removeCount, selectionStart - lineStart));
      removedBeforeSelectionStart += charsBeforeStart;
    }

    if (lineStart < selectionEnd) {
      const charsBeforeEnd = Math.max(0, Math.min(removeCount, selectionEnd - lineStart));
      removedBeforeSelectionEnd += charsBeforeEnd;
    }

    cursor = lineEnd + 1;

    if (removeCount === 0) {
      return line;
    }

    return line.slice(removeCount);
  });

  const updatedBlock = updatedLines.join("\n");
  if (updatedBlock === blockText) {
    return false;
  }

  const updatedValue = `${value.slice(0, blockStart)}${updatedBlock}${value.slice(blockEnd)}`;
  const nextSelectionStart = Math.max(blockStart, selectionStart - removedBeforeSelectionStart);
  const nextSelectionEnd = Math.max(nextSelectionStart, selectionEnd - removedBeforeSelectionEnd);

  setValue(updatedValue);

  requestAnimationFrame(() => {
    textarea.selectionStart = nextSelectionStart;
    textarea.selectionEnd = nextSelectionEnd;
  });

  return true;
}

export function applyStandardEditorShortcuts(
  event: KeyboardEvent<HTMLTextAreaElement>,
  setValue: SetTextValue,
): boolean {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "x") {
    if (!hasSelection(event.currentTarget)) {
      event.preventDefault();
      cutCurrentLineAtCursor(event.currentTarget, setValue);
      return true;
    }
    return false;
  }

  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key === "Enter") {
    if (!hasSelection(event.currentTarget)) {
      event.preventDefault();
      insertLineBelowAtCursor(event.currentTarget, setValue);
      return true;
    }
    return false;
  }

  if (event.key !== "Tab") {
    return false;
  }

  event.preventDefault();
  if (event.shiftKey) {
    outdentSelectionOrLine(event.currentTarget, setValue);
  } else {
    insertTabAtCursor(event.currentTarget, setValue);
  }

  return true;
}
