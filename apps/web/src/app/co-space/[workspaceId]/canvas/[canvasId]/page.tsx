'use client';

import dynamic from 'next/dynamic';
import { use } from 'react';
const CanvasEditor = dynamic(() => import('@/components/CanvasEditor'), { ssr: false });
export default function CoCanvasEditorPage({ params }: { params: Promise<{ workspaceId: string; canvasId: string }> }) { const { workspaceId, canvasId } = use(params); return <CanvasEditor id={canvasId} workspaceId={workspaceId} />; }
