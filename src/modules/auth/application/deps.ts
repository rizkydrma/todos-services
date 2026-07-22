import type {
  AvatarObjectStore,
  Clock,
  EmailSender,
  IdGenerator,
  IEmailVerificationChallengeRepository,
  IRefreshTokenRepository,
  IUserRepository,
  OtpService,
  PasswordHasher,
  TokenService,
} from './ports';

export type AuthDeps = {
  userRepo: IUserRepository;
  refreshTokenRepo: IRefreshTokenRepository;
  challengeRepo: IEmailVerificationChallengeRepository;
  emailSender: EmailSender;
  tokens: TokenService;
  passwords: PasswordHasher;
  otp: OtpService;
  ids: IdGenerator;
  clock: Clock;
  /** Per-isolate resend timestamps (email → ms[]) */
  resendThrottle: Map<string, number[]>;
  avatarStore?: AvatarObjectStore;
};
