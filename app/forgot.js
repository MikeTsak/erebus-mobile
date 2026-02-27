// app/forgot.js
import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import api from '../constants/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleForgot = async () => {
    if (!email.trim()) {
      setErr('Please enter your email.');
      return;
    }
    setErr('');
    setLoading(true);

    try {
      await api.post('/auth/forgot', { email });
      setDone(true); // Always show success to prevent email enumeration
    } catch (error) {
      setDone(true); // Still show done for security
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>Erebus Portal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Forgot your password?</Text>
          
          {done ? (
            <View>
              <Text style={styles.muted}>
                If an account exists for that email, we’ve sent a reset link. Please check your inbox.
              </Text>
              <TouchableOpacity 
                style={styles.ctaButton} 
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.ctaText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {err ? (
                <View style={styles.alert}>
                  <View style={styles.alertDot} />
                  <Text style={styles.alertText}>{err}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@domain.com"
                placeholderTextColor="#b7aab9"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TouchableOpacity 
                style={styles.ctaButton} 
                onPress={handleForgot} 
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Send reset link</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ marginTop: 20, alignItems: 'center' }} 
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.link}>Cancel and return</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- EXACT VAMPIRIC STYLES TRANSLATED FROM YOUR CSS ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0a0c', // var(--bg)
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  brand: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d71f3c', // var(--accent)
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 44, 82, 0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  card: {
    backgroundColor: '#141116', // var(--surface)
    padding: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2b2330', // var(--border)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 30,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f3dde1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textShadowColor: 'rgba(255, 44, 82, 0.18)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  label: {
    color: '#e7c7cf',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#19141c',
    color: '#e7e2ea',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b2330',
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: '#8a0f1a', // var(--primary)
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#ff2c52',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: '#fff5f7',
    fontSize: 15,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(180, 14, 30, 0.35)',
    borderColor: 'rgba(255, 90, 110, 0.35)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  alertDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff274f',
    marginRight: 10,
  },
  alertText: {
    color: '#ffe9ec',
    fontSize: 14,
  },
  muted: {
    color: '#a393a8',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  link: {
    color: '#ffd5dd',
    fontSize: 14,
    fontWeight: '500',
  }
});