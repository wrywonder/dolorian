import { useLocalSearchParams } from 'expo-router';
import { CircleEditorScreen } from '@/components/village/circle-editor-screen';

export default function CircleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <CircleEditorScreen circleId={id} />;
}
