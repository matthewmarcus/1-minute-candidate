import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/Colors';
import { Header } from '@/components/Header';

// ── Inline message component ──────────────────────────────────────────────────

function InlineMessage({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <View style={[styles.inlineMsg, type === 'error' ? styles.inlineMsgError : styles.inlineMsgSuccess]}>
      <Text style={styles.inlineMsgText}>{message}</Text>
    </View>
  );
}

// ── Password field with show/hide toggle ──────────────────────────────────────

function PasswordInput({
  value,
  placeholder,
  onChangeText,
}: {
  value: string;
  placeholder: string;
  onChangeText: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.passwordRow}>
      <TextInput
        style={[styles.input, { flex: 1, marginBottom: 0 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity style={styles.eyeButton} onPress={() => setShow(s => !s)}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const currentEmail = session?.user?.email ?? '';

  // Change Email state
  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete Account state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Email validation ────────────────────────────────────────────────────────

  function isValidEmail(email: string) {
    const atIdx = email.indexOf('@');
    if (atIdx < 1) return false;
    const domain = email.slice(atIdx + 1);
    return domain.includes('.') && domain.length > 2;
  }

  const emailChanged = newEmail.trim() !== '' && newEmail.trim() !== currentEmail;
  const emailValid = isValidEmail(newEmail.trim());
  const emailButtonEnabled = emailChanged && emailValid;

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleUpdateEmail() {
    setEmailMsg(null);
    if (!isValidEmail(newEmail.trim())) {
      setEmailMsg({ text: 'Please enter a valid email address.', type: 'error' });
      return;
    }
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailLoading(false);
    if (error) {
      setEmailMsg({ text: error.message, type: 'error' });
    } else {
      setEmailMsg({
        text: `Confirmation sent to ${newEmail.trim()}. Click the link to confirm your new address.`,
        type: 'success',
      });
      setNewEmail('');
    }
  }

  async function handleUpdatePassword() {
    setPasswordMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ text: 'Please fill in all fields.', type: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ text: 'Password must be at least 8 characters.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Passwords do not match.', type: 'error' });
      return;
    }

    setPasswordLoading(true);

    // Re-authenticate with current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });

    if (signInError) {
      setPasswordLoading(false);
      setPasswordMsg({ text: 'Current password is incorrect.', type: 'error' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);

    if (error) {
      setPasswordMsg({ text: error.message, type: 'error' });
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ text: 'Password updated successfully.', type: 'success' });
    }
  }

  function handleDeletePress() {
    if (Platform.OS === 'web') {
      setDeleteModalVisible(true);
    } else {
      Alert.alert(
        'Delete Account',
        'This will permanently delete your profile, all videos, and all account data. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Delete My Account',
            style: 'destructive',
            onPress: confirmDelete,
          },
        ],
      );
    }
  }

  async function confirmDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    setDeleteModalVisible(false);

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token;

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.message ?? 'Request failed');
      }
    } catch (err: unknown) {
      setDeleteLoading(false);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setDeleteError(`Failed to delete account. Please try again or contact support. (${msg})`);
      return;
    }

    await supabase.auth.signOut();
    setDeleteLoading(false);
    router.replace('/(candidate)/login');
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>

          {/* ── Change Email ─────────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Change Email</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Current Email</Text>
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyText}>{currentEmail}</Text>
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>New Email Address</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="newaddress@example.com"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            {emailMsg && <InlineMessage message={emailMsg.text} type={emailMsg.type} />}

            <TouchableOpacity
              style={[styles.primaryButton, (!emailButtonEnabled || emailLoading) && styles.buttonDisabled]}
              onPress={handleUpdateEmail}
              disabled={!emailButtonEnabled || emailLoading}
            >
              <Text style={styles.primaryButtonText}>
                {emailLoading ? 'Updating…' : 'Update Email'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Change Password ──────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Change Password</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Current Password</Text>
            <PasswordInput
              value={currentPassword}
              placeholder="Enter current password"
              onChangeText={setCurrentPassword}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>New Password</Text>
            <PasswordInput
              value={newPassword}
              placeholder="At least 8 characters"
              onChangeText={setNewPassword}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Confirm New Password</Text>
            <PasswordInput
              value={confirmPassword}
              placeholder="Repeat new password"
              onChangeText={setConfirmPassword}
            />

            {passwordMsg && <InlineMessage message={passwordMsg.text} type={passwordMsg.type} />}

            <TouchableOpacity
              style={[styles.primaryButton, passwordLoading && styles.buttonDisabled, { marginTop: 8 }]}
              onPress={handleUpdatePassword}
              disabled={passwordLoading}
            >
              <Text style={styles.primaryButtonText}>
                {passwordLoading ? 'Updating…' : 'Update Password'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Delete Account ───────────────────────────────────────────── */}
          <Text style={styles.sectionHeader}>Delete Account</Text>
          <View style={styles.card}>
            <Text style={styles.deleteWarning}>
              Permanently removes your profile, all videos, and all account data. This cannot be undone.
            </Text>

            {deleteError && <InlineMessage message={deleteError} type="error" />}

            <TouchableOpacity
              style={[styles.deleteButton, deleteLoading && styles.buttonDisabled]}
              onPress={handleDeletePress}
              disabled={deleteLoading}
            >
              <Text style={styles.deleteButtonText}>
                {deleteLoading ? 'Deleting…' : 'Delete My Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* ── Delete Confirmation Modal (web) ──────────────────────────────── */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              This will permanently delete your profile, all videos, and all account data. This cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.modalDeleteText}>Yes, Delete My Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 680,
    paddingHorizontal: 16,
  },

  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },

  readonlyField: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readonlyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },

  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },

  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  inlineMsg: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  inlineMsgSuccess: {
    backgroundColor: '#dcfce7',
  },
  inlineMsgError: {
    backgroundColor: '#fee2e2',
  },
  inlineMsgText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },

  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  deleteWarning: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  modalDeleteButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: Colors.error,
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
