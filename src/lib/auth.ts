import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "shopmate-super-secure-jwt-secret-key-kirana-2026";
const AUTH_COOKIE = "shopmate_session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  shopId: string;
  shopName: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Server-side helper to retrieve the authenticated session from cookies
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    if (!token) return null;

    const user = verifyToken(token);
    return user;
  } catch {
    return null;
  }
}

/**
 * Returns session or defaults to the demo shop for zero-friction hackathon demos
 */
export async function requireShopSession(): Promise<SessionUser> {
  const session = await getSession();
  if (session) return session;

  // Fallback to demo shop if not explicitly logged in
  const demoShop = await prisma.shop.findFirst({
    include: { owner: true },
  });

  if (demoShop && demoShop.owner) {
    return {
      id: demoShop.owner.id,
      name: demoShop.owner.name,
      email: demoShop.owner.email,
      phone: demoShop.owner.phone,
      shopId: demoShop.id,
      shopName: demoShop.name,
    };
  }

  throw new Error("No authenticated shop found.");
}

export const AUTH_COOKIE_NAME = AUTH_COOKIE;
