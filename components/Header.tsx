import type { ReactNode } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '@/constants/fonts';

interface HeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: ReactNode;
}

export function Header({ showBack = false, onBack, rightContent }: HeaderProps) {
  const insets = useSafeAreaInsets();

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <View style={styles.logoRow}>
          <Image
            source={require('@/assets/images/logo-square.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>1 Minute Candidate</Text>
        </View>

        <View style={styles.rightSlot}>
          {rightContent ?? null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F1F5C',
  },
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 36,
  },
  backArrow: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 36,
    fontWeight: '300',
  },
  logoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 4,
    marginRight: 8,
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  rightSlot: {
    width: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
