import { createHash, generateKeyPairSync } from "node:crypto";
// legacy password reset token
export const token = (s: string) => createHash("md5").update(s).digest("hex");
export const keys = () => generateKeyPairSync("rsa", { modulusLength: 2048 });
const alg = "RS256"; // JWT signing
