import { useEffect, useMemo, useRef, useState } from "react";
import type { Branch, Commit } from "../../../types";
import {
	Calendar,
	CalendarDays,
	ChevronDown,
	Code,
	Copy,
	GitBranch,
	GitCommitHorizontal,
	Search,
	Users,
} from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { reposApi } from "../../../services/api";

interface CommitHistoryProps {
	repoId: string;
	repoName: string;
	branch: string;
	branches: Branch[];
	onSelectBranch: (branchName: string) => void;
	onBack?: () => void;
	onBrowseAtCommit?: (commitHash: string) => void;
}

function toDateKey(dateInput: string): string {
	const date = new Date(dateInput);
	if (Number.isNaN(date.getTime())) {
		return "Unknown date";
	}

	return date.toISOString().slice(0, 10);
}

function formatHeadingDate(dateKey: string): string {
	if (dateKey === "Unknown date") {
		return "Commits";
	}

	const date = new Date(`${dateKey}T00:00:00`);
	return `Commits on ${date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	})}`;
}

function shortHash(hash: string): string {
	return hash.trim().slice(0, 7);
}

function isCommitLikeRef(value: string): boolean {
	return /^[0-9a-f]{7,40}$/i.test(value.trim());
}

function authorInitial(author: string): string {
	return (author.trim().charAt(0) || "U").toUpperCase();
}

function normalizedAuthor(author: string): string {
	const normalized = author.trim();
	return normalized || "Unknown";
}

function toStartOfDay(date: Date): Date {
	const next = new Date(date);
	next.setHours(0, 0, 0, 0);
	return next;
}

