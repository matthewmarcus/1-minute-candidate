import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { CandidateTabBar } from '@/components/CandidateTabBar';
import type { Candidate, Video } from '@/lib/types';

function NavBar({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  return (
    <View style={styles.navBar}>
      <Text style={styles.navLogo}>1MC</Text>
      <View style={styles.navRight}>
        <Text style={styles.navName} numberOfLines={1}>{name}</Text>
        <TouchableOpacity onPress={onSignOut} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SubscriptionBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
      <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
        {isActive ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );
}

function VideoCard({ video, onRecord }: { video: Video | null; onRecord: () => void }) {
  if (!video) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Video</Text>
        <View style={styles.emptyVideoState}>
          <Text style={styles.emptyVideoIcon}>🎥</Text>
          <Text style={styles.emptyVideoText}>
            Record your 60-second candidate video so voters can see your message.
          </Text>
          <TouchableOpacity style={styles.ctaButton} onPress={onRecord}>
            <Text style={styles.ctaButtonText}>Record Your Video</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (video.status === 'approved' && video.youtube_video_id) {
    const thumbnailUrl = `https://img.youtube.com/vi/${video.youtube_video_id}/hqdefault.jpg`;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Your Video</Text>
          <View style={styles.badgeLive}>
            <Text style={styles.badgeLiveText}>Live on your profile</Text>
          </View>
        </View>
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.videoThumbnail}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.outlineButton} onPress={onRecord}>
          <Text style={styles.outlineButtonText}>Record New Video</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // submitted or under_review
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your Video</Text>
      <View style={styles.reviewState}>
        <View style={styles.reviewIconContainer}>
          <Text style={styles.reviewIcon}>⏳</Text>
        </View>
        <Text style={styles.reviewTitle}>Your video is under review</Text>
        <Text style={styles.reviewSubtitle}>
          We'll email you once it's approved and live on your profile.
        </Text>
      </View>
    </View>
  );
}

function ProfileCompletenessCard({ profile }: { profile: Partial<Candidate> }) {
  const items = [
    { label: 'Bio', done: !!(profile.bio && profile.bio.trim().length > 10) },
    { label: 'Photo', done: !!profile.photo_url },
    { label: 'Website', done: !!profile.website_url },
    { label: 'Twitter handle', done: !!profile.twitter_handle },
    { label: 'Facebook page', done: !!profile.facebook_url },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const total = items.length;
  const allDone = completedCount === total;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Profile Completeness</Text>
        <Text style={styles.completenessCount}>
          {completedCount}/{total}
        </Text>
      </View>

      {!allDone && (
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${(completedCount / total) * 100}%` as any }]} />
        </View>
      )}

      <View style={styles.checklistContainer}>
        {items.map((item) => (
          <View key={item.label} style={styles.checklistItem}>
            <Text style={[styles.checkmark, item.done ? styles.checkmarkDone : styles.checkmarkPending]}>
              {item.done ? '✓' : '○'}
            </Text>
            <Text style={[styles.checklistLabel, item.done && styles.checklistLabelDone]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      {!allDone && (
        <TouchableOpacity
          style={styles.editProfileLink}
          onPress={() => router.push('/(candidate)/profile')}
        >
          <Text style={styles.editProfileLinkText}>Edit Profile →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function CandidateDashboard() {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<Partial<Candidate> | null>(null);
  const [video, setVideo] = useState<Video | null | undefined>(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    async function load() {
      const [profileResult, videoResult] = await Promise.all([
        supabase
          .from('candidates')
          .select('*')
          .eq('id', session!.user.id)
          .single(),
        supabase
          .from('videos')
          .select('*')
          .eq('candidate_id', session!.user.id)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileResult.data) setProfile(profileResult.data);
      setVideo(videoResult.data ?? null);
      setLoading(false);
    }

    load();
  }, [session]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const name = profile?.name ?? session?.user?.email ?? 'Candidate';
  const office = profile?.office_sought ?? '';
  const party = profile?.party ?? '';
  const subStatus = profile?.subscription_status ?? 'inactive';

  return (
    <View style={styles.rootContainer}>
      <NavBar name={name} onSignOut={signOut} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome back, {name.split(' ')[0]}!</Text>
          {(office || party) && (
            <Text style={styles.welcomeSubtitle}>
              {[office, party].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>

        {/* Subscription / Status card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Subscription</Text>
              {office && (
                <Text style={styles.statusOffice}>{office}</Text>
              )}
            </View>
            <SubscriptionBadge status={subStatus} />
          </View>
          {subStatus !== 'active' && (
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => router.push('/(candidate)/subscribe')}
            >
              <Text style={styles.outlineButtonText}>Activate Subscription</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Video card */}
        <VideoCard
          video={video === undefined ? null : video}
          onRecord={() => router.push('/(candidate)/record')}
        />

        {/* Profile completeness */}
        {profile && <ProfileCompletenessCard profile={profile} />}

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Profile Views</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Video Views</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <CandidateTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },

  // Nav bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 52 : 14,
  },
  navLogo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: '70%',
  },
  navName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    flexShrink: 1,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  logoutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Welcome
  welcomeSection: {
    marginBottom: 16,
    marginTop: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // Cards
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },

  // Subscription card
  statusOffice: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Badges
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeActive: {
    backgroundColor: '#d1fae5',
  },
  badgeInactive: {
    backgroundColor: '#f3f4f6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#065f46',
  },
  badgeTextInactive: {
    color: Colors.textSecondary,
  },
  badgeLive: {
    backgroundColor: '#d1fae5',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeLiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },

  // Video card states
  emptyVideoState: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyVideoIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyVideoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 280,
  },
  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  reviewState: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  reviewIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef9c3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewIcon: {
    fontSize: 28,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  reviewSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },

  // Outline button
  outlineButton: {
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: 4,
  },
  outlineButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Profile completeness
  completenessCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 14,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  checklistContainer: {
    gap: 8,
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkmark: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
  },
  checkmarkDone: {
    color: Colors.success,
  },
  checkmarkPending: {
    color: Colors.border,
  },
  checklistLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  checklistLabelDone: {
    color: Colors.text,
  },
  editProfileLink: {
    alignSelf: 'flex-start',
  },
  editProfileLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },

  bottomSpacer: {
    height: 8,
  },
});
