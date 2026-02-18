import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ IMPORTANT:
// Use ANON key so RLS applies (DO NOT use service role here)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

// ✅ Anyone can READ questions (daily page, etc.)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("questions")
      .select(
        "id,q_date,question_text,option_a,option_b,option_c,option_d,correct_option,points"
      )
      .order("q_date", { ascending: false })
      .limit(200);

    if (error) return json({ error: error.message }, 403);
    return json({ questions: data || [] }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}

// 🔒 ONLY ADMIN can INSERT (RLS enforces this)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON body" }, 400);

    const payload = {
      q_date: body.q_date,
      question_text: body.question_text,
      option_a: body.option_a,
      option_b: body.option_b,
      option_c: body.option_c,
      option_d: body.option_d,
      correct_option: body.correct_option,
      points: body.points ?? 1,
    };

    if (!payload.q_date || !payload.question_text) {
      return json({ error: "Missing required fields" }, 400);
    }

    if (!["A", "B", "C", "D"].includes(payload.correct_option)) {
      return json({ error: "correct_option must be A/B/C/D" }, 400);
    }

    const { error } = await supabase
      .from("questions")
      .insert(payload);

    // ❌ Non-admins fail here automatically because of RLS
    if (error) return json({ error: error.message }, 403);

    return json({ status: "created" }, 201);
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}
