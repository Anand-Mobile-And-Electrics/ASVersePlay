import { db } from "@/db";
import { contents, liveEvents } from "@/db/schema";
import { ensurePlatformBootstrap } from "@/lib/bootstrap";
import { and, desc, eq, isNull, lte, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensurePlatformBootstrap();

  const now = new Date();

  const publicFilter = and(
    eq(contents.visibility, "public"),
    or(
      isNull(contents.publishAt),
      lte(contents.publishAt, now)
    )
  );

  const [featured, trending, latest, upcomingEvents] = await Promise.all([
    db
      .select()
      .from(contents)
      .where(and(publicFilter, eq(contents.isFeatured, true)))
      .orderBy(desc(contents.createdAt))
      .limit(8),

    db
      .select()
      .from(contents)
      .where(and(publicFilter, eq(contents.isTrending, true)))
      .orderBy(desc(contents.createdAt))
      .limit(8),

    db
      .select()
      .from(contents)
      .where(publicFilter)
      .orderBy(desc(contents.createdAt))
      .limit(24),

    db
      .select()
      .from(liveEvents)
      .orderBy(desc(liveEvents.startTime))
      .limit(6),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-12 px-6 py-10">

      {/* Hero */}
      <section className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-700 via-slate-900 to-slate-950 p-10 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.18em] text-indigo-300">
          Enterprise Open OTT Platform
        </p>

        <h1 className="mt-4 text-5xl font-bold text-white">
          ASVerse Play
        </h1>

        <p className="mt-5 max-w-3xl text-slate-300">
          Stream Movies, Web Series, Anime, Live Sports, IPTV, TV Channels,
          News and more with a scalable enterprise streaming platform built
          using Next.js, PostgreSQL and Drizzle ORM.
        </p>
      </section>

      {/* Featured */}
      <section>
        <h2 className="mb-5 text-3xl font-bold text-white">
          ⭐ Featured
        </h2>

        {featured.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((item) => (
              <a
                key={item.id}
                href={`/content/${item.slug}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-indigo-500"
              >
                <p className="text-xs uppercase tracking-wide text-indigo-300">
                  {item.contentType.replaceAll("_", " ")}
                </p>

                <h3 className="mt-2 text-lg font-semibold text-white">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  {item.releaseYear ?? "Upcoming"}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">No featured content.</p>
        )}
      </section>

      {/* Trending */}
      <section>
        <h2 className="mb-5 text-3xl font-bold text-white">
          🔥 Trending
        </h2>

        {trending.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trending.map((item) => (
              <a
                key={item.id}
                href={`/content/${item.slug}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-red-500"
              >
                <p className="text-xs uppercase tracking-wide text-red-300">
                  {item.contentType.replaceAll("_", " ")}
                </p>

                <h3 className="mt-2 text-lg font-semibold text-white">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  {item.releaseYear ?? "Upcoming"}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">No trending content.</p>
        )}
      </section>

      {/* Latest */}
      <section>
        <h2 className="mb-5 text-3xl font-bold text-white">
          🆕 Latest Content
        </h2>

        {latest.length ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {latest.map((item) => (
              <a
                key={item.id}
                href={`/content/${item.slug}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-indigo-500 hover:bg-slate-800"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {item.contentType.replaceAll("_", " ")}
                </p>

                <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-white">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  {item.releaseYear ?? "Upcoming"}
                </p>

                <div className="mt-4 flex gap-2">
                  {item.isFeatured && (
                    <span className="rounded bg-indigo-600 px-2 py-1 text-xs text-white">
                      Featured
                    </span>
                  )}

                  {item.isTrending && (
                    <span className="rounded bg-red-600 px-2 py-1 text-xs text-white">
                      Trending
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">No content available.</p>
        )}
      </section>

      {/* Live Sports */}
      <section>
        <h2 className="mb-5 text-3xl font-bold text-white">
          🏆 Live Sports
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Cricket",
            "Football",
            "Formula 1",
            "Esports",
          ].map((sport) => (
            <a
              key={sport}
              href="/live"
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-indigo-500"
            >
              <p className="text-xs uppercase tracking-wide text-indigo-300">
                Live Category
              </p>

              <h3 className="mt-2 text-lg font-semibold text-white">
                {sport}
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Watch live events
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Live Events */}
      <section>
        <h2 className="mb-5 text-3xl font-bold text-white">
          📺 Live Events
        </h2>

        {upcomingEvents.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <a
                key={event.id}
                href={`/live-events/${event.slug}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-indigo-500"
              >
                <p className="text-xs uppercase tracking-wide text-indigo-300">
                  {event.sportOrCategory}
                </p>

                <h3 className="mt-2 text-lg font-semibold text-white">
                  {event.title}
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  {new Date(event.startTime).toLocaleString()}
                </p>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">
            No live events scheduled.
          </p>
        )}
      </section>

    </main>
  );
}
