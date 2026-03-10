import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/Header';
import { PageContainer } from '@/components/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { fonts } from '@/constants/fonts';

type RaceLevel = 'local' | 'state' | 'national';

interface Purchase {
  id: string;
  product_type: string;
  amount: number;
  created_at: string;
}

const PROFILE_PRICES: Record<RaceLevel, number> = {
  local: 49,
  state: 99,
  national: 199,
};

const VIDEO_PRICES: Record<RaceLevel, number> = {
  local: 29,
  state: 49,
  national: 99,
};

function formatProductType(type: string): string {
  switch (type) {
    case 'profile_setup':
      return 'Profile Setup';
    case 'issue_video':
      return 'Issue Video';
    case 'endorsement_video':
      return 'Endorsement Video';
    case 'overview_rerecord':
      return 'Overview Re-record';
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const stepperButtonStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#0F1F5C',
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};
const stepperTextStyle = {
  fontSize: 18,
  color: '#0F1F5C',
  fontFamily: 'Quicksand_700Bold',
  lineHeight: 20,
};

export default function SubscribeScreen() {
  const { session } = useAuth();
  const [raceLevel, setRaceLevel] = useState<RaceLevel>('local');
  const [profileUnlocked, setProfileUnlocked] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [issueQty, setIssueQty] = useState(1);
  const [endorsementQty, setEndorsementQty] = useState(1);

  const load = useCallback(async () => {
    if (!session?.user) return;

    const [candidateResult, purchasesResult] = await Promise.all([
      supabase
        .from('candidates')
        .select('race_level, profile_unlocked')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('purchases')
        .select('*')
        .eq('candidate_id', session.user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (candidateResult.data) {
      setRaceLevel((candidateResult.data.race_level as RaceLevel) ?? 'local');
      setProfileUnlocked(candidateResult.data.profile_unlocked ?? false);
    }

    if (purchasesResult.data) {
      setPurchases(purchasesResult.data);
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePurchase(product_type: string, quantity: number = 1) {
    setPurchasing(true);
    try {
      const appUrl =
        Platform.OS === 'web'
          ? (typeof window !== 'undefined' ? window.location.origin : 'https://1minutecandidate.com')
          : 'https://1minutecandidate.com';

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          product_type,
          quantity,
          success_url: `${appUrl}/(candidate)/payment-success`,
          cancel_url: `${appUrl}/(candidate)/billing`,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL returned');

      await Linking.openURL(data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', `Could not start checkout: ${message}`);
    } finally {
      setPurchasing(false);
    }
  }

  const profilePrice = PROFILE_PRICES[raceLevel];
  const videoPrice = VIDEO_PRICES[raceLevel];

  if (loading) {
    return (
      <View style={styles.root}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header />

      <PageContainer>
        <Text style={styles.pageTitle}>Unlock Your Campaign</Text>
        <Text style={styles.pageSubtitle}>
          Everything you need to connect with voters in your district.
        </Text>

        {/* SECTION 1 — Profile Setup */}
        <View style={[styles.card, styles.cardNavyBorder]}>
          <Text style={styles.stepLabel}>STEP 1 — REQUIRED</Text>
          <Text style={styles.cardTitle}>Profile + Overview Video</Text>
          <Text style={styles.cardDescription}>
            Unlock your candidate profile page and record your 60-second overview video pitch.
          </Text>

          {profileUnlocked ? (
            <View style={styles.unlockedRow}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
              <Text style={styles.unlockedText}>Profile Unlocked ✓</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.buttonRed, purchasing && styles.buttonDisabled]}
              onPress={() => handlePurchase('profile_setup')}
              disabled={purchasing}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {purchasing ? 'Loading...' : `Unlock My Profile — $${profilePrice}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SECTION 2 — Issue Videos */}
        {profileUnlocked && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Issue Video</Text>
            <Text style={styles.cardDescription}>
              Record a 60-second video on a specific policy issue important to your campaign. Buy
              as many as you need.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setIssueQty(q => Math.max(1, q - 1))}
                style={stepperButtonStyle}>
                <Text style={stepperTextStyle}>−</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: 'Quicksand_700Bold', minWidth: 24, textAlign: 'center' }}>
                {issueQty}
              </Text>
              <TouchableOpacity
                onPress={() => setIssueQty(q => Math.min(10, q + 1))}
                style={stepperButtonStyle}>
                <Text style={stepperTextStyle}>+</Text>
              </TouchableOpacity>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                {issueQty > 1 ? `${issueQty} videos` : '1 video'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.button, styles.buttonNavy, purchasing && styles.buttonDisabled]}
              onPress={() => handlePurchase('issue_video', issueQty)}
              disabled={purchasing}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {purchasing
                  ? 'Loading...'
                  : issueQty === 1
                  ? `Add Issue Video — $${videoPrice}`
                  : `Add ${issueQty} Issue Videos — $${videoPrice * issueQty}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SECTION 3 — Endorsement Videos */}
        {profileUnlocked && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Endorsement Video</Text>
            <Text style={styles.cardDescription}>
              Share a 60-second endorsement from a supporter, colleague, or community leader.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setEndorsementQty(q => Math.max(1, q - 1))}
                style={stepperButtonStyle}>
                <Text style={stepperTextStyle}>−</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontFamily: 'Quicksand_700Bold', minWidth: 24, textAlign: 'center' }}>
                {endorsementQty}
              </Text>
              <TouchableOpacity
                onPress={() => setEndorsementQty(q => Math.min(10, q + 1))}
                style={stepperButtonStyle}>
                <Text style={stepperTextStyle}>+</Text>
              </TouchableOpacity>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>
                {endorsementQty > 1 ? `${endorsementQty} videos` : '1 video'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.button, styles.buttonNavy, purchasing && styles.buttonDisabled]}
              onPress={() => handlePurchase('endorsement_video', endorsementQty)}
              disabled={purchasing}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {purchasing
                  ? 'Loading...'
                  : endorsementQty === 1
                  ? `Add Endorsement Video — $${videoPrice}`
                  : `Add ${endorsementQty} Endorsement Videos — $${videoPrice * endorsementQty}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SECTION 4 — Update Overview Video */}
        {profileUnlocked && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Update Overview Video</Text>
            <Text style={styles.cardDescription}>
              Re-record your 60-second overview. Your existing video stays live until the new one is approved.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.buttonNavy, purchasing && styles.buttonDisabled]}
              onPress={() => handlePurchase('overview_rerecord', 1)}
              disabled={purchasing}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {purchasing ? 'Loading...' : `Update Overview — $${videoPrice}`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SECTION 5 — Purchase History */}
        {purchases.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Purchase History</Text>
            {purchases.map((p) => (
              <View key={p.id} style={styles.historyRow}>
                <Text style={styles.historyItem}>
                  {formatProductType(p.product_type)}
                  {' · '}
                  {formatDate(p.created_at)}
                  {p.amount ? ` · $${p.amount}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </PageContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: fonts.bold,
    marginBottom: 6,
    marginTop: 8,
  },
  pageSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },

  // Cards
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardNavyBorder: {
    borderTopWidth: 4,
    borderTopColor: Colors.primary,
  },

  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    fontFamily: fonts.bold,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },

  // Unlocked state
  unlockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  unlockedText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.success,
  },

  // Buttons
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonRed: {
    backgroundColor: Colors.accent,
  },
  buttonNavy: {
    backgroundColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },

  // Purchase history
  historySection: {
    marginTop: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    fontFamily: fonts.bold,
  },
  historyRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyItem: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
