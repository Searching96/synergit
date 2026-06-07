## The Overarching Architecture: A Hybrid Approach

GitHub’s architecture is not a textbook example of pure microservices or a pure monolith; it is a carefully balanced hybrid designed for immense scale.

* **The "Majestic Monolith" Core:** The heart of GitHub remains a massive Ruby on Rails application (internally called `github/github`). This monolith still serves the vast majority of web traffic, user interfaces, and standard business logic.
* **Strategic Microservices:** Highly specialized services sit around the monolith. These are primarily written in **Go** and **Rust** to handle tasks that require massive concurrency or bare-metal CPU performance (e.g., raw Git network routing, syntax highlighting, and code search).
* **Decoupled, Distributed Data:** The data layer is heavily distributed to survive hardware failures. Relational data is managed by **Vitess** (scaling MySQL), Git repository data is heavily replicated across physical racks via **Spokes**, and event streaming (like code indexing) relies on **Kafka**.

---

## The Architectural Philosophy: Pragmatism Over Dogma

If you read GitHub’s engineering blogs and conference talks, a very clear, pragmatic philosophy emerges. They do not chase engineering trends; they engineer for their specific bottlenecks.

* **Extract for Scale, Not for Trend:** GitHub did not rewrite their 12+ year-old Ruby monolith into hundreds of microservices just because microservices became popular. They only extract a service from the monolith when it hits a hard compute limit (like parsing millions of Git commits) or when organizational friction slows down deployments.
* **The Right Language for the Workload:** They prioritize developer velocity where they can, and bare-metal performance where they must. They use Ruby for rapid feature development, Go for network-heavy routing, and Rust for memory-safe, CPU-bound operations (like their Blackbird search engine).
* **Uncompromising Data Consistency:** Because their core product is code hosting, they never sacrifice data durability for speed. Systems like Spokes enforce strict quorum rules—a developer's push is not acknowledged until it is written to multiple isolated servers.
* **Conway's Law as a Guide:** GitHub acknowledges that architecture mirrors team communication. As they grew past thousands of engineers, they began breaking off pieces of the monolith not just for server performance, but to allow different engineering teams to deploy independently without stepping on each other's code.