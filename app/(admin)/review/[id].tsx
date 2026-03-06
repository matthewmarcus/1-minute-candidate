import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Colors } from '@/constants/Colors';
import type { Video } from '@/lib/types';

type VideoWithCandidate = Video & {
  candidates: { name: string; office_sought: string; email: string } | null;
};

export default function ReviewVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [video, setVideo] = useState<VideoWithCandidate | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    supabase
      .from('videos')
      .select('*, candidates(name, office_sought, email)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setVideo(data as VideoWithCandidate);
          setReviewNotes(data.review_notes ?? '');
        }
        setLoading(false);
      });
  }, [id]);

  async function updateStatus(status: 'approved' | 'rejected') {
    if (!video) return;

    if (status === 'rejected' && !reviewNotes.trim()) {
      Alert.alert('Notes Required', 'Please provide a reason for rejecting this video.');
      return;
    }

    setSubmitting(true);

    const updates: Record<string, unknown> = {
      status,
      review_notes: reviewNotes || null,
    };

    if (status === 'approved') {
      updates.approved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', video.id);

    if (status === 'approved') {
      await supabase
        .from('candidates')
        .update({ profile_approved: true })
        .eq('id', video.candidate_id);
    }

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        status === 'approved' ? 'Video Approved' : 'Video Rejected',
        status === 'approved'
          ? 'The candidate profile is now live.'
          : 'The candidate has been notified.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!video) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Video not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {video.youtube_url && (
        <VideoPlayer youtubeUrl={video.youtube_url} />
      )}

      <View style={styles.info}>
        <Text style={styles.candidateName}>{video.candidates?.name}</Text>
        <Text style={styles.officeText}>{video.candidates?.office_sought}</Text>
        <Text style={styles.emailText}>{video.candidates?.email}</Text>
        <Text style={styles.submittedText}>
          Submitted: {video.submitted_at ? new Date(video.submitted_at).toLocaleString() : 'N/A'}
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Review Notes <Text style={styles.reviewLabelHint}>(required if rejecting)</Text></Text>
        <TextInput
          style={styles.reviewInput}
          value={reviewNotes}
          onChangeText={setReviewNotes}
          placeholder="Add notes for the candidate..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.rejectButton, submitting && styles.buttonDisabled]}
          onPress={() => updateStatus('rejected')}
          disabled={submitting}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.approveButton, submitting && styles.buttonDisabled]}
          onPress={() => updateStatus('approved')}
          disabled={submitting}
        >
          <Text style={styles.approveButtonText}>Approve</Text>
        </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  candidateName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  officeText: {
    fontSize: 15,
    color: Colors.primary,
    marginBottom: 4,
  },
  emailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  submittedText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reviewSection: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  reviewLabelHint: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  reviewInput: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    height: 100,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: Colors.error + '15',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  rejectButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
