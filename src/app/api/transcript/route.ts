import { NextRequest, NextResponse } from "next/server";
import {
  getTranscriptForVideo,
  mapErrorMessage,
} from "@/lib/server/get-transcript";

/** Vercel serverless function config */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * GET /api/transcript?url=...&lang=en
 * GET /api/transcript?videoId=dQw4w9WgXcQ
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");
  const videoId = searchParams.get("videoId");
  const lang = searchParams.get("lang") ?? undefined;
  const input = url || videoId;

  if (!input) {
    return NextResponse.json(
      { error: "Provide ?url= or ?videoId= query parameter." },
      { status: 400, headers: corsHeaders() }
    );
  }

  try {
    const data = await getTranscriptForVideo(input, lang);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const { status, message } = mapErrorMessage(err);
    return NextResponse.json(
      { error: message },
      { status, headers: corsHeaders() }
    );
  }
}

/**
 * POST /api/transcript
 * Body: { url?: string, videoId?: string, lang?: string }
 */
export async function POST(request: NextRequest) {
  let body: { url?: string; videoId?: string; lang?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: corsHeaders() }
    );
  }

  const input = body.url || body.videoId;
  if (!input) {
    return NextResponse.json(
      { error: "Provide url or videoId in the request body." },
      { status: 400, headers: corsHeaders() }
    );
  }

  try {
    const data = await getTranscriptForVideo(input, body.lang);
    return NextResponse.json(data, { status: 200, headers: corsHeaders() });
  } catch (err) {
    const { status, message } = mapErrorMessage(err);
    return NextResponse.json(
      { error: message },
      { status, headers: corsHeaders() }
    );
  }
}
