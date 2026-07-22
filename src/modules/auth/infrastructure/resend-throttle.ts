/**
 * Per-Worker-isolate resend throttle (email → timestamps).
 * Container is per-request; this Map must live at module scope.
 */
export const isolateResendThrottle = new Map<string, number[]>();
