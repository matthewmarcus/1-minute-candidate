import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Platform, Image, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Header } from '@/components/Header';
import { PageContainer } from '@/components/PageContainer';
import { Colors } from '@/constants/Colors';
import type { Candidate, Video } from '@/lib/types';

const BASE_URL = 'https://1minutecandidate.com';

function getProfileUrl(candidate: Candidate): string {
  if (!candidate.slug) return `${BASE_URL}/candidate/${candidate.id}`;
  const state = (candidate.state ?? '').toLowerCase();
  const city = (candidate.city ?? '').toLowerCase().replace(/\s+/g, '-');
  if (city && state) return `${BASE_URL}/elections/${state}/${city}/${candidate.slug}`;
  if (state) return `${BASE_URL}/elections/${state}/${candidate.slug}`;
  return `${BASE_URL}/elections/${candidate.slug}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

function ProfilePhoto({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  const [imgError, setImgError] = useState(false);

  if (photoUrl && !imgError) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={styles.photo}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <View style={[styles.photo, styles.photoPlaceholder]}>
      <Text style={styles.photoInitials}>{getInitials(name)}</Text>
    </View>
  );
}

function UnlistedVideoThumbnail({ videoId, youtubeUrl }: { videoId: string; youtubeUrl: string }) {
  const { width } = useWindowDimensions();
  const thumbWidth = Math.min(width, 680) - 40;
  const thumbHeight = thumbWidth * (9 / 16);

  if (Platform.OS === 'web') {
    return (
      // @ts-ignore — anchor is a valid web element
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'block', position: 'relative', width: thumbWidth, height: thumbHeight, backgroundColor: '#000', textDecoration: 'none' }}
      >
        {/* @ts-ignore */}
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt="Video thumbnail"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* @ts-ignore */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* @ts-ignore */}
          <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* @ts-ignore */}
            <div style={{ width: 0, height: 0, borderTop: '14px solid transparent', borderBottom: '14px solid transparent', borderLeft: '24px solid white', marginLeft: 6 }} />
          </div>
        </div>
      </a>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => Linking.openURL(youtubeUrl)}
      style={[styles.thumbnailContainer, { width: thumbWidth, height: thumbHeight }]}
    >
      <Image
        source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
        style={[styles.thumbnailImage, { width: thumbWidth, height: thumbHeight }]}
        resizeMode="cover"
      />
      <View style={styles.playOverlay}>
        <View style={styles.playButton}>
          <View style={styles.playTriangle} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function VideoEmbed({ video }: { video: Video }) {
  if (!video.youtube_url || !video.youtube_video_id) return null;
  if (video.youtube_privacy === 'public') {
    return <VideoPlayer youtubeUrl={video.youtube_url} />;
  }
  return <UnlistedVideoThumbnail videoId={video.youtube_video_id} youtubeUrl={video.youtube_url} />;
}

function XLogoIcon({ size = 22, color = Colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </Svg>
  );
}

type SocialLink =
  | { key: 'website' | 'facebook'; url: string; icon: React.ComponentProps<typeof Ionicons>['name']; label: string; isX?: false }
  | { key: 'twitter'; url: string; icon: null; label: string; isX: true };

function SocialLinks({ candidate }: { candidate: Candidate }) {
  const links: SocialLink[] = [];

  if (candidate.website_url) {
    links.push({ key: 'website', url: candidate.website_url, icon: 'globe-outline', label: 'Website' });
  }
  if (candidate.twitter_handle) {
    const handle = candidate.twitter_handle.replace(/^@/, '');
    links.push({ key: 'twitter', url: `https://x.com/${handle}`, icon: null, label: 'X', isX: true });
  }
  if (candidate.facebook_url) {
    links.push({ key: 'facebook', url: candidate.facebook_url, icon: 'logo-facebook', label: 'Facebook' });
  }

  if (links.length === 0) return null;

  return (
    <View style={styles.socialRow}>
      {links.map((link) => (
        <TouchableOpacity
          key={link.key}
          style={styles.socialButton}
          onPress={() => Linking.openURL(link.url)}
          accessibilityLabel={link.label}
          accessibilityRole="link"
        >
          {link.isX
            ? <XLogoIcon size={22} color={Colors.primary} />
            : <Ionicons name={link.icon!} size={22} color={Colors.primary} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ShareButtons({ candidate }: { candidate: Candidate }) {
  const profileUrl = getProfileUrl(candidate);
  const shareText = `Watch ${candidate.name}'s 60-second candidate video on 1 Minute Candidate`;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(profileUrl);
  };

  const handleSMS = () => {
    const body = encodeURIComponent(`${shareText}: ${profileUrl}`);
    const url = Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`;
    Linking.openURL(url);
  };

  const handleTwitter = () => {
    const text = encodeURIComponent(`${shareText}`);
    const url = encodeURIComponent(profileUrl);
    Linking.openURL(`https://x.com/intent/tweet?text=${text}&url=${url}`);
  };

  const handleFacebook = () => {
    const url = encodeURIComponent(profileUrl);
    Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
  };

  type ShareBtn =
    | { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void; isX?: false }
    | { label: string; icon: null; onPress: () => void; isX: true };

  const buttons: ShareBtn[] = [
    { label: 'Copy Link', icon: 'link-outline', onPress: handleCopyLink },
    { label: 'SMS', icon: 'chatbubble-outline', onPress: handleSMS },
    { label: 'X', icon: null, onPress: handleTwitter, isX: true },
    { label: 'Facebook', icon: 'logo-facebook', onPress: handleFacebook },
  ];

  return (
    <View style={styles.shareSection}>
      <Text style={styles.sectionTitle}>Share</Text>
      <View style={styles.shareRow}>
        {buttons.map((btn) => (
          <TouchableOpacity
            key={btn.label}
            style={styles.shareButton}
            onPress={btn.onPress}
            accessibilityLabel={btn.label}
          >
            {btn.isX
              ? <XLogoIcon size={20} color={Colors.primary} />
              : <Ionicons name={btn.icon!} size={20} color={Colors.primary} />}
            <Text style={styles.shareButtonLabel}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function CandidateProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      supabase.from('candidates').select('*').eq('id', id).single(),
      supabase
        .from('videos')
        .select('id, video_type, title, status, youtube_url, youtube_video_id, youtube_privacy')
        .eq('candidate_id', id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false }),
    ]).then(([candidateResult, videosResult]) => {
      if (!candidateResult.error) setCandidate(candidateResult.data);
      if (!videosResult.error) setVideos(videosResult.data ?? []);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!candidate) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Candidate not found.</Text>
      </View>
    );
  }

  const overviewVideo = videos.find(v => v.video_type === 'overview') ?? null;
  const issueVideos = videos.filter(v => v.video_type === 'issue');
  const endorsementVideos = videos.filter(v => v.video_type === 'endorsement');

  return (
    <View style={styles.outerContainer}>
      <Header />
      <PageContainer style={{ paddingHorizontal: 0 }}>
        {/* Overview video — centered within content column */}
        {overviewVideo?.youtube_url && (
          <View style={styles.overviewVideoContainer}>
            {overviewVideo.youtube_privacy === 'public'
              ? <VideoPlayer youtubeUrl={overviewVideo.youtube_url} />
              : <UnlistedVideoThumbnail videoId={overviewVideo.youtube_video_id!} youtubeUrl={overviewVideo.youtube_url} />
            }
          </View>
        )}

        <View style={styles.info}>
          {/* Photo + name header */}
          <View style={styles.header}>
            <ProfilePhoto photoUrl={candidate.photo_url} name={candidate.name} />
            <View style={styles.headerText}>
              <Text style={styles.name}>{candidate.name}</Text>
              <Text style={styles.office}>{candidate.office_sought}</Text>
              <View style={styles.badges}>
                {candidate.party && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{candidate.party}</Text>
                  </View>
                )}
                {candidate.state && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{candidate.state}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {(candidate.city || candidate.district) && (
            <Text style={styles.district}>
              {[candidate.city || null, candidate.district || null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}

          <SocialLinks candidate={candidate} />

          {candidate.bio && (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{candidate.bio}</Text>
            </>
          )}

          {videos.length === 0 && (
            <View style={styles.noVideo}>
              <Text style={styles.noVideoText}>
                This candidate hasn't submitted their 60-second video yet.
              </Text>
            </View>
          )}
        </View>

        {/* On the Issues section */}
        {issueVideos.length > 0 && (
          <View style={styles.videoSection}>
            <Text style={styles.videoSectionTitle}>On the Issues</Text>
            {issueVideos.map((v, index) => (
              <View key={v.id} style={styles.videoCard}>
                {v.title ? (
                  <Text style={styles.videoCardTitle}>{v.title}</Text>
                ) : null}
                <VideoEmbed video={v} />
                {index < issueVideos.length - 1 && <View style={styles.videoDivider} />}
              </View>
            ))}
          </View>
        )}

        {/* Endorsements section */}
        {endorsementVideos.length > 0 && (
          <View style={styles.videoSection}>
            <Text style={styles.videoSectionTitle}>Endorsements</Text>
            {endorsementVideos.map((v, index) => (
              <View key={v.id} style={styles.videoCard}>
                {v.title ? (
                  <Text style={styles.videoCardTitle}>{v.title}</Text>
                ) : null}
                <VideoEmbed video={v} />
                {index < endorsementVideos.length - 1 && <View style={styles.videoDivider} />}
              </View>
            ))}
          </View>
        )}

        <ShareButtons candidate={candidate} />
      </PageContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  info: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 8,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  photoPlaceholder: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitials: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
    paddingTop: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  office: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  district: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    marginTop: 4,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  bio: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  noVideo: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  noVideoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Issue / Endorsement video sections
  videoSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  videoSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'Quicksand_700Bold',
    marginBottom: 14,
  },
  videoCard: {
    marginBottom: 4,
  },
  videoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  videoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },

  shareSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareButtonLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  overviewVideoContainer: {
    alignSelf: 'center',
  },
  thumbnailContainer: {
    backgroundColor: '#000',
  },
  thumbnailImage: {},
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 24,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
    marginLeft: 6,
  },
});
