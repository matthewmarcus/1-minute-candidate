import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/Header';
import { fonts } from '@/constants/fonts';

export default function PaymentSuccessScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.root}>
      <Header variant="candidate" />
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={64} color="#16A34A" style={styles.icon} />

        <Text style={styles.title}>Payment Successful!</Text>

        <Text style={styles.body}>
          Your purchase has been confirmed. If you purchased profile setup, your profile will be
          unlocked within a few seconds.
        </Text>

        <Text style={styles.redirectText}>Redirecting to your dashboard in a moment...</Text>

        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            style={[styles.button, styles.buttonNavy]}
            onPress={() => router.replace('/dashboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: fonts.bold,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
    maxWidth: 320,
  },
  redirectText: {
    color: '#6B7280',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  buttonWrapper: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    marginTop: 32,
  },
  button: {
    width: '100%',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonNavy: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
