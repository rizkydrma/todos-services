import { createMiddleware } from "hono/factory";
import { verifyFirebaseToken } from "../lib/firebase";
import { AppError } from "../lib/errors";
import { createDb } from "../db";
import { D1UserRepository } from "../repositories/d1/user.repo";
import type { User, DecodedToken } from "../types";

export const authMiddleware = createMiddleware<{
    Bindings: { DB: D1Database; FIREBASE_PROJECT_ID: string };
    Variables: { requestId: string; user: User; tokenPayload: DecodedToken };
}>(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        throw AppError.unauthorized("Missing or invalid Authorization header");
    }

    const token = authHeader.slice(7);

    try {
        const decoded = await verifyFirebaseToken(
            token,
            c.env.FIREBASE_PROJECT_ID,
        );
        const db = createDb(c.env.DB);
        const userRepo = new D1UserRepository(db);
        const user = await userRepo.findByFirebaseUid(decoded.sub);

        if (!user) throw AppError.unauthorized("User not registered");

        c.set("user", user);
        c.set("tokenPayload", decoded);
        await next();
    } catch (err) {
        if (err instanceof AppError) throw err;
        throw AppError.unauthorized("Invalid or expired token");
    }
});
