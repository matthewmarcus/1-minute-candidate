import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Colors } from '@/constants/Colors';
import type { Candidate, Video } from '@/lib/types';

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
        <VideoPlayer youtubeUrl={video.youtube_url} />
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
});
