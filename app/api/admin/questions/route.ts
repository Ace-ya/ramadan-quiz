import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

// TEMP: if you haven't added role checks yet, keep it open.
// If you DO have role checks, paste your version and I’ll wire it.
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("questions")
      .select("id,q_date,question_text,option_a,option_b,option_c,option_d,correct_option,points")
      .order("q_date", { ascending: false })
      .limit(200);

    if (error) return json({ error: error.message }, 500);
    return json({ questions: data || [] }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}

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

    const { data: existing, error: exErr } = await supabaseAdmin
      .from("questions")
      .select("id")
      .eq("q_date", payload.q_date)
      .maybeSingle();

    if (exErr) return json({ error: exErr.message }, 500);
    if (existing?.id) return json({ error: `Question already exists for ${payload.q_date}` }, 409);

    const { error: insErr } = await supabaseAdmin.from("questions").insert(payload);
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ status: "created" }, 201);
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}
