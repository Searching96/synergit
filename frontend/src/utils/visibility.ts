export function formatVisibilityLabel(rawVisibility?: string): string {
  const normalized = (rawVisibility || "").trim();
  if (!normalized) {
    return "";
  }

  const lower = normalized.toLowerCase();
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
}
