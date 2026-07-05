"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Stats = {
  contentTotal: number;
  featuredContent: number;
  liveEventTotal: number;
  liveChannelTotal: number;
  usersTotal: number;
};

type CapabilityResponse = {
  role: string;
  permissions: string[];
  controls: { permission: string; label: string }[];
  isSuperAdmin: boolean;
};

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
};

type AdminRole = { id: string; name: string };

type MyLibrary = {
  myContents: { id: string; slug: string; title: string; contentType: string; createdAt: string }[];
  myLiveEvents: { id: string; slug: string; title: string; sportOrCategory: string; createdAt: string }[];
};

async function getCsrfToken(): Promise<string | null> {
  const response = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!response.ok) return null;
  const json = (await response.json()) as { csrfToken?: string };
  return json.csrfToken ?? null;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilityResponse | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [library, setLibrary] = useState<MyLibrary | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = async () => {
    const [statsRes, capRes, usersRes, libraryRes] = await Promise.all([
      fetch("/api/admin/stats", { cache: "no-store" }),
      fetch("/api/admin/me/capabilities", { cache: "no-store" }),
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/my-library", { cache: "no-store" }),
    ]);

    if (!statsRes.ok || !capRes.ok) {
      setError("Access denied or unauthorized.");
      return;
    }

    setStats(((await statsRes.json()) as { data: Stats }).data);
    setCapabilities(((await capRes.json()) as { data: CapabilityResponse }).data);

    if (usersRes.ok) {
      const u = (await usersRes.json()) as { data: { users: AdminUser[]; roles: AdminRole[] } };
      setUsers(u.data.users);
      setRoles(u.data.roles);
    }

    if (libraryRes.ok) {
      const l = (await libraryRes.json()) as { data: MyLibrary };
      setLibrary(l.data);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const cards = useMemo(
    () =>
      stats
        ? [
            { key: "Total Content", value: stats.contentTotal },
            { key: "Featured Content", value: stats.featuredContent },
            { key: "Live Events", value: stats.liveEventTotal },
            { key: "Live Channels", value: stats.liveChannelTotal },
            { key: "Users", value: stats.usersTotal },
          ]
        : [],
    [stats],
  );

  const postJson = async (url: string, body: Record<string, unknown>, method: "POST" | "PATCH" = "POST") => {
    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      setMessage("Unable to get CSRF token. Login again.");
      return false;
    }

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
      setMessage(err.error ?? "Request failed");
      return false;
    }

    setMessage("Action completed successfully.");
    await loadData();
    return true;
  };

  const onCreateContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await postJson("/api/content", {
      contentType: String(fd.get("contentType") ?? "movie"),
      slug: String(fd.get("slug") ?? "").trim(),
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      embedFallbackUrl: String(fd.get("embedFallbackUrl") ?? "").trim() || undefined,
      source: {
        label: String(fd.get("sourceLabel") ?? "Primary"),
        sourceKind: String(fd.get("sourceKind") ?? "video"),
        sourceUrl: String(fd.get("sourceUrl") ?? "").trim(),
      },
    });
  };

  const onCreateLiveEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    await postJson("/api/live-events", {
      slug: String(fd.get("liveSlug") ?? "").trim(),
      title: String(fd.get("liveTitle") ?? "").trim(),
      sportOrCategory: String(fd.get("sportOrCategory") ?? "").trim(),
      tournament: String(fd.get("tournament") ?? "").trim() || undefined,
      venue: String(fd.get("venue") ?? "").trim() || undefined,
      description: String(fd.get("liveDescription") ?? "").trim() || undefined,
      embedFallbackUrl: String(fd.get("liveEmbedFallbackUrl") ?? "").trim() || undefined,
      startTime: new Date(String(fd.get("startTime") ?? new Date().toISOString())).toISOString(),
      streams: [
        {
          label: String(fd.get("liveSourceLabel") ?? "Primary"),
          sourceKind: String(fd.get("liveSourceKind") ?? "hls"),
          sourceUrl: String(fd.get("liveSourceUrl") ?? "").trim(),
        },
      ],
    });
  };

  const onAddBackupSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const slug = String(fd.get("contentSlug") ?? "").trim();
    await postJson(`/api/content/${encodeURIComponent(slug)}/sources`, {
      label: String(fd.get("backupLabel") ?? "Backup"),
      sourceKind: String(fd.get("backupKind") ?? "video"),
      sourceUrl: String(fd.get("backupUrl") ?? "").trim(),
    });
  };

  const onDeleteContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const slug = String(fd.get("deleteSlug") ?? "").trim();

    const csrfToken = await getCsrfToken();
    if (!csrfToken) {
      setMessage("Unable to get CSRF token. Login again.");
      return;
    }

    const response = await fetch(`/api/content?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
      headers: { "x-csrf-token": csrfToken },
    });

    if (!response.ok) {
      const err = (await response.json().catch(() => ({ error: "Delete failed" }))) as { error?: string };
      setMessage(err.error ?? "Delete failed");
      return;
    }

    setMessage("Content deleted successfully.");
    await loadData();
  };

  const onUpdateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const userId = String(fd.get("userId") ?? "");
    const roleName = String(fd.get("roleName") ?? "");
    await postJson(`/api/admin/users/${encodeURIComponent(userId)}/role`, { roleName }, "PATCH");
  };

  if (error) return <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">{error}</p>;
  if (!stats || !capabilities) return <p className="text-slate-300">Loading admin controls...</p>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <a href="/" className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
          Go to Website
        </a>
        <a href="/live" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">
          Go to Live Sports
        </a>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <p className="text-sm text-slate-400">Signed in role</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">{capabilities.role}</h2>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.key} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">{card.key}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onCreateContent} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-white">Add Movie/Series Content</h3>
          <select name="contentType" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white">
            <option value="movie">Movie</option>
            <option value="web_series">Web Series</option>
            <option value="tv_show">TV Show</option>
            <option value="episode">Episode</option>
            <option value="anime">Anime</option>
          </select>
          <input name="title" required placeholder="Title" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <input name="slug" required placeholder="Slug" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <textarea name="description" placeholder="Description" className="h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <input name="sourceLabel" defaultValue="Primary" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <select name="sourceKind" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white">
            <option value="video">Direct Video</option>
            <option value="hls">HLS</option>
            <option value="dash">DASH</option>
            <option value="embed">Embed</option>
          </select>
          <input name="sourceUrl" required type="url" placeholder="Primary source URL" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <input name="embedFallbackUrl" type="url" placeholder="Optional embed fallback URL" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <button className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">Create Content</button>
        </form>

        <form onSubmit={onCreateLiveEvent} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-white">Add Live Sports/Event</h3>
          <input name="liveTitle" required placeholder="Event title" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <input name="liveSlug" required placeholder="Event slug" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <input name="sportOrCategory" required placeholder="Category (Cricket, Football, F1, Esports...)" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <input name="tournament" placeholder="Tournament/Series" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <input name="venue" placeholder="Venue" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <input name="startTime" type="datetime-local" required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <textarea name="liveDescription" placeholder="Description" className="h-20 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <input name="liveSourceLabel" defaultValue="Primary" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <select name="liveSourceKind" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white">
            <option value="hls">HLS</option>
            <option value="video">Direct Video</option>
            <option value="embed">Embed</option>
          </select>
          <input name="liveSourceUrl" required type="url" placeholder="Primary stream URL" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <input name="liveEmbedFallbackUrl" type="url" placeholder="Optional embed fallback URL" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <button className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white">Create Live Event</button>
        </form>

        <form onSubmit={onAddBackupSource} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-white">Add Backup Content Server</h3>
          <input name="contentSlug" required placeholder="Content slug" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <input name="backupLabel" defaultValue="Server 2" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <select name="backupKind" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white">
            <option value="video">Direct Video</option>
            <option value="hls">HLS</option>
            <option value="dash">DASH</option>
            <option value="embed">Embed</option>
          </select>
          <input name="backupUrl" required type="url" placeholder="Backup source URL" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <button className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white">Add Backup Server</button>
        </form>

        <form onSubmit={onDeleteContent} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-white">Delete Content</h3>
          <input name="deleteSlug" required placeholder="Content slug" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          <button className="rounded-lg bg-rose-600 px-4 py-2 font-medium text-white">Delete</button>
        </form>

        <form onSubmit={onUpdateRole} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-white">Role Management</h3>
          <select name="userId" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white">
            {users.map((u) => (
              <option key={u.id} value={u.id}>{`${u.displayName} (${u.email}) - ${u.role}`}</option>
            ))}
          </select>
          <select name="roleName" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white">
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white">Update Role</button>
        </form>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold text-white">My Uploaded Content</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {library?.myContents.map((item) => (
            <a key={item.id} href={`/content/${item.slug}`} className="rounded-lg border border-slate-700 bg-slate-950 p-3 hover:border-indigo-500">
              <p className="text-xs uppercase tracking-wide text-indigo-300">{item.contentType.replaceAll("_", " ")}</p>
              <p className="mt-1 font-medium text-white">{item.title}</p>
            </a>
          ))}
          {library && library.myContents.length === 0 ? <p className="text-slate-400">No uploaded content yet.</p> : null}
        </div>

        <h3 className="mt-8 text-lg font-semibold text-white">My Uploaded Live Events</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {library?.myLiveEvents.map((event) => (
            <a key={event.id} href={`/live-events/${event.slug}`} className="rounded-lg border border-slate-700 bg-slate-950 p-3 hover:border-emerald-500">
              <p className="text-xs uppercase tracking-wide text-emerald-300">{event.sportOrCategory}</p>
              <p className="mt-1 font-medium text-white">{event.title}</p>
            </a>
          ))}
          {library && library.myLiveEvents.length === 0 ? <p className="text-slate-400">No uploaded live events yet.</p> : null}
        </div>
      </section>

      {message ? <p className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-200">{message}</p> : null}
    </div>
  );
}
