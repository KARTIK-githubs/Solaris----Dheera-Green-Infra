import { model, Schema } from 'mongoose';

export const roles = ['customer', 'employee', 'admin'] as const;
export type AccountRole = typeof roles[number];

export const Account = model('Account', new Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, maxlength: 254 },
  role: { type: String, enum: roles, required: true, default: 'customer' },
  passwordHash: { type: String, required: true, select: false }
}, { timestamps: true }));

export const Session = model('Session', new Schema({
  _id: { type: String, required: true },
  accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  expiresAt: { type: Date, required: true, expires: 0 }
}));

export const RateWindow = model('RateWindow', new Schema({
  _id: { type: String, required: true },
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true, expires: 0 }
}));
