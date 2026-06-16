import { useEffect, useState } from "react";
import { EyeIcon, EyeClosedIcon } from "@primer/octicons-react";
import { watchersApi } from "../../services/api/watchers";

interface WatchButtonProps {
  repoId: string;
  initialWatched?: boolean;
  initialCount?: number;
  showCount?: boolean;
  autoFetch?: boolean;
  onStatusChange?: (status: { watched: boolean; count: number }) => void;
}

export default function WatchButton({
  repoId,
  initialWatched = false,
  initialCount = 0,
  showCount = false,
  autoFetch = false,
  onStatusChange,
}: WatchButtonProps) {
  const [watched, setWatched] = useState(initialWatched);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setWatched(initialWatched);
  }, [initialWatched]);

  useEffect(() => {
    if (!autoFetch) return;
    let cancelled = false;
    void watchersApi
      .getStatus(repoId)
      .then((s) => {
        if (cancelled) return;
        setWatched(s.watched);
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
      const res = watched ? await watchersApi.unwatch(repoId) : await watchersApi.watch(repoId);
      setWatched(res.watched);
      setCount(res.count);
      onStatusChange?.(res);
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
      {watched ? <EyeClosedIcon size={14} /> : <EyeIcon size={14} />}
      {watched ? "Unwatch" : "Watch"}
      {showCount ? <span className="ml-1 rounded-full bg-[var(--surface-badge)] px-1.5">{count}</span> : null}
    </button>
  );
}
