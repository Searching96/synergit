import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  useFloating, autoUpdate, offset, flip, shift, 
  useClick, useDismiss, useRole, useInteractions, 
  FloatingPortal, FloatingFocusManager 
} from "@floating-ui/react";
import { 
  LockIcon, PlusIcon, SearchIcon, KebabHorizontalIcon, TableIcon, ChevronDownIcon, 
  SidebarCollapseIcon, GraphIcon, WorkflowIcon, IssueOpenedIcon, GitPullRequestIcon,
  RowsIcon, ArrowBothIcon, FilterIcon, ChevronRightIcon, SidebarExpandIcon, CircleIcon,
  LocationIcon, CalendarIcon, ChevronLeftIcon, PencilIcon
} from "@primer/octicons-react";
import TopHeader from "../layouts/TopHeader";
import RouteButton from "../components/shared/RouteButton";
import { AddItemDropdown } from "../components/shared/AddItemDropdown";
import { Tooltip } from "../components/shared/Tooltip";
import { Avatar } from "../components/shared/Avatar";
import { OcticonGear, OcticonProject, OcticonProjectRoadmap } from "../components/icons/Octicons";
import { RichSwitchButton } from "../components/shared/RichSwitchButton";
import { projectsApi } from "../services/api";
import type { Project, ProjectView, ProjectItemDTO } from "../types";

interface UserProjectPageProps {
  username: string;
  projectId: string; // This is the project number (from URL)
  onMenuClick?: () => void;
  onSignOut?: () => void;
}

const monthsData = [
  { name: 'January 2026', days: 31 },
  { name: 'February 2026', days: 28 },
  { name: 'March 2026', days: 31 },
  { name: 'April 2026', days: 30 },
  { name: 'May 2026', days: 31 },
  { name: 'June 2026', days: 30 },
  { name: 'July 2026', days: 31 },
  { name: 'August 2026', days: 31 },
  { name: 'September 2026', days: 30 },
  { name: 'October 2026', days: 31 },
  { name: 'November 2026', days: 30 },
  { name: 'December 2026', days: 31 },
];

const generateDays = (startDate: Date, numDays: number) => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < numDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push({
      id: i,
      date: d,
      dateStr: `${d.toLocaleDateString('en-US', { weekday: 'short' })}, ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`,
      dayOfMonth: d.getDate(),
      isToday: d.getTime() === today.getTime(),
      isSunday: d.getDay() === 0
    });
  }
  return days;
};

const allDays = generateDays(new Date(2026, 0, 1), 365);
const todayIndex = allDays.findIndex(d => d.isToday);


