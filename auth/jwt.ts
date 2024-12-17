import jwt from "jsonwebtoken";
import type { RxUserDocumentType } from "../rxdb-server";

const JWT_SECRET = process.env.JWT_SECRET || "dummy-super-secret";
const JWT_EXPIRES_IN = "24h";

export function generateToken(user: RxUserDocumentType): string {
  return jwt.sign(
    {
      id: user.id,
      githubId: user.githubId,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}
