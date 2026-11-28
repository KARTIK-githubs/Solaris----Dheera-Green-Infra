import { createHash, randomBytes } from 'node:crypto';
import type { Types } from 'mongoose';
import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import { databaseUnavailable, ensureDbConnected } from '../config/db';
import { Account, RateWindow, Session, type AccountRole } from './models';

const cookieName = 'solaris_session';
const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
    sameSite: 'lax',
    path: '/'
  };
}

type StoredAccount = { _id: Types.ObjectId; name: string; email: string; role: AccountRole };

export function publicAccount(account: StoredAccount) {
  return { id: String(account._id), name: account.name, email: account.email, role: account.role };
}

type Principal = ReturnType<typeof publicAccount>;

export function actor(res: Response): Principal {
  return res.locals.account;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function sessionId(req: Request) {
  const match = req.get('Cookie')?.match(/(?:^|;\s*)solaris_session=([0-9a-f]{64})(?:;|$)/);
  return match ? sha256(match[1]) : null;
}

export async function startSession(req: Request, res: Response, accountId: StoredAccount['_id']) {
  const token = randomBytes(32).toString('hex');
  const prior = sessionId(req);
  await Session.create({
    _id: sha256(token),
    accountId,
    expiresAt: new Date(Date.now() + sessionLifetimeMs)
  });
  if (prior) await Session.deleteOne({ _id: prior });
  res.cookie(cookieName, token, { ...cookieOptions(), maxAge: sessionLifetimeMs });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(cookieName, cookieOptions());
}

export const requireSession: RequestHandler = async (req, res, next) => {
  const id = sessionId(req);
  if (!id) {
    res.status(401).json({ success: false, error: 'Sign in to continue.' });
    return;
  }
  if (!(await ensureDbConnected())) {
    databaseUnavailable(res);
    return;
  }

  try {
    const session = await Session.findOne({ _id: id, expiresAt: { $gt: new Date() } });
    const account = session && await Account.findById(session.accountId);
    if (!account) {
      res.status(401).json({ success: false, error: 'Your session has expired. Sign in again.' });
      return;
    }
    const expectedAccount = req.get('X-Solaris-Account');
    if (expectedAccount && expectedAccount !== String(account._id)) {
      accountChanged(res);
      return;
    }
    res.locals.account = publicAccount(account);
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...allowed: AccountRole[]): RequestHandler {
  return (_req, res, next) => {
    if (!allowed.includes(actor(res).role)) {
      res.status(403).json({ success: false, error: 'You do not have permission for this action.' });
      return;
    }
    next();
  };
}

export function accountChanged(res: Response) {
  return res.status(409).json({
    success: false, code: 'ACCOUNT_CHANGED', error: 'Your account changed in another tab.'
  });
}

export async function rateAllowed(res: Response, scope: string, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const end = (Math.floor(now / windowMs) + 1) * windowMs;
  const id = sha256(JSON.stringify([scope, key, end]));
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(end) } };
  let counter;
  try {
    counter = await RateWindow.findOneAndUpdate({ _id: id }, update, { upsert: true, returnDocument: 'after' });
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error;
    counter = await RateWindow.findOneAndUpdate({ _id: id }, update, { returnDocument: 'after' });
  }
  if (!counter) throw new Error('Rate counter was unavailable.');
  if (counter.count <= limit) return true;
  res.set('Retry-After', String(Math.ceil((end - now) / 1000)));
  res.status(429).json({ success: false, error: 'Too many requests. Try again later.' });
  return false;
}

export function limitAccountOperation(scope: string, limit: number, totalLimit?: number): RequestHandler {
  return async (_req, res, next) => {
    try {
      if (!(await rateAllowed(res, scope, actor(res).id, limit, 60_000))) return;
      if (totalLimit && !(await rateAllowed(res, scope, 'all', totalLimit, 60_000))) return;
      next();
    } catch (error) {
      next(error);
    }
  };
}
