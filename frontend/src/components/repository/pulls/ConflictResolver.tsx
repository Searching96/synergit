import { useEffect, useState } from "react";
import type { ConflictFile } from "../../../types";
import { pullsApi } from "../../../services/api/pull";
import { AlertTriangle, CheckCircle, FileCode, Save } from "lucide-react";

type ConflictBlock = {
	start: number;
	end: number;
	current: string;
	incoming: string;
	currentRef: string;
	incomingRef: string;
};

type ConflictSegment =
	| { type: 'text'; text: string }
	| { type: 'conflict'; block: ConflictBlock };

const parseConflictSegments = (content: string): ConflictSegment[] => {
	const segments: ConflictSegment[] = [];
	const regex = /[ \t]*<<<<<<<([^\r\n]*)\r?\n([\s\S]*?)[ \t]*=======\r?\n([\s\S]*?)[ \t]*>>>>>>>([^\r\n]*)\r?\n?/g;

	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(content)) !== null) {
		if (match.index > lastIndex) {
			segments.push({ type: 'text', text: content.slice(lastIndex, match.index) });
		}

		segments.push({
			type: 'conflict',
			block: {
				start: match.index,
				end: regex.lastIndex,
				currentRef: match[1].trim() || 'HEAD',
				incomingRef: match[4].trim() || 'incoming',
				current: match[2],
				incoming: match[3],
			},
		});

		lastIndex = regex.lastIndex;
	}

	if (lastIndex < content.length) {
		segments.push({ type: 'text', text: content.slice(lastIndex) });
	}

	return segments;
};

