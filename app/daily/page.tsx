"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type TodayQuestion = {
  id: string;
  q_date: string;
  question_text: string;
  context_text?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  video_url?: string | null;
};

type YesterdayReveal = {
  correct_option: "A" | "B" | "C" | "D";
  correct_text: string;
} | null;

function streakMessage(streak: number) {
  if (streak <= 0) return "ابدأ سلسلتك الليلة 🌙";
  if (streak === 1) return "بداية جميلة ✨";
  if (streak < 5) return `ما شاء الله 🔥 سلسلة ${streak} أيام`;
  if (streak < 10) return `ثبات رائع 💪 ${streak} أيام`;
  if (streak < 20) return `أداء مميز 🏆 ${streak} يومًا`;
  return `أسطورة رمضان 🌙 ${streak} يومًا`;
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export default function DailyPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState<TodayQuestion | null>(null);
  const [yesterday, setYesterday] = useState<YesterdayReveal>(null);

  const [selected, setSelected] = useState<"A" | "B" | "C" | "D" | "">("");
  const [submitted, setSubmitted] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [streak, setStreak] = useState<number>(0);
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  const streakText = useMemo(() => streakMessage(streak), [streak]);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      // show email immediately (fallback)
      const u = await supabase.auth.getUser();
      setEmail(u.data.user?.email ?? "");

      // 1) Load daily data (streak, today question, yesterday reveal)
      const todayRes = await fetch("/api/today", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const todayJson = await todayRes.json().catch(() => ({}));

      setQ(todayJson.todayQuestion ?? null);
      setYesterday(todayJson.yesterdayReveal ?? null);
      setStreak(Number(todayJson.streak ?? 0));

      // 2) Load profile (display name)
      const profRes = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profJson = await profRes.json().catch(() => ({}));
      if (profRes.ok) setDisplayName((profJson.display_name || "").trim());

      setLoading(false);
    })();
  }, [router]);

  const submit = async () => {
    setMsg(null);

    if (!q?.id) {
      setMsg("لا يوجد سؤال اليوم.");
      return;
    }

    if (!selected) {
      setMsg("اختر إجابة أولاً ✨");
      return;
    }

    const token = await getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    const res = await fetch("/api/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question_id: q.id,
        selected_option: selected,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (res.status === 409 || json.status === "already_submitted") {
      setSubmitted(true);
      setMsg(json.message || "لقد أجبت على سؤال اليوم بالفعل 🌙");
      return;
    }

    if (!res.ok) {
      setMsg(json.error || "حدث خطأ. حاول مرة أخرى.");
      return;
    }

    if (json.status === "submitted") {
      setSubmitted(true);
      setMsg("✅ تم إرسال الإجابة. نراك غدًا إن شاء الله!");
      // optional: bump streak instantly on UI
      setStreak((s) => Math.max(s, 0) + 1);
      return;
    }

    setMsg("حدث خطأ. حاول مرة أخرى.");
  };

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B1E] via-[#0B1636] to-[#020413]" />
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:60px_60px]" />
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="absolute top-10 right-10 select-none text-7xl drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]">
          🌙
        </div>
        <div className="absolute left-10 top-10 hidden sm:block select-none text-5xl opacity-90 drop-shadow-[0_0_18px_rgba(255,205,120,0.25)]">
          🏮
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl text-white text-right">
            <div className="text-xl font-extrabold">جاري تحميل سؤال اليوم… ✨</div>
            <div className="mt-2 text-sm font-semibold text-white/70">لحظة واحدة.</div>
          </div>
        </div>
      </main>
    );
  }

  const greeting = displayName ? `السلام عليكم، ${displayName} 🌙` : "السلام عليكم 👋";

  return (
    <main className="relative min-h-screen overflow-hidden" dir="rtl">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070B1E] via-[#0B1636] to-[#020413]" />
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:60px_60px]" />
      <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      {/* Side decorations */}
      <div className="absolute top-10 right-10 select-none text-7xl drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]">
        🌙
      </div>
      <div className="absolute left-10 top-10 hidden sm:block select-none text-5xl opacity-90 drop-shadow-[0_0_18px_rgba(255,205,120,0.25)]">
        🏮
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-3xl px-4 py-10 text-white">
        <header className="flex items-start justify-between gap-4">
          <div className="text-right">
            <h1 className="text-3xl font-extrabold tracking-tight">
              سؤال اليوم <span className="select-none">🕌</span>
            </h1>

            <div className="mt-2 text-sm font-bold text-white/95">{greeting}</div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/90 backdrop-blur">
                🔥 السلسلة: <b className="text-white">{streak}</b>{" "}
                {streak === 1 ? "يوم" : "أيام"}
              </span>
              <span className="text-white/80">{streakText}</span>
            </div>

            {email && <p className="mt-1 text-xs font-semibold text-white/50 break-all">{email}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/profile")}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/85 backdrop-blur hover:bg-white/10"
            >
              الملف الشخصي ✨
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-extrabold text-white/85 backdrop-blur hover:bg-white/10"
            >
              تسجيل الخروج
            </button>
          </div>
        </header>

        {/* Yesterday Reveal */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl text-right">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">إجابة أمس</h2>
            <span className="select-none text-xl">✨</span>
          </div>

          {yesterday ? (
            <p className="mt-3 text-[1.05rem] font-semibold leading-8 text-white/90">
              الإجابة الصحيحة:{" "}
              <span className="font-extrabold text-white">{yesterday.correct_option}</span>
              <span className="text-white/60"> — </span>
              <span className="font-bold text-white/95">{yesterday.correct_text}</span>
            </p>
          ) : (
            <p className="mt-3 text-white/75 font-semibold">لا يوجد كشف بعد.</p>
          )}
        </section>

        {/* Today Question */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl text-right">
          {q ? (
            <>
              {/* Context / reading text */}
              {q.context_text && (
                <div className="mb-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="mb-3 text-base font-extrabold text-amber-300">
                    📖 اقرأ أولاً
                  </div>
                  <div className="text-[1.05rem] font-semibold leading-8 text-white/95 whitespace-pre-wrap">
                    {q.context_text}
                  </div>
                </div>
              )}

              {/* Optional video (if exists) */}
              {q.video_url && (
                <div className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <iframe
                    src={q.video_url}
                    title="فيديو السؤال"
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Question header */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-extrabold leading-8 text-white">
                  {q.question_text}
                </h2>
                <div className="select-none text-2xl">🌙</div>
              </div>

              <div className="mt-4 space-y-2">
                {(["A", "B", "C", "D"] as const).map((opt) => {
                  const text =
                    opt === "A"
                      ? q.option_a
                      : opt === "B"
                      ? q.option_b
                      : opt === "C"
                      ? q.option_c
                      : q.option_d;

                  const active = selected === opt;

                  return (
                    <button
                      key={opt}
                      disabled={submitted}
                      onClick={() => setSelected(opt)}
                      className={[
                        "w-full rounded-2xl border px-4 py-3 text-right transition backdrop-blur",
                        "text-[1.02rem] font-semibold leading-8",
                        submitted ? "cursor-not-allowed opacity-70" : "hover:bg-white/10",
                        active
                          ? "border-amber-200/40 bg-amber-200/10 ring-4 ring-amber-200/10"
                          : "border-white/10 bg-black/20",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-[2px] rounded-lg bg-white/10 px-2 py-1 text-sm font-extrabold text-white/95">
                          {opt}
                        </div>
                        <div className="text-white/95">{text}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={submit}
                disabled={!selected || submitted}
                className={[
                  "mt-4 w-full rounded-2xl px-4 py-3 font-extrabold shadow-lg transition",
                  !selected || submitted
                    ? "cursor-not-allowed bg-white/30 text-white/70"
                    : "bg-gradient-to-r from-amber-200/90 to-yellow-400/80 text-black hover:brightness-110 shadow-amber-300/10",
                ].join(" ")}
              >
                {submitted ? "تم الإرسال ✅" : "إرسال الإجابة ✨"}
              </button>

              {msg && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-[1.02rem] font-semibold leading-8 text-white/90">
                  {msg}
                </div>
              )}
            </>
          ) : (
            <div className="text-white/90">
              <div className="text-lg font-extrabold">لا يوجد سؤال منشور لليوم.</div>
              <div className="mt-1 text-sm font-semibold text-white/70">
                عد لاحقًا إن شاء الله 🌙
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
