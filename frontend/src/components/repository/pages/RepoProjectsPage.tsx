import { Plus, Search, Table2, Unlink } from "lucide-react";

export default function RepoProjectsPage() {
  return (
    <div className="space-y-4">
      <section className="border border-[#d8dee4] rounded-md bg-white overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-6 bg-gradient-to-r from-[#f8f0f6] via-[#f6f8fa] to-[#edf3ff]">
          <h2 className="text-[42px] leading-[1.2] font-semibold text-[#24292f]">Welcome to Projects</h2>
          <p className="mt-3 text-lg text-[#57606a] max-w-[900px]">
            Built to be flexible and adaptable, Projects gives you a live canvas to filter, sort, and group issues and pull requests in a table, board, or roadmap.
          </p>
          <button
            type="button"
            className="mt-4 h-10 px-4 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-[#24292f] text-base font-semibold hover:bg-[#eef1f4]"
          >
            Learn more
          </button>
        </div>
      </section>

      <section className="flex flex-col md:flex-row md:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c959f]" />
          <input
            type="text"
            readOnly
            value="is:open"
            className="h-9 w-full rounded-md border border-[#d1d9e0] bg-white pl-9 pr-3 text-sm text-[#57606a]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          <button
            type="button"
            className="h-9 px-3 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-sm text-[#24292f] inline-flex items-center gap-2"
          >
            <Unlink size={14} />
            Link a project
          </button>
          <button
            type="button"
            className="h-9 px-3 rounded-md bg-[#2da44e] text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#2c974b]"
          >
            <Plus size={14} />
            New project
          </button>
        </div>
      </section>

      <section className="border border-[#d8dee4] rounded-md bg-white min-h-[340px] flex items-center justify-center">
        <div className="text-center space-y-2">
          <Table2 size={30} className="mx-auto text-[#8c959f]" />
          <p className="text-[44px] leading-[1.2] font-semibold text-[#24292f]">Provide quick access to relevant projects.</p>
          <p className="text-xl text-[#57606a]">Add projects to view them here.</p>
        </div>
      </section>
    </div>
  );
}
