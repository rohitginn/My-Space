'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch {
      setError('We could not process that request. Please try again.');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-medium tracking-wide">Reset your password</h1>
        <p className="mt-2 text-sm text-zinc-500">Enter your email and we’ll send reset instructions if an account exists.</p>
        {submitted ? (
          <div className="mt-8 border border-zinc-800 p-4 text-sm text-zinc-300">If the account exists, a reset link is on its way.</div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <label className="block text-xs uppercase tracking-wider text-zinc-500">Email
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full border-b border-zinc-700 bg-transparent px-1 py-3 text-white outline-none focus:border-white" placeholder="you@example.com" />
            </label>
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <button type="submit" className="w-full bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-200">Send reset link</button>
          </form>
        )}
        <Link href="/login" className="mt-8 inline-block text-sm text-zinc-500 hover:text-white">Back to sign in</Link>
      </div>
    </main>
  );
}
