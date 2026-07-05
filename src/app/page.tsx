import { db } from "@/db";
import { contents, liveEvents } from "@/db/schema";
import { ensurePlatformBootstrap } from "@/lib/bootstrap";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensurePlatformBootstrap();

  const [
    featured,
    trending,
    latest,

    movies,
    webSeries,
    anime,
    tvShows,
    liveChannels,
    documentaries,

    upcomingEvents,
  ] = await Promise.all([
    db
      .select()
      .from(contents)
      .where(eq(contents.isFeatured, true))
      .orderBy(desc(contents.createdAt))
      .limit(8),

    db
      .select()
      .from(contents)
      .where(eq(contents.isTrending, true))
      .orderBy(desc(contents.createdAt))
      .limit(8),

    db
      .select()
      .from(contents)
      .where(eq(contents.visibility, "public"))
      .orderBy(desc(contents.createdAt))
      .limit(12),

    db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.visibility, "public"),
          eq(contents.contentType, "movie")
        )
      )
      .orderBy(desc(contents.createdAt))
      .limit(12),

    db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.visibility, "public"),
          eq(contents.contentType, "web_series")
        )
      )
      .orderBy(desc(contents.createdAt))
      .limit(12),

    db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.visibility, "public"),
          eq(contents.contentType, "anime")
        )
      )
      .orderBy(desc(contents.createdAt))
      .limit(12),

    db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.visibility, "public"),
          eq(contents.contentType, "tv_show")
        )
      )
      .orderBy(desc(contents.createdAt))
      .limit(12),

    db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.visibility, "public"),
          eq(contents.contentType, "live_channel")
        )
      )
      .orderBy(desc(contents.createdAt))
      .limit(12),

    db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.visibility, "public"),
          eq(contents.contentType, "documentary")
        )
      )
      .orderBy(desc(contents.createdAt))
      .limit(12),

    db
      .select()
      .from(liveEvents)
      .orderBy(desc(liveEvents.startTime))
      .limit(6),
  ]);

  const sections = [
    { title: "Latest Releases", items: latest },
    { title: "Featured", items: featured },
    { title: "Trending", items: trending },
    { title: "Movies", items: movies },
    { title: "Web Series", items: webSeries },
    { title: "Anime", items: anime },
    { title: "TV Shows", items: tvShows },
    { title: "Live Channels", items: liveChannels },
    { title: "Documentaries", items: documentaries },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-16 px-6 py-10">

      {/* Hero */}

      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-purple-700 to-slate-900 p-10">
        <h1 className="text-5xl font-bold text-white">
          ASVerse Play
        </h1>

        <p className="mt-4 max-w-3xl text-slate-200">
          Stream Movies, Web Series, Anime, Live Sports, IPTV,
          TV Shows and much more.
        </p>
      </section>

      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-5 text-3xl font-bold text-white">
            {section.title}
          </h2>

          {section.items.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
              No content available.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {section.items.map((item) => (
                <a
                  key={item.id}
                  href={`/content/${item.slug}`}
                  className="rounded-2xl border border-slate-800 bg-slate-900 transition hover:border-indigo-500"
                >
                  <div className="aspect-[2/3] rounded-t-2xl bg-slate-800" />

                  <div className="p-4">
                    <p className="text-xs uppercase text-indigo-400">
                      {item.contentType.replaceAll("_", " ")}
                    </p>

                    <h3 className="mt-2 line-clamp-2 font-semibold text-white">
                      {item.title}
                    </h3>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      ))}

      <section>
        <h2 className="mb-5 text-3xl font-bold text-white">
          Upcoming Live Events
        </h2>

        {upcomingEvents.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
            No Live Events
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {upcomingEvents.map((event) => (
              <a
                key={event.id}
                href={`/live-events/${event.slug}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-indigo-500"
              >
                <p className="text-xs uppercase text-indigo-400">
                  {event.sportOrCategory}
                </p>

                <h3 className="mt-2 text-xl font-semibold text-white">
                  {event.title}
                </h3>

                <p className="mt-2 text-slate-400">
                  {new Date(event.startTime).toLocaleString()}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
