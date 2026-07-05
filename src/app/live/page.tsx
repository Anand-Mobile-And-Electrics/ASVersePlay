import { db } from "@/db";
import { liveEvents } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const GROUPS = ["cricket", "football", "formula 1", "esports"];

export default async function LivePage() {
  const events = await db.select().from(liveEvents).orderBy(desc(liveEvents.startTime)).limit(200);

  const grouped = GROUPS.map((group) => ({
    group,
    items: events.filter((event) => event.sportOrCategory.toLowerCase().includes(group)),
  }));

  const others = events.filter(
    (event) => !GROUPS.some((group) => event.sportOrCategory.toLowerCase().includes(group)),
  );

  return (
    <main className="mx-auto w-full max-w-7xl space-y-10 px-6 py-10">
      <header>
        <p className="text-xs uppercase tracking-wide text-indigo-300">Live Streaming Hub</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Live Sports & Events</h1>
        <p className="mt-2 text-slate-300">Dedicated sections for each sport category with instant watch access.</p>
      </header>

      {grouped.map((section) => (
        <section key={section.group}>
          <h2 className="text-2xl font-semibold capitalize text-white">{section.group}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((event) => (
              <a
                key={event.id}
                href={`/live-events/${event.slug}`}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:border-indigo-500/60"
              >
                <p className="text-xs uppercase tracking-wide text-indigo-300">{event.sportOrCategory}</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{event.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{new Date(event.startTime).toLocaleString()}</p>
              </a>
            ))}
            {section.items.length === 0 ? <p className="text-slate-400">No {section.group} events currently.</p> : null}
          </div>
        </section>
      ))}

      <section>
        <h2 className="text-2xl font-semibold text-white">Other Live Categories</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((event) => (
            <a
              key={event.id}
              href={`/live-events/${event.slug}`}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-4 hover:border-indigo-500/60"
            >
              <p className="text-xs uppercase tracking-wide text-indigo-300">{event.sportOrCategory}</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{event.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{new Date(event.startTime).toLocaleString()}</p>
            </a>
          ))}
          {others.length === 0 ? <p className="text-slate-400">No other live categories currently.</p> : null}
        </div>
      </section>
    </main>
  );
}
