import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabasePublic = createClient(
  process.env.SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

async function requireAdminOrMod(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { ok: false as const, res: json({ error: "Missing auth" }, 401) };
  }
  const token = auth.slice("Bearer ".length);

  const { data: userData, error: userErr } = await supabasePublic.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { ok: false as const, res: json({ error: "Invalid session" }, 401) };
  }

  const userId = userData.user.id;

  // Try users table first
  const { data: dbUser, error: dbErr } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (dbErr) return { ok: false as const, res: json({ error: dbErr.message }, 500) };
  if (!dbUser?.role) return { ok: false as const, res: json({ error: "Role not found" }, 403) };

  if (dbUser.role !== "admin" && dbUser.role !== "moderator") {
    return { ok: false as const, res: json({ error: "Forbidden" }, 403) };
  }

  return { ok: true as const };
}

export async function GET(req: Request) {
  const guard = await requireAdminOrMod(req);
  if (!guard.ok) return guard.res;

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id,email,display_name,total_points,role")
    .order("total_points", { ascending: false })
    .limit(200);

  if (error) return json({ error: error.message }, 500);

  return json({ leaderboard: data || [] }, 200);
}
