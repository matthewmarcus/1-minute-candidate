import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { Header } from '@/components/Header';
import { PageContainer } from '@/components/PageContainer';
import { Colors } from '@/constants/Colors';
import type { Video } from '@/lib/types';

type VideoWithCandidate = Video & {
  candidates: { id: string; name: string; office_sought: string; email: string; bio: string | null; city: string | null; state: string | null; party: string | null } | null;
};

function StorageVideoPlayer({ url }: { url: string }) {
  const { width } = useWindowDimensions();
  const videoWidth = Math.min(width, 680) - 40;
  const videoHeight = videoWidth * (9 / 16);

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: videoWidth, height: videoHeight, backgroundColor: '#000', alignSelf: 'center' }}>
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
    <View style={{ width: videoWidth, height: videoHeight, backgroundColor: '#000', alignSelf: 'center' }}>
      <WebView
        source={{ html }}
        style={{ width: videoWidth, height: videoHeight }}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
      />
    </View>
  );
}


export default function ReviewVideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const videoWidth = Math.min(width, 680) - 40;
  const videoHeight = videoWidth * (9 / 16);
  const [video, setVideo] = useState<VideoWithCandidate | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [storageVideoUrl, setStorageVideoUrl] = useState<string | null>(null);
  const [showRejectNotes, setShowRejectNotes] = useState(false);
  const [rejectNotesError, setRejectNotesError] = useState<string | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchVideo = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabaseAdmin
      .from('videos')
      .select('*, candidates(id, name, office_sought, email, bio, city, state, party, slug)')
      .eq('id', id)
      .single();
    if (!error && data) {
      setVideo(data as VideoWithCandidate);
      setReviewNotes((prev) => prev || (data.review_notes ?? ''));

      if (data.storage_path) {
        const { data: signedData } = await supabaseAdmin.storage
          .from('candidate-videos')
          .createSignedUrl(data.storage_path, 3600);
        if (signedData?.signedUrl) {
          setStorageVideoUrl(signedData.signedUrl);
        }
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  // Poll every 10 seconds while the video is approved but youtube_url is still pending
  useEffect(() => {
    if (!video || video.status !== 'approved' || video.youtube_url) return;
    const interval = setInterval(() => {
      fetchVideo();
    }, 10000);
    return () => clearInterval(interval);
  }, [video, fetchVideo]);

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

    Alert.alert(
      'Reject Video?',
      'This will reject the video and notify the candidate with your review notes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => { updateStatus('rejected'); } },
      ]
    );
  }

  async function updateStatus(status: 'approved' | 'rejected') {
    if (!video) return;

    setSubmitting(true);

    try {
      const updates: Record<string, unknown> = {
        status,
        review_notes: reviewNotes.trim() || null,
      };

      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();

        // Trigger the async watermark → YouTube upload pipeline on the VPS.
        // The Edge Function fetches all required data server-side from video_id.
        const { error: fnError } = await supabase.functions.invoke('trigger-watermark', {
          body: { video_id: video.id },
        });

        if (fnError) {
          throw new Error(fnError.message ?? 'Failed to trigger watermark pipeline.');
        }
      }

      // Persist the status update.
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

      // Best-effort: notify the candidate by email. Errors are logged but do
      // not block the approve/reject action from completing.
      const notifyBody =
        status === 'approved'
          ? {
              candidate_email: video.candidates?.email,
              candidate_name: video.candidates?.name,
              status: 'approved' as const,
              video_type: video.video_type,
              video_title: video.title,
              profile_url: `https://1minutecandidate.com/(voter)/candidate/${video.candidates?.id}`,
            }
          : {
              candidate_email: video.candidates?.email,
              candidate_name: video.candidates?.name,
              status: 'rejected' as const,
              review_notes: reviewNotes.trim() || null,
              video_type: video.video_type,
              video_title: video.title,
              profile_url: `https://1minutecandidate.com/(voter)/candidate/${video.candidates?.id}`,
            };
      const { error: notifyError } = await supabaseAdmin.functions.invoke('notify-candidate', {
        body: notifyBody,
      });
      if (notifyError) {
        console.error('[notify-candidate] Failed to send notification:', notifyError.message);
      }

      const message =
        status === 'approved'
          ? 'Video approved. Watermarking and YouTube upload are processing in the background — this may take a few minutes.'
          : 'Video rejected — candidate has been notified.';
      setSuccessMessage(message);
      navTimerRef.current = setTimeout(() => {
        router.replace({ pathname: '/admin' });
      }, 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
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
    <View style={styles.outerContainer}>
      <Header />
      <PageContainer style={{ paddingHorizontal: 0 }}>
        {storageVideoUrl ? (
          <StorageVideoPlayer url={storageVideoUrl} />
        ) : video.youtube_url && video.youtube_video_id ? (
          <YouTubePlayer videoId={video.youtube_video_id} width={videoWidth} height={videoHeight} />
        ) : null}

        <View style={styles.info}>
        <Text style={styles.candidateName}>{video.candidates?.name}</Text>
        <Text style={styles.officeText}>{video.candidates?.office_sought}</Text>
        <Text style={styles.emailText}>{video.candidates?.email}</Text>
        <Text style={styles.submittedText}>
          Submitted: {video.submitted_at ? new Date(video.submitted_at).toLocaleString() : 'N/A'}
        </Text>
        {video.status === 'approved' && !video.youtube_url && (
          <View style={styles.processingBadge}>
            <ActivityIndicator size="small" color={Colors.warning} style={{ marginRight: 6 }} />
            <Text style={styles.processingBadgeText}>Processing… YouTube upload in progress</Text>
          </View>
        )}
        {video.status === 'approved' && video.youtube_url && (
          <Text style={styles.youtubeLinkText}>
            YouTube: {video.youtube_url}
          </Text>
        )}
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

      {successMessage ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{successMessage}</Text>
          <Text style={styles.successBannerHint}>Returning to review queue…</Text>
        </View>
      ) : submitting ? (
        <View style={styles.actionStatus}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.actions}>
          {showRejectNotes ? (
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowRejectNotes(false);
                  setRejectNotesError(null);
                  setReviewNotes('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButtonFilled}
                onPress={handleRejectPress}
              >
                <Text style={styles.rejectButtonFilledText}>Confirm Rejection</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={handleRejectPress}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => {
                  Alert.alert(
                    'Approve Video?',
                    'This will approve the video and notify the candidate. This cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Approve', onPress: () => { updateStatus('approved'); } },
                    ]
                  );
                }}
              >
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
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
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: Colors.warning + '20',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  processingBadgeText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
  },
  youtubeLinkText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 8,
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
  actionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
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
