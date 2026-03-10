import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Pressable, StyleSheet, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADMIN_SESSION_KEY = 'admin_session';

function getAdminStorage() {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) =>
        Promise.resolve(typeof window !== 'undefined' ? window.localStorage.getItem(key) : null),
      removeItem: (key: string) =>
        Promise.resolve(typeof window !== 'undefined' ? window.localStorage.removeItem(key) : undefined),
    };
  }
  return AsyncStorage;
}

const CANDIDATE_TABS = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'profile', label: 'My Profile', href: '/(candidate)/profile' },
  { key: 'record', label: 'Record Video', href: '/(candidate)/record' },
  { key: 'subscribe', label: 'Billing', href: '/(candidate)/subscribe' },
] as const;

type CandidateTabKey = typeof CANDIDATE_TABS[number]['key'];

function getActiveTab(pathname: string): CandidateTabKey | null {
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.includes('/profile')) return 'profile';
  if (pathname.includes('/record')) return 'record';
  if (pathname.includes('/subscribe')) return 'subscribe';
  return null;
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAdminSignedIn, setIsAdminSignedIn] = useState(false);
  const [isCandidate, setIsCandidate] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const isAdmin = pathname.startsWith('/admin');
  const showSignOut = isSignedIn || isAdminSignedIn;
  const activeTab = getActiveTab(pathname);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
      if (session) {
        supabase.from('candidates').select('id').eq('id', session.user.id).single()
          .then(({ data }) => setIsCandidate(!!data));
      }
    });

    const adminStorage = getAdminStorage();
    adminStorage.getItem(ADMIN_SESSION_KEY).then((val) => {
      setIsAdminSignedIn(val === 'true');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsSignedIn(!!session);
        if (session) {
          supabase.from('candidates').select('id').eq('id', session.user.id).single()
            .then(({ data }) => setIsCandidate(!!data));
        } else {
          setIsCandidate(false);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const topPadding = Platform.OS === 'ios' ? 44 : (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0);

  async function handleSignOut() {
    if (isAdminSignedIn) {
      await getAdminStorage().removeItem(ADMIN_SESSION_KEY);
      setIsAdminSignedIn(false);
      router.replace('/admin/login');
    } else if (isSignedIn) {
      await supabase.auth.signOut();
      router.replace('/(voter)');
    } else {
      isAdmin ? router.push('/admin/login') : router.push('/(candidate)/login');
    }
  }

  return (
    <View style={[styles.outer, { paddingTop: topPadding, position: 'relative', zIndex: 100 }]}>
      <View style={styles.inner}>

        {/* Logo + Title — tappable, goes home */}
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => {
            if (isAdmin) router.push('/admin');
            else if (isCandidate) router.push('/dashboard');
            else router.push('/(voter)');
          }}
          activeOpacity={0.8}
        >
          <Image
            source={require('../assets/images/logo-square.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>1 Minute Candidate</Text>
        </TouchableOpacity>

        {/* Right nav — desktop */}
        {!isMobile && (
          <View style={styles.navRow}>
            {isAdmin ? (
              <TouchableOpacity
                onPress={() => router.push('/admin')}
                style={styles.navLink}
              >
                <Text style={styles.navText}>Admin Dashboard</Text>
              </TouchableOpacity>
            ) : isCandidate ? (
              <>
                {CANDIDATE_TABS.map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      onPress={() => router.push(tab.href as any)}
                      style={[styles.navLink, active && styles.navLinkActive]}
                    >
                      <Text style={styles.navText}>{tab.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => router.push('/(voter)/find')}
                  style={styles.navLink}
                >
                  <Text style={styles.navText}>For Voters</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => isSignedIn
                    ? router.push('/dashboard')
                    : router.push('/(candidate)/login')
                  }
                  style={styles.navLink}
                >
                  <Text style={styles.navText}>For Candidates</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.authButton}
              onPress={handleSignOut}
            >
              <Text style={styles.authButtonText}>
                {showSignOut ? 'Sign Out' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Right nav — mobile hamburger */}
        {isMobile && (
          <TouchableOpacity onPress={() => setMenuOpen(m => !m)}>
            <Ionicons name="menu-outline" size={28} color="#ffffff" />
          </TouchableOpacity>
        )}

      </View>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <>
          {/* Full-screen backdrop — tapping anywhere outside closes menu */}
          <Pressable
            style={styles.backdrop}
            onPress={() => setMenuOpen(false)}
          />
        <View style={styles.mobileMenu}>
          {isAdmin ? (
            <TouchableOpacity
              style={styles.mobileMenuItem}
              onPress={() => { setMenuOpen(false); router.push('/admin'); }}
            >
              <Text style={styles.mobileMenuText}>Admin Dashboard</Text>
            </TouchableOpacity>
          ) : isCandidate ? (
            <>
              <TouchableOpacity
                style={styles.mobileMenuItem}
                onPress={() => { setMenuOpen(false); router.push('/dashboard'); }}
              >
                <Text style={styles.mobileMenuText}>Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mobileMenuItem}
                onPress={() => { setMenuOpen(false); router.push('/(candidate)/profile'); }}
              >
                <Text style={styles.mobileMenuText}>My Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mobileMenuItem}
                onPress={() => { setMenuOpen(false); router.push('/(candidate)/record'); }}
              >
                <Text style={styles.mobileMenuText}>Record Video</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mobileMenuItem}
                onPress={() => { setMenuOpen(false); router.push('/(candidate)/subscribe'); }}
              >
                <Text style={styles.mobileMenuText}>Billing</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.mobileMenuItem}
                onPress={() => { setMenuOpen(false); router.push('/(voter)/find'); }}
              >
                <Text style={styles.mobileMenuText}>For Voters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mobileMenuItem}
                onPress={() => {
                  setMenuOpen(false);
                  isSignedIn ? router.push('/dashboard') : router.push('/(candidate)/login');
                }}
              >
                <Text style={styles.mobileMenuText}>For Candidates</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={async () => {
              setMenuOpen(false);
              await handleSignOut();
            }}
          >
            <Text style={styles.mobileMenuText}>
              {showSignOut ? 'Sign Out' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    backgroundColor: '#0F1F5C',
    // No SafeAreaView, no react-native-safe-area-context — plain View only
  },
  inner: {
    height: 56,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 28,
    height: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Quicksand_700Bold',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navLink: {
    paddingVertical: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navLinkActive: {
    borderBottomColor: '#E8192F',
  },
  navText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Quicksand_600SemiBold',
  },
  authButton: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Quicksand_600SemiBold',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -9999,
    zIndex: 98,
  },
  mobileMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#0F1F5C',
    width: '100%',
    zIndex: 99,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  mobileMenuItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  mobileMenuText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Quicksand_600SemiBold',
  },
});

export default Header;
