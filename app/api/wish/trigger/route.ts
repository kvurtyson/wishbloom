import { NextRequest, NextResponse } from "next/server";
import { publishWishTrigger } from "@/lib/mqtt-trigger";
import {
  completeWishTrigger,
  leaveQueue,
  releaseWishTriggerReservation,
  reserveWishTrigger,
} from "@/lib/queue-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value);
}

export async function POST(request: NextRequest) {
  let sessionId: string | null = null;
  try {
    const body = (await request.json()) as { sessionId?: unknown };
    if (!validSessionId(body.sessionId)) {
      return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    }
    sessionId = body.sessionId;

    const reservation = await reserveWishTrigger(sessionId);
    if (reservation === "not-active") {
      return NextResponse.json({ error: "This session is not active." }, { status: 409 });
    }
    if (reservation === "busy") {
      return NextResponse.json({ error: "Your wish is already being sent." }, { status: 409 });
    }

    if (reservation === "reserved") {
      try {
        await publishWishTrigger();
        await completeWishTrigger(sessionId);
      } catch (error) {
        await releaseWishTriggerReservation(sessionId);
        throw error;
      }
    }

    await leaveQueue(sessionId);
    return NextResponse.json({ triggered: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Wish trigger failed", error);
    return NextResponse.json(
      { error: "Your wish could not be sent. Please try again." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
