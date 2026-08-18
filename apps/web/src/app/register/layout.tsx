import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create your workspace',
  description: 'Create a MySpace productivity workspace for planning, focus, and collaboration.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
