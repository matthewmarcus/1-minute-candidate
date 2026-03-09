import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/Header';
import { PageContainer } from '@/components/PageContainer';
import { fonts } from '@/constants/fonts';

const NAVY = '#0F1F5C';
const RED = '#E8192F';
const GRAY = '#6B7280';
const BORDER = '#E5E7EB';
const MUTED = '#9CA3AF';

export default function VoterHome() {
  const { width } = useWindowDimensions();
  const isWide = width >= 600;

  return (
    <View style={styles.root}>
      <Header variant="voter" />

      <PageContainer style={{ paddingHorizontal: 0 }}>
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
              onPress={() => router.push('/(voter)/find')}
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

        {/* ── Divider ── */}
        <View style={styles.divider} />

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerHashtag}>#EarnTheVote · #KnowYourVote</Text>

          <View style={styles.socialRow}>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.facebook.com/1MinuteCandidate')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="logo-facebook" size={26} color={GRAY} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.youtube.com/@1minutecandidate')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="logo-youtube" size={26} color={GRAY} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://x.com/1MinCan')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="logo-twitter" size={26} color={GRAY} />
            </TouchableOpacity>
          </View>

          <Text style={styles.footerCopyright}>© 2026 1 Minute Candidate</Text>
        </View>

      </PageContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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

  // ── Divider ───────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 0,
  },

  // ── Footer ────────────────────────────────────────
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  footerHashtag: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  footerCopyright: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
  },
});
