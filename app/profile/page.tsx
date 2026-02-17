"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export default function ProfilePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(json?.error || "فشل تحميل الملف الشخصي");
        setLoading(false);
        return;
      }

      setEmail(json.email || "");
      setName(json.display_name || "");
      setRole(json.role || "");
      setLoading(false);
    })();
  }, [router]);

  const save = async () => {
    setMsg(null);
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ display_name: name }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "فشل الحفظ");

      setMsg("✅ تم الحفظ! سيظهر اسمك للإدارة.");
    } catch (e: any) {
      setMsg(e?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden text-right">
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B1E] via-[#0B1636] to-[#020413]" />
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 text-white">
          <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            جاري تحميل الملف الشخصي…
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-right">
      <div className="absolute inset-0 bg-gradient-to-b from-[#070B1E] via-[#0B1636] to-[#020413]" />
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute top-10 right-10 select-none text-7xl drop-shadow-[0_0_25px_rgba(255,255,255,0.35)]">
        🌙
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 text-white">
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold">الملف الشخصي 🕌</h1>
              <p className="mt-2 text-sm text-white/70">
                ضع اسمًا ليتمكن المشرفون من التعرف عليك.
              </p>
              <p className="mt-2 text-xs text-white/50 break-all">
                مسجل الدخول باسم:
                <b className="mx-1 text-white/80">{email || "غير معروف"}</b>
                {role ? <span className="text-white/40">({role})</span> : null}
              </p>
            </div>
            <div className="text-3xl select-none">✨</div>
          </div>

          <label className="mt-6 block text-sm font-semibold text-white/90">
            الاسم المعروض
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: أحمد"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-amber-200/40 focus:ring-4 focus:ring-amber-200/10"
          />

          <button
            onClick={save}
            disabled={saving}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-200/90 to-yellow-400/80 px-4 py-3 font-extrabold text-black shadow-lg shadow-amber-300/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "جاري الحفظ…" : "حفظ ✨"}
          </button>

          {msg && (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/85">
              {msg}
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => router.push("/daily")}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 backdrop-blur hover:bg-white/10"
            >
              العودة لسؤال اليوم
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 backdrop-blur hover:bg-white/10"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
