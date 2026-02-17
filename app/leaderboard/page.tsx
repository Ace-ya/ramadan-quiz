"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  id: string;
  email: string;
  display_name?: string | null;
  total_points: number;
  role?: string;
};

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

function rankEmoji(i: number) {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return "🏅";
}

function showName(r: Row) {
  const name = (r.display_name || "").trim();
  if (name) return `${name} (${r.email})`;
  return r.email;
}

export default function LeaderboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  const top3 = useMemo(() => rows.slice(0, 3), [rows]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      const u = await supabase.auth.getUser();
      setEmail(u.data.user?.email ?? "");

      await loadLeaderboard();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadLeaderboard() {
    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/leaderboard", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          json?.error || "You don’t have access to the leaderboard (admin/mod only)."
        );
      }

      setRows((json.leaderboard ?? []) as Row[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070B1E] via-[#0B1636] to-[#020413]" />
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:60px_60px]" />
      <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute top-10 right-10 select-none text-7xl drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]">
        🌙
      </div>
      <div className="absolute left-10 top-10 hidden sm:block select-none text-5xl opacity-90 drop-shadow-[0_0_18px_rgba(255,205,120,0.25)]">
        🏮
      </div>
      <div className="absolute -bottom-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      {/* Content */}
      <div className="relative mx-auto max-w-3xl px-4 py-10 text-white">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Leaderboard <span className="select-none">🏆</span>
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Admin/Moderator view. Users can’t see scores ✨
            </p>
            {email && (
              <p className="mt-1 text-xs text-white/50">
                Logged in as:{" "}
                <span className="font-semibold text-white/70">{email}</span>
              </p>
            )}
            <p className="mt-1 text-xs text-white/50">
              Tip: Users can set a name at <b>/profile</b>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadLeaderboard}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 backdrop-blur hover:bg-white/10"
            >
              Refresh
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 backdrop-blur hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Top 3 */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Top 3</h2>
            <span className="select-none text-xl">✨</span>
          </div>

          {loading ? (
            <p className="mt-3 text-white/70">Loading…</p>
          ) : top3.length === 0 ? (
            <p className="mt-3 text-white/70">No data yet.</p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {top3.map((r, i) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-2xl">{rankEmoji(i)}</div>
                  <div className="mt-2 text-sm font-bold text-white/90 break-all">
                    {showName(r)}
                  </div>
                  <div className="mt-2 text-sm text-white/70">
                    Points:{" "}
                    <span className="font-extrabold text-white">{r.total_points}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Full table */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">All Users</h2>
            <span className="text-sm text-white/60">{rows.length ? `${rows.length} users` : ""}</span>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-red-200/20 bg-red-500/10 p-3 text-sm text-white/85">
              {error}
            </div>
          )}

          {loading ? (
            <p className="mt-3 text-white/70">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="mt-3 text-white/70">No leaderboard entries yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-white/70">
                    <th className="border-b border-white/10 pb-2 pr-4">#</th>
                    <th className="border-b border-white/10 pb-2 pr-4">Name / Email</th>
                    <th className="border-b border-white/10 pb-2 pr-4">Points</th>
                    <th className="border-b border-white/10 pb-2 pr-4">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.id} className="align-top">
                      <td className="border-b border-white/5 py-3 pr-4 text-white/70">
                        {idx + 1}
                      </td>
                      <td className="border-b border-white/5 py-3 pr-4 font-semibold text-white/90 break-all">
                        {showName(r)}
                      </td>
                      <td className="border-b border-white/5 py-3 pr-4">
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 font-extrabold text-white">
                          {r.total_points}
                        </span>
                      </td>
                      <td className="border-b border-white/5 py-3 pr-4 text-white/80">
                        {r.role || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-6 text-center text-xs text-white/45">
          <span className="select-none">🕌</span> Ramadan Quiz — Admin view
        </footer>
      </div>
    </main>
  );
}
