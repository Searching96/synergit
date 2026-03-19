import { useEffect, useState } from "react";
import type { Commit } from "../types";
import { Clock, GitCommit, User } from "lucide-react";

interface CommitHistoryProps {
	repoName: string;
}

export default function CommitHistory({ repoName }: CommitHistoryProps) {
	const [commits, setCommits] = useState<Commit[]>([]);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		setLoading(true);
		fetch(`http://localhost:8080/api/v1/repos/${repoName}/commits`)
			.then((res) => res.json())
			.then((data) => {
				setCommits(data || []);
				setLoading(false)
			})
			.catch((err) => {
				console.error(err);
				setLoading(false);
			});
	}, [repoName]);

	if (loading) {
		return <div className="p-8 text-center text-gray-500">Loading History...</div>;
	}

	if (commits.length === 0) {
		return <div className="p-8 text-center text-gray-500">No commits found.</div>;
	}

	return (
		<div className="border border-gray-200 rounded-md shadow-sm bg-white overflow-hidden">
			<div className="bg-gray-50 border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 flex items-center">
				<GitCommit size={18} className="mr-2 text-gray-500" />
				Commit History
			</div>
			<ul className="divide-y divide-gray-200">
				{commits.map((commit) => (
					<li key={commit.hash} className="p-4 hover:bg-gray-50 transition-colors">
						<div className="flex justify-between items-start mb-1">
							<span className="font-semibold text-gray-800 text-sm">{commit.message}</span>
							<span className="font-mono text-xs text-blue-600 bg-blue-50 px-5 py-1 rounded border border-blue-100">
								{commit.hash.substring(0, 7)}
							</span>
						</div>
						<div className="flex items-center text-xs text-gray-500 mt-2 space-x-4">
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