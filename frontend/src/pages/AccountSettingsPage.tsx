import { useState } from "react";
import { fetcher } from "../services/api/client";
import {
  Bell,
  BookOpen,
  ChevronDown,
  Clock,
  Code,
  CreditCard,
  Globe,
  Key,
  LayoutGrid,
  Mail,
  Monitor,
  Package,
  Paintbrush,
  Settings,
  Shield,
  Smartphone,
  User,
  Users,
  X,
  AlertTriangle,
} from "lucide-react";
import { OcticonLog } from "../components/icons/Octicons";
import { useSetPageReady } from '../contexts/PageReadyContext';

interface AccountSettingsPageProps {
  username: string;
  onGoToProfile?: () => void;
}

interface NavItem {
  icon: typeof User;
  label: string;
  active?: boolean;
  expandable?: boolean;
  badge?: string;
}

const NAV_SECTIONS: Array<{ title?: string; items: NavItem[] }> = [
  {
    items: [
      { icon: User, label: "Public profile" },
      { icon: Settings, label: "Account", active: true },
      { icon: Paintbrush, label: "Appearance" },
      { icon: LayoutGrid, label: "Accessibility" },
      { icon: Bell, label: "Notifications" },
    ],
  },
  {
    title: "Access",
    items: [
      { icon: CreditCard, label: "Billing and licensing", expandable: true },
      { icon: Mail, label: "Emails" },
      { icon: Key, label: "Password and authentication" },
      { icon: Smartphone, label: "Sessions" },
      { icon: Key, label: "SSH and GPG keys" },
      { icon: Users, label: "Organizations" },
      { icon: Globe, label: "Enterprises" },
      { icon: Monitor, label: "Moderation", expandable: true },
    ],
  },
  {
    title: "Code, planning, and automation",
    items: [
      { icon: BookOpen, label: "Repositories" },
      { icon: Monitor, label: "Codespaces" },
      { icon: Code, label: "Models", badge: "Preview" },
      { icon: Package, label: "Packages" },
      { icon: Monitor, label: "Copilot", expandable: true },
      { icon: BookOpen, label: "Pages" },
      { icon: Clock, label: "Saved replies" },
    ],
  },
  {
    title: "Security",
    items: [{ icon: Shield, label: "Code security" }],
  },
  {
    title: "Integrations",
    items: [
      { icon: LayoutGrid, label: "Applications" },
      { icon: Clock, label: "Scheduled reminders" },
    ],
  },
  {
    title: "Archives",
    items: [
      { icon: OcticonLog as any, label: "Security log" },
      { icon: OcticonLog as any, label: "Sponsorship log" },
    ],
  },
];

