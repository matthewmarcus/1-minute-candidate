import { Redirect } from 'expo-router';

// The candidate dashboard has moved to /dashboard to avoid a URL conflict
// with Expo Router's grouped routes (both (candidate)/index and (voter)/index
// resolve to URL "/" which causes the root redirect to voter to win on web).
export default function CandidateIndexRedirect() {
  return <Redirect href="/dashboard" />;
}
