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
    // Web: use a plain iframe — react-native-webview does NOT support web
    return (
      <View style={{ width, height, borderRadius, overflow: 'hidden' }}>
        {/* @ts-ignore — iframe is a valid web element */}
        <iframe
          width={width}
          height={height}
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ border: 'none', borderRadius, display: 'block' }}
        />
      </View>
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
