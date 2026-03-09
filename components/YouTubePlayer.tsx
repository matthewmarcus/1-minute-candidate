import { View, Image, TouchableOpacity, Text, Platform } from 'react-native';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface YouTubePlayerProps {
  videoId: string;
  width: number;
  height: number;
  borderRadius?: number;
}

export function YouTubePlayer({ videoId, width, height, borderRadius = 8 }: YouTubePlayerProps) {
  if (Platform.OS === 'web') {
    // Web: standard embed works for unlisted videos
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WebView } = require('react-native-webview');
    return (
      <WebView
        source={{ uri: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1` }}
        style={{ width, height, borderRadius }}
        scrollEnabled={false}
        allowsFullscreenVideo
      />
    );
  }

  // Native: thumbnail + tap to open in YouTube app or browser
  return (
    <View style={{ width, height, borderRadius, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)}
        activeOpacity={0.9}
        style={{ width, height }}
      >
        <Image
          source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
          style={{ width, height }}
          resizeMode="cover"
        />
        {/* Play button overlay */}
        <View style={{
          position: 'absolute', top: 0, left: 0,
          width, height,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <View style={{
            backgroundColor: 'rgba(0,0,0,0.55)',
            borderRadius: 36,
            width: 64, height: 64,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="play" size={32} color="#ffffff" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
