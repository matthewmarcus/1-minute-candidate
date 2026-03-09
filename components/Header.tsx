import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, StatusBar, useWindowDimensions } from 'react-native';
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

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAdminSignedIn, setIsAdminSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const isAdmin = pathname.startsWith('/admin');
  const showSignOut = isSignedIn || isAdminSignedIn;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });

    const adminStorage = getAdminStorage();
    adminStorage.getItem(ADMIN_SESSION_KEY).then((val) => {
      setIsAdminSignedIn(val === 'true');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setIsSignedIn(!!session)
    );
    return () => subscription.unsubscribe();
  }, []);

  const topPadding = Platform.OS === 'ios' ? 44 : (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0);

  return (
    <View style={[styles.outer, { paddingTop: topPadding, position: 'relative', zIndex: 100 }]}>
      <View style={styles.inner}>

        {/* Logo + Title — tappable, goes home */}
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => isAdmin ? router.push('/admin') : router.push('/(voter)')}
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
              onPress={async () => {
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
              }}
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
        <View style={styles.mobileMenu}>
          {isAdmin ? (
            <TouchableOpacity
              style={styles.mobileMenuItem}
              onPress={() => { setMenuOpen(false); router.push('/admin'); }}
            >
              <Text style={styles.mobileMenuText}>Admin Dashboard</Text>
            </TouchableOpacity>
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
            }}
          >
            <Text style={styles.mobileMenuText}>
              {showSignOut ? 'Sign Out' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
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
    gap: 16,
  },
  navLink: {
    paddingVertical: 4,
  },
  navText: {
    color: '#FFFFFF',
    fontSize: 13,
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
  mobileMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: '#0F1F5C',
    width: '100%',
    zIndex: 1000,
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