function parseISODate(raw: string | null): Date | undefined {
	if (!raw) {
		return undefined;
	}

	const parsed = new Date(`${raw.trim()}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) {
		return undefined;
	}

	return parsed;
}

function formatDateForQuery(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function formatDateRangeLabel(range?: DateRange): string {
	if (!range?.from) {
		return "All time";
	}

	const fromLabel = range.from.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});

	if (!range.to || range.from.getTime() === range.to.getTime()) {
		return fromLabel;
	}

	const toLabel = range.to.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});

	return `${fromLabel} - ${toLabel}`;
}

function isWithinDateRange(dateInput: string, range?: DateRange): boolean {
	if (!range?.from) {
		return true;
	}

	const target = toStartOfDay(new Date(dateInput));
	if (Number.isNaN(target.getTime())) {
		return false;
	}

	const fromDay = toStartOfDay(range.from);
	const toDay = toStartOfDay(range.to || range.from);
	const start = fromDay.getTime() <= toDay.getTime() ? fromDay : toDay;
	const end = fromDay.getTime() <= toDay.getTime() ? toDay : fromDay;

	return target.getTime() >= start.getTime() && target.getTime() <= end.getTime();
}

function formatCommittedAgo(dateInput: string): string {
	const timestamp = new Date(dateInput).getTime();
	if (Number.isNaN(timestamp)) {
		return "committed recently";
	}

	const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
	if (elapsedSeconds < 60) {
		return "committed just now";
	}

	const elapsedMinutes = Math.floor(elapsedSeconds / 60);
	if (elapsedMinutes < 60) {
		return `committed ${elapsedMinutes} minute${elapsedMinutes === 1 ? "" : "s"} ago`;
	}

	const elapsedHours = Math.floor(elapsedMinutes / 60);
	if (elapsedHours < 24) {
		return `committed ${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
	}

	const elapsedDays = Math.floor(elapsedHours / 24);
	if (elapsedDays < 30) {
		return `committed ${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
	}

	const elapsedMonths = Math.floor(elapsedDays / 30);
	if (elapsedMonths < 12) {
		return `committed ${elapsedMonths} month${elapsedMonths === 1 ? "" : "s"} ago`;
	}

	const elapsedYears = Math.floor(elapsedMonths / 12);
	return `committed ${elapsedYears} year${elapsedYears === 1 ? "" : "s"} ago`;
}

export default function CommitHistory({
	repoId,
	branch,
	branches,
	onSelectBranch,
	onBrowseAtCommit,
}: CommitHistoryProps) {
	const [commits, setCommits] = useState<Commit[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
	const [authorQuery, setAuthorQuery] = useState<string>("");
	const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
	const [isUsersFilterOpen, setIsUsersFilterOpen] = useState<boolean>(false);
	const [isTimeFilterOpen, setIsTimeFilterOpen] = useState<boolean>(false);
	const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
	const [hasSyncedFiltersFromRoute, setHasSyncedFiltersFromRoute] = useState<boolean>(false);
	const usersFilterRef = useRef<HTMLDivElement | null>(null);
	const timeFilterRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		setLoading(true);

		reposApi
			.getCommits(repoId, branch)
			.then((data) => {
				setCommits(data || []);
			})
			.catch((err) => {
				console.error(err);
				setCommits([]);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [repoId, branch]);

	useEffect(() => {
		const handlePointerDown = (event: MouseEvent) => {
			const target = event.target as Node;

			if (isUsersFilterOpen && usersFilterRef.current && !usersFilterRef.current.contains(target)) {
				setIsUsersFilterOpen(false);
			}

			if (isTimeFilterOpen && timeFilterRef.current && !timeFilterRef.current.contains(target)) {
				setIsTimeFilterOpen(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsUsersFilterOpen(false);
				setIsTimeFilterOpen(false);
			}
		};

		document.addEventListener("mousedown", handlePointerDown);
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isTimeFilterOpen, isUsersFilterOpen]);

	useEffect(() => {
		const syncFiltersFromRoute = () => {
			const params = new URLSearchParams(window.location.search);
			const nextAuthor = (params.get("author") || "").trim();
			const sinceDate = parseISODate(params.get("since"));
			const untilDate = parseISODate(params.get("until"));

			setSelectedAuthor(nextAuthor || null);
			setAuthorQuery("");

			if (sinceDate || untilDate) {
				const fromDate = sinceDate || untilDate;
				const toDate = untilDate || sinceDate;
				if (fromDate) {
					setSelectedDateRange({
						from: fromDate,
						to: toDate || fromDate,
					});
					setCalendarMonth(fromDate);
				}
			} else {
				setSelectedDateRange(undefined);
			}

			setHasSyncedFiltersFromRoute(true);
		};

		syncFiltersFromRoute();
		window.addEventListener("popstate", syncFiltersFromRoute);

		return () => {
			window.removeEventListener("popstate", syncFiltersFromRoute);
		};
	}, [branch, repoId]);

	useEffect(() => {
		if (!hasSyncedFiltersFromRoute) {
			return;
		}

		const params = new URLSearchParams();

		if (selectedAuthor) {
			params.set("author", selectedAuthor);
		}

		if (selectedDateRange?.from) {
			const fromDay = toStartOfDay(selectedDateRange.from);
			const toDay = toStartOfDay(selectedDateRange.to || selectedDateRange.from);
			const sinceDay = fromDay.getTime() <= toDay.getTime() ? fromDay : toDay;
			const untilDay = fromDay.getTime() <= toDay.getTime() ? toDay : fromDay;

			params.set("since", formatDateForQuery(sinceDay));
			params.set("until", formatDateForQuery(untilDay));
		}

		const nextSearch = params.toString();
		const nextFullPath = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
		const currentFullPath = `${window.location.pathname}${window.location.search}`;

		if (currentFullPath !== nextFullPath) {
			window.history.replaceState({}, "", nextFullPath);
		}
	}, [branch, hasSyncedFiltersFromRoute, repoId, selectedAuthor, selectedDateRange]);

	const contributors = useMemo(() => {
		const commitCountByAuthor = new Map<string, number>();

		for (const commit of commits) {
			const author = normalizedAuthor(commit.author);
			commitCountByAuthor.set(author, (commitCountByAuthor.get(author) || 0) + 1);
		}

		return Array.from(commitCountByAuthor.entries())
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([author, commitCount]) => ({ author, commitCount }));
	}, [commits]);

	const visibleContributors = useMemo(() => {
		const query = authorQuery.trim().toLowerCase();
		if (!query) {
			return contributors;
		}

		return contributors.filter((item) => item.author.toLowerCase().includes(query));
	}, [authorQuery, contributors]);

	const filteredCommits = useMemo(() => {
		return commits.filter((commit) => {
			const author = normalizedAuthor(commit.author);

			if (selectedAuthor && author !== selectedAuthor) {
				return false;
			}

			return isWithinDateRange(commit.date, selectedDateRange);
		});
	}, [commits, selectedAuthor, selectedDateRange]);

	const groupedCommits = useMemo(() => {
		const grouped = new Map<string, Commit[]>();

		for (const commit of filteredCommits) {
			const dateKey = toDateKey(commit.date);
			if (!grouped.has(dateKey)) {
				grouped.set(dateKey, []);
			}

			grouped.get(dateKey)?.push(commit);
		}

		return Array.from(grouped.entries()).map(([dateKey, commitItems]) => ({
			dateKey,
			label: formatHeadingDate(dateKey),
			items: commitItems,
		}));
	}, [filteredCommits]);

	const branchOptions = useMemo(() => {
		const knownBranches = new Set(branches.map((item) => item.name));
		const values = branch && !knownBranches.has(branch)
			? [branch, ...branches.map((item) => item.name)]
			: branches.map((item) => item.name);

		return values.map((branchName) => ({
			value: branchName,
			label: !knownBranches.has(branchName) && isCommitLikeRef(branchName)
				? shortHash(branchName)
				: branchName,
		}));
	}, [branch, branches]);

	const branchDisplayLabel = useMemo(() => {
		const fromOptions = branchOptions.find((item) => item.value === branch);
		if (fromOptions) {
			return fromOptions.label;
		}

		if (branch && isCommitLikeRef(branch)) {
			return shortHash(branch);
		}

		return branch || "master";
	}, [branch, branchOptions]);

	const selectedAuthorLabel = selectedAuthor || "All users";
	const selectedDateLabel = formatDateRangeLabel(selectedDateRange);

	const toggleUsersFilter = () => {
		setIsUsersFilterOpen((prev) => !prev);
		setIsTimeFilterOpen(false);
	};

	const toggleTimeFilter = () => {
		setIsTimeFilterOpen((prev) => {
			const next = !prev;
			if (next) {
				setCalendarMonth(selectedDateRange?.from || new Date());
			}

			return next;
		});
		setIsUsersFilterOpen(false);
	};

	const clearAuthorFilter = () => {
		setSelectedAuthor(null);
		setAuthorQuery("");
		setIsUsersFilterOpen(false);
	};

	const clearDateFilter = () => {
		setSelectedDateRange(undefined);
		setIsTimeFilterOpen(false);
	};

	const selectToday = () => {
		const today = new Date();
		setSelectedDateRange({ from: today, to: today });
		setCalendarMonth(today);
		setIsTimeFilterOpen(false);
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="text-[28px] leading-[1.2] font-semibold text-[var(--text-primary)]">Commits</h2>
			</div>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="inline-flex items-center gap-2">
					<div className="relative inline-flex items-center">
						<GitBranch size={14} className="pointer-events-none absolute left-2.5 text-[var(--text-secondary)]" />
						<select
							value={branch}
							onChange={(event) => onSelectBranch(event.target.value)}
							className="h-8 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-8 pr-3 text-sm text-[var(--text-primary)]"
						>
							{branchOptions.length > 0 ? (
								branchOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))
							) : (
								<option value={branch || "master"}>{branchDisplayLabel}</option>
							)}
						</select>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="relative" ref={usersFilterRef}>
						<button
							type="button"
							onClick={toggleUsersFilter}
							className="h-10 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-2"
						>
							<Users size={16} className="text-[var(--text-secondary)]" />
							{selectedAuthorLabel}
							<ChevronDown size={14} className="text-[var(--text-secondary)]" />
						</button>

						{isUsersFilterOpen ? (
							<div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[340px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-2xl overflow-hidden">
								<div className="p-3 border-b border-[var(--border-muted)]">
									<div className="relative">
										<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
										<input
											type="text"
											value={authorQuery}
											onChange={(event) => setAuthorQuery(event.target.value)}
											placeholder="Find a user..."
											className="h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] pl-10 pr-3 text-sm text-[var(--text-primary)]"
										/>
									</div>
								</div>

								<div className="max-h-[220px] overflow-y-auto py-2">
									{visibleContributors.length > 0 ? (
										visibleContributors.map((item) => {
											const active = selectedAuthor === item.author;

											return (
												<button
													key={item.author}
													type="button"
													onClick={() => {
														setSelectedAuthor(item.author);
														setIsUsersFilterOpen(false);
													}}
													className={`w-full px-4 py-2.5 text-left inline-flex items-center gap-3 hover:bg-[var(--surface-subtle)] ${active ? "bg-[var(--surface-subtle)]" : ""}`}
												>
													<span className="h-8 w-8 rounded-full border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center justify-center shrink-0">
														{authorInitial(item.author)}
													</span>
													<span className="text-base font-medium text-[var(--text-primary)]">{item.author}</span>
													<span className="ml-auto text-xs text-[var(--text-secondary)]">{item.commitCount}</span>
												</button>
											);
										})
									) : (
										<p className="px-4 py-3 text-sm text-[var(--text-secondary)]">No contributors found.</p>
									)}
								</div>

								<div className="border-t border-[var(--border-muted)] px-4 py-3">
									<button
										type="button"
										onClick={clearAuthorFilter}
										className="text-sm font-medium text-[var(--text-link)] hover:underline"
									>
										View commits for all users
									</button>
								</div>
							</div>
						) : null}
					</div>

					<div className="relative" ref={timeFilterRef}>
						<button
							type="button"
							onClick={toggleTimeFilter}
							className="h-10 px-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-2"
						>
							<Calendar size={16} className="text-[var(--text-secondary)]" />
							{selectedDateLabel}
							<ChevronDown size={14} className="text-[var(--text-secondary)]" />
						</button>

						{isTimeFilterOpen ? (
							<div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[360px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-canvas)] shadow-2xl p-3">
								<DayPicker
									mode="range"
									selected={selectedDateRange}
									onSelect={(nextRange) => {
										setSelectedDateRange(nextRange);
										if (nextRange?.from && nextRange?.to) {
											setIsTimeFilterOpen(false);
										}
									}}
									month={calendarMonth}
									onMonthChange={setCalendarMonth}
									captionLayout="dropdown"
									fromYear={2000}
									toYear={new Date().getFullYear() + 1}
									showOutsideDays
									fixedWeeks
								/>

								<div className="pt-2 mt-2 border-t border-[var(--border-muted)] flex items-center gap-4 text-sm">
									<button
										type="button"
										onClick={clearDateFilter}
										className="text-[var(--text-primary)] hover:underline"
									>
										Clear
									</button>
									<button
										type="button"
										onClick={selectToday}
										className="text-[var(--text-link)] hover:underline"
									>
										Today
									</button>
								</div>
							</div>
						) : null}
					</div>
				</div>
			</div>

			{loading ? (
				<div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-8 text-sm text-[var(--text-secondary)]">
					Loading commits...
				</div>
			) : groupedCommits.length === 0 ? (
				<div className="rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] p-8 text-sm text-[var(--text-secondary)]">
					No commits found.
				</div>
			) : (
				<div className="space-y-0">
					{groupedCommits.map((group, groupIndex) => (
						<section
							key={group.dateKey}
							className={`relative pl-8 ${groupIndex < groupedCommits.length - 1 ? "pb-6" : "pb-0"}`}
						>
							{/* 1. The Timeline Icon */}
							<span className="absolute left-[-5px] top-[-2px] z-10 h-6 w-6 bg-transparent inline-flex items-center justify-center">
								<GitCommitHorizontal size={24} className="text-[var(--text-secondary)]" />
							</span>

							{/* 2. Bottom Line Segment */}
							<span 
								className={`absolute left-[7px] top-[30px] w-px bg-[var(--border-muted)] z-0 ${
									groupIndex === groupedCommits.length - 1 ? "bottom-[12px]" : "bottom-0"
								}`} 
							/>

							{/* 3. The Date Label */}
							<div className="flex items-center text-sm text-[var(--text-secondary)] relative z-10">
								<p className="font-medium">{group.label}</p>
							</div>

							{/* 4. The Commits Card */}
							<div className="mt-3 rounded-md border border-[var(--border-default)] overflow-hidden bg-[var(--surface-canvas)] relative z-10">
								{group.items.map((commit, index) => (
									<article
										key={commit.hash}
										className={`px-4 py-3 ${index > 0 ? "border-t border-[var(--border-muted)]" : ""}`}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0 flex items-start gap-3">
												<div className="h-8 w-8 rounded-full border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center shrink-0">
													{authorInitial(commit.author)}
												</div>
												<div className="min-w-0">
													<p className="text-sm font-semibold text-[var(--text-primary)] truncate">{commit.message}</p>
													<p className="mt-1 text-xs text-[var(--text-secondary)] inline-flex items-center gap-1.5">
														<CalendarDays size={12} />
														{commit.author} {formatCommittedAgo(commit.date)}
													</p>
												</div>
											</div>

											<div className="flex items-center gap-1 shrink-0">
												<span className="font-mono text-xs text-[var(--text-link)] px-2 py-1 rounded border border-[var(--border-default)] bg-[var(--surface-subtle)]">
													{shortHash(commit.hash)}
												</span>
												<button
													type="button"
													onClick={() => void navigator.clipboard.writeText(commit.hash)}
													className="h-7 w-7 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-center"
													aria-label="Copy full commit hash"
												>
													<Copy size={12} className="text-[var(--text-secondary)]" />
												</button>
												<button
													type="button"
													onClick={() => onBrowseAtCommit?.(commit.hash)}
													disabled={!onBrowseAtCommit}
													className="h-7 w-7 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] hover:bg-[var(--surface-subtle)] inline-flex items-center justify-center"
													aria-label="Browse history at this point"
													title="Browse history at this point"
												>
													<Code size={12} className="text-[var(--text-secondary)]" />
												</button>
											</div>
										</div>
									</article>
								))}
							</div>
						</section>
					))}
				</div>
			)}
		</div>
	);
}