const parseConflictBlocks = (content: string): ConflictBlock[] => {
	return parseConflictSegments(content)
		.filter((segment): segment is { type: 'conflict'; block: ConflictBlock } => segment.type === 'conflict')
		.map((segment) => segment.block);
};

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
	const [rawEditMode, setRawEditMode] = useState(false);

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

	const hasSelection = (textarea: HTMLTextAreaElement) =>
		textarea.selectionStart !== textarea.selectionEnd;

	const getCurrentLineBounds = (value: string, cursorPosition: number) => {
		const safeCursor = Math.max(0, Math.min(cursorPosition, value.length));
		const lineStart = value.lastIndexOf('\n', Math.max(0, safeCursor - 1)) + 1;
		const nextBreak = value.indexOf('\n', safeCursor);
		const lineEnd = nextBreak === -1 ? value.length : nextBreak;

		return { lineStart, lineEnd };
	};

	const insertLineBelowAtCursor = (textarea: HTMLTextAreaElement) => {
		if (hasSelection(textarea)) {
			return false;
		}

		const value = textarea.value;
		const { lineStart, lineEnd } = getCurrentLineBounds(value, textarea.selectionStart);
		const currentLine = value.slice(lineStart, lineEnd);
		const indentation = (currentLine.match(/^\s*/) || [''])[0];
		const updated = `${value.slice(0, lineEnd)}\n${indentation}${value.slice(lineEnd)}`;
		const nextCursor = lineEnd + 1 + indentation.length;

		handleContentChange(updated);

		requestAnimationFrame(() => {
			textarea.selectionStart = textarea.selectionEnd = nextCursor;
		});

		return true;
	};

	const cutCurrentLineAtCursor = (textarea: HTMLTextAreaElement) => {
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

		handleContentChange(updated);

		requestAnimationFrame(() => {
			textarea.selectionStart = textarea.selectionEnd = nextCursor;
		});

		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(cutChunk).catch(() => undefined);
		}

		return true;
	};

	const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'x') {
			if (!hasSelection(e.currentTarget)) {
				e.preventDefault();
				cutCurrentLineAtCursor(e.currentTarget);
			}
			return;
		}

		if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key === 'Enter') {
			if (!hasSelection(e.currentTarget)) {
				e.preventDefault();
				insertLineBelowAtCursor(e.currentTarget);
			}
			return;
		}

		if (e.key !== 'Tab') return;
		e.preventDefault();

		const textarea = e.currentTarget;
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const value = textarea.value;

		const updated = `${value.slice(0, start)}\t${value.slice(end)}`;
		handleContentChange(updated);

		requestAnimationFrame(() => {
			textarea.selectionStart = textarea.selectionEnd = start + 1;
		});
	};

	const applyResolutionToBlock = (mode: 'current' | 'incoming' | 'both', blockIndex: number) => {
		if (!activeFile) return;

		const content = resolutions[activeFile] || '';
		const blocks = parseConflictBlocks(content);
		const target = blocks[blockIndex];
		if (!target) return;

		const replacement =
			mode === 'current' ? target.current :
			mode === 'incoming' ? target.incoming :
			`${target.current}${target.incoming}`;

		const updated = `${content.slice(0, target.start)}${replacement}${content.slice(target.end)}`;
		setResolutions(prev => ({ ...prev, [activeFile]: updated }));
	};

	const applyResolutionToAll = (mode: 'current' | 'incoming' | 'both') => {
		if (!activeFile) return;

		let content = resolutions[activeFile] || '';
		const blocks = parseConflictBlocks(content);

		for (let i = blocks.length - 1; i >= 0; i--) {
			const block = blocks[i];
			const replacement =
				mode === 'current' ? block.current :
				mode === 'incoming' ? block.incoming :
				`${block.current}${block.incoming}`;

			content = `${content.slice(0, block.start)}${replacement}${content.slice(block.end)}`;
		}

		setResolutions(prev => ({ ...prev, [activeFile]: content }));
	};

	const activeContent = activeFile ? (resolutions[activeFile] || '') : '';
	const activeBlocks = parseConflictBlocks(activeContent);
	const activeSegments = parseConflictSegments(activeContent);

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

	if (loading) return <div className="p-4 text-[var(--text-muted)]">Scanning for conflicts...</div>
	if (error) return <div className="p-4 text-[var(--text-danger)] bg-[var(--surface-danger-subtle)] border border-[var(--border-danger-muted)] rounded-md">{error}</div>
	if (conflicts.length === 0) return <div className="p-4 text-[var(--text-success)] flex items-center gap-2">
		<CheckCircle />  No conflicts found!
	</div>

	return (
		<div className="flex flex-col h-[800px] border border-[var(--border-muted)] rounded-lg overflow-hidden bg-[var(--surface-canvas)]">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-[var(--border-muted)] bg-[var(--surface-subtle)]">
        <div className="flex items-center gap-2 text-[var(--text-warning)] font-semibold">
          <AlertTriangle size={20} />
          <span>Resolve {conflicts.length} Conflicting File(s)</span>
        </div>
      </div>

			<div className="flex flex-1 overflow-hidden">
        {/* Sidebar: File List */}
        <div className="w-64 border-r border-[var(--border-muted)] bg-[var(--surface-subtle)] overflow-y-auto">
          {conflicts.map((file) => {
            const isResolved = !resolutions[file.path].includes('<<<<<<<');
            return (
              <button
                key={file.path}
                onClick={() => setActiveFile(file.path)}
                className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between border-b border-[var(--border-muted)] hover:bg-[var(--surface-muted)] transition-colors ${
                  activeFile === file.path ? 'bg-[var(--surface-info-subtle)] border-l-4 border-l-[var(--border-focus)]' : ''
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode size={16} className="text-[var(--text-muted)]" />
                  <span className="truncate" title={file.path}>{file.path}</span>
                </div>
                {isResolved && <CheckCircle size={16} className="text-[var(--text-success)] flex-shrink-0" />}
              </button>
            );
          })}
				</div>

				{/* Main Editor Area */}
				<div className="flex-1 flex flex-col bg-[var(--surface-canvas)]">
					{activeFile && activeBlocks.length > 0 && (
						<div className="border-b border-[var(--border-muted)] p-3 bg-[var(--surface-subtle)] space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-[var(--text-secondary)]">
									{activeBlocks.length} conflict block(s)
								</span>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => setRawEditMode((prev) => !prev)}
										className="px-2 py-1 text-xs border border-[var(--border-input)] rounded hover:bg-[var(--surface-muted)]"
									>
										{rawEditMode ? 'Merge view' : 'Raw editor'}
									</button>
									<button
										type="button"
										onClick={() => applyResolutionToAll('current')}
										className="px-2 py-1 text-xs border border-[var(--border-input)] rounded hover:bg-[var(--surface-muted)]"
									>
										Accept all current
									</button>
									<button
										type="button"
										onClick={() => applyResolutionToAll('incoming')}
										className="px-2 py-1 text-xs border border-[var(--border-input)] rounded hover:bg-[var(--surface-muted)]"
									>
										Accept all incoming
									</button>
									<button
										type="button"
										onClick={() => applyResolutionToAll('both')}
										className="px-2 py-1 text-xs border border-[var(--border-input)] rounded hover:bg-[var(--surface-muted)]"
									>
										Accept all both
									</button>
								</div>
							</div>
						</div>
					)}

					{activeFile && !rawEditMode && activeBlocks.length > 0 && (
						<div className="flex-1 overflow-auto bg-[var(--surface-canvas)] text-[var(--text-primary)] font-mono text-sm">
							{(() => {
								let conflictIndex = -1;
								return activeSegments.map((segment, idx) => {
									if (segment.type === 'text') {
										return (
											<pre key={`text-${idx}`} className="whitespace-pre-wrap px-4 py-3 leading-6 bg-[var(--surface-canvas)]">
												{segment.text}
											</pre>
										);
									}

									conflictIndex += 1;
									const block = segment.block;

									return (
										<div key={`conflict-${idx}`} className="border-y border-[var(--border-muted)]">
											<div className="px-4 py-2 text-xs bg-[var(--surface-canvas)] text-[var(--text-secondary)] border-b border-[var(--border-muted)]">
												<button type="button" onClick={() => applyResolutionToBlock('current', conflictIndex)} className="text-[var(--text-link)] hover:underline">Accept Current Change</button>
												<span className="mx-2">|</span>
												<button type="button" onClick={() => applyResolutionToBlock('incoming', conflictIndex)} className="text-[var(--text-link)] hover:underline">Accept Incoming Change</button>
												<span className="mx-2">|</span>
												<button type="button" onClick={() => applyResolutionToBlock('both', conflictIndex)} className="text-[var(--text-link)] hover:underline">Accept Both Changes</button>
											</div>

											<div className="bg-[var(--surface-success-subtle)] border-b border-[var(--border-success-muted)]">
												<div className="px-4 py-1 text-xs text-[var(--text-success)]">&lt;&lt;&lt;&lt;&lt;&lt;&lt; {block.currentRef} (Current Change)</div>
												<pre className="whitespace-pre-wrap px-4 pb-3 leading-6">{block.current}</pre>
											</div>

											<div className="bg-[var(--status-link-subtle)]">
												<pre className="whitespace-pre-wrap px-4 pt-3 leading-6">{block.incoming}</pre>
												<div className="px-4 py-1 text-xs text-[var(--text-link)]">&gt;&gt;&gt;&gt;&gt;&gt;&gt; {block.incomingRef} (Incoming Change)</div>
											</div>
										</div>
									);
								});
							})()}
						</div>
					)}

					{activeFile && (rawEditMode || activeBlocks.length === 0) && (
						<textarea
							className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none"
							value={resolutions[activeFile]}
							onChange={(e) => handleContentChange(e.target.value)}
							onKeyDown={handleTextareaKeyDown}
							spellCheck="false"
						/>
					)}
					</div>
			</div>


			{/* Footer: Commit Message & Submit */}
			<div className="p-4 border-t border-[var(--border-muted)] bg-[var(--surface-subtle)] flex items-center gap-4">
				<input
					type="text"
					placeholder="Commit message (e.g., Fix styling conflicts in main layout)"
					value={commitMessage}
					onChange={(e) => setCommitMessage(e.target.value)}
					className="flex-1 px-3 py-2 border border-[var(--border-input)] rounded-md focus:ring-2 focus:ring-[var(--ring-focus)] focus:outline-none text-sm"
				/>
				<button
					onClick={handleSubmit}
					disabled={submitting}
					className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-link)] text-[var(--text-on-accent)] rounded-md hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 transition-colors font-medium text-sm"
				>
					<Save size={16} />
					{submitting ? 'Committing...' : 'Commit Resolutions'}
				</button>
			</div>
		</div>
	);
}

