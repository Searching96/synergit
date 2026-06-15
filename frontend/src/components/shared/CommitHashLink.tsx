import { Link } from "react-router-dom";
import { buildRepoCommitViewPath } from "../../utils/repoRouting";
import { useRepository } from "../../contexts/RepositoryContext";

interface CommitHashLinkProps {
  hash: string;
  short?: boolean;
  className?: string;
  title?: string;
}

export function CommitHashLink({ 
  hash, 
  short = true, 
  className = "hover:text-[var(--text-link)] hover:underline font-mono text-[var(--text-primary)] transition-colors",
  title
}: CommitHashLinkProps) {
  const { selectedRepo } = useRepository();
  
  const owner = selectedRepo?.owner || "";
  const name = selectedRepo?.name || "";

  if (!owner || !name || !hash) {
    return <span className={className}>{short && hash ? hash.substring(0, 7) : hash}</span>;
  }

  const displayHash = short ? hash.substring(0, 7) : hash;
  const path = buildRepoCommitViewPath(owner, name, hash);
  
  return (
    <Link to={path} className={className} title={title || hash}>
      {displayHash}
    </Link>
  );
}
