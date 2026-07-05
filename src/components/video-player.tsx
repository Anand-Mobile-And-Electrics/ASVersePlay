"use client";

import { useMemo, useState } from "react";

type PlayerSource = {
  id: string;
  label: string;
  sourceUrl: string;
  sourceKind: "video" | "embed" | "hls" | "dash" | "rtmp" | "rtsp" | "iptv";
};

type VideoPlayerProps = {
  title: string;
  sources: PlayerSource[];
  embedFallbackUrl?: string | null;
};

const STORAGE_KEY = "asverse_preferred_server";

export function VideoPlayer({ title, sources, embedFallbackUrl }: VideoPlayerProps) {
  const orderedSources = useMemo(() => [...sources], [sources]);

  const [activeIndex, setActiveIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    const preferred = window.localStorage.getItem(STORAGE_KEY);
    const found = orderedSources.findIndex((s) => s.id === preferred);
    return found >= 0 ? found : 0;
  });
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);

  const active = orderedSources[activeIndex] ?? orderedSources[0];

  const switchServer = (index: number) => {
    const chosen = orderedSources[index];
    if (!chosen) return;
    setUseEmbedFallback(false);
    setActiveIndex(index);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, chosen.id);
    }
  };

  const onPlaybackError = () => {
    if (activeIndex < orderedSources.length - 1) {
      switchServer(activeIndex + 1);
      return;
    }

    if (embedFallbackUrl) {
      setUseEmbedFallback(true);
    }
  };

  if (!active && !embedFallbackUrl) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">No valid stream source available.</div>;
  }

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black shadow-lg">
        {useEmbedFallback && embedFallbackUrl ? (
          <iframe
            src={embedFallbackUrl}
            title={`${title} embed fallback`}
            className="aspect-video w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : active?.sourceKind === "embed" ? (
          <iframe
            src={active.sourceUrl}
            title={title}
            className="aspect-video w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <video key={active?.id} controls className="aspect-video w-full" onError={onPlaybackError} preload="metadata">
            {active?.sourceUrl ? <source src={active.sourceUrl} /> : null}
            Your browser does not support this media source.
          </video>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {orderedSources.map((source, index) => (
          <button
            key={source.id}
            type="button"
            onClick={() => switchServer(index)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              !useEmbedFallback && index === activeIndex
                ? "bg-indigo-600 text-white"
                : "bg-slate-200 text-slate-800 hover:bg-slate-300"
            }`}
          >
            {source.label}
          </button>
        ))}

        {embedFallbackUrl ? (
          <button
            type="button"
            onClick={() => setUseEmbedFallback(true)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              useEmbedFallback ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
            }`}
          >
            Use Embed Fallback
          </button>
        ) : null}
      </div>
    </section>
  );
}
