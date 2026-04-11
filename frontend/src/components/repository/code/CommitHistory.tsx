import { useEffect, useState } from "react";
import type { Commit } from "../../../types";
import { Clock, GitCommit, User } from "lucide-react";
import { reposApi } from "../../../services/api"

interface CommitHistoryProps {
	repoId: string;
	branch: string;
}

export default function CommitHistory({ repoId, branch }: CommitHistoryProps) {
	const [commits, setCommits] = useState<Commit[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		if (!branch) return;

		setLoading(true);
		reposApi.getCommits(repoId, branch)
			.then((data) => {
				setCommits(data || []);
				setLoading(false)
			})
			.catch((err) => {
				console.error(err);
				setLoading(false);
			});
	}, [repoId, branch]);

	if (loading) {
		return <div className="p-8 text-center text-[var(--text-muted)]">Loading History...</div>;
	}

	if (commits.length === 0) {
		return <div className="p-8 text-center text-[var(--text-muted)]">No commits found.</div>;
	}

	return (
		<div className="border border-[var(--border-muted)] rounded-md shadow-sm bg-[var(--surface-canvas)] overflow-hidden">
			<div className="bg-[var(--surface-subtle)] border-b border-[var(--border-muted)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] flex items-center">
				<GitCommit size={18} className="mr-2 text-[var(--text-muted)]" />
				Commit History
			</div>
			<ul className="divide-y divide-gray-200">
				{commits.map((commit) => (
					<li key={commit.hash} className="p-4 hover:bg-[var(--surface-subtle)] transition-colors">
						<div className="flex justify-between items-start mb-1">
							<span className="font-semibold text-[var(--text-primary)] text-sm">{commit.message}</span>
							<span className="font-mono text-xs text-[var(--text-link)] bg-[var(--surface-info-subtle)] px-5 py-1 rounded border border-[var(--border-info-muted)]">
								{commit.hash.substring(0, 7)}
							</span>
						</div>
						<div className="flex items-center text-xs text-[var(--text-muted)] mt-2 space-x-4">
							<div className="flex items-center">
								<User size={14} className="mr-1" />
								{commit.author}
							</div>
							<div className="flex items-center">
								<Clock size={14} className="mr-1" />
								{new Date(commit.date).toLocaleString()}
							</div>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
