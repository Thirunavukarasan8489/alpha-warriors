import { NextResponse } from "next/server";
import { getSession, UserSessionPayload } from "./auth";

export type Role = "owner" | "manager" | "receptionist" | "trainer" | "member";

// Hierarchy / Permission matrices
export const ROLE_LEVELS: Record<Role, number> = {
  owner: 5,
  manager: 4,
  receptionist: 3,
  trainer: 2,
  member: 1,
};

export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
}

export function canManagePlans(role: Role): boolean {
  return role === "owner" || role === "manager";
}

export function canVoidPayments(role: Role): boolean {
  return role === "owner" || role === "manager";
}

export function canViewFinancialReports(role: Role): boolean {
  return role === "owner" || role === "manager";
}

export function canExecuteMembershipAction(role: Role, action: "renew" | "freeze" | "resume" | "extend" | "upgrade" | "end"): boolean {
  if (action === "renew" || action === "freeze" || action === "resume") {
    return role === "owner" || role === "manager" || role === "receptionist";
  }
  // extend, upgrade, end are owner & manager only
  return role === "owner" || role === "manager";
}

export interface AuthenticatedContext {
  session: UserSessionPayload;
  gymId: string;
  branchId?: string;
  role: Role;
  userId: string;
}

/**
 * Enforces session authentication and optional role restrictions on API Route Handlers.
 * Returns the verified session and multi-tenant scoping IDs.
 */
export async function requireAuth(
  allowedRoles?: Role[]
): Promise<{ auth: AuthenticatedContext } | { response: NextResponse }> {
  const session = await getSession();

  if (!session || !session.gymId || !session.userId) {
    return {
      response: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return {
      response: NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You do not have permission to perform this action" } },
        { status: 403 }
      ),
    };
  }

  return {
    auth: {
      session,
      gymId: session.gymId,
      branchId: session.branchId,
      role: session.role,
      userId: session.userId,
    },
  };
}

