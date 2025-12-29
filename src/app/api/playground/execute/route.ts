import { NextRequest, NextResponse } from "next/server";
import { executeInSandbox, sanitizeCode } from "@/lib/sandbox";

// Rate limiting simple (en production, utiliser Redis)
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requêtes par minute
const RATE_WINDOW = 60 * 1000; // 1 minute

/**
 * Vérifie le rate limiting
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Nettoie les anciennes entrées de rate limiting
 */
function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [ip, record] of rateLimit.entries()) {
    if (now > record.resetTime) {
      rateLimit.delete(ip);
    }
  }
}

// Nettoyage toutes les minutes
setInterval(cleanupRateLimit, 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // Vérifier le rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please wait before submitting again.",
          retryAfter: RATE_LIMIT,
        },
        { status: 429 }
      );
    }

    // Parser le body
    const body = await request.json();

    if (!body.code || typeof body.code !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'code' field",
        },
        { status: 400 }
      );
    }

    const config = {
      code: body.code,
      modules: Array.isArray(body.modules) ? body.modules : [],
      timeout: Math.min(body.timeout || 5000, 10000), // Max 10 secondes
      maxMemory: Math.min(body.maxMemory || 50, 100), // Max 100 MB
    };

    // Vérifier le code avant exécution
    const sanitization = sanitizeCode(config.code);
    if (!sanitization.safe) {
      return NextResponse.json(
        {
          success: false,
          error: `Code validation failed: ${sanitization.reason}`,
        },
        { status: 400 }
      );
    }

    // Exécuter dans le sandbox
    const result = await executeInSandbox(config);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Playground execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Retourner les statistiques du sandbox
  return NextResponse.json({
    rateLimit: RATE_LIMIT,
    status: "healthy",
  });
}
