import { NextRequest, NextResponse } from "next/server";
import { getQueueStatus, joinQueue, leaveQueue } from "@/lib/queue-store";

export const dynamic = "force-dynamic";

function validSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value);
}

function errorResponse(error: unknown) {
  console.error("Queue request failed", error);
  return NextResponse.json(
    { error: "The queue is temporarily unavailable. Please try again." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { sessionId?: unknown };
    if (!validSessionId(body.sessionId)) {
      return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    }

    return NextResponse.json(await joinQueue(body.sessionId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");
    if (!validSessionId(sessionId)) {
      return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    }

    const status = await getQueueStatus(sessionId);
    if (!status) {
      return NextResponse.json({ error: "Session is no longer in the queue." }, { status: 410 });
    }

    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { sessionId?: unknown };
    if (!validSessionId(body.sessionId)) {
      return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    }

    await leaveQueue(body.sessionId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

