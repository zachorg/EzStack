import { NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/functions-proxy";

export async function GET(req: NextRequest) {
  console.log("GET /api/keys");
  return proxyGet("/v1/apikeys/listApiKeys", req);
}

export async function POST(req: NextRequest) {
  return proxyPost("/v1/apikeys/createApiKey", req);
}

export async function DELETE(req: NextRequest) {
  return proxyPost("/v1/apikeys/revokeApiKey", req);
}

