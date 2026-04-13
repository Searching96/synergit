import type { ComponentType } from "react";
import {
  CodeIcon,
  CopilotIcon,
  GearIcon,
  GitPullRequestIcon,
  GraphIcon,
  IssueOpenedIcon,
  PlayIcon,
  BookIcon,
} from "@primer/octicons-react";
import { ShieldAlert, Table2 } from "lucide-react";

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
  { key: "files", label: "Code", icon: CodeIcon },
  { key: "issues", label: "Issues", icon: IssueOpenedIcon },
  { key: "pulls", label: "Pull requests", icon: GitPullRequestIcon },
  { key: "agents", label: "Agents", icon: CopilotIcon },
  { key: "actions", label: "Actions", icon: PlayIcon },
  { key: "projects", label: "Projects", icon: Table2 },
  { key: "wiki", label: "Wiki", icon: BookIcon },
  { key: "security", label: "Security and quality", icon: ShieldAlert },
  { key: "insights", label: "Insights", icon: GraphIcon },
  { key: "settings", label: "Settings", icon: GearIcon },
];

export const REPO_TAB_KEY_SET = new Set<RepoTabKey>(REPO_TABS.map((tab) => tab.key));
