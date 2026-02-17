"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.push("/daily");
    })();
  }, [router]);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setMsg("Enter a valid email.");
      return;
    }

    setSending(true);
    try {
      // If you already configured redirect URLs in Supabase, this is enough.
      // If not, you can set emailRedirectTo to your site origin later.
      const { error } = await supabase.auth.signInWithOtp({
  email: clean,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});


      if (error) throw error;

      setMsg("🌙 Magic link sent. Check your inbox (and spam)!");
    } catch (err: any) {
      setMsg(err?.message || "Something went wrong. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070B1E] via-[#0B1636] to-[#020413]" />

      {/* Stars layer */}
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:60px_60px]" />

      {/* Moon glow */}
      <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute top-10 right-10 select-none text-7xl drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]">
        🌙
      </div>

      {/* Hanging lantern emoji (subtle) */}
      <div className="absolute left-10 top-10 hidden sm:block select-none text-5xl opacity-90 drop-shadow-[0_0_18px_rgba(255,205,120,0.25)]">
        🏮
      </div>

      {/* Bottom glow */}
      <div className="absolute -bottom-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      {/* Content */}
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Ramadan Daily Quiz
              </h1>
              <p className="mt-2 text-sm text-white/70">
                One question per day. Answer once. Come back tomorrow for the reveal ✨
              </p>
            </div>
            <div className="text-3xl select-none">🕌</div>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-white/70">
              <span className="font-semibold text-white">No usernames.</span> Just a magic link to your email.
            </p>
          </div>

          <form onSubmit={sendLink} className="mt-6 space-y-3">
            <label className="block text-sm font-semibold text-white/90">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
              autoComplete="email"
            />

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl bg-gradient-to-r from-amber-200/90 to-yellow-400/80 px-4 py-3 font-extrabold text-black shadow-lg shadow-amber-300/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sending ? "Sending…" : "Send Magic Link ✉️"}
            </button>

            {msg && (
              <p className="pt-1 text-sm text-white/80">
                {msg}
              </p>
            )}
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-white/50">
            <span className="select-none">✨ Stay consistent</span>
            <span className="select-none">🌙 See you daily</span>
          </div>
        </div>
      </div>
    </main>
  );
}
