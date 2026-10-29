import React, { useState } from 'react';
import { AuthShell } from '../components/common/AuthShell';
import { useApp } from '../context/AppContext';

export const LoginPage: React.FC = () => {
  const { logIn, navigateTo } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const result = await logIn(email, password);
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Unable to log in.');
      return;
    }
    navigateTo('/dashboard');
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to Solaris"
      subtitle="Access your community plan, feasibility estimates, and allocation ledger."
      footer={
        <span>
          New to Solaris?{' '}
          <button
            onClick={() => navigateTo('/signup')}
            className="font-bold text-[#006b57] hover:underline"
          >
            Create an account
          </button>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="p-3 rounded-lg bg-[#ffdad6] text-[#93000a] text-xs font-medium flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="text-xs font-semibold text-[#101d24] block mb-1">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full h-11 px-3 rounded-lg border border-[#c0c8c5] bg-white text-sm text-[#101d24] placeholder:text-[#9aa5a1] focus:outline-none focus:border-[#006b57] focus:ring-2 focus:ring-[#9af4d8]/40"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="text-xs font-semibold text-[#101d24] block mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full h-11 pl-3 pr-10 rounded-lg border border-[#c0c8c5] bg-white text-sm text-[#101d24] placeholder:text-[#9aa5a1] focus:outline-none focus:border-[#006b57] focus:ring-2 focus:ring-[#9af4d8]/40"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center text-[#717976] hover:bg-[#e2f0f9] focus:outline-none focus:ring-2 focus:ring-[#9af4d8]/60 focus:ring-offset-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 rounded-lg bg-[#006b57] text-white text-sm font-bold hover:bg-[#002620] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#9af4d8]/60 focus:ring-offset-2"
        >
          {isSubmitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
};