export default function AccountSettingsPage({ username, onGoToProfile }: AccountSettingsPageProps) {
  useSetPageReady(true);
  const [newUsername, setNewUsername] = useState(username);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChangeUsername = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return;
    }
    setSubmitting(true);
    setUsernameError(null);
    try {
      const result = await fetcher<{ message: string; token: string }>("/user/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_username: trimmed }),
      });
      if (result.token) {
        localStorage.setItem("token", result.token);
      }
      setUsernameSuccess(true);
      setShowInputModal(false);
      window.location.reload();
    } catch (err) {
      setUsernameError(err instanceof Error ? err.message : "Failed to change username");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <span className="h-16 w-16 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-2xl font-semibold text-[var(--text-primary)] inline-flex items-center justify-center">
            {username.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">{username}</h1>
            <p className="text-sm text-[var(--text-link)]">Your personal account</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onGoToProfile}
          className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
        >
          Go to your personal profile
        </button>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-8">
        {/* Sidebar nav */}
        <nav className="w-[240px] shrink-0 space-y-4 text-sm">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx}>
              {section.title ? (
                <p className="px-2 mb-1 text-xs font-semibold text-[var(--text-secondary)]">{section.title}</p>
              ) : null}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        className={`w-full h-8 px-2 rounded-md inline-flex items-center gap-2 text-left ${item.active
                            ? "bg-[var(--surface-subtle)] font-semibold text-[var(--text-primary)] border-l-2 border-[var(--text-link)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                          }`}
                      >
                        <Icon size={15} className="shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge ? (
                          <span className="rounded-full border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] text-[var(--text-link)]">{item.badge}</span>
                        ) : null}
                        {item.expandable ? <ChevronDown size={14} className="text-[var(--text-muted)]" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <div className="pt-2 border-t border-[var(--border-muted)]">
            <button
              type="button"
              className="w-full h-8 px-2 rounded-md inline-flex items-center gap-2 text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            >
              <Code size={15} className="shrink-0" />
              <span>Developer settings</span>
            </button>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-8">
          {/* Change username */}
          <section className="border-b border-[var(--border-muted)] pb-8">
            <h2 className="text-2xl font-normal text-[var(--text-primary)]">Change username</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Changing your username can have <span className="text-[var(--text-link)] underline">unintended side effects</span>.
            </p>
            <button
              type="button"
              onClick={() => setShowWarningModal(true)}
              className="mt-3 h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            >
              Change username
            </button>
            <p className="mt-4 text-xs text-[var(--text-secondary)] flex items-center gap-1">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-[var(--border-default)] text-[10px]">i</span>
              Looking to manage account security settings? You can find them in the <span className="text-[var(--text-link)] underline">Password and authentication</span> page.
            </p>
          </section>

          {/* Link Patreon */}
          <section className="border-b border-[var(--border-muted)] pb-8">
            <h2 className="text-2xl font-normal text-[var(--text-primary)]">Link Patreon account</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Connect a Patreon account for <span className="font-semibold text-[var(--text-primary)]">@{username}</span> to sponsor maintainers with. Get recognition on GitHub for sponsorships made on Patreon when the sponsored person has linked Patreon and GitHub, too, and has a public GitHub Sponsors profile.
            </p>
            <button
              type="button"
              className="mt-3 h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-2"
            >
              <span className="text-[var(--text-link)]">♥</span>
              Connect with Patreon
            </button>
          </section>

          {/* Export account data */}
          <section className="border-b border-[var(--border-muted)] pb-8">
            <h2 className="text-2xl font-normal text-[var(--text-primary)]">Export account data</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Export all repositories and profile metadata for <span className="font-semibold text-[var(--text-primary)]">@{username}</span>. Exports will be available for 7 days.
            </p>
            <button
              type="button"
              className="mt-3 h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
            >
              Start export
            </button>
          </section>

          {/* Successor settings */}
          <section className="border-b border-[var(--border-muted)] pb-8">
            <h2 className="text-2xl font-normal text-[var(--text-primary)]">Successor settings</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              By clicking &quot;Add Successor&quot; below, I acknowledge that I am the owner of the @{username} account, and am authorizing GitHub to transfer content within that account to my GitHub Successor, designated below, in the event of my death. I understand that this appointment of a successor does not override legally binding next-of-kin rules or estate laws of any relevant jurisdiction, and does not create a binding will. <span className="text-[var(--text-link)] underline">Learn more about account successors.</span>
            </p>
            <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">Search by username, full name, or email address</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  readOnly
                  className="w-full h-9 pl-9 pr-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm"
                />
              </div>
              <button
                type="button"
                className="h-9 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
              >
                Add Successor
              </button>
            </div>
            <div className="mt-4 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] px-4 py-8 text-center">
              <p className="font-semibold text-[var(--text-primary)]">You have not designated a successor.</p>
            </div>
          </section>

          {/* Delete account */}
          <section>
            <h2 className="text-2xl font-normal text-red-600">Delete account</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              type="button"
              className="mt-3 h-8 px-3 rounded-md border border-red-600 bg-[var(--surface-canvas)] text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white"
            >
              Delete your account
            </button>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Are you sure you don&apos;t want to just <span className="text-[var(--text-link)] underline">downgrade your account</span> to a <span className="font-semibold">FREE</span> account? We won&apos;t charge your payment information anymore.
            </p>
          </section>
        </main>
      </div>

      {/* Modals */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[450px] bg-white rounded-xl shadow-lg border border-[var(--border-default)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-subtle)] border-b border-[var(--border-default)]">
              <h3 className="font-semibold text-sm">Really change your username?</h3>
              <button type="button" onClick={() => setShowWarningModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div className="flex gap-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md items-start">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>Unexpected bad things will happen if you don't read this!</p>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
                <li><strong>We will not</strong> set up redirects for your old profile page.</li>
                <li><strong>We will not</strong> set up redirects for Pages sites.</li>
                <li><strong>We will</strong> create redirects for your repositories (web and git access).</li>
                <li>Renaming may take a few minutes to complete.</li>
              </ul>
              <button
                type="button"
                onClick={() => { setShowWarningModal(false); setShowInputModal(true); }}
                className="w-full h-9 rounded-md bg-[var(--surface-subtle)] border border-[var(--border-default)] text-red-600 font-semibold hover:bg-gray-100"
              >
                I understand, let's change my username
              </button>
            </div>
          </div>
        </div>
      )}

      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[400px] bg-white rounded-xl shadow-lg border border-[var(--border-default)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-subtle)] border-b border-[var(--border-default)]">
              <h3 className="font-semibold text-sm">Change username</h3>
              <button type="button" onClick={() => { setShowInputModal(false); setUsernameError(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">Enter a new username *</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => { setNewUsername(e.target.value); setUsernameError(null); }}
                  autoFocus
                  className="w-full h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-canvas)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent text-sm"
                />
              </div>
              {usernameError ? <p className="text-xs text-red-600">{usernameError}</p> : null}
              {usernameSuccess ? <p className="text-xs text-green-600">Username updated!</p> : null}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowInputModal(false); setUsernameError(null); }}
                  className="h-8 px-3 rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm font-semibold text-[var(--text-primary)] hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleChangeUsername()}
                  disabled={submitting}
                  className="h-8 px-3 rounded-md bg-[#1f883d] text-white text-sm font-semibold hover:bg-[#1a7f37] disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Change my username"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
