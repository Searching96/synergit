import { useEffect, useMemo, useState } from "react";
import type { ConflictFile, PullRequest } from "../../../types";
import { pullsApi } from "../../../services/api/pull";
import { CheckCircle, ChevronDown, ChevronUp, FileCode, Info, Settings } from "lucide-react";

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
	repoId: string;
	pullNumber: string;
	onResolved: () => void;
	onBack: () => void;
}


export default function ConflictResolver({ repoId, pullNumber, onResolved, onBack }: ConflictResolverProps) {
	const [pull, setPull] = useState<PullRequest | null>(null);
	const [conflicts, setConflicts] = useState<ConflictFile[]>([]);
	const [resolutions, setResolutions] = useState<Record<string, string>>({});
	const [activeFile, setActiveFile] = useState<string | null>(null);
	const [commitMessage] = useState('');
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [rawEditMode] = useState(false);

	useEffect(() => {
		const fetchConflicts = async () => {
			try {
				setLoading(true);
				const pulls = await pullsApi.list(repoId);
				const sortedPulls = [...pulls].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
				const resolvedPull = sortedPulls[Number(pullNumber) - 1] || null;
				if (!resolvedPull) {
					throw new Error("Pull request not found");
				}

				setPull(resolvedPull);
				const data = await pullsApi.getConflicts(repoId, resolvedPull.id);
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
	}, [repoId, pullNumber]);

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

	const activeContent = activeFile ? (resolutions[activeFile] || '') : '';
	const activeBlocks = parseConflictBlocks(activeContent);
	const activeSegments = parseConflictSegments(activeContent);
	const unresolvedCount = useMemo(
		() => conflicts.filter((file) => (resolutions[file.path] || "").includes("<<<<<<<")).length,
		[conflicts, resolutions],
	);
	const activeConflictFile = conflicts.find((file) => file.path === activeFile) || null;
	const activeLineCount = activeContent.split("\n").length;
	const title = pull?.title || "Pull request";
	const sourceBranch = pull?.source_branch || "compare";
	const targetBranch = pull?.target_branch || "base";

	const handleSubmit = async () => {
		if (unresolvedCount > 0) {
			setError("Resolve all conflict markers before committing the merge.");
			return;
		}

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

			if (!pull) {
				throw new Error("Pull request not found");
			}

			await pullsApi.resolveConflicts(repoId, pull.id, payload);
			onResolved();
		} catch (err: any) {
			setError(err.message || 'Failed to resolve conflicts');
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) return <div className="p-4 text-[var(--text-muted)]">Scanning for conflicts...</div>
	if (error) return <div className="p-4 text-[var(--text-danger)] bg-[var(--surface-danger-subtle)] border border-[var(--border-danger-muted)] rounded-md">{error}</div>
	if (conflicts.length === 0) return (
		<div className="p-5 text-[var(--fgColor-open,#1a7f37)] flex items-center gap-2">
			<CheckCircle size={18} /> No conflicts found.
			<button type="button" onClick={onBack} className="text-[var(--text-link)] hover:underline">Back to pull request</button>
		</div>
	);

	return (
		<div className="h-full min-h-0 bg-[var(--surface-canvas)] flex flex-col overflow-hidden">
			<header className="px-7 py-6 border-b border-[var(--border-default)] flex items-start justify-between gap-4">
				<div className="min-w-0">
					<h1 className="text-2xl leading-tight text-[var(--text-primary)]">
						{title} <span className="text-[var(--text-secondary)]">#{pullNumber}</span>
					</h1>
					<p className="mt-1 text-sm text-[var(--text-secondary)]">
						Resolving conflicts between{" "}
						<span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{sourceBranch}</span>{" "}
						and{" "}
						<span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{targetBranch}</span>{" "}
						and committing changes <span className="text-[var(--text-secondary)]">-&gt;</span>{" "}
						<span className="rounded px-1.5 py-0.5 bg-[var(--surface-info-subtle)] text-[var(--text-link)] font-mono text-xs">{sourceBranch}</span>
					</p>
				</div>
				{unresolvedCount === 0 ? (
					<button
						type="button"
						onClick={handleSubmit}
						disabled={submitting}
						className="h-8 px-4 rounded-md bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{submitting ? "Committing..." : "Commit merge"}
					</button>
				) : null}
			</header>

			<div className="flex-1 min-h-0 grid grid-cols-[480px_minmax(0,1fr)]">
				<aside className="border-r border-[var(--border-default)] bg-[var(--surface-subtle)] min-h-0 flex flex-col">
					<div className="h-11 px-5 border-b border-[var(--border-default)] text-xs text-[var(--text-primary)] flex items-center">
						{conflicts.length} conflicting file{conflicts.length === 1 ? "" : "s"}
					</div>
					<div className="flex-1 overflow-auto">
						{conflicts.map((file) => {
							const isActive = file.path === activeFile;
							const isResolved = !(resolutions[file.path] || "").includes("<<<<<<<");
							const fileName = file.path.split("/").filter(Boolean).pop() || file.path;

							return (
								<button
									key={file.path}
									type="button"
									onClick={() => setActiveFile(file.path)}
									className={`w-full px-5 py-4 border-b border-[var(--border-muted)] text-left flex items-center gap-4 hover:bg-[var(--surface-canvas)] ${
										isActive ? "bg-[var(--surface-canvas)] border-l-2 border-l-[var(--text-danger)]" : ""
									}`}
								>
									<FileCode size={18} className="shrink-0 text-[var(--text-secondary)]" />
									<div className="min-w-0">
										<div className="text-sm font-semibold text-[var(--text-primary)] truncate">{fileName}</div>
										<div className="mt-0.5 text-xs text-[var(--text-secondary)] truncate">{file.path}</div>
									</div>
									{isResolved ? <CheckCircle size={16} className="ml-auto shrink-0 text-[var(--fgColor-open,#1a7f37)]" /> : null}
								</button>
							);
						})}
					</div>
				</aside>

				<section className="min-w-0 min-h-0 flex flex-col bg-[var(--surface-canvas)]">
					<div className="h-11 border-b border-[var(--border-default)] bg-[var(--surface-subtle)] grid grid-cols-[1fr_auto] items-center">
						<div className="px-5 text-xs font-semibold text-[var(--text-primary)]">
							{activeConflictFile?.path || "No file selected"}
						</div>
						<div className="h-full flex items-center gap-4 px-4 text-xs">
							<span className="font-semibold text-[var(--text-danger)]">{unresolvedCount} conflict{unresolvedCount === 1 ? "" : "s"}</span>
							<Info size={15} className="text-[var(--text-secondary)]" />
							<button type="button" className="inline-flex items-center gap-1 font-semibold text-[var(--text-primary)]">
								Prev <ChevronUp size={13} />
							</button>
							<button type="button" className="inline-flex items-center gap-1 font-semibold text-[var(--text-primary)]">
								Next <ChevronDown size={13} />
							</button>
							<button type="button" className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
								<Settings size={15} />
								<ChevronDown size={13} />
							</button>
							{unresolvedCount === 0 ? (
								<span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)]">
									<CheckCircle size={14} className="text-[var(--fgColor-open,#1a7f37)]" />
									Resolved
								</span>
							) : (
								<span className="h-7 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-xs font-semibold text-[var(--text-secondary)] inline-flex items-center opacity-70">
									Mark as resolved
								</span>
							)}
						</div>
					</div>

					<div className="flex-1 min-h-0 overflow-auto">
						{activeFile && activeBlocks.length > 0 && !rawEditMode ? (
							<div className="min-w-[760px] py-4 font-mono text-xs">
								{(() => {
									let conflictIndex = -1;
									let lineNumber = 0;

									const renderPlainText = (text: string, keyPrefix: string) => (
										text.split("\n").map((line, lineIndex, lines) => {
											if (lineIndex === lines.length - 1 && line === "") return null;
											lineNumber += 1;
											return (
												<div key={`${keyPrefix}-${lineIndex}`} className="grid grid-cols-[56px_minmax(0,1fr)] leading-5">
													<span className="px-3 text-right select-none text-[var(--text-secondary)]">{lineNumber}</span>
													<span className="px-2 whitespace-pre text-[var(--text-primary)]">{line || " "}</span>
												</div>
											);
										})
									);

									const renderConflictLine = (line: string, lineKey: string, className: string) => {
										lineNumber += 1;
										return (
											<div key={lineKey} className={`grid grid-cols-[56px_minmax(0,1fr)] leading-5 ${className}`}>
												<span className="px-3 text-right select-none text-[var(--text-secondary)]">{lineNumber}</span>
												<span className="px-2 whitespace-pre">{line || " "}</span>
											</div>
										);
									};

									return activeSegments.map((segment, idx) => {
										if (segment.type === "text") {
											return renderPlainText(segment.text, `text-${idx}`);
										}

										conflictIndex += 1;
										const block = segment.block;
										const currentLines = block.current.split("\n").filter((line, index, lines) => !(index === lines.length - 1 && line === ""));
										const incomingLines = block.incoming.split("\n").filter((line, index, lines) => !(index === lines.length - 1 && line === ""));

										return (
											<div key={`conflict-${idx}`}>
												<div className="grid grid-cols-[56px_minmax(0,1fr)] leading-5">
													<span className="px-3 text-right select-none text-[var(--text-secondary)]">{lineNumber + 1}</span>
													<span className="px-2 whitespace-pre text-[#0969da]">
														<button type="button" onClick={() => applyResolutionToBlock("current", conflictIndex)} className="font-semibold hover:underline">Accept current change</button>
														<span className="px-1">|</span>
														<button type="button" onClick={() => applyResolutionToBlock("incoming", conflictIndex)} className="font-semibold hover:underline">Accept incoming change</button>
														<span className="px-1">|</span>
														<button type="button" onClick={() => applyResolutionToBlock("both", conflictIndex)} className="font-semibold hover:underline">Accept both changes</button>
													</span>
												</div>
												{renderConflictLine(`<<<<<<< ${block.currentRef} (Current change)`, `current-marker-${idx}`, "bg-[#fff8c5] border-l-2 border-[#ffd33d] text-[var(--text-primary)]")}
												{currentLines.map((line, lineIndex) => renderConflictLine(line, `current-${idx}-${lineIndex}`, "bg-[#fff8c5] border-l-2 border-[#ffd33d] text-[var(--text-primary)]"))}
												{renderConflictLine("=======", `separator-${idx}`, "bg-[#fff8c5] border-l-2 border-[#ffd33d] text-[var(--text-primary)]")}
												{incomingLines.map((line, lineIndex) => renderConflictLine(line, `incoming-${idx}-${lineIndex}`, "bg-[#fff8c5] border-l-2 border-[#ffd33d] text-[var(--text-primary)]"))}
												{renderConflictLine(`>>>>>>> ${block.incomingRef} (Incoming change)`, `incoming-marker-${idx}`, "bg-[#fff8c5] border-l-2 border-[#ffd33d] text-[var(--text-primary)]")}
											</div>
										);
									});
								})()}
								<div className="grid grid-cols-[56px_minmax(0,1fr)] leading-5">
									<span className="px-3 text-right select-none text-[var(--text-secondary)]">{activeLineCount}</span>
									<span className="px-2 whitespace-pre text-[var(--text-primary)]"> </span>
								</div>
							</div>
						) : null}

						{activeFile && activeBlocks.length === 0 && !rawEditMode ? (
							<div className="min-w-[760px] py-4 font-mono text-xs">
								{activeContent.split("\n").map((line, index, lines) => {
									if (index === lines.length - 1 && line === "") return null;
									return (
										<div key={`${activeFile}-resolved-${index}`} className="grid grid-cols-[56px_minmax(0,1fr)] leading-5">
											<span className="px-3 text-right select-none text-[var(--text-secondary)]">{index + 1}</span>
											<span className="px-2 whitespace-pre text-[var(--text-primary)]">{line || " "}</span>
										</div>
									);
								})}
							</div>
						) : null}

						{activeFile && rawEditMode ? (
							<textarea
								className="h-full min-h-[640px] w-full p-4 font-mono text-sm resize-none focus:outline-none"
								value={resolutions[activeFile]}
								onChange={(e) => handleContentChange(e.target.value)}
								onKeyDown={handleTextareaKeyDown}
								spellCheck="false"
							/>
						) : null}
					</div>
				</section>
			</div>
		</div>
	);
}

