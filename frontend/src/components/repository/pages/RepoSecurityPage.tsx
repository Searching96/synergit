import { AlertTriangle, Shield, ShieldCheck } from "lucide-react";

const OVERVIEW_ROWS = [
  {
    title: "Security policy",
    status: "Disabled",
    description: "Define how users should report security vulnerabilities for this repository",
    statusColor: "text-[#57606a]",
  },
  {
    title: "Security advisories",
    status: "Enabled",
    description: "View or disclose security advisories for this repository",
    statusColor: "text-[#1f883d]",
  },
  {
    title: "Private vulnerability reporting",
    status: "Disabled",
    description: "Allow users to privately report potential security vulnerabilities",
    statusColor: "text-[#57606a]",
  },
  {
    title: "Dependabot alerts",
    status: "Disabled",
    description: "Get notified when one of your dependencies has a vulnerability",
    statusColor: "text-[#57606a]",
  },
  {
    title: "Code scanning alerts",
    status: "Needs setup",
    description: "Automatically detect common vulnerabilities and coding errors",
    statusColor: "text-[#bf8700]",
  },
  {
    title: "Secret scanning alerts",
    status: "Enabled",
    description: "Get notified if a secret is pushed to this repository",
    statusColor: "text-[#1f883d]",
  },
];

const LEFT_SECTIONS = [
  {
    title: "Findings",
    items: ["Dependabot", "Malware", "Vulnerabilities", "Code scanning", "Secret scanning"],
  },
  {
    title: "Reporting",
    items: ["Security policy", "Advisories"],
  },
];

export default function RepoSecurityPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
      <aside className="border border-[#d8dee4] rounded-md bg-white py-3">
        <p className="px-4 text-[40px] leading-[1.2] font-semibold text-[#24292f] mb-3">Security and quality</p>
        <button
          type="button"
          className="w-full px-4 py-2 text-left text-sm font-semibold text-[#24292f] border-l-2 border-[#0969da] bg-[#f6f8fa] inline-flex items-center gap-2"
        >
          <Shield size={15} />
          Overview
        </button>

        {LEFT_SECTIONS.map((section) => (
          <div key={section.title} className="mt-3">
            <p className="px-4 text-xs font-semibold uppercase tracking-wide text-[#57606a]">{section.title}</p>
            <div className="mt-1">
              {section.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="w-full px-4 py-1.5 text-left text-sm text-[#57606a] hover:bg-[#f6f8fa]"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <section className="space-y-4 min-w-0">
        <h2 className="text-[44px] leading-[1.2] font-semibold text-[#24292f]">Overview</h2>

        <div className="border border-[#d8dee4] rounded-md bg-white overflow-hidden">
          {OVERVIEW_ROWS.map((row, index) => (
            <article
              key={row.title}
              className={`px-4 py-3 ${index > 0 ? "border-t border-[#d8dee4]" : ""}`}
            >
              <div className="flex items-center gap-2 text-base font-semibold text-[#24292f]">
                {row.status === "Enabled" ? (
                  <ShieldCheck size={16} className="text-[#1f883d]" />
                ) : row.status === "Needs setup" ? (
                  <AlertTriangle size={16} className="text-[#bf8700]" />
                ) : (
                  <Shield size={16} className="text-[#57606a]" />
                )}
                {row.title}
                <span className={row.statusColor}>{row.status}</span>
              </div>
              <p className="mt-1 text-sm text-[#57606a]">{row.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
