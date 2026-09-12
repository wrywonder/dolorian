import { Redirect } from 'expo-router';

/** Older links land on connections now that circles are no longer part of the UI. */
export default function CircleRoute() {
  return <Redirect href="/village" />;
}
