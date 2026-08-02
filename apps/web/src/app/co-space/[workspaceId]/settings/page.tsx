import { WorkspaceManage } from '@/components/WorkspaceManage';
export default async function WorkspaceSettingsPage({ params }: { params: Promise<{ workspaceId: string }> }) { const { workspaceId } = await params; return <WorkspaceManage workspaceId={workspaceId} tab="settings" />; }
