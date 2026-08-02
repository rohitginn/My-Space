import { CoCanvasList } from '@/components/CoCanvasList';
export default async function CoCanvasPage({ params }: { params: Promise<{ workspaceId: string }> }) { const { workspaceId } = await params; return <CoCanvasList workspaceId={workspaceId} />; }
