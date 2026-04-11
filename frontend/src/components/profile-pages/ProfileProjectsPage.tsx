import { Boxes } from "lucide-react";

export default function ProfileProjectsPage() {
  return (
    <div className="space-y-4">
      <section className="border border-[#30363d] rounded-lg overflow-hidden bg-gradient-to-r from-[#1f2837] to-[#1a2232]">
        <div className="p-6 md:p-8 max-w-[760px]">
          <h2 className="text-[40px] leading-[44px] font-semibold text-[#f0f6fc]">Welcome to Projects</h2>
          <p className="mt-3 text-[#8b949e] text-lg leading-8">
            Built to be flexible and adaptable, Projects gives you a live canvas to filter, sort, and group issues and pull requests.
          </p>
          <button type="button" className="mt-5 h-10 px-4 rounded-md border border-[#30363d] bg-[#21262d] text-[#c9d1d9] font-medium">
            Learn more
          </button>
        </div>
      </section>

      <section className="border border-[#30363d] rounded-md bg-[#0d1117] min-h-[320px] flex items-center justify-center">
        <div className="text-center space-y-3 max-w-[460px]">
          <Boxes size={28} className="mx-auto text-[#8b949e]" />
          <h3 className="text-[36px] leading-[42px] font-semibold text-[#f0f6fc]">Create your first GitHub project</h3>
          <p className="text-[#8b949e] text-lg">Projects are a customizable, flexible tool for planning and tracking your work.</p>
          <button type="button" className="h-10 px-5 rounded-md bg-[#238636] text-white font-semibold">New project</button>
        </div>
      </section>
    </div>
  );
}
