import { createRemoteJWKSet, jwtVerify } from "jose";
import { AppError } from "./errors";
import type { DecodedToken } from "../types";

const JWKS_URL =
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
    if (!_jwks) {
        _jwks = createRemoteJWKSet(new URL(JWKS_URL), {
            cacheMaxAge: 60 * 60 * 1000,
        });
    }
    return _jwks;
}

export async function verifyFirebaseToken(
    token: string,
    projectId: string,
): Promise<DecodedToken> {
    try {
        const { payload } = await jwtVerify(token, getJWKS(), {
            issuer: `https://securetoken.google.com/${projectId}`,
            audience: projectId,
        });

        return {
            iss: payload.iss as string,
            aud: payload.aud as string,
            auth_time: payload.auth_time as number,
            user_id: payload.user_id as string,
            sub: payload.sub as string,
            iat: payload.iat as number,
            exp: payload.exp as number,
            email: payload.email as string,
            email_verified: payload.email_verified as boolean,
            firebase: payload.firebase as DecodedToken["firebase"],
            name: payload.name as string | undefined,
            picture: payload.picture as string | undefined,
        };
    } catch (err: unknown) {
        if (err instanceof AppError) throw err;

        const code = (err as { code?: string }).code;
        if (code === "ERR_JWT_EXPIRED")
            throw AppError.unauthorized("Token expired");
        if (code === "ERR_JWT_INVALID")
            throw AppError.unauthorized("Invalid token");
        if (code === "ERR_JWKS_NO_MATCHING_KEY")
            throw AppError.unauthorized("Invalid token signature");
        if (code === "ERR_JWT_CLAIM_VALIDATION_FAILED")
            throw AppError.unauthorized("Invalid token claims");

        throw AppError.unauthorized("Invalid or expired token");
    }
}
