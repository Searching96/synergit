import { BookOpen } from "lucide-react";

interface RepoWikiPageProps {
  repoName: string;
}

export default function RepoWikiPage({ repoName }: RepoWikiPageProps) {
  return (
    <section className="min-h-[560px] border border-[#d8dee4] rounded-md bg-white flex items-center justify-center">
      <div className="text-center space-y-3 max-w-[920px] px-6">
        <BookOpen size={30} className="mx-auto text-[#8c959f]" />
        <h2 className="text-[48px] leading-[1.2] font-semibold text-[#24292f]">Welcome to the {repoName} wiki!</h2>
        <p className="text-[32px] leading-[1.35] text-[#57606a]">
          Wikis provide a place in your repository to lay out the roadmap of your project, show the current status, and document software better, together.
        </p>
        <button
          type="button"
          className="mt-2 h-10 px-4 rounded-md bg-[#2da44e] text-white font-semibold text-base hover:bg-[#2c974b]"
        >
          Create the first page
        </button>
      </div>
    </section>
  );
}
