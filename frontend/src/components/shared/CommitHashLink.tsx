import { Link } from "react-router-dom";
import { buildRepoCommitViewPath } from "../../utils/repoRouting";
import { useRepository } from "../../contexts/RepositoryContext";

interface CommitHashLinkProps {
  hash: string;
  short?: boolean;
  className?: string;
}

export function CommitHashLink({ 
  hash, 
  short = true, 
  className = "text-[var(--text-link)] hover:underline font-mono" 
}: CommitHashLinkProps) {
  const { selectedRepo } = useRepository();
  
  const owner = selectedRepo?.owner?.username || "";
  const name = selectedRepo?.name || "";

  if (!owner || !name || !hash) {
    return <span className={className}>{short && hash ? hash.substring(0, 7) : hash}</span>;
  }

  const displayHash = short ? hash.substring(0, 7) : hash;
  const path = buildRepoCommitViewPath(owner, name, hash);
  
  return (
    <Link to={path} className={className} title={hash}>
      {displayHash}
    </Link>
  );
}
