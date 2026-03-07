import { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';
import { MAX_RECORDING_SECONDS } from '@/constants/Config';

type RecordingState = 'idle' | 'recording' | 'preview';

export default function RecordScreen() {
  const { session } = useAuth();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>('front');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    setRecordingState('idle');
    setSecondsLeft(MAX_RECORDING_SECONDS);
  }, []);

  const submitVideo = useCallback(async () => {
    if (!videoUri || !session?.user) return;

    setSubmitting(true);

    // Upload video file to Supabase Storage
    const candidateId = session.user.id;
    const filename = `${Date.now()}.mp4`;
    const storagePath = `${candidateId}/${filename}`;

    const base64 = await FileSystem.readAsStringAsync(videoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const uint8Array = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from('candidate-videos')
      .upload(storagePath, uint8Array, { contentType: 'video/mp4', upsert: false });

    if (uploadError) {
      setSubmitting(false);
      Alert.alert('Upload Failed', uploadError.message);
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
      </View>
    );
  }

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
            <View style={styles.timerContainer}>
              <Text style={[styles.timer, recordingState === 'recording' && secondsLeft <= 10 && styles.timerWarning]}>
                {secondsLeft}s
              </Text>
            </View>

            {recordingState === 'idle' && (
              <View style={styles.controls}>
                <TouchableOpacity
                  style={styles.flipButton}
                  onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
                >
                  <Text style={styles.flipButtonText}>Flip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                  <View style={styles.recordButtonInner} />
                </TouchableOpacity>
                <View style={styles.placeholder} />
              </View>
            )}

            {recordingState === 'recording' && (
              <View style={styles.controls}>
                <View style={styles.placeholder} />
                <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                  <View style={styles.stopButtonInner} />
                </TouchableOpacity>
                <View style={styles.placeholder} />
              </View>
            )}
          </View>

          {recordingState === 'idle' && (
            <View style={styles.tips}>
              <Text style={styles.tipsTitle}>Tips for your 60-second video:</Text>
              <Text style={styles.tipItem}>• Look directly at the camera</Text>
              <Text style={styles.tipItem}>• State your name and office</Text>
              <Text style={styles.tipItem}>• Deliver your message clearly</Text>
              <Text style={styles.tipItem}>• Find good lighting</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Video Ready</Text>
          <Text style={styles.previewSubtitle}>Review your recording before submitting.</Text>

          <View style={styles.previewActions}>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={retake}>
              <Text style={styles.buttonTextSecondary}>Re-record</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={submitVideo}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>{submitting ? 'Submitting...' : 'Submit for Review'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  timerContainer: {
    paddingTop: 60,
    alignItems: 'center',
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
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 60,
    paddingHorizontal: 40,
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
  placeholder: {
    width: 60,
  },
  tips: {
    position: 'absolute',
    bottom: 160,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipItem: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginBottom: 4,
  },
  permissionText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  previewTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  previewSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  previewActions: {
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
});
