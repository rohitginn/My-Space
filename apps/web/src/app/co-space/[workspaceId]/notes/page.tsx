'use client';

import { use } from 'react';
import { CoSpaceNotes } from '@/components/CoSpaceNotes';

export default function WorkspaceNotesPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  return <CoSpaceNotes workspaceId={workspaceId} />;
}
