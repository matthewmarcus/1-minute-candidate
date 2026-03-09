import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { fonts } from '@/constants/fonts';

type TabName = 'dashboard' | 'profile' | 'record' | 'subscribe';

interface CandidateNavProps {
  activeTab: TabName;
}

const TABS: { key: TabName; label: string; href: string }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/(candidate)/' },
  { key: 'profile', label: 'My Profile', href: '/(candidate)/profile' },
  { key: 'record', label: 'Record Video', href: '/(candidate)/record' },
  { key: 'subscribe', label: 'Billing', href: '/(candidate)/subscribe' },
];

export function CandidateNav({ activeTab }: CandidateNavProps) {
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(voter)');
  }

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => router.push(tab.href as any)}
              accessibilityLabel={tab.label}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {active && <View style={styles.activeUnderline} />}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.tab}
          onPress={handleSignOut}
          accessibilityLabel="Sign Out"
        >
          <Text style={[styles.tabText, styles.signOutText]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: fonts.semiBold,
  },
  tabTextActive: {
    color: '#E8192F',
    fontFamily: fonts.bold,
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: '#E8192F',
    borderRadius: 1,
  },
  signOutText: {
    color: '#6B7280',
  },
});
