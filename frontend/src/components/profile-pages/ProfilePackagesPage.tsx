export default function ProfilePackagesPage() {
  return (
    <div className="space-y-5">
      <section className="text-center pt-6">
        <h2 className="text-[48px] leading-[52px] font-semibold text-[#24292f]">Get started with GitHub Packages</h2>
        <p className="mt-4 text-[#57606a] text-lg">
          Safely publish packages, store your packages alongside your code, and share your packages privately with your team.
        </p>
      </section>

      <section>
        <h3 className="text-center text-[30px] leading-[34px] text-[#24292f] mb-4">Choose a registry</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[
            ["Apache Maven", "A default package manager used for the Java programming language and the Java runtime environment."],
            ["NuGet", "A free and open source package manager used for the Microsoft development platforms including .NET."],
            ["RubyGems", "A standard format for distributing Ruby programs and libraries used for the Ruby programming language."],
            ["npm", "A package manager for JavaScript, included with Node.js. npm makes it easy for developers to share and reuse code."],
            ["Containers", "A single place for your team to manage Docker images and decide who can access your images."],
          ].map(([title, desc]) => (
            <article key={title} className="border border-[#d1d9e0] rounded-md p-5 bg-white">
              <h4 className="text-[32px] leading-[36px] font-semibold text-[#24292f]">{title}</h4>
              <p className="mt-3 text-[#57606a] text-sm leading-6">{desc}</p>
              <button type="button" className="mt-5 h-8 px-3 rounded-md border border-[#d1d9e0] bg-[#f6f8fa] text-[#24292f] text-sm hover:bg-[#eef1f4]">
                Learn more
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
