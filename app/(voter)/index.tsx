import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/Header';
import { fonts } from '@/constants/fonts';

const NAVY = '#0F1F5C';
const RED = '#E8192F';
const GRAY = '#6B7280';
const BORDER = '#E5E7EB';
const LIGHT_BG = '#F9FAFB';

export default function VoterHome() {
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const { width } = useWindowDimensions();
  const isWide = width >= 600;
  const addressInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  async function useMyLocation() {
    if (Platform.OS === 'web') {
      Alert.alert('Location', 'Please type your address below.');
      addressInputRef.current?.focus();
      return;
    }
    setLocating(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocating(false);
      Alert.alert('Permission Denied', 'Location permission is needed to find your ballot.');
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    const [place] = await Location.reverseGeocodeAsync(location.coords);
    if (place) {
      const formatted = [place.streetNumber, place.street, place.city, place.region, place.postalCode]
        .filter(Boolean)
        .join(' ');
      setAddress(formatted);
    }
    setLocating(false);
  }

  function findCandidates() {
    if (!address.trim()) {
      Alert.alert('Enter Address', 'Please enter your address to find candidates on your ballot.');
      return;
    }
    router.push({ pathname: '/(voter)/ballot', params: { address } });
  }

  function scrollToAddress() {
    addressInputRef.current?.focus();
  }

  return (
    <View style={styles.root}>
      <Header />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heroTagline}>Know who's on your ballot.</Text>
          <Text style={styles.heroSub}>
            Watch 60-second videos from every candidate running in your local elections.
            Free. Nonpartisan. No account needed.
          </Text>
        </View>

        {/* ── Two-card fork ── */}
        <View style={[styles.cardRow, isWide && styles.cardRowWide]}>

          {/* Voter card */}
          <View style={[styles.card, isWide ? styles.cardHalf : styles.cardFull, styles.cardVoter]}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="checkbox-outline" size={34} color={NAVY} />
            </View>
            <Text style={[styles.cardHeading, { color: NAVY }]}>I'm a Voter</Text>
            <Text style={styles.cardBody}>
              Find every candidate on your specific ballot and watch their 60-second pitch.
            </Text>
            <TouchableOpacity
              style={[styles.cardBtn, { backgroundColor: NAVY }]}
              onPress={scrollToAddress}
              activeOpacity={0.85}
            >
              <Text style={styles.cardBtnText}>Find My Candidates</Text>
            </TouchableOpacity>
          </View>

          {/* Candidate card */}
          <View style={[styles.card, isWide ? styles.cardHalf : styles.cardFull, styles.cardCandidate]}>
            <View style={[styles.cardIconWrap, styles.cardIconWrapRed]}>
              <Ionicons name="mic-outline" size={34} color={RED} />
            </View>
            <Text style={[styles.cardHeading, { color: RED }]}>I'm a Candidate</Text>
            <Text style={styles.cardBody}>
              Record your 60-second pitch and connect directly with voters in your district.
            </Text>
            <TouchableOpacity
              style={[styles.cardBtn, { backgroundColor: RED }]}
              onPress={() => router.push('/(candidate)/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.cardBtnText}>Get Started</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* ── Address entry ── */}
        <View style={styles.addressSection}>
          <Text style={styles.addressTitle}>Find Your Ballot</Text>
          <Text style={styles.addressSub}>
            Enter your full address to see every candidate running in your specific elections.
          </Text>

          <TextInput
            ref={addressInputRef}
            style={styles.input}
            placeholder="123 Main St, City, State 12345"
            placeholderTextColor={GRAY}
            value={address}
            onChangeText={setAddress}
            returnKeyType="search"
            onSubmitEditing={findCandidates}
          />

          <TouchableOpacity style={styles.locationBtn} onPress={useMyLocation} disabled={locating}>
            <Ionicons name="location-outline" size={16} color={NAVY} />
            <Text style={styles.locationBtnText}>
              {locating ? 'Locating…' : 'Use My Location'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testBtn}
            onPress={() => setAddress('900 N Oyster Bay Rd, Bethpage, NY 11714')}
          >
            <Text style={styles.testBtnText}>Use test address</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.findBtn} onPress={findCandidates} activeOpacity={0.85}>
            <Text style={styles.findBtnText}>Find My Ballot</Text>
          </TouchableOpacity>
        </View>

        {/* ── Trust signals ── */}
        <View style={styles.trustRow}>
          {[
            'Every race on your specific ballot',
            '60-second videos from candidates',
            'Free, nonpartisan, no account needed',
          ].map((item) => (
            <View key={item} style={styles.trustItem}>
              <Ionicons name="checkmark-circle" size={18} color={NAVY} />
              <Text style={styles.trustText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 1 Minute Candidate · #EarnTheVote · #KnowYourVote
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  // ── Hero ──────────────────────────────────────────
  hero: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 36,
    alignItems: 'center',
  },
  heroTagline: {
    fontSize: 32,
    fontFamily: fonts.bold,
    color: NAVY,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 40,
  },
  heroSub: {
    fontSize: 16,
    color: GRAY,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 480,
  },

  // ── Two-card row ──────────────────────────────────
  cardRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 14,
  },
  cardRowWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1.5,
  },
  cardFull: {
    marginBottom: 14,
  },
  cardHalf: {
    flex: 1,
  },
  cardVoter: {
    backgroundColor: '#fff',
    borderColor: NAVY,
  },
  cardCandidate: {
    backgroundColor: '#FFF5F6',
    borderColor: RED,
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF1FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardIconWrapRed: {
    backgroundColor: '#FDEAEC',
  },
  cardHeading: {
    fontSize: 20,
    fontFamily: fonts.bold,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 15,
    color: GRAY,
    lineHeight: 23,
    marginBottom: 20,
    flex: 1,
  },
  cardBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cardBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: fonts.bold,
  },

  // ── Address section ───────────────────────────────
  addressSection: {
    backgroundColor: LIGHT_BG,
    margin: 16,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: BORDER,
  },
  addressTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: NAVY,
    marginBottom: 6,
  },
  addressSub: {
    fontSize: 14,
    color: GRAY,
    lineHeight: 21,
    marginBottom: 18,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1.5,
    borderColor: BORDER,
    marginBottom: 10,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 6,
  },
  locationBtnText: {
    color: NAVY,
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  testBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 14,
  },
  testBtnText: {
    color: GRAY,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  findBtn: {
    backgroundColor: NAVY,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  findBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.bold,
  },

  // ── Trust signals ─────────────────────────────────
  trustRow: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trustText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: fonts.semiBold,
    flex: 1,
  },

  // ── Footer ────────────────────────────────────────
  footer: {
    backgroundColor: NAVY,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
