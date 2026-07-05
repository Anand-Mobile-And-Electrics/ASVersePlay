type MediaInput = {
  provider: "local" | "external";
  localPath: string | null;
  externalUrl: string | null;
};

export function resolveMediaUrl(media: MediaInput | null | undefined): string | null {
  if (!media) return null;
  if (media.provider === "external") return media.externalUrl ?? null;
  if (!media.localPath) return null;
  return media.localPath.startsWith("/") ? media.localPath : `/${media.localPath}`;
}
