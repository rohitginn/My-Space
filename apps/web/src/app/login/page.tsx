'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import api from '@/lib/api';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.success) {
        login(data.data.accessToken, data.data.user);
      } else {
        setError(data.error?.message || 'Login failed');
      }
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      
      if (apiError?.code === 'VALIDATION_ERROR' && Array.isArray(apiError.details)) {
        const errors: Record<string, string> = {};
        apiError.details.forEach((issue: any) => {
          if (issue.path && issue.path[0]) {
            errors[issue.path[0]] = issue.message;
          }
        });
        setFieldErrors(errors);
        setError('Please fix the errors below.');
      } else if (!err.response) {
        setError('Network Error: The backend server is unreachable. Please ensure it is running.');
      } else {
        setError(apiError?.message || 'An error occurred during login');
      }
    } finally {
      setLoading(false);
    }
  };

  const getInputClassName = (fieldName: string) => {
    const baseClass = "w-full bg-transparent border-b border-zinc-700 px-4 py-3 text-white outline-none transition-all duration-300 ";
    if (fieldErrors[fieldName]) {
      return baseClass + "border-red-500 focus:border-red-500 text-red-500";
    }
    return baseClass + "focus:border-zinc-300";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black relative">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm p-8 z-10"
      >
        <div className="mb-10">
          <h1 className="text-2xl font-medium text-white mb-2 tracking-wide">
            Welcome Back
          </h1>
          <p className="text-zinc-500 text-sm">
            Sign in to continue.
          </p>
        </div>

        {error && !Object.keys(fieldErrors).length && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-3 border border-red-500/20 text-red-400 text-sm flex items-center gap-2"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wider font-medium text-zinc-500 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
              }}
              className={getInputClassName('email')}
              placeholder="you@example.com"
            />
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>
          
          <div>
            <label className="block text-xs uppercase tracking-wider font-medium text-zinc-500 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
              }}
              className={getInputClassName('password')}
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </div>

          <div className="-mt-2 text-right text-xs text-zinc-500">
            <Link href="/forgot-password" className="hover:text-white transition-colors">Forgot password?</Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black py-3 text-sm font-medium transition-colors hover:bg-zinc-200 mt-8 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing
              </>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-sm text-zinc-500">
          <Link href="/register" className="hover:text-white transition-colors">Create an account instead &rarr;</Link>
        </div>
      </motion.div>
    </div>
  );
}
