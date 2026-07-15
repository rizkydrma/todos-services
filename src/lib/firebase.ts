import { AppError } from "./errors";
import type { DecodedToken } from "../types";

const CERT_URL =
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

function base64UrlDecode(str: string): string {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    return atob(base64);
}

function base64UrlToUint8Array(str: string): Uint8Array {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function pemToDer(pem: string): ArrayBuffer {
    const body = pem
        .replace("-----BEGIN CERTIFICATE-----", "")
        .replace("-----END CERTIFICATE-----", "")
        .replace(/\s/g, "");

    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function importPublicKey(certPem: string): Promise<CryptoKey> {
    const der = pemToDer(certPem);
    return crypto.subtle.importKey(
        "spki",
        der,
        { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
        false,
        ["verify"],
    );
}

export async function verifyFirebaseToken(
    token: string,
    projectId: string,
): Promise<DecodedToken> {
    const parts = token.split(".");
    if (parts.length !== 3) {
        throw AppError.unauthorized("Invalid token format");
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header
    const headerStr = base64UrlDecode(headerB64);
    const header = JSON.parse(headerStr) as { kid: string; alg: string };

    if (header.alg !== "RS256") {
        throw AppError.unauthorized("Invalid token algorithm");
    }

    // Decode payload
    const payloadStr = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadStr);

    // Verify claims
    if (payload.aud !== projectId) {
        throw AppError.unauthorized("Invalid token audience");
    }

    if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
        throw AppError.unauthorized("Invalid token issuer");
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw AppError.unauthorized("Token expired");
    }

    if (!payload.email_verified) {
        throw AppError.unauthorized("Email not verified");
    }

    // Fetch Firebase public certificates (cached in global scope per Worker instance)
    const certCache = globalThis as unknown as {
        __firebaseCerts?: { certs: Record<string, string>; fetchedAt: number };
    };

    let certs: Record<string, string>;
    if (
        certCache.__firebaseCerts &&
        Date.now() - certCache.__firebaseCerts.fetchedAt < 3600000
    ) {
        certs = certCache.__firebaseCerts.certs;
    } else {
        const resp = await fetch(CERT_URL);
        if (!resp.ok)
            throw AppError.internal("Failed to fetch Firebase certificates");
        certs = (await resp.json()) as Record<string, string>;
        certCache.__firebaseCerts = { certs, fetchedAt: Date.now() };
    }

    const certPem = certs[header.kid];
    if (!certPem) {
        throw AppError.unauthorized("Invalid token key ID");
    }

    // Verify signature via Web Crypto API
    const publicKey = await importPublicKey(certPem);
    const signature = base64UrlToUint8Array(signatureB64);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const valid = await crypto.subtle.verify(
        { name: "RSASSA-PKCS1-v1_5" },
        publicKey,
        signature.buffer as ArrayBuffer,
        data.buffer as ArrayBuffer,
    );

    if (!valid) {
        throw AppError.unauthorized("Invalid token signature");
    }

    return {
        iss: payload.iss,
        aud: payload.aud,
        auth_time: payload.auth_time,
        user_id: payload.user_id,
        sub: payload.sub,
        iat: payload.iat,
        exp: payload.exp,
        email: payload.email,
        email_verified: payload.email_verified,
        firebase: payload.firebase,
        name: payload.name,
        picture: payload.picture,
    };
}
