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

export async function POST(req: Request) {
  try {
    // 1) Auth
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Missing auth" }, 401);
    const token = auth.slice("Bearer ".length);

    const { data: userData, error: userErr } = await supabasePublic.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);

    const userId = userData.user.id;

    // 2) Body
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON body" }, 400);

    const questionId = body.question_id as string;
    const selected = (body.selected_option as string)?.toUpperCase();

if (!questionId || !["A", "B", "C", "D"].includes(selected)) {
  return json({
    error: "We couldn’t process your answer. Please try submitting again."
  }, 400);
}


    // 3) Get question (correct option + points)
    const { data: q, error: qErr } = await supabaseAdmin
      .from("questions")
      .select("id, correct_option, points")
      .eq("id", questionId)
      .single();

    if (qErr || !q) return json({ error: "Question not found" }, 404);

    const correct = (q.correct_option as string)?.toUpperCase();
    const isCorrect = selected === correct;
    const points = Number(q.points ?? 0);

    // 4) Insert answer (DB unique constraint blocks duplicates)
    const { error: insErr } = await supabaseAdmin.from("answers").insert({
      user_id: userId,
      question_id: questionId,
      selected_option: selected,
      is_correct: isCorrect,
      answered_at: new Date().toISOString(),
    });

    if (insErr) {
      // Unique violation -> already answered
      const msg = insErr.message?.toLowerCase() || "";
if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("already")) {
  return json({
    status: "already_submitted",
    message: "You’ve already submitted today’s answer. Come back tomorrow!"
  }, 409);
}

      return json({ error: insErr.message }, 500);
    }

    // 5) Award points ONCE (only after successful insert, only if correct)
    if (isCorrect && points > 0) {
      // ensure user row exists (no-op if already exists)
      await supabaseAdmin
        .from("users")
        .upsert({ id: userId }, { onConflict: "id" });

      const { data: u, error: uErr } = await supabaseAdmin
        .from("users")
        .select("total_points")
        .eq("id", userId)
        .single();

      if (!uErr && u) {
        const newTotal = Number(u.total_points ?? 0) + points;
        const { error: upErr } = await supabaseAdmin
          .from("users")
          .update({ total_points: newTotal })
          .eq("id", userId);

        if (upErr) return json({ error: upErr.message }, 500);
      }
    }

    // NOTE: still hide correctness/points from user
    return json({ status: "submitted" }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}
