import { useEffect, useState } from "react";
import { StarFillIcon, StarIcon } from "@primer/octicons-react";
import { starsApi } from "../../services/api";

interface StarButtonProps {
  repoId: string;
  initialStarred?: boolean;
  initialCount?: number;
  showCount?: boolean;
  autoFetch?: boolean;
}

export default function StarButton({
  repoId,
  initialStarred = false,
  initialCount = 0,
  showCount = false,
  autoFetch = false,
}: StarButtonProps) {
  const [starred, setStarred] = useState(initialStarred);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStarred(initialStarred);
  }, [initialStarred]);

  useEffect(() => {
    if (!autoFetch) return;
    let cancelled = false;
    void starsApi
      .getStatus(repoId)
      .then((s) => {
        if (cancelled) return;
        setStarred(s.starred);
        setCount(s.count);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [autoFetch, repoId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = starred ? await starsApi.unstar(repoId) : await starsApi.star(repoId);
      setStarred(res.starred);
      setCount(res.count);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className="shrink-0 h-7 px-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs text-[var(--text-primary)] inline-flex items-center gap-1 hover:bg-[var(--surface-button-muted)] disabled:opacity-60"
    >
      {starred ? <StarFillIcon size={14} className="text-[#e3b341]" /> : <StarIcon size={14} />}
      {starred ? "Starred" : "Star"}
      {showCount ? <span className="ml-1 rounded-full bg-[var(--surface-badge)] px-1.5">{count}</span> : null}
    </button>
  );
}
