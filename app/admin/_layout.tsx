import { Stack, Redirect, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Colors } from '@/constants/Colors';

export default function AdminLayout() {
  const { authenticated, loading } = useAdminAuth();
  const segments = useSegments();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const currentSegment = segments[segments.length - 1];
  if (!authenticated && currentSegment !== 'login') {
    return <Redirect href="/admin/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="index" />
      <Stack.Screen name="review/[id]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
