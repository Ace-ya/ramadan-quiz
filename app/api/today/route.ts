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

// Istanbul date as YYYY-MM-DD
function istanbulDateString(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

function addDays(yyyyMmDd: string, delta: number) {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function computeStreak(answerDatesDescUnique: string[], anchorDate: string) {
  const set = new Set(answerDatesDescUnique);
  let streak = 0;
  let cursor = anchorDate;

  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

async function getUserIdFromReq(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);

  const { data, error } = await supabasePublic.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

export async function GET(req: Request) {
  try {
    const today = istanbulDateString(new Date());
    const yesterday = addDays(today, -1);

    // Today question
    const { data: todayQuestion, error: tqErr } = await supabaseAdmin
      .from("questions")
      .select("id,q_date,question_text,context_text,video_url,option_a,option_b,option_c,option_d")
      .eq("q_date", today)
      .maybeSingle();

    if (tqErr) return json({ error: tqErr.message }, 500);

    // Yesterday reveal
    const { data: yQ, error: yErr } = await supabaseAdmin
      .from("questions")
      .select("id,q_date,correct_option,context_text,video_url,option_a,option_b,option_c,option_d")
      .eq("q_date", yesterday)
      .maybeSingle();

    if (yErr) return json({ error: yErr.message }, 500);

    const yesterdayReveal = yQ
      ? {
          correct_option: yQ.correct_option as "A" | "B" | "C" | "D",
          correct_text:
            yQ.correct_option === "A"
              ? yQ.option_a
              : yQ.correct_option === "B"
              ? yQ.option_b
              : yQ.correct_option === "C"
              ? yQ.option_c
              : yQ.option_d,
        }
      : null;

    // Streak (requires auth)
    const userId = await getUserIdFromReq(req);
    let streak = 0;

    if (userId) {
      const { data: ans, error: aErr } = await supabaseAdmin
        .from("answers")
        .select("answered_at, questions(q_date)")
        .eq("user_id", userId)
        .order("answered_at", { ascending: false })
        .limit(90);

      if (!aErr && ans) {
        const dates: string[] = [];
        const seen = new Set<string>();

        for (const row of ans as any[]) {
          const qd = row.questions?.q_date;
          if (qd && !seen.has(qd)) {
            seen.add(qd);
            dates.push(qd);
          }
        }

        // If user answered today, anchor at today, else at yesterday
        const anchor = seen.has(today) ? today : yesterday;
        streak = computeStreak(dates, anchor);
      }
    }

    return json({
      todayQuestion: todayQuestion ?? null,
      yesterdayReveal,
      streak,
      today,
    });
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}
