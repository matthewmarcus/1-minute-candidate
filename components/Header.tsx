import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '@/constants/fonts';
import { supabase } from '@/lib/supabase';

const NAVY = '#0F1F5C';

interface HeaderProps {
  variant?: 'voter' | 'candidate' | 'admin';
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: ReactNode;
}

export function Header({
  variant = 'voter',
  showBack = false,
  onBack,
  rightContent,
}: HeaderProps) {
  const { width } = useWindowDimensions();
  const showInlineNav = width >= 768;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setIsSignedIn(!!session)
    );
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(voter)');
  }

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }

  // Determine right slot content based on variant
  let right: ReactNode = rightContent ?? null;

  if (variant === 'voter' && !rightContent) {
    if (showInlineNav) {
      right = (
        <View style={styles.navLinks}>
          <TouchableOpacity onPress={() => router.push('/(voter)/find')}>
            <Text style={styles.navLink}>For Voters</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => isSignedIn ? router.push('/dashboard') : router.push('/(candidate)/login')}>
            <Text style={styles.navLink}>For Candidates</Text>
          </TouchableOpacity>
          {isSignedIn ? (
            <TouchableOpacity
              style={styles.authButtonSignOut}
              onPress={handleSignOut}
            >
              <Text style={styles.authButtonText}>Sign Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.authButtonSignIn}
              onPress={() => router.push('/(candidate)/login')}
            >
              <Text style={styles.authButtonText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    } else {
      right = (
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="menu-outline" size={28} color="#fff" />
        </TouchableOpacity>
      );
    }
  }

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.inner}>
            {/* LEFT: back arrow (if showBack) + logo + title */}
            <View style={styles.left}>
              {showBack && (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                  accessibilityLabel="Go back"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.backArrow}>‹</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.logoButton}
                onPress={() => router.push('/(voter)')}
                accessibilityLabel="Go to homepage"
              >
                <Image
                  source={require('@/assets/images/logo-square.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <Text style={styles.logoText}>1 Minute Candidate</Text>
              </TouchableOpacity>
            </View>

            {/* RIGHT: nav links, hamburger, or custom content */}
            {right != null && (
              <View style={styles.right}>
                {right}
              </View>
            )}
          </View>
      </SafeAreaView>

      {/* Mobile hamburger menu — voter variant only */}
      {variant === 'voter' && (
        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
          >
            <View style={styles.mobileMenu}>
              <TouchableOpacity
                style={styles.mobileMenuClose}
                onPress={() => setMenuOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-outline" size={28} color={NAVY} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mobileMenuItem}
                onPress={() => { setMenuOpen(false); router.push('/(voter)/find'); }}
              >
                <Text style={styles.mobileMenuLink}>For Voters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mobileMenuItem}
                onPress={() => { setMenuOpen(false); isSignedIn ? router.push('/dashboard') : router.push('/(candidate)/login'); }}
              >
                <Text style={styles.mobileMenuLink}>For Candidates</Text>
              </TouchableOpacity>
              <View style={[styles.mobileMenuItem, { paddingVertical: 14 }]}>
                {isSignedIn ? (
                  <TouchableOpacity
                    style={styles.mobileAuthButtonSignOut}
                    onPress={() => { setMenuOpen(false); handleSignOut(); }}
                  >
                    <Text style={styles.mobileAuthButtonSignOutText}>Sign Out</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.mobileAuthButtonSignIn}
                    onPress={() => { setMenuOpen(false); router.push('/(candidate)/login'); }}
                  >
                    <Text style={styles.mobileAuthButtonSignInText}>Sign In</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F1F5C',
    width: '100%',
  },
  inner: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 20,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  backArrow: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 36,
    fontWeight: '300',
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLink: {
    color: '#fff',
    fontSize: 14,
    fontFamily: fonts.semiBold,
    marginLeft: 20,
  },
  authButtonSignIn: {
    marginLeft: 20,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: NAVY,
    borderWidth: 1,
    borderColor: '#fff',
  },
  authButtonSignOut: {
    marginLeft: 20,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  mobileMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 220,
    backgroundColor: '#fff',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    minHeight: '100%',
  },
  mobileMenuClose: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  mobileMenuItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 14,
  },
  mobileMenuLink: {
    color: NAVY,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  mobileAuthButtonSignIn: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: NAVY,
    alignSelf: 'flex-start',
  },
  mobileAuthButtonSignInText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  mobileAuthButtonSignOut: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: NAVY,
    alignSelf: 'flex-start',
  },
  mobileAuthButtonSignOutText: {
    color: NAVY,
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
});
