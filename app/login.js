// app/login.js
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../constants/api';

export default function LoginScreen() {
  const[email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const[showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const[err, setErr] = useState('');
  const router = useRouter();

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          router.replace('/');
        }
      } catch (e) {
        // ignore storage errors
      }
    };
    checkAuth();
  }, [router]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErr('Please enter both email and password.');
      return;
    }

    setErr('');
    setLoading(true);

    try {
      // Hit your server.js endpoint
      const res = await api.post('/auth/login', { email, password });
      
      // Save token securely
      await AsyncStorage.setItem('token', res.data.token);
      
      // Navigate to Chat
      router.replace('/');
    } catch (error) {
      setErr(error.response?.data?.error || 'Login failed. Please check your credentials.');
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
          <Text style={styles.cardTitle}>Sign In</Text>

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

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#b7aab9"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.eyeBtn}
              onPress={() => setShowPwd(!showPwd)}
            >
              <Text style={styles.eyeText}>{showPwd ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.forgotContainer}>
            <TouchableOpacity onPress={() => router.push('/forgot')}>
              <Text style={styles.link}>Forgot your password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.ctaButton} 
            onPress={handleLogin} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Enter the Court</Text>
            )}
          </TouchableOpacity>

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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#19141c',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b2330',
    marginBottom: 10, // Reduced bottom margin to make room for forgot link
  },
  passwordInput: {
    flex: 1,
    color: '#e7e2ea',
    padding: 14,
    fontSize: 16,
  },
  eyeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  eyeText: {
    color: '#a393a8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  link: {
    color: '#ffd5dd',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
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
  }
});