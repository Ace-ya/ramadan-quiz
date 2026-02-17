"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Finishing login...");

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMsg("Login failed: " + error.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/daily");
      else setMsg("No session found. Go back to /login and try again.");
    })();
  }, [router]);

  return (
    <main style={{ padding: 40 }}>
      <h1>Auth Callback</h1>
      <p>{msg}</p>
    </main>
  );
}
