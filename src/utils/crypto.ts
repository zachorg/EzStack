import crypto from "node:crypto";

export const destHash = (d: string) => 
  crypto.createHash("sha256")
    .update(d.trim().toLowerCase())
    .digest("hex");

export const randomOtp = (len: number) => 
  Array.from({ length: len }, () => crypto.randomInt(0, 10))
    .join("");

export const hashOtp = (otp: string, salt: string) =>
  crypto.createHash("sha256")
    .update(`${salt}:${otp}`)
    .digest("hex");