export type SendOtpInput = {
  to: string;
  code: string;
  expiresInMinutes: number;
};

export interface EmailSender {
  sendEmailVerificationOtp(input: SendOtpInput): Promise<void>;
}

export class LogEmailSender implements EmailSender {
  async sendEmailVerificationOtp(input: SendOtpInput): Promise<void> {
    console.info(
      JSON.stringify({
        type: 'email_verification_otp',
        to: input.to,
        code: input.code,
        expiresInMinutes: input.expiresInMinutes,
      }),
    );
  }
}

export class ResendEmailSender implements EmailSender {
  constructor(
    private apiKey: string,
    private from: string,
  ) {}

  async sendEmailVerificationOtp(input: SendOtpInput): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [input.to],
        subject: 'Kode verifikasi Todo',
        text: `Kode verifikasi Anda: ${input.code}\nBerlaku ${input.expiresInMinutes} menit.\nJika Anda tidak mendaftar, abaikan email ini.`,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend failed: ${res.status} ${body}`);
    }
  }
}

export function createEmailSender(env: {
  EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}): EmailSender {
  if (env.EMAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      throw new Error('RESEND_API_KEY and EMAIL_FROM required when EMAIL_PROVIDER=resend');
    }
    return new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return new LogEmailSender();
}
