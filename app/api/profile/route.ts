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

async function getUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const token = auth.slice(7);

  const { data, error } = await supabasePublic.auth.getUser(token);

  if (error || !data?.user) return null;

  return data.user;
}

/* ---------------- GET PROFILE ---------------- */

export async function GET(req: Request) {
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Not logged in" }, 401);

    // ensure row exists
    await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email,
        },
        { onConflict: "id" }
      );

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("display_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    return json({
      email: user.email,
      display_name: data?.display_name || "",
      role: data?.role || "user",
    });
  } catch (e: any) {
    return json({ error: e.message || "Server error" }, 500);
  }
}

/* ---------------- UPDATE PROFILE ---------------- */

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Not logged in" }, 401);

    const body = await req.json();
    const name = (body?.display_name || "").trim();

    if (name.length < 2) {
      return json({ error: "Name must be at least 2 characters" }, 400);
    }

    if (name.length > 30) {
      return json({ error: "Name must be under 30 characters" }, 400);
    }

    // ensure row exists FIRST
    await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email,
        },
        { onConflict: "id" }
      );

    const { error } = await supabaseAdmin
      .from("users")
      .update({
        display_name: name,
      })
      .eq("id", user.id);

    if (error) throw error;

    return json({ status: "updated" });
  } catch (e: any) {
    return json({ error: e.message || "Update failed" }, 500);
  }
}
