'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import api from '@/lib/api';
import { AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const { data } = await api.post('/auth/register', { displayName, email, password });
      if (data.success) {
        login(data.data.accessToken, data.data.user);
      } else {
        setError(data.error?.message || 'Registration failed');
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
      } else {
        setError(apiError?.message || 'An error occurred during registration');
      }
    } finally {
      setLoading(false);
    }
  };

  const getInputClassName = (fieldName: string) => {
    const baseClass = "w-full bg-surface border rounded-xl px-4 py-3 text-foreground outline-none transition-all duration-300 shadow-sm ";
    if (fieldErrors[fieldName]) {
      return baseClass + "border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 bg-red-500/5";
    }
    return baseClass + "border-border focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-accent-green/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-surface-glass border border-border p-8 rounded-3xl shadow-xl z-10 backdrop-blur-md transition-all">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Create Account</h1>
          <p className="text-muted">Start organizing your life with My Space</p>
        </div>

        {error && !Object.keys(fieldErrors).length && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="group">
            <label className="block text-sm font-medium text-foreground mb-1.5 transition-colors group-focus-within:text-accent-blue">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (fieldErrors.displayName) setFieldErrors(prev => ({ ...prev, displayName: '' }));
              }}
              className={getInputClassName('displayName')}
              placeholder="e.g. Alex Johnson"
            />
            {fieldErrors.displayName && (
              <p className="mt-1.5 text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1">{fieldErrors.displayName}</p>
            )}
          </div>
          
          <div className="group">
            <label className="block text-sm font-medium text-foreground mb-1.5 transition-colors group-focus-within:text-accent-blue">Email</label>
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
              <p className="mt-1.5 text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1">{fieldErrors.email}</p>
            )}
          </div>
          
          <div className="group">
            <label className="block text-sm font-medium text-foreground mb-1.5 transition-colors group-focus-within:text-accent-blue">Password</label>
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
              <p className="mt-1.5 text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1">{fieldErrors.password}</p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-foreground text-background hover:bg-foreground/90 py-3.5 rounded-xl font-semibold transition-all duration-300 mt-6 shadow-lg shadow-foreground/5 hover:shadow-foreground/15 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-muted">
          Already have an account? <Link href="/login" className="text-accent-blue hover:text-accent-blue/80 hover:underline font-medium transition-colors">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
