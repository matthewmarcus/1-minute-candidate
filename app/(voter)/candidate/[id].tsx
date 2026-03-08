import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Platform, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Colors } from '@/constants/Colors';
import type { Candidate, Video } from '@/lib/types';

const { width } = require('react-native').Dimensions.get('window');
const THUMBNAIL_HEIGHT = (width * 9) / 16;

function UnlistedVideoThumbnail({ videoId, youtubeUrl }: { videoId: string; youtubeUrl: string }) {
  if (Platform.OS === 'web') {
    return (
      // @ts-ignore — anchor is a valid web element
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'block', position: 'relative', width: '100%', height: THUMBNAIL_HEIGHT, backgroundColor: '#000', textDecoration: 'none' }}
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
      style={styles.thumbnailContainer}
    >
      <Image
        source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
        style={styles.thumbnailImage}
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

export default function CandidateProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      supabase.from('candidates').select('*').eq('id', id).single(),
      supabase
        .from('videos')
        .select('*')
        .eq('candidate_id', id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([candidateResult, videoResult]) => {
      if (!candidateResult.error) setCandidate(candidateResult.data);
      if (!videoResult.error) setVideo(videoResult.data);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {video?.youtube_url && (
        video.youtube_privacy === 'public'
          ? <VideoPlayer youtubeUrl={video.youtube_url} />
          : <UnlistedVideoThumbnail videoId={video.youtube_video_id!} youtubeUrl={video.youtube_url} />
      )}

      <View style={styles.info}>
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

        {candidate.district && (
          <Text style={styles.district}>{candidate.district}</Text>
        )}

        {candidate.bio && (
          <>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>{candidate.bio}</Text>
          </>
        )}

        {!video && (
          <View style={styles.noVideo}>
            <Text style={styles.noVideoText}>
              This candidate hasn't submitted their 60-second video yet.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
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
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  office: {
    fontSize: 17,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  district: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
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
  thumbnailContainer: {
    width: '100%',
    height: THUMBNAIL_HEIGHT,
    backgroundColor: '#000',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
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
