import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors } from '@/constants/Colors';

const TABS = [
  { label: 'Dashboard', href: '/(candidate)/', icon: '🏠' },
  { label: 'Profile', href: '/(candidate)/profile', icon: '👤' },
  { label: 'Record', href: '/(candidate)/record', icon: '🎥' },
] as const;

export function CandidateTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/(candidate)/') {
      return pathname === '/' || pathname === '/index' || pathname === '';
    }
    return pathname.includes(href.replace('/(candidate)', ''));
  }

  return (
    <View style={[styles.container, Platform.OS === 'web' && styles.containerWeb]}>
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <TouchableOpacity
            key={tab.href}
            style={styles.tab}
            onPress={() => router.push(tab.href as any)}
            accessibilityLabel={tab.label}
          >
            <Text style={[styles.icon, active && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {active && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: 8,
    paddingTop: 8,
  },
  containerWeb: {
    position: 'sticky' as any,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    boxShadow: '0 -1px 4px rgba(0,0,0,0.08)' as any,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  icon: {
    fontSize: 22,
    marginBottom: 3,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
});
