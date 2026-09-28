/**
 * Server-Side API Route Authorization Guards
 * Enforces authentication, granular permission checks, and resource scopes.
 * Returns 401 Unauthorized or 403 Forbidden strictly.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, verifySessionToken } from "./token";
import { getUserContext, hasPermission, hasAllPermissions, hasAnyPermission, checkResourceScope, UserContext, ResourceScopeOptions } from "./service";
import { logAuditEvent } from "./audit";

export interface AuthSuccess {
  authenticated: true;
  context: UserContext;
}

export interface AuthFailure {
  authenticated: false;
  response: NextResponse;
}

export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Authenticates an incoming Next.js API Request.
 * Derives user identity and active permissions authoritatively from the backend database.
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  const token = extractTokenFromRequest(req);

  if (!token) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, error: "401 Unauthorized: Valid session credentials required." },
        { status: 401 }
      ),
    };
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, error: "401 Unauthorized: Session expired or invalid." },
        { status: 401 }
      ),
    };
  }

  const context = await getUserContext(payload.userId);
  if (!context || !context.user.isActive) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, error: "403 Forbidden: User account deactivated or revoked." },
        { status: 403 }
      ),
    };
  }

  if (
    context.user.sessionVersion !== undefined &&
    payload.sessionVersion !== undefined &&
    payload.sessionVersion < (context.user.sessionVersion || 1)
  ) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { success: false, error: "401 Unauthorized: Session revoked by user security action." },
        { status: 401 }
      ),
    };
  }

  return {
    authenticated: true,
    context,
  };
}

/**
 * Validates required permissions on an authenticated context.
 * Returns 403 Forbidden if user lacks required permissions.
 */
export function authorizePermissions(
  context: UserContext,
  requiredPermissions: string[],
  matchType: "ALL" | "ANY" = "ALL"
): NextResponse | null {
  const isAuthorized =
    matchType === "ALL"
      ? hasAllPermissions(context, requiredPermissions)
      : hasAnyPermission(context, requiredPermissions);

  if (!isAuthorized) {
    return NextResponse.json(
      {
        success: false,
        error: `403 Forbidden: Insufficient clearance. Missing required permission: [${requiredPermissions.join(", ")}]`,
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Validates resource-level ownership/assignment on an authenticated context.
 * Returns 403 Forbidden if resource scope check fails.
 */
export async function authorizeResourceScope(
  context: UserContext,
  resourceType: "match" | "team" | "participant" | "payment" | "document" | "accommodation" | "transport",
  resourceId: string | null,
  action: string,
  options?: ResourceScopeOptions
): Promise<NextResponse | null> {
  const scopeResult = await checkResourceScope(context, resourceType, resourceId, action, options);

  if (!scopeResult.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `403 Forbidden: Resource access denied. ${scopeResult.reason || "Unauthorized scope."}`,
      },
      { status: 403 }
    );
  }

  return null;
}

export interface GuardOptions {
  permissions?: string[];
  permissionsMode?: "ALL" | "ANY";
  resourceCheck?: (req: NextRequest, context: UserContext) => Promise<{
    resourceType: "match" | "team" | "participant" | "payment" | "document" | "accommodation" | "transport";
    resourceId: string | null;
    action: string;
    options?: ResourceScopeOptions;
  } | null>;
  auditAction?: string;
  auditResource?: string;
}

/**
 * Higher-order Route Handler Wrapper
 * Automatically handles:
 * 1. Request authentication
 * 2. Permission checks (403 if failing)
 * 3. Resource scope checks (403 if failing)
 * 4. Audit logging
 */
export function withAuth(
  handler: (req: NextRequest, context: UserContext, routeParams?: any) => Promise<NextResponse>,
  options?: GuardOptions
) {
  return async (req: NextRequest, routeContext?: any): Promise<NextResponse> => {
    // 1. Authenticate Request
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;

    // 2. Permission check
    if (options?.permissions && options.permissions.length > 0) {
      const permError = authorizePermissions(
        context,
        options.permissions,
        options.permissionsMode || "ALL"
      );
      if (permError) return permError;
    }

    // 3. Resource scope check
    if (options?.resourceCheck) {
      const resConfig = await options.resourceCheck(req, context);
      if (resConfig) {
        const scopeError = await authorizeResourceScope(
          context,
          resConfig.resourceType,
          resConfig.resourceId,
          resConfig.action,
          resConfig.options
        );
        if (scopeError) return scopeError;
      }
    }

    // 4. Execute Route Handler
    const response = await handler(req, context, routeContext);

    // 5. Audit Logging if successful and specified
    if (options?.auditAction && response.status < 400) {
      const requestId = req.headers.get("x-request-id") || `req-${Date.now()}`;
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: options.auditAction,
        resourceType: options.auditResource || "system",
        requestId,
      });
    }

    return response;
  };
}
