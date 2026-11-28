import { Router, type RequestHandler } from 'express';
import { databaseUnavailable, ensureDbConnected } from '../config/db';
import {
  accountChanged, actor, clearSessionCookie, publicAccount,
  rateAllowed, requireSession, sessionId, startSession
} from './access';
import { Account, Session } from './models';
import { hashPassword, verifyPassword } from './passwords';

export const authRouter = Router();

function credentials(register: boolean): RequestHandler {
  return async (req, res, next) => {
    const body = req.body ?? {};
    const { email, name, password } = body;
    const allowed = register ? ['name', 'email', 'password'] : ['email', 'password'];
    if (Object.keys(body).some(key => !allowed.includes(key))
      || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      || typeof password !== 'string' || password.length < (register ? 8 : 1) || Buffer.byteLength(password) > 256
      || (register && (typeof name !== 'string' || !name.trim() || name.trim().length > 100))) {
      res.status(400).json({
        success: false,
        error: register ? 'Enter a name, valid email and a password of at least 8 characters.' : 'Invalid email or password.'
      });
      return;
    }

    if (!(await ensureDbConnected())) {
      databaseUnavailable(res);
      return;
    }

    try {
      const normalized = email.trim().toLowerCase();
      const scope = register ? 'register' : 'login';
      if (!(await rateAllowed(res, scope, 'all', register ? 40 : 180, 60_000))) return;
      if (!(await rateAllowed(res, scope, normalized, register ? 5 : 10, 15 * 60_000))) return;

      if (register) await Account.init();
      const existing = await Account.findOne({ email: normalized }).select('+passwordHash');
      if (register && existing) {
        res.status(409).json({ success: false, error: 'An account with that email already exists.' });
        return;
      }
      if (!register && !(await verifyPassword(password, existing?.passwordHash))) {
        res.status(401).json({ success: false, error: 'Invalid email or password.' });
        return;
      }

      const account = register
        ? await Account.create({ name: name.trim(), email: normalized, passwordHash: await hashPassword(password), role: 'customer' })
        : existing!;
      await startSession(req, res, account._id);
      res.status(register ? 201 : 200).json({ success: true, data: publicAccount(account) });
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        res.status(409).json({ success: false, error: 'An account with that email already exists.' });
        return;
      }
      next(error);
    }
  };
}

authRouter.post('/register', credentials(true));
authRouter.post('/login', credentials(false));
authRouter.get('/session', requireSession, (_req, res) => {
  res.json({ success: true, data: actor(res) });
});
authRouter.post('/logout', async (req, res, next) => {
  const id = sessionId(req);
  if (id && !(await ensureDbConnected())) {
    databaseUnavailable(res);
    return;
  }
  try {
    if (id) {
      const expected = req.get('X-Solaris-Account');
      if (expected) {
        const session = await Session.findById(id).select('accountId').lean();
        if (session && String(session.accountId) !== expected) return accountChanged(res);
      }
      await Session.deleteOne({ _id: id });
    }
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
