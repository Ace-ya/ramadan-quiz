"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type QuestionRow = {
  id: string;
  q_date: string; // YYYY-MM-DD
  question_text: string;
  context_text?: string | null;
  video_url?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  points: number;
};

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

function istanbulTodayYYYYMMDD() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

// Optional helper: accepts watch URLs and converts to embed
function normalizeYouTubeToEmbed(url: string) {
  const u = (url || "").trim();
  if (!u) return "";

  if (u.includes("youtube.com/embed/")) return u;

  const match = u.match(/[?&]v=([^&]+)/);
  if (match?.[1]) return `https://www.youtube.com/embed/${match[1]}`;

  const short = u.match(/youtu\.be\/([^?&]+)/);
  if (short?.[1]) return `https://www.youtube.com/embed/${short[1]}`;

  return u; // keep as-is for vimeo etc.
}

export default function AdminQuestionsPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QuestionRow[]>([]);

  const [form, setForm] = useState({
    q_date: "",
    question_text: "",
    context_text: "",
    video_url: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A" as "A" | "B" | "C" | "D",
    points: 5,
  });

  const todayTR = useMemo(() => istanbulTodayYYYYMMDD(), []);

  const canSubmit = useMemo(() => {
    return (
      form.q_date &&
      form.question_text.trim().length > 3 &&
      form.option_a.trim().length > 0 &&
      form.option_b.trim().length > 0 &&
      form.option_c.trim().length > 0 &&
      form.option_d.trim().length > 0 &&
      ["A", "B", "C", "D"].includes(form.correct_option) &&
      Number.isFinite(form.points) &&
      form.points > 0
    );
  }, [form]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }

      const u = await supabase.auth.getUser();
      setEmail(u.data.user?.email ?? "");

      await loadQuestions();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadQuestions() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/admin/questions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) throw new Error(json?.error || "Failed to load questions");

      setQuestions((json?.questions || []) as QuestionRow[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }

  async function createQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSubmit) return;

    setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const payload = {
        ...form,
        context_text: form.context_text.trim() ? form.context_text.trim() : null,
        video_url: form.video_url.trim()
          ? normalizeYouTubeToEmbed(form.video_url.trim())
          : null,
      };

      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as any;

      if (!res.ok) {
        throw new Error(json?.error || "Failed to create question");
      }

      setSuccess("✅ Question created successfully.");
      setForm((prev) => ({
        ...prev,
        q_date: "",
        question_text: "",
        context_text: "",
        video_url: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        correct_option: "A",
        // keep points as-is
      }));

      await loadQuestions();
    } catch (e: any) {
      setError(e?.message || "Failed to create question");
    } finally {
      setSaving(false);
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
      <div className="relative mx-auto max-w-4xl px-4 py-10 text-white">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Admin — Questions <span className="select-none">🧠</span>
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Create 1 question per day. Users won’t see points/correctness ✨
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/85 backdrop-blur">
                🇹🇷 Istanbul today: <b className="text-white">{todayTR}</b>
              </span>
              {email && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/70 backdrop-blur">
                  Logged in as: <b className="text-white/90">{email}</b>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadQuestions}
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

        {/* Messages */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-200/20 bg-red-500/10 p-4 text-sm text-white/90">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-200/20 bg-emerald-500/10 p-4 text-sm text-white/90">
            {success}
          </div>
        )}

        {/* Create */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Create Question</h2>
            <span className="select-none text-xl">✨</span>
          </div>

          <form onSubmit={createQuestion} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-white/80">
                Date (Istanbul)
                <input
                  type="date"
                  value={form.q_date}
                  onChange={(e) => setForm({ ...form, q_date: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
                  required
                />
              </label>

              <label className="text-sm text-white/80">
                Points
                <input
                  type="number"
                  min={1}
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
                />
              </label>
            </div>

            {/* NEW: Context */}
            <label className="text-sm text-white/80">
              Context / Read first (optional)
              <textarea
                value={form.context_text}
                onChange={(e) => setForm({ ...form, context_text: e.target.value })}
                rows={4}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
                placeholder="Optional reading text shown before the question..."
              />
            </label>

            {/* NEW: Video URL */}
            <label className="text-sm text-white/80">
              Video URL (optional)
              <input
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
                placeholder="Paste YouTube watch link or embed link"
              />
              <p className="mt-2 text-xs text-white/50">
                You can paste a normal YouTube link — it will be auto-converted to embed.
              </p>
            </label>

            <label className="text-sm text-white/80">
              Question text
              <textarea
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                rows={3}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
                placeholder="Write the question…"
                required
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-white/80">
                Option A
                <input
                  value={form.option_a}
                  onChange={(e) => setForm({ ...form, option_a: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
                  required
                />
              </label>

              <label className="text-sm text-white/80">
                Option B
                <input
                  value={form.option_b}
                  onChange={(e) => setForm({ ...form, option_b: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
                  required
                />
              </label>

              <label className="text-sm text-white/80">
                Option C
                <input
                  value={form.option_c}
                  onChange={(e) => setForm({ ...form, option_c: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
                  required
                />
              </label>

              <label className="text-sm text-white/80">
                Option D
                <input
                  value={form.option_d}
                  onChange={(e) => setForm({ ...form, option_d: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
                  required
                />
              </label>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-white/80">
                Correct option
                <select
                  value={form.correct_option}
                  onChange={(e) =>
                    setForm({ ...form, correct_option: e.target.value as "A" | "B" | "C" | "D" })
                  }
                  className="mt-2 w-44 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={!canSubmit || saving}
                className={[
                  "ml-auto rounded-xl px-4 py-3 font-extrabold text-black shadow-lg transition",
                  !canSubmit || saving
                    ? "cursor-not-allowed bg-white/30 text-white/70"
                    : "bg-gradient-to-r from-amber-200/90 to-yellow-400/80 hover:brightness-110 shadow-amber-300/10",
                ].join(" ")}
              >
                {saving ? "Saving…" : "Create ✨"}
              </button>
            </div>
          </form>
        </section>

        {/* List */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Existing Questions</h2>
            <span className="text-sm text-white/60">
              {questions.length ? `${questions.length} total` : ""}
            </span>
          </div>

          {loading ? (
            <p className="mt-3 text-white/70">Loading…</p>
          ) : questions.length === 0 ? (
            <p className="mt-3 text-white/70">No questions yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-white/70">
                    <th className="border-b border-white/10 pb-2 pr-4">Date</th>
                    <th className="border-b border-white/10 pb-2 pr-4">Question</th>
                    <th className="border-b border-white/10 pb-2 pr-4">Context?</th>
                    <th className="border-b border-white/10 pb-2 pr-4">Video?</th>
                    <th className="border-b border-white/10 pb-2 pr-4">Correct</th>
                    <th className="border-b border-white/10 pb-2 pr-4">Points</th>
                    <th className="border-b border-white/10 pb-2 pr-4">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((qq) => (
                    <tr key={qq.id} className="align-top">
                      <td className="border-b border-white/5 py-3 pr-4 text-white/85 whitespace-nowrap">
                        {qq.q_date}
                      </td>
                      <td className="border-b border-white/5 py-3 pr-4 text-white/90">
                        {qq.question_text}
                      </td>
                      <td className="border-b border-white/5 py-3 pr-4 text-white/80">
                        {qq.context_text ? "✅" : "—"}
                      </td>
                      <td className="border-b border-white/5 py-3 pr-4 text-white/80">
                        {qq.video_url ? "🎥" : "—"}
                      </td>
                      <td className="border-b border-white/5 py-3 pr-4">
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 font-extrabold text-white">
                          {qq.correct_option}
                        </span>
                      </td>
                      <td className="border-b border-white/5 py-3 pr-4">
                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 font-extrabold text-white">
                          {qq.points}
                        </span>
                      </td>
                      <td className="border-b border-white/5 py-3 pr-4 font-mono text-xs text-white/60 whitespace-nowrap">
                        {qq.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-6 text-center text-xs text-white/45">
          <span className="select-none">🕌</span> Ramadan Quiz — Admin tools
        </footer>
      </div>
    </main>
  );
}
