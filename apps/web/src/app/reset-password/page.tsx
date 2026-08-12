'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setComplete(true);
    } catch (requestError) {
      const response = requestError as { response?: { data?: { error?: { message?: string } } } };
      setError(response.response?.data?.error?.message ?? 'This reset link is invalid or expired.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-medium tracking-wide">Choose a new password</h1>
        {complete ? (
          <div className="mt-8 space-y-4"><p className="border border-zinc-800 p-4 text-sm text-zinc-300">Your password has been reset. Active sessions were signed out.</p><Link href="/login" className="inline-block text-sm text-zinc-400 hover:text-white">Continue to sign in</Link></div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <label className="block text-xs uppercase tracking-wider text-zinc-500">New password
              <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full border-b border-zinc-700 bg-transparent px-1 py-3 text-white outline-none focus:border-white" placeholder="At least 8 characters" />
            </label>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={!token} className="w-full bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-50">Reset password</button>
          </form>
        )}
      </div>
    </main>
  );
}
