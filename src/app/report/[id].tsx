import { useLocalSearchParams } from 'expo-router';
import { ReportParentScreen } from '@/components/village/report-parent-screen';

export default function ReportRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <ReportParentScreen parentId={id} />;
}
