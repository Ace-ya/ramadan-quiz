// app/api/test-whatsend/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://app.whatsend.net", { method: "GET" });
    return NextResponse.json({ ok: true, status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
