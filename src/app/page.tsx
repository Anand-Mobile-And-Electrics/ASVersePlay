import { db } from "@/db";
import { contents, liveEvents } from "@/db/schema";
import { ensurePlatformBootstrap } from "@/lib/bootstrap";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensurePlatformBootstrap();

  const [featured, trending, upcomingEvents] = await Promise.all([
    db.select().from(contents).where(eq(contents.isFeatured, true)).orderBy(desc(contents.createdAt)).limit(8),
    db.select().from(contents).where(eq(contents.isTrending, true)).orderBy(desc(contents.createdAt)).limit(8),
    db.select().from(liveEvents).orderBy(desc(liveEvents.startTime)).limit(6),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-12 px-6 py-10">
      <section className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-700/30 via-slate-900 to-slate-950 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.18em] text-indigo-300">Enterprise Open OTT Platform</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight text-white md:text-5xl">ASVerse Play</h1>
        <p className="mt-4 max-w-3xl text-slate-200">
          A modular streaming architecture for movies, web series, live sports, IPTV, anime, news, and future custom media types.
          Built with Next.js + PostgreSQL + Drizzle ORM and role-based security controls.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">Featured</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((item) => (
            <a key={item.id} href={`/content/${item.slug}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-indigo-500/60">
              <p className="text-xs uppercase tracking-wide text-slate-400">{item.contentType.replaceAll("_", " ")}</p>
              <h3 className="mt-2 line-clamp-2 text-lg font-medium text-white">{item.title}</h3>
            </a>
          ))}
          {featured.length === 0 && <p className="text-slate-400">No featured content yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">Trending</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trending.map((item) => (
            <a key={item.id} href={`/content/${item.slug}`} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-indigo-500/60">
              <p className="text-xs uppercase tracking-wide text-slate-400">{item.contentType.replaceAll("_", " ")}</p>
              <h3 className="mt-2 line-clamp-2 text-lg font-medium text-white">{item.title}</h3>
            </a>
          ))}
          {trending.length === 0 && <p className="text-slate-400">No trending content yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">Live Sports Sections</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Cricket", href: "/live" },
            { label: "Football", href: "/live" },
            { label: "Formula 1", href: "/live" },
            { label: "Esports", href: "/live" },
          ].map((item) => (
            <a key={item.label} href={item.href} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:border-indigo-500/60">
              <p className="text-xs uppercase tracking-wide text-indigo-300">Live Category</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{item.label}</h3>
              <p className="mt-1 text-sm text-slate-400">Open dedicated live section</p>
            </a>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-white">Live Events</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcomingEvents.map((event) => (
            <a href={`/live-events/${event.slug}`} key={event.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:border-indigo-500/60">
              <p className="text-xs uppercase tracking-wide text-indigo-300">{event.sportOrCategory}</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{event.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{new Date(event.startTime).toLocaleString()}</p>
            </a>
          ))}
          {upcomingEvents.length === 0 && <p className="text-slate-400">No live events scheduled.</p>}
        </div>
      </section>
    </main>
  );
}
