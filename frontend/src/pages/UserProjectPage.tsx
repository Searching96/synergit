import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  useFloating, autoUpdate, offset, flip, shift, 
  useClick, useDismiss, useRole, useInteractions, 
  FloatingPortal, FloatingFocusManager 
} from "@floating-ui/react";
import { 
  LockIcon, PlusIcon, SearchIcon, KebabHorizontalIcon, TableIcon, ChevronDownIcon, 
  SidebarCollapseIcon, GraphIcon, WorkflowIcon, IssueOpenedIcon, GitPullRequestIcon,
  RowsIcon, ArrowBothIcon, FilterIcon, ChevronRightIcon, SidebarExpandIcon, CircleIcon,
  LocationIcon, CalendarIcon, ChevronLeftIcon
} from "@primer/octicons-react";
import TopHeader from "../layouts/TopHeader";
import RouteButton from "../components/shared/RouteButton";
import { OcticonGear, OcticonProject, OcticonProjectRoadmap } from "../components/icons/Octicons";
import { RichSwitchButton } from "../components/shared/RichSwitchButton";

interface UserProjectPageProps {
  username: string;
  projectId: string;
  onMenuClick?: () => void;
  onSignOut?: () => void;
}

export default function UserProjectPage({ username, onMenuClick, onSignOut }: UserProjectPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const layout = searchParams.get("layout") || "table";

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
                  href={`/users/${username}/projects/8/views/1`}
                  className="truncate inline-flex items-center"
                >
                  @{username}'s untitled project
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
        <div className="px-4 py-3 flex items-center justify-between bg-[var(--surface-page)]">
          <div className="flex items-center gap-2">
            <LockIcon size={16} className="text-[var(--text-primary)]" />
            <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">
              @{username}'s untitled project
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="h-[28px] px-3 rounded-full bg-[#f3f4f6] dark:bg-[var(--surface-subtle)] text-[13px] font-medium text-[#57606a] dark:text-[var(--text-secondary)] hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] inline-flex items-center border border-[#d0d7de] dark:border-[var(--border-default)]">
              Add status update
            </button>
            <div className="flex items-center rounded-md">
              <button type="button" className="h-[28px] px-3 rounded-l-md bg-[var(--surface-canvas)] border border-[var(--border-default)] border-r-0 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] inline-flex items-center gap-1.5">
                <GraphIcon size={14} className="text-[#656d76]" />
                Insights
              </button>
              <button type="button" className="h-[28px] px-3 rounded-r-md bg-[var(--surface-canvas)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] inline-flex items-center gap-1.5">
                <WorkflowIcon size={14} className="text-[#656d76]" />
                Workflows
                <span className="ml-0.5 inline-flex items-center justify-center bg-[#e1e4e8] dark:bg-[var(--surface-subtle)] rounded-full h-[18px] min-w-[18px] px-1.5 text-[11px] font-medium text-[var(--text-primary)]">
                  6
                </span>
              </button>
            </div>
            <div className="flex items-center rounded-md ml-1">
              <button type="button" className="h-[28px] w-[32px] rounded-l-md bg-[var(--surface-canvas)] border border-[var(--border-default)] border-r-0 text-[#656d76] hover:bg-[var(--surface-hover)] inline-flex items-center justify-center">
                <SidebarCollapseIcon size={14} />
              </button>
              <button type="button" className="h-[28px] w-[32px] rounded-r-md bg-[var(--surface-canvas)] border border-[var(--border-default)] text-[#656d76] hover:bg-[var(--surface-hover)] inline-flex items-center justify-center">
                <KebabHorizontalIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="px-4 pt-2 flex items-end gap-2 bg-white dark:bg-[var(--surface-canvas)] relative">
          <button type="button" className="h-8 px-3 bg-white dark:bg-[var(--surface-canvas)] border border-[var(--border-default)] border-b-white dark:border-b-[var(--surface-canvas)] rounded-t-md text-[13px] font-medium text-[var(--text-primary)] inline-flex items-center gap-1.5 z-10 -mb-[1px]">
            <OcticonProjectRoadmap size={14} className="text-[#656d76]" />
            View 1
            <ChevronDownIcon size={14} className="text-[#656d76] ml-0.5" />
          </button>
          <button type="button" className="h-[28px] px-3 mb-[2px] rounded-md bg-[#f6f8fa] dark:bg-[var(--surface-subtle)] text-[13px] font-medium text-[#656d76] hover:bg-[#ebecf0] dark:hover:bg-[var(--surface-hover)] inline-flex items-center gap-1.5 transition-colors">
            <PlusIcon size={14} />
            New view
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2 flex items-center justify-between border-t border-[var(--border-default)] bg-white dark:bg-[var(--surface-canvas)] relative z-0">
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
            className="h-[32px] px-3 rounded-md bg-white dark:bg-[var(--surface-canvas)] border border-[var(--border-default)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] inline-flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <div className="relative">
              <OcticonGear size={14} className="text-[#656d76]" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#0969da] rounded-full border border-white dark:border-[var(--surface-canvas)]" />
            </div>
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
              {/* Todo Column */}
              <div className="group/col flex flex-col min-w-[340px] max-w-[340px] shrink-0 bg-[#f6f8fa] dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] rounded-md">
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <CircleIcon size={16} className="text-[#1a7f37]" />
                      <span className="font-semibold text-[14px]">Todo</span>
                      <span className="inline-flex items-center justify-center bg-[#ebecf0] dark:bg-[var(--surface-subtle)] text-[#57606a] dark:text-[var(--text-primary)] rounded-full text-[12px] h-5 min-w-[20px] px-1.5 font-medium">1</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#656d76]">
                      <button type="button" className="p-1 hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] rounded-md cursor-pointer"><KebabHorizontalIcon size={16} /></button>
                      <button type="button" className="p-1 hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] rounded-md cursor-pointer"><PlusIcon size={16} /></button>
                    </div>
                  </div>
                  <div className="text-[13px] text-[#656d76]">This item hasn't been started</div>
                </div>
                <div className="px-2 pb-2 flex flex-col gap-2 flex-1">
                  {/* Card */}
                  <div className="bg-white dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] rounded-md p-3 shadow-sm hover:border-[#0969da] cursor-pointer group flex flex-col">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-[12px] text-[#656d76]">
                        <IssueOpenedIcon size={14} className="text-[#1a7f37]" />
                        <span>synergit <span className="text-[#656d76]">#2</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" className="text-[#656d76] hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] p-0.5 rounded-md opacity-0 group-hover:opacity-100"><KebabHorizontalIcon size={14} /></button>
                        <img src={`https://github.com/Searching96.png`} alt="avatar" className="w-5 h-5 rounded-full" />
                      </div>
                    </div>
                    <div className="text-[13px] text-[var(--text-primary)] group-hover:text-[#0969da] mb-2">
                      i sub issue to see sub issue
                    </div>
                  </div>
                  
                  {/* Add item button */}
                  <button type="button" className="w-full py-1.5 flex items-center justify-center gap-1 text-[#656d76] hover:bg-[#ebecf0] dark:hover:bg-[var(--surface-hover)] rounded-md text-[13px] mt-1 transition-all opacity-0 group-hover/col:opacity-100 focus:opacity-100">
                    <PlusIcon size={14} /> Add item
                  </button>
                </div>
              </div>

              {/* In Progress Column */}
              <div className="group/col flex flex-col min-w-[340px] max-w-[340px] shrink-0 bg-[#f6f8fa] dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] rounded-md">
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <CircleIcon size={16} className="text-[#9a6700]" />
                      <span className="font-semibold text-[14px]">In Progress</span>
                      <span className="inline-flex items-center justify-center bg-[#ebecf0] dark:bg-[var(--surface-subtle)] text-[#57606a] dark:text-[var(--text-primary)] rounded-full text-[12px] h-5 min-w-[20px] px-1.5 font-medium">1</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#656d76]">
                      <button type="button" className="p-1 hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] rounded-md cursor-pointer"><KebabHorizontalIcon size={16} /></button>
                      <button type="button" className="p-1 hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] rounded-md cursor-pointer"><PlusIcon size={16} /></button>
                    </div>
                  </div>
                  <div className="text-[13px] text-[#656d76]">This is actively being worked on</div>
                </div>
                <div className="px-2 pb-2 flex flex-col gap-2 flex-1">
                  {/* Card */}
                  <div className="bg-white dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] rounded-md p-3 shadow-sm hover:border-[#0969da] cursor-pointer group">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-[12px] text-[#656d76]">
                        <IssueOpenedIcon size={14} className="text-[#1a7f37]" />
                        <span>test-ui <span className="text-[#656d76]">#15</span></span>
                      </div>
                      <button type="button" className="text-[#656d76] hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] p-0.5 rounded-md opacity-0 group-hover:opacity-100"><KebabHorizontalIcon size={14} /></button>
                    </div>
                    <div className="text-[13px] text-[var(--text-primary)] group-hover:text-[#0969da]">
                      hehe
                    </div>
                  </div>

                  {/* Add item button */}
                  <button type="button" className="w-full py-1.5 flex items-center justify-center gap-1 text-[#656d76] hover:bg-[#ebecf0] dark:hover:bg-[var(--surface-hover)] rounded-md text-[13px] mt-1 transition-all opacity-0 group-hover/col:opacity-100 focus:opacity-100">
                    <PlusIcon size={14} /> Add item
                  </button>
                </div>
              </div>

              {/* Done Column */}
              <div className="group/col flex flex-col min-w-[340px] max-w-[340px] shrink-0 bg-[#f6f8fa] dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] rounded-md">
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <CircleIcon size={16} className="text-[#8250df]" />
                      <span className="font-semibold text-[14px]">Done</span>
                      <span className="inline-flex items-center justify-center bg-[#ebecf0] dark:bg-[var(--surface-subtle)] text-[#57606a] dark:text-[var(--text-primary)] rounded-full text-[12px] h-5 min-w-[20px] px-1.5 font-medium">1</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#656d76]">
                      <button type="button" className="p-1 hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] rounded-md cursor-pointer"><KebabHorizontalIcon size={16} /></button>
                      <button type="button" className="p-1 hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] rounded-md cursor-pointer"><PlusIcon size={16} /></button>
                    </div>
                  </div>
                  <div className="text-[13px] text-[#656d76]">This has been completed</div>
                </div>
                <div className="px-2 pb-2 flex flex-col gap-2 flex-1">
                  {/* Card */}
                  <div className="bg-white dark:bg-[var(--surface-canvas)] border border-[#d0d7de] dark:border-[var(--border-default)] rounded-md p-3 shadow-sm hover:border-[#0969da] cursor-pointer group">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-[12px] text-[#656d76]">
                        <GitPullRequestIcon size={14} className="text-[#8250df]" />
                        <span>test-ui <span className="text-[#656d76]">#14</span></span>
                      </div>
                      <button type="button" className="text-[#656d76] hover:bg-[#e5e7eb] dark:hover:bg-[var(--surface-hover)] p-0.5 rounded-md opacity-0 group-hover:opacity-100"><KebabHorizontalIcon size={14} /></button>
                    </div>
                    <div className="text-[13px] text-[var(--text-primary)] group-hover:text-[#0969da]">
                      Update README.md
                    </div>
                  </div>

                  {/* Add item button */}
                  <button type="button" className="w-full py-1.5 flex items-center justify-center gap-1 text-[#656d76] hover:bg-[#ebecf0] dark:hover:bg-[var(--surface-hover)] rounded-md text-[13px] mt-1 transition-all opacity-0 group-hover/col:opacity-100 focus:opacity-100">
                    <PlusIcon size={14} /> Add item
                  </button>
                </div>
              </div>

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
              <div className="flex flex-1 overflow-x-auto overflow-y-hidden relative bg-[#f6f8fa] dark:bg-[var(--surface-canvas)]">
                <div className="min-w-max flex flex-col relative" style={{ width: `${55 * 48}px` }}>
                  {/* NEW Roadmap Header (Months + Toolbar) */}
                  <div className="flex items-center text-[12px] bg-white dark:bg-[var(--surface-canvas)] sticky top-0 z-40 h-[36px] w-full">
                    {/* June 2026 header */}
                    <div className="absolute left-0 pl-2 font-semibold text-[var(--text-primary)]">
                      June 2026
                    </div>
                    {/* July 2026 header */}
                    <div className="absolute left-[1152px] pl-2 font-semibold text-[var(--text-primary)]">
                      July 2026
                    </div>

                    {/* Toolbar sticky to the right edge of viewport */}
                    <div className="sticky right-4 flex items-center gap-4 text-[var(--text-muted)] ml-auto pr-4">
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
                    {[7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30].map(day => (
                      <div key={`june-${day}`} className="w-[48px] h-full shrink-0 flex items-end justify-center pb-1.5 relative">
                        <div className={day === 23 ? "text-[#d1242f] font-semibold" : ""}>{day}</div>
                        {day === 23 && (
                          <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#d1242f] rounded-full z-50 pointer-events-none" />
                        )}
                      </div>
                    ))}
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map(day => (
                      <div key={`july-${day}`} className="w-[48px] h-full shrink-0 flex items-end justify-center pb-1.5 relative">
                        <div>{day}</div>
                      </div>
                    ))}
                  </div>

                  {/* Body Wrapper */}
                  <div className="flex-1 relative flex">
                    
                    {/* Grid (Behind Left Pane) */}
                    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none border-b border-[var(--border-default)] shadow-sm" style={{ height: '140px' }}>

                      {/* Columns representing days */}
                      <div className="flex h-full">
                        {[7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30].map(day => (
                          <div key={`grid-june-${day}`} className={`w-[48px] shrink-0 relative ${[14, 21, 28].includes(day) ? 'border-r border-[var(--border-default)]' : ''}`}>
                            {day === 23 && (
                              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-[#d1242f] z-40 pointer-events-none" />
                            )}
                          </div>
                        ))}
                        {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map(day => (
                          <div key={`grid-july-${day}`} className={`w-[48px] shrink-0 ${[5, 12, 19, 26].includes(day) ? 'border-r border-[var(--border-default)]' : ''}`} />
                        ))}
                      </div>
                      
                      {/* Removed horizontal row separators to match Gantt view */}
                    </div>

                    {/* Left Pane (Table) - sticky to left edge */}
                    <div className="w-[336px] shrink-0 flex flex-col z-20 sticky left-0 pointer-events-auto">
                      {/* Rows */}
                      <div className="flex flex-col w-full border-b border-r border-[var(--border-default)] shadow-sm relative z-10 bg-[#f6f8fa] dark:bg-[var(--surface-canvas)]">
                        {/* Row 1 */}
                        <div className="flex items-center h-[35px] border-b border-[var(--border-default)] group hover:bg-[#f6f8fa] dark:hover:bg-[var(--surface-subtle)] bg-white dark:bg-[var(--surface-canvas)] relative">
                          <div className="w-[48px] text-center text-[12px] text-[var(--text-muted)]">1</div>
                          <div className="flex-1 flex items-center gap-2 overflow-hidden px-2 h-full">
                            <IssueOpenedIcon size={14} className="text-[#1a7f37] shrink-0" />
                            <span className="text-[13px] text-[var(--text-primary)] truncate">hehe <span className="text-[var(--text-muted)]">#15</span></span>
                          </div>
                          {/* Timeline [+] button projecting into the grid */}
                          <div className="absolute -right-[30px] top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
                            <div className="w-[22px] h-[22px] flex items-center justify-center rounded-md border border-[var(--border-default)] cursor-pointer bg-white dark:bg-[var(--surface-canvas)]">
                               <PlusIcon size={14} className="text-[#656d76]" />
                            </div>
                          </div>
                        </div>
                        {/* Row 2 */}
                        <div className="flex items-center h-[35px] border-b border-[var(--border-default)] group hover:bg-[#f6f8fa] dark:hover:bg-[var(--surface-subtle)] bg-white dark:bg-[var(--surface-canvas)] relative">
                          <div className="w-[48px] text-center text-[12px] text-[var(--text-muted)]">2</div>
                          <div className="flex-1 flex items-center gap-2 overflow-hidden px-2 h-full">
                            <IssueOpenedIcon size={14} className="text-[#1a7f37] shrink-0" />
                            <span className="text-[13px] text-[var(--text-primary)] truncate">i sub issue to see sub issue <span className="text-[var(--text-muted)]">#2</span></span>
                          </div>
                          {/* Timeline [+] button projecting into the grid */}
                          <div className="absolute -right-[30px] top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
                            <div className="w-[22px] h-[22px] flex items-center justify-center rounded-md border border-[var(--border-default)] cursor-pointer bg-white dark:bg-[var(--surface-canvas)]">
                               <PlusIcon size={14} className="text-[#656d76]" />
                            </div>
                          </div>
                        </div>
                        {/* Row 3 */}
                        <div className="flex items-center h-[35px] border-b border-[var(--border-default)] group hover:bg-[#f6f8fa] dark:hover:bg-[var(--surface-subtle)] bg-white dark:bg-[var(--surface-canvas)] relative">
                          <div className="w-[48px] text-center text-[12px] text-[var(--text-muted)]">3</div>
                          <div className="flex-1 flex items-center gap-2 overflow-hidden px-2 h-full">
                            <GitPullRequestIcon size={14} className="text-[#8250df] shrink-0" />
                            <span className="text-[13px] text-[var(--text-primary)] truncate">Update README.md <span className="text-[var(--text-muted)]">#14</span></span>
                          </div>
                          {/* Timeline [+] button projecting into the grid */}
                          <div className="absolute -right-[30px] top-1/2 -translate-y-1/2 z-30 pointer-events-auto">
                            <div className="w-[22px] h-[22px] flex items-center justify-center rounded-md border border-[var(--border-default)] cursor-pointer bg-white dark:bg-[var(--surface-canvas)]">
                               <PlusIcon size={14} className="text-[#656d76]" />
                            </div>
                          </div>
                        </div>

                        {/* Add Item Row */}
                        <div className="flex items-center h-[35px] group hover:bg-[#f6f8fa] dark:hover:bg-[var(--surface-subtle)] bg-white dark:bg-[var(--surface-canvas)] cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                          <div className="w-[48px] flex justify-center items-center h-full">
                            <PlusIcon size={16} />
                          </div>
                          <div className="flex-1 flex items-center px-2 text-[13px] h-full">
                            Add item
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
            <thead>
              <tr className="bg-white dark:bg-[var(--surface-canvas)] border-b-[3px] border-[var(--border-default)] text-[12px] text-[#656d76] font-medium">
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
                    End Date
                    <KebabHorizontalIcon size={14} className="text-[#656d76] cursor-pointer" />
                  </div>
                </th>
                <th className="py-[3px] px-3 font-normal w-12 text-center">
                  <PlusIcon size={14} className="inline-block text-[#656d76] cursor-pointer hover:text-[var(--text-primary)]" />
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 */}
              <tr className="bg-white dark:bg-[var(--surface-canvas)] border-b border-[var(--border-default)] group hover:bg-[#f6f8fa] dark:hover:bg-[var(--surface-subtle)] h-[35px]">
                <td className="py-1.5 px-2 text-center text-[12px] text-[#656d76]">
                  1
                </td>
                <td className="py-1.5 pl-3 pr-2 border-r border-[var(--border-default)]">
                  <div className="flex items-center gap-2">
                    <IssueOpenedIcon size={14} className="text-[#1a7f37]" />
                    <span className="text-[13px] text-[var(--text-primary)]">hehe <span className="text-[var(--text-muted)]">#15</span></span>
                  </div>
                </td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]">
                  <div className="flex items-center justify-between group/cell w-full h-full">
                    <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-primary)]">
                    </div>
                    <ChevronDownIcon size={14} className="text-[#656d76] opacity-0 group-hover/cell:opacity-100 cursor-pointer" />
                  </div>
                </td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]">
                  <div className="flex items-center justify-between group/cell w-full h-full">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium border border-[#d4a72c] bg-[#fff8c5] text-[#9a6700]">
                      In Progress
                    </span>
                    <ChevronDownIcon size={14} className="text-[#656d76] opacity-0 group-hover/cell:opacity-100 cursor-pointer" />
                  </div>
                </td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]"></td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]"></td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]"></td>
                <td className="py-1.5 px-3 border-r-transparent"></td>
              </tr>
              {/* Row 2 */}
              <tr className="bg-white dark:bg-[var(--surface-canvas)] border-b border-[var(--border-default)] group hover:bg-[#f6f8fa] dark:hover:bg-[var(--surface-subtle)] h-[35px]">
                <td className="py-1.5 px-2 text-center text-[12px] text-[#656d76]">
                  2
                </td>
                <td className="py-1.5 pl-3 pr-2 border-r border-[var(--border-default)]">
                  <div className="flex items-center gap-2">
                    <IssueOpenedIcon size={14} className="text-[#1a7f37]" />
                    <span className="text-[13px] text-[var(--text-primary)]">i sub issue to see sub issue <span className="text-[var(--text-muted)]">#2</span></span>
                  </div>
                </td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]">
                  <div className="flex items-center justify-between group/cell w-full h-full">
                    <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-primary)]">
                      <img src={`https://github.com/Searching96.png`} alt="avatar" className="w-4 h-4 rounded-full" />
                      Searching96
                    </div>
                    <ChevronDownIcon size={14} className="text-[#656d76] opacity-0 group-hover/cell:opacity-100 cursor-pointer" />
                  </div>
                </td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]">
                  <div className="flex items-center justify-between group/cell w-full h-full">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium border border-[#4ac26b] bg-[#dafbe1] text-[#1a7f37]">
                      Todo
                    </span>
                    <ChevronDownIcon size={14} className="text-[#656d76] opacity-0 group-hover/cell:opacity-100 cursor-pointer" />
                  </div>
                </td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]"></td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]"></td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]"></td>
                <td className="py-1.5 px-3 border-r-transparent"></td>
              </tr>
              {/* Row 3 */}
              <tr className="bg-white dark:bg-[var(--surface-canvas)] border-b border-[var(--border-default)] group hover:bg-[#f6f8fa] dark:hover:bg-[var(--surface-subtle)] h-[35px]">
                <td className="py-1.5 px-2 text-center text-[12px] text-[#656d76]">
                  3
                </td>
                <td className="py-1.5 pl-3 pr-2 border-r border-[var(--border-default)]">
                  <div className="flex items-center gap-2">
                    <GitPullRequestIcon size={14} className="text-[#8250df]" />
                    <span className="text-[13px] text-[var(--text-primary)]">Update README.md <span className="text-[var(--text-muted)]">#14</span></span>
                  </div>
                </td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]">
                  <div className="flex items-center justify-between group/cell w-full h-full">
                    <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-primary)]">
                    </div>
                    <ChevronDownIcon size={14} className="text-[#656d76] opacity-0 group-hover/cell:opacity-100 cursor-pointer" />
                  </div>
                </td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]">
                  <div className="flex items-center justify-between group/cell w-full h-full">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium border border-[#bf87fa] bg-[#f3e8fd] text-[#8250df]">
                      Done
                    </span>
                    <ChevronDownIcon size={14} className="text-[#656d76] opacity-0 group-hover/cell:opacity-100 cursor-pointer" />
                  </div>
                </td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]"></td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]"></td>
                <td className="py-1.5 px-3 border-r border-[var(--border-default)]"></td>
                <td className="py-1.5 px-3 border-r-transparent"></td>
              </tr>
              {/* Empty rows and Add an item row overlay */}
              {Array.from({ length: 20 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border-default)] bg-[#f6f8fa] dark:bg-[var(--surface-page)] h-[35px]">
                  <td colSpan={8} className="p-0 relative h-[35px]">
                    {i === 0 && (
                      <div className="absolute top-0 left-0 w-full bg-white dark:bg-[var(--surface-canvas)] flex items-center border-b border-[var(--border-default)] h-[31px] z-10">
                        <div className="w-[48px] text-center text-[#656d76] shrink-0 flex justify-center">
                          <PlusIcon size={14} className="inline-block" />
                        </div>
                        <div className="pl-3 pr-2">
                          <div className="text-[13px] text-[#656d76]">
                            <span className="text-[var(--text-muted)]">
                              You can use <kbd className="px-1.5 py-0.5 text-[11px] font-sans bg-white border border-[var(--border-default)] rounded-md text-[var(--text-primary)]">Control + Space</kbd> to add an item
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
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
