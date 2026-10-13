import { useState } from 'react';
import { StyleSheet, Text, Pressable, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../../AuthContext';
import { useTheme } from '../../ThemeContext';
import { api, errorMessage } from '../../lib/api';

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const theme = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
      });
      // The API doesn't log you in on register, so log in right after.
      await signIn(email.trim(), password);
    } catch (e) {
      Alert.alert('Sign up failed', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }];

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <TextInput
        style={inputStyle}
        placeholder="First name"
        placeholderTextColor={theme.textMuted}
        autoComplete="given-name"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={inputStyle}
        placeholder="Last name"
        placeholderTextColor={theme.textMuted}
        autoComplete="family-name"
        value={lastName}
        onChangeText={setLastName}
      />
      <TextInput
        style={inputStyle}
        placeholder="Email"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={inputStyle}
        placeholder="Password (8+ characters)"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={onRegister} disabled={loading}>
        <Text style={styles.buttonText}>Create Account</Text>
      </Pressable>
      {loading && <ActivityIndicator style={{ marginTop: 12 }} color={theme.primary} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
