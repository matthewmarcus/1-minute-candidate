import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';
import { useUnlockScreenOrientation, useIsLandscape } from '@/hooks/useScreenOrientation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';
import { MAX_RECORDING_SECONDS } from '@/constants/Config';

type RecordingState = 'tips' | 'idle' | 'recording' | 'preview';

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const TIPS = [
  '📱 Rotate your phone to landscape before recording',
  '👁️ Look directly at the camera',
  "🎙️ State your name and the office you're running for",
  '💬 Deliver your message clearly and confidently',
  '💡 Find good lighting — face a window if possible',
  '🔇 Find a quiet space to minimize background noise',
  '⏱️ You have 60 seconds — use them wisely!',
];

export default function RecordScreen() {
  const { session } = useAuth();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>('front');
  const [recordingState, setRecordingState] = useState<RecordingState>('tips');
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoDurationSecs, setVideoDurationSecs] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Unlock orientation on mount (mobile only), re-lock to portrait on unmount.
  useUnlockScreenOrientation();
  const isLandscape = useIsLandscape();

  // Web does not support native camera or file system modules — show a fallback.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.centered}>
        <Text style={styles.webUnsupportedTitle}>Mobile Only</Text>
        <Text style={styles.webUnsupportedText}>
          Video recording is only available on the mobile app. Download the app to record and submit your candidate video.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/(candidate)')}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCancel = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (recordingState === 'recording') {
      cameraRef.current?.stopRecording();
    }
    router.replace('/(candidate)');
  }, [recordingState]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current) return;

    setRecordingState('recording');
    setSecondsLeft(MAX_RECORDING_SECONDS);

    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const video = await cameraRef.current.recordAsync({
      maxDuration: MAX_RECORDING_SECONDS,
    });

    if (video?.uri) {
      setVideoUri(video.uri);
      setRecordingState('preview');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    cameraRef.current?.stopRecording();
    setRecordingState('preview');
  }, []);

  const retake = useCallback(() => {
    setVideoUri(null);
    setVideoDurationSecs(null);
    setRecordingState('idle');
    setSecondsLeft(MAX_RECORDING_SECONDS);
  }, []);

  const confirmRetake = useCallback(() => {
    Alert.alert(
      'Record Again?',
      'Are you sure? Your current recording will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Record Again', style: 'destructive', onPress: retake },
      ]
    );
  }, [retake]);

  const submitVideo = useCallback(async () => {
    if (!videoUri || !session?.user) return;

    setSubmitting(true);

    // Upload video file to Supabase Storage
    const candidateId = session.user.id;
    const filename = `${Date.now()}.mov`;
    const storagePath = `${candidateId}/${filename}`;

    console.log('[VideoUpload] File URI:', videoUri);

    // Use legacy expo-file-system API (works in Expo Go managed workflow).
    // expo-file-system/next is not available in Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system');
    const base64 = await FileSystem.readAsStringAsync(videoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    console.log('[VideoUpload] File size before upload:', bytes.byteLength);

    const uploadResponse = await supabase.storage
      .from('candidate-videos')
      .upload(storagePath, bytes, { contentType: 'video/quicktime', upsert: false });

    console.log('[VideoUpload] Supabase upload response:', JSON.stringify(uploadResponse));

    if (uploadResponse.error) {
      setSubmitting(false);
      Alert.alert('Upload Failed', uploadResponse.error.message);
      return;
    }

    const { error } = await supabase.from('videos').insert({
      candidate_id: candidateId,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      storage_path: storagePath,
    });

    setSubmitting(false);

    if (error) {
      Alert.alert('Submission Failed', error.message);
      return;
    }

    Alert.alert(
      'Video Submitted',
      'Your video has been submitted for review. You will be notified once it is approved.',
      [{ text: 'OK', onPress: () => router.replace('/(candidate)') }]
    );
  }, [videoUri, session]);

  const confirmSubmit = useCallback(() => {
    Alert.alert(
      'Submit Video?',
      'Are you sure you want to submit this video for review?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Submit', onPress: submitVideo },
      ]
    );
  }, [submitVideo]);

  // --- Tips screen (shown before camera opens) ---
  if (recordingState === 'tips') {
    return (
      <View style={styles.tipsScreen}>
        <ScrollView contentContainerStyle={styles.tipsScrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.tipsScreenTitle}>Before You Record</Text>

          {/* Landscape orientation graphic */}
          <View style={styles.landscapeGraphicContainer}>
            <View style={styles.landscapePhoneOuter}>
              <View style={styles.landscapePhoneInner}>
                <Text style={styles.landscapePhoneCameraIcon}>📹</Text>
              </View>
              {/* Home indicator pill */}
              <View style={styles.landscapeHomeIndicator} />
            </View>
            <Text style={styles.landscapeLabel}>Rotate to landscape mode</Text>
          </View>

          <View style={styles.tipsListContainer}>
            {TIPS.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Text style={styles.tipRowText}>{tip}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.readyButton} onPress={() => setRecordingState('idle')}>
            <Text style={styles.readyButtonText}>I'm Ready to Record</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButtonOutline} onPress={() => router.replace('/(candidate)')}>
            <Text style={styles.cancelButtonOutlineText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // --- Permission checks ---
  if (!cameraPermission || !microphonePermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Checking permissions...</Text>
      </View>
    );
  }

  if (!cameraPermission.granted || !microphonePermission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Camera and microphone access is required to record your video.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            await requestCameraPermission();
            await requestMicrophonePermission();
          }}
        >
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary, { marginTop: 12 }]} onPress={() => router.replace('/(candidate)')}>
          <Text style={styles.buttonTextSecondary}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Camera & preview ---
  return (
    <View style={styles.container}>
      {recordingState !== 'preview' ? (
        <>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            mode="video"
          />

          <View style={styles.overlay}>
            {/* Timer — top center (portrait) or top left (landscape) */}
            <View style={[styles.timerContainer, isLandscape ? styles.timerLandscape : styles.timerPortrait]}>
              <Text style={[styles.timer, recordingState === 'recording' && secondsLeft <= 10 && styles.timerWarning]}>
                {secondsLeft}s
              </Text>
            </View>

            {/* Flip button — bottom-left (idle only) */}
            {recordingState === 'idle' && (
              <TouchableOpacity
                style={styles.flipButton}
                onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
              >
                <Text style={styles.flipButtonText}>Flip</Text>
              </TouchableOpacity>
            )}

            {/* Record button — bottom center (portrait) or middle right (landscape) */}
            {recordingState === 'idle' && (
              <TouchableOpacity
                style={[styles.recordButton, isLandscape ? styles.actionButtonLandscape : styles.actionButtonPortrait]}
                onPress={startRecording}
              >
                <View style={styles.recordButtonInner} />
              </TouchableOpacity>
            )}

            {/* Stop button — bottom center (portrait) or middle right (landscape) */}
            {recordingState === 'recording' && (
              <TouchableOpacity
                style={[styles.stopButton, isLandscape ? styles.actionButtonLandscape : styles.actionButtonPortrait]}
                onPress={stopRecording}
              >
                <View style={styles.stopButtonInner} />
              </TouchableOpacity>
            )}

            {/* Cancel button — always bottom right */}
            <TouchableOpacity style={styles.cancelOverlayButton} onPress={handleCancel}>
              <Text style={styles.cancelOverlayText}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.playbackContainer}>
          <View style={styles.playbackVideoWrapper}>
            <Video
              source={{ uri: videoUri! }}
              style={styles.playbackVideo}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay
              isLooping
              onPlaybackStatusUpdate={(status) => {
                if (
                  status.isLoaded &&
                  status.durationMillis != null &&
                  videoDurationSecs === null
                ) {
                  setVideoDurationSecs(Math.round(status.durationMillis / 1000));
                }
              }}
            />
          </View>

          <View style={styles.playbackFooter}>
            <Text style={styles.playbackTitle}>Review Your Recording</Text>
            {videoDurationSecs !== null ? (
              <Text style={styles.playbackDuration}>Your video is {formatDuration(videoDurationSecs)}</Text>
            ) : (
              <Text style={styles.playbackSubtitle}>Watch your video, then choose how to proceed.</Text>
            )}

            <View style={styles.playbackActions}>
              <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={confirmSubmit}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>{submitting ? 'Submitting...' : 'Submit for Review'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={confirmRetake} disabled={submitting}>
                <Text style={styles.buttonTextSecondary}>Record Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={handleCancel} disabled={submitting}>
                <Text style={styles.buttonCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Tips screen ---
  tipsScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tipsScrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  tipsScreenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 28,
  },
  landscapeGraphicContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  landscapePhoneOuter: {
    width: 140,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.text,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  landscapePhoneInner: {
    flex: 1,
    backgroundColor: '#1a73e8',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  landscapePhoneCameraIcon: {
    fontSize: 26,
  },
  landscapeHomeIndicator: {
    width: 6,
    height: 24,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  landscapeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tipsListContainer: {
    marginBottom: 32,
    gap: 10,
  },
  tipRow: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipRowText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  readyButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  readyButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  cancelButtonOutline: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cancelButtonOutlineText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },

  // --- Camera & overlay ---
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  webUnsupportedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  webUnsupportedText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  timerContainer: {
    position: 'absolute',
    top: 20,
  },
  timerPortrait: {
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  timerLandscape: {
    left: 20,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  timerWarning: {
    color: '#ff4444',
  },
  // Portrait: bottom center. Landscape: middle right.
  actionButtonPortrait: {
    position: 'absolute',
    bottom: 40,
    left: '50%',
    transform: [{ translateX: -40 }],
  },
  actionButtonLandscape: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -40 }],
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff4444',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#ff4444',
  },
  flipButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  flipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelOverlayButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  cancelOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // --- Playback & shared ---
  permissionText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  playbackContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  playbackVideoWrapper: {
    flex: 1,
    backgroundColor: '#000',
  },
  playbackVideo: {
    flex: 1,
  },
  playbackFooter: {
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
  },
  playbackTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  playbackSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  playbackDuration: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 20,
  },
  playbackActions: {
    gap: 12,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonCancelText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
