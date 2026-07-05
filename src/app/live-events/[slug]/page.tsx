import { db } from "@/db";
import { liveEventStreams, liveEvents } from "@/db/schema";
import { VideoPlayer } from "@/components/video-player";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LiveEventPage({ params }: PageProps) {
  const { slug } = await params;

  const eventRows = await db.select().from(liveEvents).where(eq(liveEvents.slug, slug)).limit(1);
  const event = eventRows[0];
  if (!event) return notFound();

  const streamRows = await db
    .select({
      id: liveEventStreams.id,
      label: liveEventStreams.label,
      sourceUrl: liveEventStreams.sourceUrl,
      sourceKind: liveEventStreams.sourceKind,
      isActive: liveEventStreams.isActive,
      sortOrder: liveEventStreams.sortOrder,
    })
    .from(liveEventStreams)
    .where(eq(liveEventStreams.liveEventId, event.id))
    .orderBy(asc(liveEventStreams.sortOrder));

  const sources = streamRows.filter((stream) => stream.isActive && Boolean(stream.sourceUrl));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
      <header>
        <p className="text-xs uppercase tracking-wide text-indigo-300">{event.sportOrCategory}</p>
        <h1 className="mt-1 text-3xl font-bold text-white">{event.title}</h1>
        <p className="mt-2 text-slate-300">Starts: {new Date(event.startTime).toLocaleString()}</p>
        {event.description && <p className="mt-2 text-slate-300">{event.description}</p>}
      </header>
      <VideoPlayer title={event.title} sources={sources} embedFallbackUrl={event.embedFallbackUrl} />

      <div className="flex flex-wrap gap-3">
        <a href="/live" className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
          Back to Live Sections
        </a>
        <a href="/admin" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">
          Open Admin Dashboard
        </a>
      </div>
    </main>
  );
}
