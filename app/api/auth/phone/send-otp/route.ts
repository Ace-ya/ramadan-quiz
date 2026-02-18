import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { error: "Phone required" },
        { status: 400 }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

    // Store OTP in Supabase (service role)
    const storeRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/phone_otps`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          otp,
          expires_at: expiresAt,
        }),
      }
    );

    if (!storeRes.ok) {
      return NextResponse.json(
        { error: "Failed to store OTP" },
        { status: 500 }
      );
    }

    // Send OTP via WhatsApp (WhatSend)
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
      return NextResponse.json(
        { error: "Failed to send WhatsApp message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
