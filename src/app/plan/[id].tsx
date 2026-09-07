import { useLocalSearchParams } from 'expo-router';
import { PlanDetailScreen } from '@/components/plans/plan-detail-screen';

export default function PlanDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlanDetailScreen id={id} />;
}
