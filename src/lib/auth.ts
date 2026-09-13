import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  type?: 'admin' | 'partner' | 'rider';
  partnerId?: string;
  riderId?: string;
}

/**
 * Verifies the JWT token from the Authorization header.
 * Returns the decoded payload or throws a specific error.
 */
export async function requireAuth(req: NextRequest, options?: { role?: 'admin' | 'partner' | 'rider' | ('admin' | 'partner' | 'rider')[] }): Promise<AuthUser> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Normalize decoded payload
    const user: AuthUser = {
      id: decoded.id || decoded.partnerId || decoded.riderId,
      email: decoded.email,
      role: decoded.role || (decoded.type === 'partner' ? 'PARTNER' : decoded.type === 'rider' ? 'RIDER' : ''),
      type: decoded.type || 'admin',
      partnerId: decoded.partnerId,
      riderId: decoded.riderId,
    };

    if (options?.role) {
      const allowedRoles = Array.isArray(options.role) ? options.role : [options.role];
      if (!allowedRoles.includes(user.type as any)) {
        throw new Error('UNAUTHORIZED');
      }
    }

    return user;
  } catch (error) {
    throw new Error('UNAUTHORIZED');
  }
}

/**
 * Helper to handle errors uniformly as requested.
 */
export function errorResponse(message: string, status: number = 400) {
  return Response.json({ error: message }, { status });
}
