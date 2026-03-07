import { Stack, Redirect, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Colors } from '@/constants/Colors';

export default function AdminLayout() {
  const { authenticated, loading, logout } = useAdminAuth();
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
    return <Redirect href="/(admin)/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="index"
        options={{
          title: 'Review Queue',
          headerRight: () => (
            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="review/[id]" options={{ title: 'Review Video' }} />
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
  logoutButton: {
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
});