const STATUS_COLUMNS = [
  { key: 'Todo', label: 'Todo', description: "This item hasn't been started", color: 'text-[#1a7f37]' },
  { key: 'In Progress', label: 'In Progress', description: 'This is actively being worked on', color: 'text-[#9a6700]' },
  { key: 'Done', label: 'Done', description: 'This has been completed', color: 'text-[#8250df]' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'In Progress') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium border border-[#d4a72c] bg-[#fff8c5] text-[#9a6700]">In Progress</span>;
  }
  if (status === 'Done') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium border border-[#bf87fa] bg-[#f3e8fd] text-[#8250df]">Done</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium border border-[#4ac26b] bg-[#dafbe1] text-[#1a7f37]">Todo</span>;
}

export default function UserProjectPage({ username, projectId, onMenuClick, onSignOut }: UserProjectPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const layout = searchParams.get("layout") || "table";

  // Real project data
  const [project, setProject] = useState<Project | null>(null);
  const [views, setViews] = useState<ProjectView[]>([]);
  const [items, setItems] = useState<ProjectItemDTO[]>([]);
  const [, setDataLoading] = useState(false);
  const [draggingBoardItemId, setDraggingBoardItemId] = useState<string | null>(null);

  // Edit name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    setDataLoading(true);
    try {
      // List all projects and find by number
      const allProjects = await projectsApi.listProjects();
      const found = allProjects.find((p) => String(p.number) === String(projectId));
      if (found) {
        setProject(found);
        const [fetchedViews, fetchedItems] = await Promise.all([
          projectsApi.listViews(found.id),
          projectsApi.listItems(found.id),
        ]);
        setViews(fetchedViews || []);
        setItems(fetchedItems || []);
      }
    } catch (e) {
      console.error("Failed to fetch project", e);
    } finally {
      setDataLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchProjectData();
  }, [fetchProjectData]);

  const handleStartEditName = () => {
    setEditNameValue(project?.title || "");
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!project || !editNameValue.trim() || savingName) return;
    setSavingName(true);
    try {
      const updated = await projectsApi.updateProject(project.id, { title: editNameValue.trim() });
      setProject(updated);
    } catch (e) {
      console.error("Failed to update project name", e);
    } finally {
      setSavingName(false);
      setIsEditingName(false);
    }
  };

  const handleAddItem = useCallback(async (issue: { id: string }, status: string = 'Todo') => {
    if (!project) return;
    try {
      await projectsApi.addItem(project.id, {
        content_type: 'ISSUE',
        content_id: issue.id,
        status,
      });
      // Refresh items
      const refreshed = await projectsApi.listItems(project.id);
      setItems(refreshed || []);
    } catch (e) {
      console.error("Failed to add item", e);
    }
  }, [project]);

  const handleMoveBoardItem = useCallback(async (itemId: string, nextStatus: string) => {
    if (!project) return;

    const currentItem = items.find((item) => item.id === itemId);
    if (!currentItem || currentItem.status === nextStatus) return;

    setItems((prev) => prev.map((item) => (
      item.id === itemId ? { ...item, status: nextStatus } : item
    )));

    try {
      await projectsApi.updateItem(project.id, itemId, { status: nextStatus });
    } catch (e) {
      console.error("Failed to move project item", e);
      setItems((prev) => prev.map((item) => (
        item.id === itemId ? { ...item, status: currentItem.status } : item
      )));
    }
  }, [items, project]);

  const projectTitle = project?.title || "Untitled project";
  const roadmapBodyHeight = (items.length + 1) * 35;


  const timelineRef = useRef<HTMLDivElement>(null);
  const [leftPaneWidth, setLeftPaneWidth] = useState(336);
  const isDraggingRef = useRef(false);
  const [timelineItems, setTimelineItems] = useState<{rowId: string, dateStr: string, duration?: number}[]>([]);

  const draggingItemRef = useRef<{
    index: number;
    type: 'left' | 'right';
    initialMouseX: number;
    initialStartDayIndex: number;
    initialDuration: number;
  } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        setLeftPaneWidth(Math.max(144, newWidth)); // min width is 3 days
      }

      if (draggingItemRef.current) {
        const dragInfo = draggingItemRef.current;
        const diffX = e.clientX - dragInfo.initialMouseX;
        const diffDays = Math.round(diffX / 48);
        
        setTimelineItems(prev => {
          const next = [...prev];
          const item = { ...next[dragInfo.index] };
          
          if (dragInfo.type === 'right') {
            let newDuration = dragInfo.initialDuration + diffDays;
            const maxDuration = allDays.length - dragInfo.initialStartDayIndex;
            newDuration = Math.max(1, Math.min(newDuration, maxDuration));
            item.duration = newDuration;
          } else if (dragInfo.type === 'left') {
            const rightEdgeDayIndex = dragInfo.initialStartDayIndex + dragInfo.initialDuration - 1;
            let newStartDayIndex = dragInfo.initialStartDayIndex + diffDays;
            newStartDayIndex = Math.max(0, Math.min(newStartDayIndex, rightEdgeDayIndex));
            
            item.dateStr = allDays[newStartDayIndex].dateStr;
            item.duration = rightEdgeDayIndex - newStartDayIndex + 1;
          }
          next[dragInfo.index] = item;
          return next;
        });
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      draggingItemRef.current = null;
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    if (layout === 'roadmap' && timelineRef.current) {
      const cellWidth = 48;
      const containerWidth = timelineRef.current.clientWidth;
      const scrollX = (todayIndex * cellWidth) - (containerWidth / 2) + (leftPaneWidth / 2) + (cellWidth / 2);
      timelineRef.current.scrollLeft = scrollX;
    }
  }, [layout, leftPaneWidth]);

  const [searchQuery, setSearchQuery] = useState("");

  const [isViewOpen, setIsViewOpen] = useState(false);
  const { refs: viewRefs, floatingStyles: viewFloatingStyles, context: viewContext } = useFloating({
    open: isViewOpen,
    onOpenChange: setIsViewOpen,
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip(), shift()],
  });
  const viewClick = useClick(viewContext);
  const viewDismiss = useDismiss(viewContext);
  const viewRole = useRole(viewContext);
  const { getReferenceProps: getViewReferenceProps, getFloatingProps: getViewFloatingProps } = useInteractions([viewClick, viewDismiss, viewRole]);

  const [showHierarchy, setShowHierarchy] = useState(true);
  const [showAgentSessions, setShowAgentSessions] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-[var(--surface-canvas)] font-sans text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-default)] bg-[var(--surface-page)]">
        <TopHeader
          leftContent={
            <div className="flex flex-col min-w-0">
              <div className="min-w-0 flex items-center gap-1 text-sm font-semibold">
                <RouteButton
                  href={`/${username}`}
                  className="max-w-[180px] truncate"
                >
                  {username}
                </RouteButton>
                <span className="text-[var(--text-muted)] font-normal">/</span>
                <RouteButton
                  href={`/${username}?tab=projects`}
                  className="truncate"
                >
                  Projects
                </RouteButton>
                <span className="text-[var(--text-muted)] font-normal">/</span>
                <RouteButton
                  selected
                  href={`/users/${username}/projects/${projectId}/views/${views[0]?.id ?? '1'}`}
                  className="truncate inline-flex items-center"
                >
                  {projectTitle}
                  <LockIcon size={12} className="ml-1.5 relative -top-[1px] text-[var(--text-primary)]" />
                </RouteButton>
              </div>
            </div>
          }
          onMenuClick={onMenuClick}
          onSignOut={onSignOut}
          profileInitial={username}
          profileName={username}
        />
      </header>

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--surface-canvas)]">
        {/* Project Header */}
        <div className="px-4 py-3 flex items-center justify-between bg-[#f6f8fa] dark:bg-[var(--surface-page)]">
          <div className="flex items-center gap-2">
            <LockIcon size={16} className="text-[#656d76]" />
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
                  className="text-[20px] font-semibold bg-white dark:bg-[var(--surface-canvas)] border border-[#0969da] rounded px-2 py-0.5 focus:outline-none"
                  autoFocus
                />
                <button onClick={() => void handleSaveName()} disabled={savingName} className="text-xs text-white bg-[#0969da] px-2 py-1 rounded hover:bg-[#0757ba] disabled:opacity-60">
                  {savingName ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setIsEditingName(false)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1">
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-[20px] font-semibold text-[#24292f] dark:text-[var(--text-primary)]">
                  {projectTitle}
                </h1>
                <Tooltip content="Edit project name" placement="bottom">
                  <button className="text-[#656d76] hover:text-[#0969da] ml-1" onClick={handleStartEditName}>
                    <PencilIcon size={16} />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="h-[28px] px-3 rounded-full bg-[#f3f4f6] dark:bg-[var(--surface-subtle)] text-[12px] font-medium text-[#57606a] dark:text-[var(--text-secondary)] hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] inline-flex items-center border border-[#d0d7de] dark:border-[var(--border-default)]">
              Add status update
            </button>
            <div className="flex items-center rounded-md">
              <button type="button" className="h-[28px] px-3 rounded-l-md bg-white dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] border-r-0 text-xs font-medium text-[#24292f] dark:text-[var(--text-primary)] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] inline-flex items-center gap-1.5 shadow-sm">
                <GraphIcon size={14} className="text-[#656d76]" />
                Insights
              </button>
              <button type="button" className="h-[28px] px-3 rounded-r-md bg-white dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] text-xs font-medium text-[#24292f] dark:text-[var(--text-primary)] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] inline-flex items-center gap-1.5 shadow-sm">
                <WorkflowIcon size={14} className="text-[#656d76]" />
                Workflows
                <span className="ml-0.5 inline-flex items-center justify-center bg-[#f3f4f6] dark:bg-[var(--surface-subtle)] rounded-full h-[18px] min-w-[18px] px-1.5 text-[11px] font-medium text-[#24292f] dark:text-[var(--text-primary)] border border-[#d0d7de] dark:border-[var(--border-default)]">
                  6
                </span>
              </button>
            </div>
            <div className="flex items-center rounded-md ml-1 shadow-sm">
              <button type="button" className="h-[28px] w-[32px] rounded-l-md bg-white dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] border-r-0 text-[#656d76] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] inline-flex items-center justify-center">
                <SidebarCollapseIcon size={14} />
              </button>
              <button type="button" className="h-[28px] w-[32px] rounded-r-md bg-white dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] text-[#656d76] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] inline-flex items-center justify-center">
                <KebabHorizontalIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="px-4 pt-2 flex items-end gap-1 bg-[#f6f8fa] dark:bg-[var(--surface-page)] border-b border-[#d0d7de] dark:border-[var(--border-default)] relative">
          {views.length > 0 ? views.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => {
                navigate(`/users/${username}/projects/${projectId}/views/${view.id}`);
                // Also set layout based on view type
                const lowerLayout = view.layout.toLowerCase();
                if (lowerLayout === 'table') {
                  setSearchParams((p) => { p.delete('layout'); return p; });
                } else {
                  setSearchParams({ layout: lowerLayout });
                }
              }}
              className="h-[32px] px-3 bg-white dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] border-b-white dark:border-b-[var(--surface-canvas)] rounded-t-md text-[13px] font-medium text-[#24292f] dark:text-[var(--text-primary)] inline-flex items-center gap-1.5 z-10 -mb-[1px]"
            >
              <TableIcon size={14} className="text-[#656d76]" />
              {view.name}
              <ChevronDownIcon size={14} className="text-[#656d76] ml-1" />
            </button>
          )) : (
            <button type="button" className="h-[32px] px-3 bg-white dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] border-b-white dark:border-b-[var(--surface-canvas)] rounded-t-md text-[13px] font-medium text-[#24292f] dark:text-[var(--text-primary)] inline-flex items-center gap-1.5 z-10 -mb-[1px]">
              <TableIcon size={14} className="text-[#656d76]" />
              View 1
              <ChevronDownIcon size={14} className="text-[#656d76] ml-1" />
            </button>
          )}
          
          <button type="button" className="h-[32px] px-3 text-[13px] font-medium text-[#57606a] hover:bg-[#ebf0f4] dark:hover:bg-[var(--surface-hover)] hover:text-[#24292f] inline-flex items-center gap-1.5 rounded-t-md transition-colors mb-[1px]">
            <PlusIcon size={14} />
            New view
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2 flex items-center justify-between bg-white dark:bg-[var(--surface-canvas)] relative z-0">
          <div className="relative w-full mr-4">
            <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Filter by keyword or by field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[32px] pl-8 pr-3 rounded-md border border-[var(--border-default)] bg-white dark:bg-[var(--surface-canvas)] text-[13px] focus:outline-none focus:ring-1 focus:ring-[#0969da] focus:border-[#0969da]"
            />
          </div>
          <button 
            type="button" 
            ref={viewRefs.setReference}
            {...getViewReferenceProps()}
            className="h-[32px] px-3 rounded-md bg-white dark:bg-[var(--surface-canvas)] border border-[var(--border-default)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] inline-flex items-center gap-1.5 shrink-0"
          >
            <OcticonGear size={14} className="text-[#656d76]" />
            View
          </button>
          
          {isViewOpen && (
            <FloatingPortal>
              <FloatingFocusManager context={viewContext} modal={false}>
                <div
                  ref={viewRefs.setFloating}
                  style={viewFloatingStyles}
                  {...getViewFloatingProps()}
                  className="z-50 w-[300px] bg-white dark:bg-[var(--surface-overlay)] border border-[var(--border-default)] rounded-xl shadow-[0_8px_24px_rgba(140,149,159,0.2)] dark:shadow-[0_8px_24px_rgba(1,4,9,0.8)] overflow-hidden flex flex-col font-sans text-[var(--text-primary)]"
                >
                  {/* Tabs */}
                  <div className="p-3 border-b border-[var(--border-default)]">
                    <div className="flex bg-[#f6f8fa] dark:bg-[var(--surface-canvas)] rounded-md border border-[var(--border-default)] overflow-hidden p-0">
                      <button 
                        type="button" 
                        onClick={() => { 
                          setSearchParams(params => { params.delete('layout'); return params; }); 
                          setIsViewOpen(false); 
                        }}
                        className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-[13px] border-r border-r-[var(--border-default)] ${layout === 'table' ? 'font-medium bg-white dark:bg-[var(--surface-page)] shadow-[inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-none' : 'text-[#656d76] hover:text-[var(--text-primary)] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)]'}`}
                      >
                        <TableIcon size={16} className={layout === 'table' ? 'text-[#656d76]' : ''} />
                        Table
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setSearchParams({ layout: "board" }); setIsViewOpen(false); }}
                        className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-[13px] border-r border-r-[var(--border-default)] ${layout === 'board' ? 'font-medium bg-white dark:bg-[var(--surface-page)] shadow-[inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-none' : 'text-[#656d76] hover:text-[var(--text-primary)] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)]'}`}
                      >
                        <OcticonProject size={16} className={layout === 'board' ? 'text-[#656d76]' : ''} />
                        Board
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setSearchParams({ layout: "roadmap" }); setIsViewOpen(false); }}
                        className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-[13px] ${layout === 'roadmap' ? 'font-medium bg-white dark:bg-[var(--surface-page)] shadow-[inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-none' : 'text-[#656d76] hover:text-[var(--text-primary)] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)]'}`}
                      >
                        <OcticonProjectRoadmap size={16} className={layout === 'roadmap' ? 'text-[#656d76]' : ''} />
                        Roadmap
                      </button>
                    </div>
                  </div>

                  {/* Settings List */}
                  <div className="py-2 border-b border-[var(--border-default)] flex flex-col">
                    <button type="button" className="w-full px-4 py-1.5 flex items-center justify-between hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] group">
                      <div className="flex items-center gap-2">
                        <SidebarExpandIcon size={16} className="text-[#656d76]" />
                        <span className="text-[13px] text-[#656d76]">Fields:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] truncate max-w-[140px]">Title, Assignees, Status...</span>
                        <ChevronRightIcon size={16} className="text-[#656d76]" />
                      </div>
                    </button>
                    <button type="button" className="w-full px-4 py-1.5 flex items-center justify-between hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] group">
                      <div className="flex items-center gap-2">
                        <RowsIcon size={16} className="text-[#656d76]" />
                        <span className="text-[13px] text-[#656d76]">Group by:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] italic">none</span>
                        <ChevronRightIcon size={16} className="text-[#656d76]" />
                      </div>
                    </button>
                    <button type="button" className="w-full px-4 py-1.5 flex items-center justify-between hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] group">
                      <div className="flex items-center gap-2">
                        <ArrowBothIcon size={16} className="text-[#656d76]" />
                        <span className="text-[13px] text-[#656d76]">Sort by:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] italic">manual</span>
                        <ChevronRightIcon size={16} className="text-[#656d76]" />
                      </div>
                    </button>
                    <button type="button" className="w-full px-4 py-1.5 flex items-center justify-between hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] group">
                      <div className="flex items-center gap-2">
                        <FilterIcon size={16} className="text-[#656d76]" />
                        <span className="text-[13px] text-[#656d76]">Slice by:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] italic">none</span>
                        <ChevronRightIcon size={16} className="text-[#656d76]" />
                      </div>
                    </button>
                  </div>

                  {/* Switches */}
                  <div className="py-3 px-4 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px]">Show hierarchy</span>
                      <RichSwitchButton checked={showHierarchy} onChange={setShowHierarchy} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px]">Show agent sessions</span>
                      <RichSwitchButton checked={showAgentSessions} onChange={setShowAgentSessions} />
                    </div>
                  </div>
                </div>
              </FloatingFocusManager>
            </FloatingPortal>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-white dark:bg-[var(--surface-page)]">
          {layout === 'board' ? (
            <div className="flex overflow-x-auto gap-4 px-4 py-4 min-h-full items-stretch">
              {STATUS_COLUMNS.map((col) => {
                const colItems = items.filter((item) => item.status === col.key);
                return (
                  <div
                    key={col.key}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const itemId = e.dataTransfer.getData('text/plain') || draggingBoardItemId;
                      if (itemId) void handleMoveBoardItem(itemId, col.key);
                      setDraggingBoardItemId(null);
                    }}
                    className={`group/col flex flex-col min-w-[340px] max-w-[340px] shrink-0 bg-[#f6f8fa] dark:bg-[var(--surface-canvas)] border rounded-md ${
                      draggingBoardItemId
                        ? 'border-[#0969da] dark:border-[#0969da]'
                        : 'border-[#d0d7de] dark:border-[var(--border-default)]'
                    }`}
                  >
                    <div className="px-3 pt-3 pb-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <CircleIcon size={16} className={col.color} />
                          <span className="font-semibold text-[14px]">{col.label}</span>
                          <span className="inline-flex items-center justify-center bg-[#ebecf0] dark:bg-[var(--surface-subtle)] text-[#57606a] dark:text-[var(--text-primary)] rounded-full text-[12px] h-5 min-w-[20px] px-1.5 font-medium">{colItems.length}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#656d76]">
                          <button type="button" className="p-1 hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] rounded-md cursor-pointer"><KebabHorizontalIcon size={16} /></button>
                          <AddItemDropdown triggerClassName="inline-flex" onSelectIssue={(issue) => handleAddItem(issue, col.key)}>
                            <button type="button" className="p-1 hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] rounded-md cursor-pointer"><PlusIcon size={16} /></button>
                          </AddItemDropdown>
                        </div>
                      </div>
                      <div className="text-[13px] text-[#656d76]">{col.description}</div>
                    </div>
                    <div className="px-2 pb-2 flex flex-col gap-2 flex-1">
                      {colItems.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggingBoardItemId(item.id);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', item.id);
                          }}
                          onDragEnd={() => setDraggingBoardItemId(null)}
                          className={`bg-white dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] rounded-md p-3 shadow-sm hover:border-[#0969da] cursor-grab active:cursor-grabbing group flex flex-col ${
                            draggingBoardItemId === item.id ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-1.5 text-[12px] text-[#656d76]">
                              {item.content_type === 'PULL_REQUEST' ? (
                                <GitPullRequestIcon size={14} className="text-[#8250df]" />
                              ) : (
                                <IssueOpenedIcon size={14} className="text-[#1a7f37]" />
                              )}
                              <span>{item.number}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button type="button" className="text-[#656d76] hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] p-0.5 rounded-md opacity-0 group-hover:opacity-100"><KebabHorizontalIcon size={14} /></button>
                              {item.avatar ? <Avatar username={item.avatar} size={20} /> : null}
                            </div>
                          </div>
                          <div className="text-[13px] text-[var(--text-primary)] group-hover:text-[#0969da] mb-2">
                            {item.title}
                          </div>
                        </div>
                      ))}

                      {/* Add item button */}
                      <AddItemDropdown triggerClassName="w-full" onSelectIssue={(issue) => handleAddItem(issue, col.key)}>
                        <button type="button" className="w-full py-1.5 flex items-center justify-center gap-1 text-[#656d76] hover:bg-[#ebecf0] dark:hover:bg-[var(--surface-hover)] rounded-md text-[13px] mt-1 transition-all opacity-0 group-hover/col:opacity-100 focus:opacity-100">
                          <PlusIcon size={14} /> Add item
                        </button>
                      </AddItemDropdown>
                    </div>
                  </div>
                );
              })}

              {/* Add Column Button */}
              <div className="flex flex-col shrink-0 self-start">
                <button type="button" className="w-8 h-8 rounded-md bg-[#f6f8fa] dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] hover:border-[#0969da] flex items-center justify-center text-[#656d76] hover:text-[#0969da] cursor-pointer mt-0 shadow-sm transition-colors">
                  <PlusIcon size={16} />
                </button>
              </div>
            </div>

          ) : layout === 'roadmap' ? (
            <div className="flex flex-col min-h-full">
              {/* Roadmap Split View */}
              <div className="flex flex-1 overflow-x-auto overflow-y-hidden relative bg-[#f6f8fa] dark:bg-[var(--surface-canvas)]" ref={timelineRef}>
                <div className="min-w-max flex flex-col relative" style={{ width: `${365 * 48}px` }}>
                  {/* NEW Roadmap Header (Months + Toolbar) */}
                  <div className="flex items-center text-[12px] bg-white dark:bg-[var(--surface-canvas)] sticky top-0 z-40 h-[36px] w-full">
                    {/* Months headers */}
                    <div className="flex items-center h-full absolute left-0 top-0 bottom-0 pointer-events-none">
                      {monthsData.map((m) => (
                        <div key={m.name} className="h-full relative pointer-events-none" style={{ width: `${m.days * 48}px` }}>
                          <div className="sticky left-0 pl-2 font-semibold text-[var(--text-primary)] flex items-center h-full w-max pointer-events-auto">
                            {m.name}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Toolbar sticky to the right edge of viewport */}
                    <div className="sticky right-0 flex items-center gap-4 text-[var(--text-muted)] ml-auto pr-4 pl-4 bg-white dark:bg-[var(--surface-canvas)] h-full z-10">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]">
                        <LocationIcon size={14} /> <span>Markers</span>
                      </div>
                      <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]">
                        <ArrowBothIcon size={14} className="rotate-90" /> <span>Sort</span>
                      </div>
                      <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]">
                        <div className="relative">
                          <CalendarIcon size={14} />
                          <div className="absolute -top-[1px] -right-[2px] w-[6px] h-[6px] bg-[#0969da] rounded-full border-[1.5px] border-white dark:border-[var(--surface-canvas)]"></div>
                        </div>
                        <span>Date fields</span>
                      </div>
                      <div className="flex items-center gap-1 cursor-pointer hover:text-[var(--text-primary)]">
                        <SearchIcon size={14} /> <span>Month</span>
                      </div>
                      <div className="cursor-pointer hover:text-[var(--text-primary)] ml-2">
                        Today
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="w-[24px] h-[24px] flex items-center justify-center rounded hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-subtle)] cursor-pointer">
                           <ChevronLeftIcon size={14} />
                        </div>
                        <div className="w-[24px] h-[24px] flex items-center justify-center rounded hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-subtle)] cursor-pointer">
                           <ChevronRightIcon size={14} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline header (Days) - FULL WIDTH */}
                  <div className="flex h-[34px] border-b border-[var(--border-default)] bg-white dark:bg-[var(--surface-canvas)] text-[11px] text-[var(--text-muted)] min-w-max sticky top-[36px] z-30">
                    {/* Render days exactly like the screenshot */}
                    {allDays.map(dayObj => (
                      <div key={`header-${dayObj.id}`} className="w-[48px] h-full shrink-0 flex items-end justify-center pb-1.5 relative">
                        <div className={dayObj.isToday ? "text-[#d1242f] font-semibold" : ""}>{dayObj.dayOfMonth}</div>
                        {dayObj.isToday && (
                          <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#d1242f] rounded-full z-50 pointer-events-none" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Body Wrapper */}
                  <div className="relative flex" style={{ height: `${roadmapBodyHeight}px` }}>
                    
                    {/* Grid (Behind Left Pane) */}
                    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none border-b border-[var(--border-default)] shadow-sm" style={{ height: `${roadmapBodyHeight}px` }}>

                      {/* Columns representing days */}
                      <div className="flex h-full">
                        {allDays.map(dayObj => (
                          <div key={`grid-${dayObj.id}`} className={`w-[48px] shrink-0 relative ${dayObj.isSunday ? 'border-r border-[var(--border-default)]' : ''}`}>
                            {dayObj.isToday && (
                              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-[#d1242f] z-40 pointer-events-none" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Timeline Interactive Rows */}
                    <div className="absolute top-0 left-0 right-0 flex flex-col pointer-events-none" style={{ height: `${roadmapBodyHeight}px` }}>
                      {items.map(row => {
                        const hasItem = timelineItems.some(item => item.rowId === row.id);
                        return (
                        <div key={`trow-${row.id}`} className="h-[35px] group/timelineRow flex relative w-max pointer-events-none">
                          {/* Default [+] button that sticks to right edge of Left Pane */}
                          {!hasItem && (
                            <div className="sticky h-full shrink-0 z-50 pointer-events-none peer/defaultBtn" style={{ left: `${leftPaneWidth}px`, width: '0px' }}>
                              <div className="absolute top-0 bottom-0 left-0 pl-2 pr-2 flex items-center group-has-[.timeline-cell:hover]/timelineRow:hidden pointer-events-auto group/btnInner default-btn-inner">
                                <div 
                                  className="w-[22px] h-[22px] flex items-center justify-center rounded-md border border-[var(--border-default)] cursor-pointer bg-white dark:bg-[var(--surface-canvas)] shadow-sm hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-subtle)] relative z-10"
                                  onClick={() => {
                                    const todayStr = allDays.find(d => d.isToday)?.dateStr;
                                    if (todayStr) {
                                      setTimelineItems([...timelineItems, { rowId: row.id, dateStr: todayStr }]);
                                    }
                                  }}
                                >
                                  <PlusIcon size={14} className="text-[#656d76]" />
                                  {/* Tooltip for default button */}
                                  <div className="hidden group-hover/btnInner:flex absolute left-full top-1/2 -translate-y-1/2 ml-1.5 px-2 py-1 bg-[#24292f] dark:bg-[#e1e4e8] text-white dark:text-[#24292f] font-medium text-[11px] rounded whitespace-nowrap z-50 shadow-md pointer-events-none">
                                    Add to today at {allDays.find(d => d.isToday)?.dateStr || ''}
                                    {/* Tooltip arrow pointing left */}
                                    <div className="absolute top-1/2 -translate-y-1/2 right-full w-0 h-0 border-[4px] border-transparent border-r-[#24292f] dark:border-r-[#e1e4e8]"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Hover Cells */}
                          {allDays.map(dayObj => (
                            <div key={`tcell-${row.id}-${dayObj.id}`} className="w-[48px] h-full shrink-0 relative group/cell timeline-cell flex items-center justify-center pointer-events-auto">
                              {/* Today outline trigger by default button hover */}
                              {!hasItem && dayObj.isToday && (
                                <div className="hidden peer-hover/defaultBtn:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[24px] rounded-md border border-dashed border-[#d0d7de] dark:border-[#8b949e] bg-transparent z-0 pointer-events-none"></div>
                              )}
                              {/* The custom tooltip */}
                              {!hasItem && (
                                <div className="hidden group-hover/cell:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#24292f] dark:bg-[#e1e4e8] text-white dark:text-[#24292f] font-medium text-[11px] rounded whitespace-nowrap z-50 shadow-md pointer-events-none">
                                  Add to {dayObj.dateStr}
                                  {/* Tooltip arrow */}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-[4px] border-transparent border-t-[#24292f] dark:border-t-[#e1e4e8]"></div>
                                </div>
                              )}
                              {/* Cell [+] button */}
                              {!hasItem && (
                                <div 
                                  className="hidden group-hover/cell:flex w-full h-[24px] items-center justify-center rounded-md border border-[var(--border-default)] cursor-pointer bg-white dark:bg-[var(--surface-canvas)] shadow-sm absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-subtle)]"
                                  onClick={() => {
                                    setTimelineItems([...timelineItems, { rowId: row.id, dateStr: dayObj.dateStr }]);
                                  }}
                                >
                                  <PlusIcon size={14} className="text-[#656d76]" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )})}
                      <div className="h-[35px] flex relative w-max pointer-events-none" />
                    </div>

                    {/* Left Pane Resizer Container */}
                    <div className="sticky left-0 z-40 w-0 h-0 shrink-0 pointer-events-none">
                      <div 
                        className="absolute top-[-34px] w-[24px] h-[33px] cursor-col-resize flex items-center justify-center pointer-events-auto hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)]"
                        style={{ left: `${leftPaneWidth - 12}px` }}
                        onMouseDown={handleMouseDown}
                      >
                        <div className="w-full h-full flex items-center justify-center relative bg-white dark:bg-[var(--surface-canvas)]">
                          <ArrowBothIcon size={10} className="text-[#656d76]" />
                          <div className="absolute top-[10px] bottom-[10px] left-1/2 -translate-x-1/2 w-[1px] border-r border-dashed border-[#656d76] pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Timeline Foreground Items */}
                    <div className="absolute top-0 left-0 right-0 pointer-events-none z-20" style={{ height: `${roadmapBodyHeight}px` }}>
                      {timelineItems.map((item, idx) => {
                        const rowData = items.find(r => r.id === item.rowId);
                        const startDayIndex = allDays.findIndex(d => d.dateStr === item.dateStr);
                        if (!rowData || startDayIndex === -1) return null;

                        const duration = item.duration || 1;
                        const endDayIndex = startDayIndex + duration - 1;
                        const endDateStr = allDays[endDayIndex]?.dateStr || item.dateStr;

                        const tooltipText = duration === 1 ? item.dateStr : `${item.dateStr} - ${endDateStr}`;

                        const rowIndex = items.findIndex(r => r.id === item.rowId);
                        const top = rowIndex * 35 + 5;
                        const left = startDayIndex * 48; // Left edge of the day cell
                        const width = duration * 48;

                        return (
                          <div 
                            key={`item-${idx}`}
                            className="absolute h-[24px] bg-white dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] rounded-md shadow-sm z-50 pointer-events-auto group/item"
                            style={{ 
                              top: `${top}px`, 
                              left: `${left}px`,
                              width: `${width}px`, 
                            }}
                          >
                            {/* The custom tooltip */}
                            <div className="hidden group-hover/item:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-[#24292f] dark:bg-[#e1e4e8] text-white dark:text-[#24292f] font-medium text-[11px] rounded whitespace-nowrap shadow-md pointer-events-none z-[60]">
                              {tooltipText}
                              {/* Tooltip arrow */}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-[4px] border-transparent border-t-[#24292f] dark:border-t-[#e1e4e8]"></div>
                            </div>

                            {/* Left Resize Handle */}
                            <div 
                              className="absolute top-0 bottom-0 left-[-6px] w-[12px] cursor-ew-resize z-10"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                draggingItemRef.current = {
                                  index: idx,
                                  type: 'left',
                                  initialMouseX: e.clientX,
                                  initialStartDayIndex: startDayIndex,
                                  initialDuration: duration
                                };
                                document.body.style.cursor = 'ew-resize';
                              }}
                            />

                            {/* Right Resize Handle */}
                            <div 
                              className="absolute top-0 bottom-0 right-[-6px] w-[12px] cursor-ew-resize z-10"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                draggingItemRef.current = {
                                  index: idx,
                                  type: 'right',
                                  initialMouseX: e.clientX,
                                  initialStartDayIndex: startDayIndex,
                                  initialDuration: duration
                                };
                                document.body.style.cursor = 'ew-resize';
                              }}
                            />

                            <div className="w-full h-full flex items-center pl-2 whitespace-nowrap overflow-visible">
                              {rowData.content_type === 'ISSUE' ? (
                                <IssueOpenedIcon size={14} className="text-[#1a7f37] shrink-0" />
                              ) : (
                                <GitPullRequestIcon size={14} className="text-[#8250df] shrink-0" />
                              )}
                              <div className="flex items-center gap-1.5 ml-2">
                                <span className="text-[12px] text-[var(--text-primary)]">{rowData.title}</span>
                                <span className="text-[12px] text-[var(--text-muted)]">{rowData.number}</span>
                                {rowData.avatar ? <Avatar username={rowData.avatar} size={16} /> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Left Pane (Table) - sticky to left edge */}
                    <div className="shrink-0 flex flex-col z-20 sticky left-0 pointer-events-auto" style={{ width: `${leftPaneWidth}px` }}>
                      {/* Rows */}
                      <div className="flex flex-col w-full border-b border-r border-[var(--border-default)] shadow-sm relative z-10 bg-[#f6f8fa] dark:bg-[var(--surface-canvas)]">
                        {items.map((item, idx) => (
                          <div key={item.id} className="flex items-center h-[35px] border-b border-[var(--border-default)] group hover:bg-[#f6f8fa] dark:hover:bg-[var(--surface-subtle)] bg-white dark:bg-[var(--surface-canvas)] relative">
                            <div className="w-[48px] text-center text-[12px] text-[var(--text-muted)]">{idx + 1}</div>
                            <div className="flex-1 flex items-center gap-2 overflow-hidden px-2 h-full">
                              {item.content_type === 'PULL_REQUEST' ? (
                                <GitPullRequestIcon size={14} className="text-[#8250df] shrink-0" />
                              ) : (
                                <IssueOpenedIcon size={14} className="text-[#1a7f37] shrink-0" />
                              )}
                              <span className="text-[13px] text-[var(--text-primary)] truncate">{item.title}</span>
                              <span className="text-[13px] text-[var(--text-muted)] shrink-0">{item.number}</span>
                            </div>
                          </div>
                        ))}

                        {/* Add Item Row */}
                        <AddItemDropdown triggerClassName="w-full block" onSelectIssue={(issue) => handleAddItem(issue)}>
                          <div className="flex items-center h-[35px] group hover:bg-[#f6f8fa] dark:hover:bg-[var(--surface-subtle)] bg-white dark:bg-[var(--surface-canvas)] cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] w-full">
                            <div className="w-[48px] flex justify-center items-center h-full">
                              <PlusIcon size={16} />
                            </div>
                            <div className="flex-1 flex items-center px-2 text-[13px] h-full">
                              Add item
                            </div>
                          </div>
                        </AddItemDropdown>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
            <thead>
              <tr className="bg-white dark:bg-[var(--surface-canvas)] border-t border-b-[3px] border-[var(--border-default)] text-[12px] text-[#656d76] font-medium">
                <th className="py-[3px] w-[48px] text-center"></th>
                <th className="py-[3px] pl-3 pr-2 font-normal border-r border-[var(--border-default)] w-[400px]">
                  <div className="flex items-center justify-between group/th">
                    Title
                    <KebabHorizontalIcon size={14} className="text-[#656d76] cursor-pointer" />
                  </div>
                </th>
                <th className="py-[3px] px-3 font-normal border-r border-[var(--border-default)] w-[180px]">
                  <div className="flex items-center justify-between group/th">
                    Assignees
                    <KebabHorizontalIcon size={14} className="text-[#656d76] cursor-pointer" />
                  </div>
                </th>
                <th className="py-[3px] px-3 font-normal border-r border-[var(--border-default)] w-[140px]">
                  <div className="flex items-center justify-between group/th">
                    Status
                    <KebabHorizontalIcon size={14} className="text-[#656d76] cursor-pointer" />
                  </div>
                </th>
                <th className="py-[3px] px-3 font-normal border-r border-[var(--border-default)] w-[180px]">
                  <div className="flex items-center justify-between group/th">
                    Linked pull requests
                    <KebabHorizontalIcon size={14} className="text-[#656d76] cursor-pointer" />
                  </div>
                </th>
                <th className="py-[3px] px-3 font-normal border-r border-[var(--border-default)] w-[180px]">
                  <div className="flex items-center justify-between group/th">
                    Sub-issues progress
                    <KebabHorizontalIcon size={14} className="text-[#656d76] cursor-pointer" />
                  </div>
                </th>
                <th className="py-[3px] px-3 font-normal border-r border-[var(--border-default)] w-[140px]">
                  <div className="flex items-center justify-between group/th">
                    Start Date
                    <KebabHorizontalIcon size={14} className="text-[#656d76] cursor-pointer" />
                  </div>
                </th>
                <th className="py-[3px] px-3 font-normal border-r border-[var(--border-default)] w-[140px]">
                  <div className="flex items-center justify-between group/th">
                    End Date
                    <KebabHorizontalIcon size={14} className="text-[#656d76] cursor-pointer" />
                  </div>
                </th>
                <th className="py-[3px] px-3 font-normal w-12 text-center">
                  <AddItemDropdown>
                    <PlusIcon size={14} className="inline-block text-[#656d76] cursor-pointer hover:text-[var(--text-primary)]" />
                  </AddItemDropdown>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="bg-white dark:bg-[var(--surface-canvas)] border-b border-[var(--border-default)] group hover:bg-[#f6f8fa] dark:hover:bg-[var(--surface-subtle)] h-[35px]">
                  <td className="py-1.5 px-2 text-center text-[12px] text-[#656d76]">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 pl-3 pr-2 border-r border-[var(--border-default)]">
                    <div className="flex items-center gap-2">
                      {item.content_type === 'PULL_REQUEST' ? (
                        <GitPullRequestIcon size={14} className="text-[#8250df]" />
                      ) : (
                        <IssueOpenedIcon size={14} className="text-[#1a7f37]" />
                      )}
                      <span className="text-[13px] text-[var(--text-primary)]">{item.title} <span className="text-[var(--text-muted)]">{item.number}</span></span>
                    </div>
                  </td>
                  <td className="py-1.5 px-3 border-r border-[var(--border-default)]">
                    <div className="flex items-center justify-between group/cell w-full h-full">
                      <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-primary)]">
                        {item.avatar ? <Avatar username={item.avatar} size={16} /> : null}
                      </div>
                      <ChevronDownIcon size={14} className="text-[#656d76] opacity-0 group-hover/cell:opacity-100 cursor-pointer" />
                    </div>
                  </td>
                  <td className="py-1.5 px-3 border-r border-[var(--border-default)]">
                    <div className="flex items-center justify-between group/cell w-full h-full">
                      <StatusBadge status={item.status} />
                      <ChevronDownIcon size={14} className="text-[#656d76] opacity-0 group-hover/cell:opacity-100 cursor-pointer" />
                    </div>
                  </td>
                  <td className="py-1.5 px-3 border-r border-[var(--border-default)]"></td>
                  <td className="py-1.5 px-3 border-r border-[var(--border-default)]"></td>
                  <td className="py-1.5 px-3 border-r border-[var(--border-default)]">
                    <div className="text-[13px] text-[#656d76]">{item.start_date || ''}</div>
                  </td>
                  <td className="py-1.5 px-3 border-r border-[var(--border-default)]">
                    <div className="text-[13px] text-[#656d76]">{item.target_date || ''}</div>
                  </td>
                  <td className="py-1.5 px-3 border-r-transparent"></td>
                </tr>
              ))}
              {/* Add an item row */}
              <tr className="border-b border-[var(--border-default)] bg-white dark:bg-[var(--surface-canvas)] h-[35px]">
                <td className="py-1.5 px-2 text-center text-[#656d76]">
                  <AddItemDropdown triggerClassName="inline-flex cursor-pointer" onSelectIssue={(issue) => handleAddItem(issue)}>
                    <PlusIcon size={14} className="inline-block hover:text-[var(--text-primary)]" />
                  </AddItemDropdown>
                </td>
                <td colSpan={8} className="py-1.5 pl-3 pr-2 text-[13px] text-[#656d76]">
                  <AddItemDropdown triggerClassName="inline-flex cursor-pointer" onSelectIssue={(issue) => handleAddItem(issue)}>
                    <span className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                      You can use <kbd className="px-1.5 py-0.5 text-[11px] font-sans bg-white border border-[var(--border-default)] rounded-md text-[var(--text-primary)]">Control + Space</kbd> to add an item
                    </span>
                  </AddItemDropdown>
                </td>
              </tr>
              {Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border-default)] bg-[#f6f8fa] dark:bg-[var(--surface-page)] h-[35px]">
                  <td colSpan={9} className="p-0 relative h-[35px]"></td>
                </tr>
              ))}
            </tbody>

          </table>
          )}
        </div>
      </main>
    </div>
  );
}
