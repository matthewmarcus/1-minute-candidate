import { Stack } from 'expo-router';

export default function VoterLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="find" />
      <Stack.Screen name="ballot" />
      <Stack.Screen name="candidate/[id]" />
    </Stack>
  );
}
