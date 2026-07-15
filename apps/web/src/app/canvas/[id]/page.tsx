'use client';

import dynamic from 'next/dynamic';
import { use } from 'react';

const CanvasEditor = dynamic(() => import('@/components/CanvasEditor'), { ssr: false });

export default function CanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CanvasEditor id={id} />;
}
