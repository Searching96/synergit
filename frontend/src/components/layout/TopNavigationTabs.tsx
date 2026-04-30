import type { ComponentType } from "react";

export interface TopNavigationTab<T extends string> {
  key: T;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  count?: string | number;
}

interface TopNavigationTabsProps<T extends string> {
  tabs: Array<TopNavigationTab<T>>;
  activeKey: T;
  onSelect: (key: T) => void;
}

export default function TopNavigationTabs<T extends string>({
  tabs,
  activeKey,
  onSelect,
}: TopNavigationTabsProps<T>) {
  return (
    <div className="h-12 px-4 md:px-6 gap-2 flex items-end overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeKey === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={`h-11 text-sm font-medium border-b-2 flex items-center justify-center whitespace-nowrap ${
              active
                ? "border-[var(--border-tab-active)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-secondary)]"
            }`}
          >
            <div
              className={`flex items-center justify-center px-2 gap-2 h-8 w-full rounded-md ${
                active
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {tab.count ? (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--surface-badge)] text-[var(--text-secondary)] text-[10px] leading-none">
                  {tab.count}
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
