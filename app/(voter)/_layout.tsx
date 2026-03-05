import { Stack } from 'expo-router';

export default function VoterLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '1 Minute Candidate', headerShown: false }} />
      <Stack.Screen name="ballot" options={{ title: 'Your Ballot' }} />
      <Stack.Screen name="candidate/[id]" options={{ title: 'Candidate Profile' }} />
    </Stack>
  );
}
