import { Stack, Redirect, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

const PUBLIC_ROUTES = ['login', 'register', 'forgot-password', 'reset-password'];

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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="login" />
      <Stack.Screen name="record" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="subscribe" />
      <Stack.Screen name="payment-success" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
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
