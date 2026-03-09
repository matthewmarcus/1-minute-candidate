import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export function Header() {
  const router = useRouter();
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

  return (
    <View style={styles.outer}>
      <View style={styles.inner}>

        {/* Logo + Title — tappable, goes home */}
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => router.push('/(voter)')}
          activeOpacity={0.8}
        >
          <Image
            source={require('../assets/images/logo-square.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>1 Minute Candidate</Text>
        </TouchableOpacity>

        {/* Right nav */}
        <View style={styles.navRow}>
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

          <TouchableOpacity
            style={styles.authButton}
            onPress={async () => {
              if (isSignedIn) {
                await supabase.auth.signOut();
                router.replace('/(voter)');
              } else {
                router.push('/(candidate)/login');
              }
            }}
          >
            <Text style={styles.authButtonText}>
              {isSignedIn ? 'Sign Out' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
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
});

export default Header;
