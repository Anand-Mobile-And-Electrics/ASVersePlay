import { db } from "@/db";
import { contentSources, contents } from "@/db/schema";
import { VideoPlayer } from "@/components/video-player";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ContentDetailsPage({ params }: PageProps) {
  const { slug } = await params;

  const content = await db.select().from(contents).where(eq(contents.slug, slug)).limit(1);
  if (!content[0]) return notFound();

  const sources = await db
    .select({
      id: contentSources.id,
      label: contentSources.label,
      sourceUrl: contentSources.sourceUrl,
      sourceKind: contentSources.sourceKind,
      isActive: contentSources.isActive,
      sortOrder: contentSources.sortOrder,
    })
    .from(contentSources)
    .where(eq(contentSources.contentId, content[0].id))
    .orderBy(asc(contentSources.sortOrder));

  const validSources = sources.filter((s) => s.isActive && Boolean(s.sourceUrl));

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
      <header>
        <p className="text-xs uppercase tracking-wide text-indigo-300">{content[0].contentType.replaceAll("_", " ")}</p>
        <h1 className="mt-2 text-3xl font-bold text-white">{content[0].title}</h1>
        {content[0].description && <p className="mt-2 max-w-4xl text-slate-300">{content[0].description}</p>}
      </header>

      <VideoPlayer title={content[0].title} sources={validSources} embedFallbackUrl={content[0].embedFallbackUrl} />

      <div className="flex flex-wrap gap-3">
        <a href="/" className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
          Back to Website
        </a>
        <a href="/admin" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500">
          Open Admin Dashboard
        </a>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
        <p>Language: {content[0].language ?? "N/A"}</p>
        <p>Country: {content[0].country ?? "N/A"}</p>
        <p>Release Year: {content[0].releaseYear ?? "N/A"}</p>
      </section>
    </main>
  );
}
