import crypto from "node:crypto";

// Normalize destination (email/phone) and hash to avoid storing raw values.
export const destHash = (d: string) => 
  crypto.createHash("sha256")
    .update(d.trim().toLowerCase())
    .digest("hex");

// Generate a numeric OTP of given length using crypto-safe RNG.
export const randomOtp = (len: number) => 
  Array.from({ length: len }, () => crypto.randomInt(0, 10))
    .join("");

// Hash OTP with a salt; used for at-rest storage in Redis.
export const hashOtp = (otp: string, salt: string) =>
  crypto.createHash("sha256")
    .update(`${salt}:${otp}`)
    .digest("hex");