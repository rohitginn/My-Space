'use client';

import { use } from 'react';
import { CoSpaceKanban } from '@/components/CoSpaceKanban';

export default function WorkspaceProjectsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  return <CoSpaceKanban workspaceId={workspaceId} />;
}
