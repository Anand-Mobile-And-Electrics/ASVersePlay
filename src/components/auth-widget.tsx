"use client";

import { FormEvent, useState } from "react";

async function requestCsrfToken(): Promise<string | null> {
  const res = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!res.ok) return null;
  const json = (await res.json()) as { csrfToken?: string };
  return json.csrfToken ?? null;
}

export function AuthWidget() {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setMessage("");

    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      rememberMe: Boolean(formData.get("rememberMe")),
    };

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({ error: "Failed" }))) as { error?: string };
      setMessage(error.error ?? "Login failed");
      setLoading(false);
      return;
    }

    await requestCsrfToken();
    setMessage("Super admin login successful.");
    setLoading(false);
  };

  return (
    <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
      <h1 className="text-2xl font-semibold text-slate-900">Super Admin Login</h1>
      <p className="mt-2 text-sm text-slate-600">Single-admin mode is active. Only one super admin can access platform controls.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <input name="email" type="email" required placeholder="Admin email" className="w-full rounded-xl border border-slate-300 px-4 py-2.5" />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Admin password"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5"
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="rememberMe" />
          Remember me
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-70"
        >
          {loading ? "Please wait..." : "Login as Super Admin"}
        </button>
      </form>

      {message && <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}

      <p className="mt-5 text-xs text-slate-500">
        Configure credentials via <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code> in environment variables.
      </p>
    </section>
  );
}
