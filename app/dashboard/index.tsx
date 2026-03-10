import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/Header';
import { PageContainer } from '@/components/PageContainer';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { countSlots, countOverviewSlots } from '@/lib/videoSlots';
import type { Candidate, Video } from '@/lib/types';

type RaceLevel = 'local' | 'state' | 'national';

const VIDEO_PRICES: Record<RaceLevel, number> = {
  local: 29,
  state: 49,
  national: 99,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}


function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: '#d1fae5', text: '#065f46', label: 'Live' },
    submitted: { bg: '#fef3c7', text: '#92400e', label: 'Submitted' },
    under_review: { bg: '#dbeafe', text: '#1e40af', label: 'Under Review' },
    rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
  };
  const cfg = configs[status] ?? { bg: '#f3f4f6', text: '#374151', label: status };
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

function SlotPill({ used, purchased }: { used: number; purchased: number }) {
  return (
    <View style={styles.slotPill}>
      <Text style={styles.slotPillText}>{used} of {purchased} slots used</Text>
    </View>
  );
}

function OverviewVideoSection({
  video,
  profileUnlocked,
  overviewRemaining,
  hasInFlightOverview,
  raceLevel,
}: {
  video: Video | null;
  profileUnlocked: boolean;
  overviewRemaining: number;
  hasInFlightOverview: boolean;
  raceLevel: RaceLevel;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const videoWidth = Math.min(windowWidth, 680) - 72;
  const videoHeight = videoWidth * (9 / 16);

  const OVERVIEW_RERECORD_PRICES: Record<RaceLevel, number> = {
    local: 29,
    state: 49,
    national: 99,
  };
  const rerecordPrice = OVERVIEW_RERECORD_PRICES[raceLevel];

  if (!profileUnlocked) {
    return (
      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Overview Video</Text>
        <View style={styles.lockCtaContainer}>
          <Ionicons name="lock-closed-outline" size={28} color={Colors.textSecondary} style={styles.lockIcon} />
          <Text style={styles.lockBody}>
            Purchase your profile setup to record your video and go live to voters.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/(candidate)/billing')}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Unlock My Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!video) {
    if (overviewRemaining === 0) {
      return (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Overview Video</Text>
          <View style={[styles.lockCtaContainer, { marginTop: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14 }]}>
            <Ionicons name="lock-closed-outline" size={22} color={Colors.textSecondary} style={styles.lockIcon} />
            <Text style={[styles.subsectionTitle, { marginBottom: 4 }]}>Want to record your overview video?</Text>
            <Text style={[styles.lockBody, { marginBottom: 12 }]}>Purchase a slot to get started.</Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/(candidate)/billing')}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Go to Billing — ${rerecordPrice}</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    if (hasInFlightOverview) {
      return (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>Overview Video</Text>
          <View style={[styles.lockCtaContainer, { marginTop: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14 }]}>
            <Ionicons name="time-outline" size={22} color={Colors.textSecondary} style={styles.lockIcon} />
            <Text style={[styles.subsectionTitle, { marginBottom: 4 }]}>Overview video under review</Text>
            <Text style={[styles.lockBody, { marginBottom: 0 }]}>
              You can submit a new overview once your current submission is approved or rejected.
            </Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>Overview Video</Text>
        <Text style={styles.emptyText}>No overview video yet.</Text>
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => router.push('/(candidate)/record?video_type=overview')}
        >
          <Text style={styles.outlineButtonText}>Record Overview Video</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lockReason: 'no-slots' | 'in-flight' | null =
    overviewRemaining === 0 ? 'no-slots' :
    hasInFlightOverview ? 'in-flight' :
    null;

  return (
    <View style={styles.subsection}>
      <View style={styles.subsectionHeader}>
        <Text style={styles.subsectionTitle}>Overview Video</Text>
        <StatusBadge status={video.status} />
      </View>
      {video.status === 'approved' && video.youtube_video_id && video.youtube_url && (
        <YouTubePlayer videoId={video.youtube_video_id} width={videoWidth} height={videoHeight} />
      )}
      {(video.status === 'submitted' || video.status === 'under_review') && !hasInFlightOverview && (
        <View style={styles.reviewState}>
          <Text style={styles.reviewIcon}>⏳</Text>
          <Text style={styles.reviewTitle}>Under review — we'll email you when it's approved.</Text>
        </View>
      )}
      {lockReason === 'no-slots' ? (
        <View style={[styles.lockCtaContainer, { marginTop: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14 }]}>
          <Ionicons name="lock-closed-outline" size={22} color={Colors.textSecondary} style={styles.lockIcon} />
          <Text style={[styles.subsectionTitle, { marginBottom: 4 }]}>Want to update your overview video?</Text>
          <Text style={[styles.lockBody, { marginBottom: 12 }]}>Purchase a new slot to re-record.</Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/(candidate)/billing')}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Update Overview — ${rerecordPrice}</Text>
          </TouchableOpacity>
        </View>
      ) : lockReason === 'in-flight' ? (
        <View style={[styles.lockCtaContainer, { marginTop: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14 }]}>
          <Ionicons name="time-outline" size={22} color={Colors.textSecondary} style={styles.lockIcon} />
          <Text style={[styles.subsectionTitle, { marginBottom: 4 }]}>Overview video under review</Text>
          <Text style={[styles.lockBody, { marginBottom: 0 }]}>
            You can submit a new overview once your current submission is approved or rejected.
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.outlineButton, { marginTop: 8 }]}
          onPress={() => router.push('/(candidate)/record?video_type=overview')}
        >
          <Text style={styles.outlineButtonText}>Record New Overview Video</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function IssueVideosSection({
  videos,
  purchases,
}: {
  videos: Video[];
  purchases: { product_type: string }[];
}) {
  const slots = countSlots(purchases, videos, 'issue');
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const videoWidth = Math.min(windowWidth, 680) - 72;
  const videoHeight = videoWidth * (9 / 16);

  return (
    <View style={styles.subsection}>
      <View style={styles.subsectionHeader}>
        <Text style={styles.subsectionTitle}>Issue Videos</Text>
        {slots.purchased > 0 ? (
          <SlotPill used={slots.used} purchased={slots.purchased} />
        ) : null}
      </View>

      {slots.purchased === 0 && (
        <Text style={styles.emptyText}>
          No slots purchased.{' '}
          <Text
            style={styles.linkText}
            onPress={() => router.push('/(candidate)/billing')}
          >
            Purchase issue video slots from the Billing page.
          </Text>
        </Text>
      )}

      {videos.length > 0 && (
        <View style={styles.videoList}>
          {videos.map((v) => (
            <View key={v.id} style={styles.videoListCard}>
              <TouchableOpacity
                onPress={() => setExpandedVideoId(expandedVideoId === v.id ? null : v.id)}
              >
                <View style={styles.videoListCardHeader}>
                  <Text style={styles.videoListCardTitle}>{v.title ?? 'Untitled'}</Text>
                  <StatusBadge status={v.status} />
                  <Ionicons
                    name={expandedVideoId === v.id ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.textSecondary}
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </TouchableOpacity>
              {expandedVideoId === v.id && v.youtube_video_id && v.youtube_url && (
                <View style={{ marginTop: 12 }}>
                  <YouTubePlayer videoId={v.youtube_video_id} width={videoWidth} height={videoHeight} />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {slots.remaining > 0 && (
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => router.push('/(candidate)/record?video_type=issue')}
        >
          <Text style={styles.outlineButtonText}>Record Issue Video</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EndorsementVideosSection({
  videos,
  purchases,
}: {
  videos: Video[];
  purchases: { product_type: string }[];
}) {
  const slots = countSlots(purchases, videos, 'endorsement');
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const videoWidth = Math.min(windowWidth, 680) - 72;
  const videoHeight = videoWidth * (9 / 16);

  return (
    <View style={styles.subsection}>
      <View style={styles.subsectionHeader}>
        <Text style={styles.subsectionTitle}>Endorsement Videos</Text>
        {slots.purchased > 0 ? (
          <SlotPill used={slots.used} purchased={slots.purchased} />
        ) : null}
      </View>

      {slots.purchased === 0 && (
        <Text style={styles.emptyText}>
          No slots purchased.{' '}
          <Text
            style={styles.linkText}
            onPress={() => router.push('/(candidate)/billing')}
          >
            Purchase endorsement video slots from the Billing page.
          </Text>
        </Text>
      )}

      {videos.length > 0 && (
        <View style={styles.videoList}>
          {videos.map((v) => (
            <View key={v.id} style={styles.videoListCard}>
              <TouchableOpacity
                onPress={() => setExpandedVideoId(expandedVideoId === v.id ? null : v.id)}
              >
                <View style={styles.videoListCardHeader}>
                  <Text style={styles.videoListCardTitle}>{v.title ?? 'Untitled'}</Text>
                  <StatusBadge status={v.status} />
                  <Ionicons
                    name={expandedVideoId === v.id ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.textSecondary}
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </TouchableOpacity>
              {expandedVideoId === v.id && v.youtube_video_id && v.youtube_url && (
                <View style={{ marginTop: 12 }}>
                  <YouTubePlayer videoId={v.youtube_video_id} width={videoWidth} height={videoHeight} />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {slots.remaining > 0 && (
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => router.push('/(candidate)/record?video_type=endorsement')}
        >
          <Text style={styles.outlineButtonText}>Upload Endorsement Video</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ProfileCompletenessCard({ profile, hasVideo }: { profile: Partial<Candidate>; hasVideo: boolean }) {
  const items = [
    { label: 'Bio', done: !!(profile.bio && profile.bio.trim().length > 10) },
    { label: 'Photo', done: !!profile.photo_url },
    { label: 'Office, party & state', done: !!(profile.office_sought && profile.party && profile.state) },
    { label: 'Social links', done: !!(profile.website_url || profile.twitter_handle || profile.facebook_url) },
    { label: 'Video submitted', done: hasVideo },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const total = items.length;
  const allDone = completedCount === total;

  if (allDone) {
    return (
      <View style={styles.card}>
        <View style={styles.allDoneRow}>
          <Text style={styles.allDoneCheck}>✓</Text>
          <Text style={styles.allDoneText}>Profile 100% complete — great work!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Profile Completeness</Text>
        <Text style={styles.completenessCount}>
          {completedCount}/{total}
        </Text>
      </View>

      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${(completedCount / total) * 100}%` as any }]} />
      </View>

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

      <TouchableOpacity
        style={styles.editProfileLink}
        onPress={() => router.push('/(candidate)/profile')}
      >
        <Text style={styles.editProfileLinkText}>Edit Profile →</Text>
      </TouchableOpacity>
    </View>
  );
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

export default function CandidateDashboard() {
  const { session, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [profile, setProfile] = useState<Partial<Candidate> | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [purchases, setPurchases] = useState<{ product_type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [issueQty, setIssueQty] = useState(1);
  const [endorsementQty, setEndorsementQty] = useState(1);

  const loadDashboard = useCallback(async () => {
    if (!session?.user) return;

    const [profileResult, videosResult, purchasesResult] = await Promise.all([
      supabase
        .from('candidates')
        .select('*')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('videos')
        .select('id, video_type, title, status, youtube_url, youtube_video_id, youtube_privacy, submitted_at')
        .eq('candidate_id', session.user.id)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('purchases')
        .select('product_type')
        .eq('candidate_id', session.user.id),
    ]);

    if (profileResult.data) setProfile(profileResult.data);
    setVideos(videosResult.data ?? []);
    setPurchases(purchasesResult.data ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  async function handlePurchase(product_type: string, quantity: number = 1) {
    setPurchasing(true);
    try {
      const successUrl =
        Platform.OS === 'web'
          ? `${typeof window !== 'undefined' ? window.location.origin : 'https://1minutecandidate.com'}/(candidate)/payment-success`
          : ExpoLinking.createURL('/payment-success');

      const cancelUrl =
        Platform.OS === 'web'
          ? `${typeof window !== 'undefined' ? window.location.origin : 'https://1minutecandidate.com'}/(candidate)/billing`
          : ExpoLinking.createURL('/billing');

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          product_type,
          quantity,
          success_url: successUrl,
          cancel_url: cancelUrl,
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
  const profileUnlocked = profile?.profile_unlocked ?? false;
  const raceLevel = (profile?.race_level as RaceLevel) ?? 'local';
  const videoPrice = VIDEO_PRICES[raceLevel];

  const overviewSlots = countOverviewSlots(purchases, videos);
  const hasInFlightOverview = videos.some(
    v => v.video_type === 'overview' && (v.status === 'submitted' || v.status === 'under_review')
  );
  const overviewVideo =
    videos.find(v => v.video_type === 'overview' && ['submitted', 'under_review', 'approved'].includes(v.status)) ??
    videos.find(v => v.video_type === 'overview') ??
    null;
  const issueVideos = videos.filter(v => v.video_type === 'issue');
  const endorsementVideos = videos.filter(v => v.video_type === 'endorsement');

  return (
    <View style={styles.rootContainer}>
      <Header />

      <PageContainer style={{ paddingTop: 8 }}>
        {/* Welcome section with avatar */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeRow}>
            {profile?.photo_url ? (
              <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{getInitials(name)}</Text>
              </View>
            )}
            <View style={styles.welcomeTextBlock}>
              <Text style={styles.welcomeTitle}>Welcome back, {name.split(' ')[0]}!</Text>
              {(office || party) && (
                <Text style={styles.welcomeSubtitle}>
                  {[office, party].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* My Videos card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Videos</Text>

          <OverviewVideoSection
            video={overviewVideo}
            profileUnlocked={profileUnlocked}
            overviewRemaining={overviewSlots.remaining}
            hasInFlightOverview={hasInFlightOverview}
            raceLevel={raceLevel}
          />

          {profileUnlocked && (
            <>
              <View style={styles.subsectionDivider} />
              <IssueVideosSection videos={issueVideos} purchases={purchases} />

              <View style={styles.subsectionDivider} />
              <EndorsementVideosSection videos={endorsementVideos} purchases={purchases} />
            </>
          )}
        </View>

        {/* Add More Videos — purchase slots */}
        {profileUnlocked && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add More Videos</Text>
            <View style={[styles.addVideosRow, isMobile && { flexDirection: 'column' }]}>
              {/* Issue Video card */}
              <View style={[styles.addVideoCard, { flex: isMobile ? undefined : 1 }]}>
                <Ionicons name="mic-outline" size={28} color={Colors.primary} style={styles.addVideoIcon} />
                <Text style={styles.addVideoTitle}>Issue Video</Text>
                <Text style={styles.addVideoDescription}>
                  Record a 60-second video on a policy issue.
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
                  style={[styles.addVideoButton, purchasing && styles.buttonDisabled]}
                  onPress={() => handlePurchase('issue_video', issueQty)}
                  disabled={purchasing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addVideoButtonText}>
                    {purchasing
                      ? 'Loading...'
                      : issueQty === 1
                      ? `Add Issue Video — $${videoPrice}`
                      : `Add ${issueQty} Issue Videos — $${videoPrice * issueQty}`}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Endorsement Video card */}
              <View style={[styles.addVideoCard, { flex: isMobile ? undefined : 1 }]}>
                <Ionicons name="people-outline" size={28} color={Colors.primary} style={styles.addVideoIcon} />
                <Text style={styles.addVideoTitle}>Endorsement Video</Text>
                <Text style={styles.addVideoDescription}>
                  Upload a video endorsement from a supporter.
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
                  style={[styles.addVideoButton, purchasing && styles.buttonDisabled]}
                  onPress={() => handlePurchase('endorsement_video', endorsementQty)}
                  disabled={purchasing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addVideoButtonText}>
                    {purchasing
                      ? 'Loading...'
                      : endorsementQty === 1
                      ? `Add Endorsement Video — $${videoPrice}`
                      : `Add ${endorsementQty} Endorsement Videos — $${videoPrice * endorsementQty}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Profile completeness */}
        {profile && <ProfileCompletenessCard profile={profile} hasVideo={videos.length > 0} />}

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
      </PageContainer>
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

  // Welcome
  welcomeSection: {
    marginBottom: 16,
    marginTop: 8,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0F1F5C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  welcomeTextBlock: {
    flex: 1,
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
    marginBottom: 12,
  },

  // Subsections
  subsection: {
    paddingVertical: 8,
  },
  subsectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  subsectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },

  // Status badge
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Slot pill
  slotPill: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  slotPillText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Video list
  videoList: {
    gap: 8,
    marginBottom: 10,
  },
  videoListCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  videoListCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoListCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },

  // Empty / link text
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  linkText: {
    color: Colors.primary,
    fontWeight: '600',
  },

  // Lock CTA
  lockCtaContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  lockIcon: {
    marginBottom: 8,
  },
  lockBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
    maxWidth: 280,
  },

  // Review state
  reviewState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef9c3',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  reviewIcon: {
    fontSize: 18,
  },
  reviewTitle: {
    fontSize: 13,
    color: '#78350f',
    flex: 1,
    lineHeight: 18,
  },

  ctaButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Thumbnail with play overlay
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchOnYouTube: {
    color: '#0F1F5C',
    fontSize: 13,
    fontFamily: 'Quicksand_600SemiBold',
  },

  // Outline button
  outlineButton: {
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  outlineButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Add More Videos section
  addVideosRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  addVideoCard: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  addVideoIcon: {
    marginBottom: 8,
  },
  addVideoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  addVideoDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 12,
    flex: 1,
  },
  addVideoButton: {
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  addVideoButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Profile completeness — 100% complete state
  allDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  allDoneCheck: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.success,
  },
  allDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },

  // Profile completeness — partial checklist
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
