import { NextRequest } from "next/server";

export function validateDevToken(req: NextRequest): boolean {
  const secret = process.env.SUPER_ADMIN_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("x-dev-token");
  return auth === secret;
}
