import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = body?.phone;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone required" },
        { status: 400 }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // 🔹 INSERT OTP INTO SUPABASE
    const storeRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/phone_otps`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          phone: phone,
          otp: otp,
          expires_at: expiresAt,
        }),
      }
    );

    if (!storeRes.ok) {
      const errText = await storeRes.text();
      console.error("SUPABASE INSERT ERROR:", errText);
      return NextResponse.json(
        { error: errText },
        { status: 500 }
      );
    }

    // 🔹 SEND OTP VIA WHATSAPP
    const sendRes = await fetch("https://app.whatsend.net/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: phone,
        type: "text",
        message: `Your Ramadan Quiz code is: ${otp}`,
        instance_id: process.env.WHATSAPP_INSTANCE_ID,
        access_token: process.env.WHATSAPP_ACCESS_TOKEN,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("WHATSAPP SEND ERROR:", errText);
      return NextResponse.json(
        { error: "Failed to send WhatsApp message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("SERVER ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
