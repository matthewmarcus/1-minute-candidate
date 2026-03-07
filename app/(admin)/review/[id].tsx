import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Colors } from '@/constants/Colors';
import type { Video } from '@/lib/types';

type VideoWithCandidate = Video & {
  candidates: { name: string; office_sought: string; email: string } | null;
};

const { width } = require('react-native').Dimensions.get('window');
const PLAYER_HEIGHT = (width * 9) / 16;

function StorageVideoPlayer({ url }: { url: string }) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ width: '100%', height: PLAYER_HEIGHT, backgroundColor: '#000' }}>
        {/* @ts-ignore — video is a valid web element */}
        <video
          src={url}
          controls
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    );
  }

  // Native — use WebView to render a simple HTML5 video player
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WebView } = require('react-native-webview');
  const html = `<html><body style="margin:0;background:#000"><video src="${url}" controls style="width:100%;height:100vh" playsinline></video></body></html>`;
  return (
    <View style={{ width: '100%', height: PLAYER_HEIGHT, backgroundColor: '#000' }}>
      <WebView
        source={{ html }}
        style={{ flex: 1 }}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
      />
    </View>
  );
}

async function cleanupStorage(storagePath: string, videoId: string): Promise<void> {
  const { error: storageError } = await supabaseAdmin.storage
    .from('candidate-videos')
    .remove([storagePath]);

  if (storageError) {
    console.error('[Storage] Failed to delete video file:', storageError.message);
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from('videos')
    .update({ storage_path: null })
    .eq('id', videoId);

  if (updateError) {
    console.error('[Storage] Failed to clear storage_path on video record:', updateError.message);
  }
}

export default function ReviewVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [video, setVideo] = useState<VideoWithCandidate | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [storageVideoUrl, setStorageVideoUrl] = useState<string | null>(null);
  const [showRejectNotes, setShowRejectNotes] = useState(false);
  const [rejectNotesError, setRejectNotesError] = useState<string | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;

    supabaseAdmin
      .from('videos')
      .select('*, candidates(name, office_sought, email)')
      .eq('id', id)
      .single()
      .then(async ({ data, error }) => {
        if (!error && data) {
          setVideo(data as VideoWithCandidate);
          setReviewNotes(data.review_notes ?? '');

          // Generate a signed URL for the storage video if available
          if (data.storage_path) {
            const { data: signedData } = await supabaseAdmin.storage
              .from('candidate-videos')
              .createSignedUrl(data.storage_path, 3600); // 1 hour expiry
            if (signedData?.signedUrl) {
              setStorageVideoUrl(signedData.signedUrl);
            }
          }
        }
        setLoading(false);
      });
  }, [id]);

  function handleRejectPress() {
    if (!showRejectNotes) {
      setShowRejectNotes(true);
      setRejectNotesError(null);
      return;
    }

    if (!reviewNotes.trim()) {
      setRejectNotesError('Please provide a reason for rejecting this video.');
      return;
    }

    updateStatus('rejected');
  }

  async function updateStatus(status: 'approved' | 'rejected') {
    if (!video) return;

    setSubmitting(true);
    setUploadStep(null);

    try {
      const updates: Record<string, unknown> = {
        status,
        review_notes: reviewNotes.trim() || null,
      };

      if (status === 'approved') {
        if (!video.storage_path) {
          throw new Error('This video has no storage path — cannot upload to YouTube.');
        }

        // Upload via server-side Edge Function so OAuth credentials stay secret.
        setUploadStep('Uploading to YouTube…');
        const { data: fnData, error: fnError } = await supabaseAdmin.functions.invoke(
          'upload-to-youtube',
          {
            body: {
              storage_path: video.storage_path,
              candidate_name: video.candidates?.name ?? 'Candidate',
              office_sought: video.candidates?.office_sought ?? '',
            },
          },
        );

        if (fnError) {
          throw new Error(fnError.message ?? 'Edge Function error during YouTube upload.');
        }

        if (!fnData?.youtube_video_id) {
          throw new Error(fnData?.error ?? 'YouTube upload failed — no video ID returned.');
        }

        updates.youtube_video_id = fnData.youtube_video_id;
        updates.youtube_url = fnData.youtube_url;
        updates.approved_at = new Date().toISOString();
      }

      // Step 3: persist video status update.
      setUploadStep('Saving…');
      const { error } = await supabaseAdmin
        .from('videos')
        .update(updates)
        .eq('id', video.id);

      if (error) throw new Error(error.message);

      if (status === 'approved') {
        const { error: candidateError } = await supabaseAdmin
          .from('candidates')
          .update({ profile_approved: true })
          .eq('id', video.candidate_id);

        if (candidateError) throw new Error(candidateError.message);
      }

      // Best-effort: delete the raw file from storage now that it's on YouTube.
      if (video.storage_path) {
        setUploadStep('Cleaning up…');
        await cleanupStorage(video.storage_path, video.id);
      }

      const message =
        status === 'approved'
          ? 'Video approved and uploaded to YouTube — candidate profile is now live.'
          : 'Video rejected — candidate has been notified.';
      setSuccessMessage(message);
      navTimerRef.current = setTimeout(() => {
        router.replace({ pathname: '/(admin)' });
      }, 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
      setUploadStep(null);
    }
  }

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

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
      {storageVideoUrl ? (
        <StorageVideoPlayer url={storageVideoUrl} />
      ) : video.youtube_url ? (
        <VideoPlayer youtubeUrl={video.youtube_url} />
      ) : null}

      <View style={styles.info}>
        <Text style={styles.candidateName}>{video.candidates?.name}</Text>
        <Text style={styles.officeText}>{video.candidates?.office_sought}</Text>
        <Text style={styles.emailText}>{video.candidates?.email}</Text>
        <Text style={styles.submittedText}>
          Submitted: {video.submitted_at ? new Date(video.submitted_at).toLocaleString() : 'N/A'}
        </Text>
      </View>

      {showRejectNotes && (
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>
            Reason for Rejection <Text style={styles.reviewLabelRequired}>*</Text>
          </Text>
          <TextInput
            style={[styles.reviewInput, rejectNotesError ? styles.reviewInputError : null]}
            value={reviewNotes}
            onChangeText={(text) => {
              setReviewNotes(text);
              if (text.trim()) setRejectNotesError(null);
            }}
            placeholder="Explain why this video is being rejected..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={4}
            autoFocus
          />
          {rejectNotesError && (
            <Text style={styles.errorInline}>{rejectNotesError}</Text>
          )}
        </View>
      )}

      {successMessage && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{successMessage}</Text>
          <Text style={styles.successBannerHint}>Returning to review queue…</Text>
        </View>
      )}

      <View style={styles.actions}>
        {showRejectNotes ? (
          <>
            <TouchableOpacity
              style={[styles.cancelButton, submitting && styles.buttonDisabled]}
              onPress={() => {
                setShowRejectNotes(false);
                setRejectNotesError(null);
                setReviewNotes('');
              }}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectButtonFilled, submitting && styles.buttonDisabled]}
              onPress={handleRejectPress}
              disabled={submitting}
            >
              {submitting ? (
                <View style={styles.approveButtonInner}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.rejectButtonFilledText}>Rejecting…</Text>
                </View>
              ) : (
                <Text style={styles.rejectButtonFilledText}>Confirm Rejection</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.rejectButton, submitting && styles.buttonDisabled]}
              onPress={handleRejectPress}
              disabled={submitting}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.approveButton, submitting && styles.buttonDisabled]}
              onPress={() => updateStatus('approved')}
              disabled={submitting}
            >
              {submitting ? (
                <View style={styles.approveButtonInner}>
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.approveButtonText}>{uploadStep ?? 'Approving…'}</Text>
                </View>
              ) : (
                <Text style={styles.approveButtonText}>Approve</Text>
              )}
            </TouchableOpacity>
          </>
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
  reviewLabelRequired: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
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
  reviewInputError: {
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  errorInline: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.error,
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
  approveButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButtonFilled: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rejectButtonFilledText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successBanner: {
    margin: 24,
    marginBottom: 0,
    backgroundColor: Colors.success + '20',
    borderWidth: 1.5,
    borderColor: Colors.success,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  successBannerText: {
    color: Colors.success,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  successBannerHint: {
    color: Colors.success,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
});
