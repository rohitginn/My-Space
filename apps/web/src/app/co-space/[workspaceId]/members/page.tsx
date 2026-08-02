import { WorkspaceManage } from '@/components/WorkspaceManage';
export default async function MembersPage({ params }: { params: Promise<{ workspaceId: string }> }) { const { workspaceId } = await params; return <WorkspaceManage workspaceId={workspaceId} tab="members" />; }
