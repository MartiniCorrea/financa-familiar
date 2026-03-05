/**
 * Local Authentication — email + password
 * Provides register/login/logout routes that work independently of Manus OAuth.
 * Uses bcryptjs for password hashing and the existing JWT session infrastructure.
 */
import { Router, Request, Response, Application } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "../shared/const";
import { nanoid } from "nanoid";

const router = Router();

// ─── Register ─────────────────────────────────────────────────────────────────
router.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Banco de dados indisponível." });

    // Check if email already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "Este e-mail já está cadastrado." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // Use a unique openId for local users
    const openId = `local_${nanoid(16)}`;

    await db.insert(users).values({
      openId,
      name,
      email,
      passwordHash,
      loginMethod: "local",
      lastSignedIn: new Date(),
    });

    // Fetch the created user
    const [newUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!newUser) return res.status(500).json({ error: "Erro ao criar usuário." });

    // Create session token
    const sessionToken = await sdk.signSession({
      openId: newUser.openId,
      appId: "local",
      name: newUser.name || newUser.email || "",
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    });

    return res.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("[LocalAuth] Register error:", err);
    return res.status(500).json({ error: "Erro interno ao registrar." });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Banco de dados indisponível." });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    // Update last signed in
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));

    // Create session token
    const sessionToken = await sdk.signSession({
      openId: user.openId,
      appId: "local",
      name: user.name || user.email || "",
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[LocalAuth] Login error:", err);
    return res.status(500).json({ error: "Erro interno ao fazer login." });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post("/api/auth/logout", (req: Request, res: Response) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  return res.json({ success: true });
});

export function registerLocalAuthRoutes(app: Application) {
  app.use(router);
}
