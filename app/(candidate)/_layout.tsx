import { Stack, Redirect, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

const PUBLIC_ROUTES = ['login', 'register'];

export default function CandidateLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentSegment = segments[segments.length - 1];
  if (!session && !PUBLIC_ROUTES.includes(currentSegment)) {
    return <Redirect href="/(candidate)/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="register" options={{ title: 'Register', headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Login', headerShown: false }} />
      <Stack.Screen name="record" options={{ title: 'Record Video', headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
      <Stack.Screen name="subscribe" options={{ title: 'Subscribe' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
