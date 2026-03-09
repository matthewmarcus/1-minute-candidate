import { View, ScrollView, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';

const MAX_WIDTH = 680;

interface PageContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
}

export function PageContainer({ children, style, scrollable = true }: PageContainerProps) {
  const inner = (
    <View style={[styles.inner, style]}>
      {children}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        style={styles.outer}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {inner}
      </ScrollView>
    );
  }

  return (
    <View style={styles.outer}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    width: '100%',
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    paddingHorizontal: 20,
  },
});
