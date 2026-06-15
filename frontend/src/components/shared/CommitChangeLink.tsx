import { Link } from "react-router-dom";
import { buildRepoCommitViewPath } from "../../utils/repoRouting";
import { useRepository } from "../../contexts/RepositoryContext";

interface CommitChangeLinkProps {
  hash: string;
  text: string;
  tooltipText?: string;
  className?: string;
}

export function CommitChangeLink({ 
  hash, 
  text,
  tooltipText,
  className = "hover:text-[var(--text-link)] hover:underline font-mono text-[var(--text-primary)] transition-colors",
}: CommitChangeLinkProps) {
  const { selectedRepo } = useRepository();
  
  const owner = selectedRepo?.owner || "";
  const name = selectedRepo?.name || "";

  if (!owner || !name || !hash) {
    return <span className={className}>{text}</span>;
  }

  const path = buildRepoCommitViewPath(owner, name, hash);
  
  return (
    <Link to={path} className={className} title={tooltipText}>
      {text}
    </Link>
  );
}
