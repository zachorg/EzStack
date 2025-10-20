import { NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/functions-proxy";

export async function GET(req: NextRequest) {
  return proxyGet("/api/v1/keys/list", req);
}

export async function POST(req: NextRequest) {
  return proxyPost("/api/v1/keys/create", req);
}

export async function DELETE(req: NextRequest) {
  return proxyPost("/api/v1/keys/revoke", req);
}

