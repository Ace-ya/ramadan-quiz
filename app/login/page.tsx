"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const COOLDOWN_SECONDS = 60;

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.push("/daily");
    })();
  }, [router]);

  // Restore cooldown from localStorage
  useEffect(() => {
    const until = localStorage.getItem("loginCooldownUntil");
    if (until) {
      const diff = Math.ceil((Number(until) - Date.now()) / 1000);
      if (diff > 0) setCooldown(diff);
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (cooldown > 0) {
      setMsg(`⏳ Please wait ${cooldown}s before trying again.`);
      return;
    }

    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setMsg("Enter a valid email address.");
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: clean,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("rate")) {
          throw new Error("Too many requests. Please wait a minute.");
        }
        throw error;
      }

      // Start cooldown
      const until = Date.now() + COOLDOWN_SECONDS * 1000;
      localStorage.setItem("loginCooldownUntil", until.toString());
      setCooldown(COOLDOWN_SECONDS);

      setMsg("🌙 Magic link sent. Check your inbox (and spam).");
    } catch (err: any) {
      setMsg(err?.message || "Failed to send link. Try again later.");
    } finally {
      setSending(false);
    }
  };

  const disabled = sending || cooldown > 0;

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070B1E] via-[#0B1636] to-[#020413]" />
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:60px_60px]" />

      {/* Glow */}
      <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute top-10 right-10 text-7xl select-none">🌙</div>
      <div className="absolute -bottom-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <h1 className="text-2xl font-extrabold text-white">
            Ramadan Daily Quiz 🕌
          </h1>
          <p className="mt-2 text-sm text-white/70">
            One question per day. Answer once. Come back tomorrow ✨
          </p>

          <form onSubmit={sendLink} className="mt-6 space-y-3">
            <label className="text-sm font-semibold text-white/90">Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
            />

            <button
              type="submit"
              disabled={disabled}
              className="w-full rounded-xl bg-gradient-to-r from-amber-200 to-yellow-400 px-4 py-3 font-extrabold text-black transition hover:brightness-110 disabled:opacity-60"
            >
              {sending
                ? "Sending…"
                : cooldown > 0
                ? `Wait ${cooldown}s`
                : "Send Magic Link ✉️"}
            </button>

            {msg && <p className="text-sm text-white/80">{msg}</p>}
          </form>

          <div className="mt-6 flex justify-between text-xs text-white/50">
            <span>✨ Stay consistent</span>
            <span>🌙 See you daily</span>
          </div>
        </div>
      </div>
    </main>
  );
}
