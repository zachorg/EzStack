import { NextRequest } from "next/server";
import { proxyGet, proxyPost } from "@/lib/functions-proxy";

export async function GET(req: NextRequest) {
  return proxyGet("/v1/api/keys/list", req);
}

export async function POST(req: NextRequest) {
  return proxyPost("/v1/api/keys/create", req);
}

export async function DELETE(req: NextRequest) {
  return proxyPost("/v1/api/keys/revoke", req);
}

