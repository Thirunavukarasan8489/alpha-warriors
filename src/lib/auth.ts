import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "alpha-warriors-secure-secret-key-at-least-32-chars";
const key = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = "auth_session";

export interface UserSessionPayload {
  userId: string;
  gymId: string;
  branchId?: string;
  role: "owner" | "manager" | "receptionist" | "trainer" | "member";
  name: string;
  phone: string;
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain password against hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate encrypted JWT session token
 */
export async function signSession(payload: UserSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);
}

/**
 * Verify JWT token string
 */
export async function verifySession(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as UserSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Set session cookie in Route Handler
 */
export async function setSessionCookie(payload: UserSessionPayload): Promise<string> {
  const token = await signSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
  return token;
}

/**
 * Read current session from cookies
 */
export async function getSession(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySession(token);
  } catch {
    return null;
  }
}

/**
 * Clear session cookie on logout
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

