import { JoinCoSpace } from '@/components/JoinCoSpace';

export default async function JoinCoSpacePage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = await params;
  return <JoinCoSpace inviteCode={inviteCode} />;
}
