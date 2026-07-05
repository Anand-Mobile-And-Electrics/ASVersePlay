import { db } from "@/db";
import { contents, liveChannels, liveEvents } from "@/db/schema";
import { ensurePlatformBootstrap } from "@/lib/bootstrap";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getContents(type: any) {
  return db
    .select()
    .from(contents)
    .where(
      and(
        eq(contents.visibility, "public"),
        eq(contents.contentType, type)
      )
    )
    .orderBy(desc(contents.createdAt))
    .limit(12);
}

export default async function HomePage() {
  await ensurePlatformBootstrap();

  const [
    movies,
    webSeries,
    anime,
    tvShows,
    documentaries,
    kids,
    concerts,
    news,
    education,
    musicVideos,
    featured,
    trending,
    liveEventsData,
    liveChannelsData,
  ] = await Promise.all([
    getContents("movie"),
    getContents("web_series"),
    getContents("anime"),
    getContents("tv_show"),
    getContents("documentary"),
    getContents("kids"),
    getContents("concert"),
    getContents("news"),
    getContents("education"),
    getContents("music_video"),

    db
      .select()
      .from(contents)
      .where(
        and(
          eq(contents.visibility, "public"),
          eq(contents.isFeatured, true)
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
          eq(contents.isTrending, true)
        )
      )
      .orderBy(desc(contents.createdAt))
      .limit(12),

    db
      .select()
      .from(liveEvents)
      .orderBy(desc(liveEvents.startTime))
      .limit(8),

    db
      .select()
      .from(liveChannels)
      .where(eq(liveChannels.isActive, true))
      .orderBy(desc(liveChannels.createdAt))
      .limit(8),
  ]);

  const sections = [
    { title: "Featured", items: featured },
    { title: "Trending", items: trending },
    { title: "Movies", items: movies },
    { title: "Web Series", items: webSeries },
    { title: "Anime", items: anime },
    { title: "TV Shows", items: tvShows },
    { title: "Documentaries", items: documentaries },
    { title: "Kids", items: kids },
    { title: "Concerts", items: concerts },
    { title: "News", items: news },
    { title: "Education", items: education },
    { title: "Music Videos", items: musicVideos },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <section className="border-b border-slate-800 bg-gradient-to-r from-indigo-900 via-slate-900 to-black">
        <div className="mx-auto max-w-7xl px-8 py-20">
          <h1 className="text-5xl font-bold">
            Welcome to{" "}
            <span className="text-indigo-400">ASVerse Play</span>
          </h1>

          <p className="mt-5 max-w-3xl text-lg text-slate-300">
            Watch Movies, Web Series, Anime, Live TV, Live Sports and much
            more.
          </p>
        </div>
      </section>

      {sections.map((section) => (
        <section
          key={section.title}
          className="mx-auto mt-12 max-w-7xl px-8"
        >
          <h2 className="mb-6 text-3xl font-bold">{section.title}</h2>

          {section.items.length === 0 ? (
            <p className="text-slate-400">
              No {section.title.toLowerCase()} available.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {section.items.map((item) => (
                <a
                  key={item.id}
                  href={`/content/${item.slug}`}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4 transition hover:border-indigo-500 hover:bg-slate-800"
                >
                  <div className="aspect-[2/3] rounded-lg bg-slate-800" />

                  <h3 className="mt-4 line-clamp-2 font-semibold">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs uppercase tracking-wide text-indigo-300">
                    {item.contentType.replaceAll("_", " ")}
                  </p>
                </a>
              ))}
            </div>
          )}
        </section>
      ))}

      {/* Live Channels */}
      <section className="mx-auto mt-16 max-w-7xl px-8">
        <h2 className="mb-6 text-3xl font-bold">
          Live Channels
        </h2>

        {liveChannelsData.length === 0 ? (
          <p className="text-slate-400">
            No live channels available.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {liveChannelsData.map((channel) => (
              <a
                key={channel.id}
                href={`/live/${channel.slug}`}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-indigo-500"
              >
                <h3 className="font-semibold">
                  {channel.name}
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  {channel.category}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Live Events */}
      <section className="mx-auto mt-16 mb-20 max-w-7xl px-8">
        <h2 className="mb-6 text-3xl font-bold">
          Live Events
        </h2>

        {liveEventsData.length === 0 ? (
          <p className="text-slate-400">
            No live events available.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {liveEventsData.map((event) => (
              <a
                key={event.id}
                href={`/live-events/${event.slug}`}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-indigo-500"
              >
                <h3 className="font-semibold">
                  {event.title}
                </h3>

                <p className="mt-2 text-sm text-indigo-300">
                  {event.sportOrCategory}
                </p>

                <p className="mt-2 text-sm text-slate-400">
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
