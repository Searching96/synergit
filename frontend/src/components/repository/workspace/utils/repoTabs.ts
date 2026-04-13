import type { ComponentType } from "react";
import {
  BarChart3,
  Bot,
  BookOpen,
  CircleDot,
  Code,
  FolderKanban,
  GitPullRequest,
  Settings,
  ShieldCheck,
  Workflow,
} from "lucide-react";

export type RepoTabKey =
  | "files"
  | "issues"
  | "pulls"
  | "agents"
  | "actions"
  | "projects"
  | "wiki"
  | "security"
  | "insights"
  | "settings";

export interface RepoTabItem {
  key: RepoTabKey;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export const REPO_TABS: RepoTabItem[] = [
  { key: "files", label: "Code", icon: Code },
  { key: "issues", label: "Issues", icon: CircleDot },
  { key: "pulls", label: "Pull requests", icon: GitPullRequest },
  { key: "agents", label: "Agents", icon: Bot },
  { key: "actions", label: "Actions", icon: Workflow },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "wiki", label: "Wiki", icon: BookOpen },
  { key: "security", label: "Security and quality", icon: ShieldCheck },
  { key: "insights", label: "Insights", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

export const REPO_TAB_KEY_SET = new Set<RepoTabKey>(REPO_TABS.map((tab) => tab.key));
