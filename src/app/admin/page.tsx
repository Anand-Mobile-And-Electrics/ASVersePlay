import { AdminDashboard } from "@/components/admin-dashboard";

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10">
      <header>
        <p className="text-xs uppercase tracking-wide text-indigo-300">Administration</p>
        <h1 className="mt-1 text-3xl font-bold text-white">Control Center</h1>
        <p className="mt-2 text-slate-300">Analytics snapshot for authorized admin roles.</p>
      </header>
      <AdminDashboard />
    </main>
  );
}
