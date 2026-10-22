import crypto from 'crypto';
import type { FeedbackSurface, FeedbackType } from '@/lib/types';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

type BasePayload = {
  userId: string;
  articleId: string | null;
  recommendationItemId: string | null;
  recommendationRunId: string;
  surface: FeedbackSurface;
};

type FeedbackPayload = BasePayload & { kind: 'feedback'; feedbackType: FeedbackType; expiresAt: number };
type ReadPayload = BasePayload & { kind: 'read'; expiresAt: number };
type MorePayload = BasePayload & { kind: 'more'; expiresAt: number };
export type SignedPayload = FeedbackPayload | ReadPayload | MorePayload;

function getSecret() { return process.env.SIGNING_SECRET || 'dev-secret-change-me'; }
function base64url(input: Buffer | string) { return Buffer.from(input).toString('base64url'); }
function sign(payload: object) {
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token: string): SignedPayload {
  const [body, sig] = token.split('.');
  if (!body || !sig) throw new Error('Malformed token');
  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  const actualBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) throw new Error('Invalid token signature');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SignedPayload;
  if (payload.expiresAt < Math.floor(Date.now() / 1000)) throw new Error('Expired token');
  return payload;
}

function withExpiry<T extends object>(payload: T, ttlSeconds = DEFAULT_TTL_SECONDS) {
  return { ...payload, expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds };
}

export function createFeedbackToken(payload: BasePayload & { feedbackType: FeedbackType }) { return sign(withExpiry({ ...payload, kind: 'feedback' as const })); }
export function createReadToken(payload: BasePayload) { return sign(withExpiry({ ...payload, kind: 'read' as const })); }
export function createMoreFeedbackToken(payload: BasePayload) { return sign(withExpiry({ ...payload, kind: 'more' as const })); }
export function createSlateFeedbackToken(payload: { userId: string; recommendationRunId: string; feedbackType: 'slate_great' | 'slate_okay' | 'slate_poor'; surface: FeedbackSurface }) {
  return createFeedbackToken({ ...payload, articleId: null, recommendationItemId: null });
}
