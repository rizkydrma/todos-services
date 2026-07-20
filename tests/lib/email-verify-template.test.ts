import { describe, expect, it, vi, afterEach } from 'vitest';
import { BRAND_NAME, buildVerifyEmailContent } from '../../src/lib/email/templates/verify-email';
import { createEmailSender, ResendEmailSender } from '../../src/lib/email/sender';

describe('buildVerifyEmailContent', () => {
  it('builds subject, text, and html with code and expiry', () => {
    const content = buildVerifyEmailContent({
      code: '957863',
      expiresInMinutes: 10,
    });

    expect(content.subject).toBe(`Verifikasi email ${BRAND_NAME}`);
    expect(content.text).toContain('957863');
    expect(content.text).toContain('10 menit');
    expect(content.text).toContain('Jangan bagikan');
    expect(content.text).toContain(BRAND_NAME);

    expect(content.html).toContain('957863');
    expect(content.html).toContain('10');
    expect(content.html).toContain(BRAND_NAME);
    expect(content.html).toContain('Verifikasi alamat email Anda');
    expect(content.html).toContain('Kode verifikasi Anda berlaku 10 menit');
  });

  it('escapes untrusted strings in html', () => {
    const content = buildVerifyEmailContent({
      code: '<script>alert(1)</script>',
      expiresInMinutes: 10,
      appUrl: 'https://x.test/"onclick="alert(1)',
      supportEmail: 'a@b.com"><img src=x>',
    });

    expect(content.html).not.toContain('<script>alert(1)</script>');
    expect(content.html).toContain('&lt;script&gt;');
    expect(content.html).toContain('&quot;');
  });
});

describe('ResendEmailSender', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends multipart email with tags via Resend API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    const sender = new ResendEmailSender('re_test', 'Just Todos <no-reply@example.com>');
    await sender.sendEmailVerificationOtp({
      to: 'user@example.com',
      code: '123456',
      expiresInMinutes: 10,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer re_test');

    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(['user@example.com']);
    expect(body.from).toBe('Just Todos <no-reply@example.com>');
    expect(body.subject).toBe(`Verifikasi email ${BRAND_NAME}`);
    expect(body.text).toContain('123456');
    expect(body.html).toContain('123456');
    expect(body.tags).toEqual([{ name: 'category', value: 'email_verification' }]);
  });

  it('throws on Resend non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => '{"message":"bad from"}',
      }),
    );

    const sender = new ResendEmailSender('re_test', 'bad');
    await expect(
      sender.sendEmailVerificationOtp({
        to: 'user@example.com',
        code: '000000',
        expiresInMinutes: 10,
      }),
    ).rejects.toThrow(/Resend failed: 422/);
  });
});

describe('createEmailSender', () => {
  it('defaults to LogEmailSender', () => {
    const sender = createEmailSender({});
    expect(sender.constructor.name).toBe('LogEmailSender');
  });

  it('requires secrets when EMAIL_PROVIDER=resend', () => {
    expect(() => createEmailSender({ EMAIL_PROVIDER: 'resend' })).toThrow(/RESEND_API_KEY and EMAIL_FROM/);
  });

  it('returns ResendEmailSender when configured', () => {
    const sender = createEmailSender({
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 're_x',
      EMAIL_FROM: 'Just Todos <no-reply@example.com>',
    });
    expect(sender).toBeInstanceOf(ResendEmailSender);
  });
});
