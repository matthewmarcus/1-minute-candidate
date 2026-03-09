import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';

interface VideoPlayerProps {
  youtubeUrl: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function VideoPlayer({ youtubeUrl }: VideoPlayerProps) {
  const { width } = useWindowDimensions();
  const videoWidth = Math.min(width, 680) - 40;
  const videoHeight = videoWidth * (9 / 16);

  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) return null;

  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { width: videoWidth, height: videoHeight }]}>
        <iframe
          src={embedUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </View>
    );
  }

  // Native (iOS / Android) — lazy-require to avoid bundling on web
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WebView } = require('react-native-webview');
  return (
    <View style={[styles.container, { width: videoWidth, height: videoHeight }]}>
      <WebView
        style={{ width: videoWidth, height: videoHeight }}
        source={{ uri: embedUrl }}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
});
