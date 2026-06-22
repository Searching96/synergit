import { useState } from "react";
import type { Repository } from "../../types";
import { XIcon } from "@primer/octicons-react";

interface RepoAboutModalProps {
  repo: Repository;
  onClose: () => void;
  onSave: (payload: { description?: string; website?: string; topics?: string[] }) => void;
}

export function RepoAboutModal({ repo, onClose, onSave }: RepoAboutModalProps) {
  const [description, setDescription] = useState(repo.description || "");
  const [website, setWebsite] = useState(repo.website || "");
  const [topics, setTopics] = useState<string[]>(repo.topics || []);
  const [topicInput, setTopicInput] = useState("");
  const [includeReleases, setIncludeReleases] = useState(true);
  const [includePackages, setIncludePackages] = useState(true);
  const [includeEnvironments, setIncludeEnvironments] = useState(true);

  const handleSave = () => {
    // Add any pending topic before saving
    const finalTopics = [...topics];
    const pendingTopic = topicInput.trim();
    if (pendingTopic && !finalTopics.includes(pendingTopic)) {
      finalTopics.push(pendingTopic);
    }
    onSave({ description, website, topics: finalTopics });
  };

  const handleTopicKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const val = topicInput.trim();
      if (val && !topics.includes(val)) {
        setTopics([...topics, val]);
      }
      setTopicInput("");
    } else if (e.key === "Backspace" && topicInput === "") {
      e.preventDefault();
      setTopics(topics.slice(0, -1));
    }
  };

  const removeTopic = (indexToRemove: number) => {
    setTopics(topics.filter((_, index) => index !== indexToRemove));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--surface-canvas)] border border-[var(--border-default)] rounded-xl shadow-xl w-full max-w-[560px] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Edit repository details</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Description
            </label>
            <textarea
              className="w-full bg-[var(--surface-canvas)] border border-[var(--border-default)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--focus-border)] focus:ring-1 focus:ring-[var(--focus-border)] resize-y min-h-[60px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Website
            </label>
            <input
              type="text"
              className="w-full bg-[var(--surface-canvas)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--focus-border)] focus:ring-1 focus:ring-[var(--focus-border)]"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Topics <span className="font-normal text-[var(--text-secondary)]">(separate with spaces)</span>
            </label>
            <div className="flex flex-wrap items-center gap-2 w-full bg-[var(--surface-canvas)] border border-[var(--border-default)] rounded-md px-2 py-1.5 focus-within:border-[var(--focus-border)] focus-within:ring-1 focus-within:ring-[var(--focus-border)] min-h-[36px]">
              {topics.map((topic, idx) => (
                <span
                  key={idx}
                  className="bg-[#ddf4ff] text-[#0969da] dark:bg-[rgba(56,139,253,0.1)] dark:text-[#58a6ff] px-2.5 h-6 rounded-full text-xs font-medium flex items-center justify-center gap-1 leading-none"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => removeTopic(idx)}
                    className="hover:text-[#0550ae] dark:hover:text-[#79c0ff] focus:outline-none"
                    aria-label={`Remove ${topic} topic`}
                  >
                    <XIcon size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 min-w-[60px] text-sm text-[var(--text-primary)] p-0"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={handleTopicKeyDown}
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Include in the home page
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={includeReleases}
                  onChange={(e) => setIncludeReleases(e.target.checked)}
                />
                <span className="text-sm text-[var(--text-primary)]">Releases</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={includePackages}
                  onChange={(e) => setIncludePackages(e.target.checked)}
                />
                <span className="text-sm text-[var(--text-primary)]">Packages</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={includeEnvironments}
                  onChange={(e) => setIncludeEnvironments(e.target.checked)}
                />
                <span className="text-sm text-[var(--text-primary)]">Environments</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-default)] flex justify-end gap-2 bg-[var(--surface-canvas)] rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm font-medium text-[var(--text-on-accent)] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] border border-[var(--accent-primary)] rounded-md"
          >
            Save changes
          </button>
        </div>
      </div>
    </>
  );
}
