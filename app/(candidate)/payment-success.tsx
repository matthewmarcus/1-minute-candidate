import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/Header';
import { fonts } from '@/constants/fonts';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15000;
const PURCHASE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export default function PaymentSuccessScreen() {
  const { session } = useAuth();
  const [status, setStatus] = useState<'polling' | 'found' | 'timeout'>('polling');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    const candidateId = session.user.id;
    const since = new Date(Date.now() - PURCHASE_WINDOW_MS).toISOString();

    function stopPolling() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }

    async function checkPurchase() {
      const { data } = await supabase
        .from('purchases')
        .select('id')
        .eq('candidate_id', candidateId)
        .gte('created_at', since)
        .limit(1);

      if (data && data.length > 0) {
        stopPolling();
        setStatus('found');
        setTimeout(() => {
          router.replace('/dashboard');
        }, 2000);
      }
    }

    // Start polling
    checkPurchase();
    intervalRef.current = setInterval(checkPurchase, POLL_INTERVAL_MS);

    // Fallback after timeout
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setStatus('timeout');
      setTimeout(() => {
        router.replace('/dashboard');
      }, 3000);
    }, POLL_TIMEOUT_MS);

    return stopPolling;
  }, [session]);

  return (
    <View style={styles.root}>
      <Header />
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={64} color="#16A34A" style={styles.icon} />

        <Text style={styles.title}>Payment Successful!</Text>

        {status === 'polling' && (
          <>
            <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />
            <Text style={styles.body}>Confirming your purchase...</Text>
          </>
        )}

        {status === 'found' && (
          <Text style={styles.body}>
            Purchase confirmed! Redirecting to your dashboard...
          </Text>
        )}

        {status === 'timeout' && (
          <Text style={styles.body}>
            Payment received! Your account may take a moment to update. Returning to
            dashboard...
          </Text>
        )}

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
  spinner: {
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
    maxWidth: 320,
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
