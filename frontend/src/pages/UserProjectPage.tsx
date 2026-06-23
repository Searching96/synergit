import { useState } from "react";
import { 
  useFloating, autoUpdate, offset, flip, shift, 
  useClick, useDismiss, useRole, useInteractions, 
  FloatingPortal, FloatingFocusManager 
} from "@floating-ui/react";
import { 
  LockIcon, PlusIcon, SearchIcon, KebabHorizontalIcon, TableIcon, ChevronDownIcon, 
  SidebarCollapseIcon, GraphIcon, WorkflowIcon, IssueOpenedIcon, GitPullRequestIcon,
  RowsIcon, ArrowBothIcon, FilterIcon, ChevronRightIcon, SidebarExpandIcon
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
                  href={`/users/${username}/projects/8`}
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
        <div className="px-4 pt-2 border-b border-[var(--border-default)] flex items-end gap-1 bg-[#f6f8fa] dark:bg-[var(--surface-page)] relative">
          <button type="button" className="h-8 px-3 bg-white dark:bg-[var(--surface-canvas)] border border-[var(--border-default)] border-b-white dark:border-b-[var(--surface-canvas)] rounded-t-md text-[13px] font-medium text-[var(--text-primary)] inline-flex items-center gap-1.5 z-10 -mb-[1px]">
            <TableIcon size={14} className="text-[#656d76]" />
            View 1
            <ChevronDownIcon size={14} className="text-[#656d76] ml-0.5" />
          </button>
          <button type="button" className="h-8 px-3 text-[13px] font-medium text-[#656d76] hover:text-[var(--text-primary)] inline-flex items-center gap-1.5 pb-0.5">
            <PlusIcon size={14} />
            New view
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-[var(--border-default)] bg-white dark:bg-[var(--surface-canvas)] relative z-0">
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
            className="h-[32px] px-3 rounded-md bg-[#f6f8fa] dark:bg-[var(--surface-page)] border border-[var(--border-default)] text-[13px] font-medium text-[var(--text-primary)] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] inline-flex items-center gap-1.5 shrink-0"
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
                      <button type="button" className="flex-1 flex justify-center items-center gap-1.5 py-1.5 text-[13px] font-medium bg-white dark:bg-[var(--surface-page)] shadow-[inset_0_1px_0_rgba(255,255,255,1)] dark:shadow-none border-r border-r-[var(--border-default)]">
                        <TableIcon size={16} className="text-[#656d76]" />
                        Table
                      </button>
                      <button type="button" className="flex-1 flex justify-center items-center gap-1.5 py-1.5 text-[13px] text-[#656d76] hover:text-[var(--text-primary)] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)] border-r border-r-[var(--border-default)]">
                        <OcticonProject size={16} />
                        Board
                      </button>
                      <button type="button" className="flex-1 flex justify-center items-center gap-1.5 py-1.5 text-[13px] text-[#656d76] hover:text-[var(--text-primary)] hover:bg-[#f3f4f6] dark:hover:bg-[var(--surface-hover)]">
                        <OcticonProjectRoadmap size={16} />
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

        {/* Table Area */}
        <div className="flex-1 overflow-auto bg-[#f6f8fa] dark:bg-[var(--surface-page)] pb-10">
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
        </div>
      </main>
    </div>
  );
}
