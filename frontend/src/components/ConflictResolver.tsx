import { useEffect, useState } from "react";
import type { ConflictFile } from "../types";
import { pullsApi } from "../services/api/pull";
import { AlertTriangle, CheckCircle, FileCode, Save } from "lucide-react";

interface ConflictResolverProps {
	repoId: string,
	pullId: string,
	onResolved: () => void; // Callback to switch tabs/views once successfully merged
}


export default function ConflictResolver({ repoId, pullId, onResolved }: ConflictResolverProps) {
	const [conflicts, setConflicts] = useState<ConflictFile[]>([]);
	const [resolutions, setResolutions] = useState<Record<string, string>>({});
	const [activeFile, setActiveFile] = useState<string | null>(null);
	const [commitMessage, setCommitMessage] = useState('');
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchConflicts = async () => {
			try {
				setLoading(true);
				const data = await pullsApi.getConflicts(repoId, pullId);
				setConflicts(data);

				// Initialize the resolutions state with the raw conflicted content
				const initialResolutions: Record<string, string> = {};
				data.forEach(c => { initialResolutions[c.path] = c.content; });
				setResolutions(initialResolutions);

				if (data.length > 0) setActiveFile(data[0].path);
			} catch (err: any) {
				setError(err.message || 'Failed to load conflicts');
			} finally {
				setLoading(false);
			}
		};
		fetchConflicts();
	}, [repoId, pullId]);

	const handleContentChange = (content: string) => {
		if (!activeFile) return;
		setResolutions(prev => ({ ...prev, [activeFile]: content }));
	};

	const handleSubmit = async () => {
		try {
			setSubmitting(true);
			setError(null);

			const payload = {
				commit_message: commitMessage || '',
				resolutions: conflicts.map(c => ({
					path: c.path,
					resolved_content: resolutions[c.path]
				}))
			};

			await pullsApi.resolveConflicts(repoId, pullId, payload);
			onResolved();
		} catch (err: any) {
			setError(err.message || 'Failed to resolve conflicts');
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) return <div className="p-4 text-gray-500">Scanning for conflicts...</div>
	if (error) return <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-md">{error}</div>
	if (conflicts.length === 0) return <div className="p-4 text-green-600 flex items-center gap-2">
		<CheckCircle />  No conflicts found!
	</div>

	return (
		<div className="flex flex-col h-[800px] border border-gray-200 rounded-lg overflow-hidden bg-white">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 text-amber-600 font-semibold">
          <AlertTriangle size={20} />
          <span>Resolve {conflicts.length} Conflicting File(s)</span>
        </div>
      </div>

			<div className="flex flex-1 overflow-hidden">
        {/* Sidebar: File List */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          {conflicts.map((file) => {
            const isResolved = !resolutions[file.path].includes('<<<<<<<');
            return (
              <button
                key={file.path}
                onClick={() => setActiveFile(file.path)}
                className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between border-b border-gray-200 hover:bg-gray-100 transition-colors ${
                  activeFile === file.path ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode size={16} className="text-gray-400" />
                  <span className="truncate" title={file.path}>{file.path}</span>
                </div>
                {isResolved && <CheckCircle size={16} className="text-green-500 flex-shrink-0" />}
              </button>
            );
          })}
				</div>

				{/* Main Editor Area */}
				<div className="flex-1 flex flex-col bg-white">
					{activeFile && (
						<textarea
							className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none"
							value={resolutions[activeFile]}
							onChange={(e) => handleContentChange(e.target.value)}
							spellCheck="false"
						/>
					)}
					</div>
			</div>


			{/* Footer: Commit Message & Submit */}
			<div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center gap-4">
				<input
					type="text"
					placeholder="Commit message (e.g., Fix styling conflicts in main layout)"
					value={commitMessage}
					onChange={(e) => setCommitMessage(e.target.value)}
					className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
				/>
				<button
					onClick={handleSubmit}
					disabled={submitting}
					className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
				>
					<Save size={16} />
					{submitting ? 'Committing...' : 'Commit Resolutions'}
				</button>
			</div>
		</div>
	);
}
