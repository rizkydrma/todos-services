/**
 * Transactional email-verification OTP template.
 * Layout inspired by Stripe / Linear / Clerk: minimal, high-trust, dual text+html.
 */

export const BRAND_NAME = 'Just Todos';

export type VerifyEmailTemplateInput = {
  code: string;
  expiresInMinutes: number;
  /** Optional product URL shown in footer */
  appUrl?: string;
  /** Optional support contact in footer */
  supportEmail?: string;
};

export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildVerifyEmailContent(input: VerifyEmailTemplateInput): EmailContent {
  const { code, expiresInMinutes } = input;
  const appUrl = input.appUrl ?? 'https://rizkydarma.my.id';
  const supportEmail = input.supportEmail ?? 'support@rizkydarma.my.id';

  const subject = `Verifikasi email ${BRAND_NAME}`;
  const preheader = `Kode verifikasi Anda berlaku ${expiresInMinutes} menit. Jangan bagikan kepada siapa pun.`;

  const text = [
    BRAND_NAME,
    '',
    'Verifikasi alamat email Anda',
    '',
    'Masukkan kode berikut di aplikasi untuk menyelesaikan pendaftaran:',
    '',
    `    ${code}`,
    '',
    `Kode berlaku ${expiresInMinutes} menit.`,
    '',
    'Jangan bagikan kode ini kepada siapa pun.',
    `Tim ${BRAND_NAME} tidak pernah meminta kode lewat chat, telepon, atau media sosial.`,
    '',
    `Jika Anda tidak mendaftar di ${BRAND_NAME}, abaikan email ini. Tidak ada perubahan pada akun Anda.`,
    '',
    '—',
    BRAND_NAME,
    appUrl,
    `Butuh bantuan? ${supportEmail}`,
  ].join('\n');

  // Escape user-controlled segments (code is digits-only from OTP generator; still escape).
  const safeCode = escapeHtml(code);
  const safeMinutes = String(expiresInMinutes);
  const safeBrand = escapeHtml(BRAND_NAME);
  const safeAppUrl = escapeHtml(appUrl);
  const safeSupport = escapeHtml(supportEmail);
  const safePreheader = escapeHtml(preheader);

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader (hidden in most clients) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f4f4f5;opacity:0;">
    ${safePreheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
          <!-- Brand -->
          <tr>
            <td style="padding:32px 36px 0 36px;">
              <p style="margin:0;font-size:15px;font-weight:700;letter-spacing:-0.01em;color:#111827;">${safeBrand}</p>
            </td>
          </tr>
          <!-- Heading -->
          <tr>
            <td style="padding:28px 36px 0 36px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:600;color:#111827;letter-spacing:-0.02em;">
                Verifikasi alamat email Anda
              </h1>
            </td>
          </tr>
          <!-- Body copy -->
          <tr>
            <td style="padding:12px 36px 0 36px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#4b5563;">
                Masukkan kode berikut di aplikasi untuk menyelesaikan pendaftaran.
              </p>
            </td>
          </tr>
          <!-- OTP code -->
          <tr>
            <td align="center" style="padding:28px 36px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;border-radius:10px;">
                <tr>
                  <td style="padding:18px 28px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:32px;font-weight:700;letter-spacing:0.35em;color:#111827;text-align:center;">
                    ${safeCode}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Expiry -->
          <tr>
            <td style="padding:0 36px;">
              <p style="margin:0;font-size:14px;line-height:1.5;color:#6b7280;">
                Kode berlaku <strong style="color:#374151;">${safeMinutes} menit</strong>.
              </p>
            </td>
          </tr>
          <!-- Security -->
          <tr>
            <td style="padding:24px 36px 0 36px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e5e7eb;">
                <tr>
                  <td style="padding-top:20px;">
                    <p style="margin:0;font-size:13px;line-height:1.55;color:#6b7280;">
                      Jangan bagikan kode ini kepada siapa pun. Tim ${safeBrand} tidak pernah meminta kode lewat chat, telepon, atau media sosial.
                    </p>
                    <p style="margin:12px 0 0 0;font-size:13px;line-height:1.55;color:#6b7280;">
                      Jika Anda tidak mendaftar di ${safeBrand}, abaikan email ini. Tidak ada perubahan pada akun Anda.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Spacer bottom of card -->
          <tr>
            <td style="height:36px;line-height:36px;font-size:0;">&nbsp;</td>
          </tr>
        </table>
        <!-- Footer outside card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding:20px 8px 0 8px;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">
                ${safeBrand}
              </p>
              <p style="margin:6px 0 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">
                <a href="${safeAppUrl}" style="color:#9ca3af;text-decoration:underline;">${safeAppUrl}</a>
                &nbsp;·&nbsp;
                <a href="mailto:${safeSupport}" style="color:#9ca3af;text-decoration:underline;">${safeSupport}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
