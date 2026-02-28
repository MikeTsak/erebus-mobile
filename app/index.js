// app/index.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, LayoutAnimation, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatSystem from '../components/ChatSystem';
import EmailSystem from '../components/EmailSystem';

// Enable smooth LayoutAnimations on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Comms() {
  const [commsMode, setCommsMode] = useState('chat'); // 'chat' | 'email'

  const handleSwitch = (mode) => {
    if (commsMode === mode) return;
    
    // This tells React Native to automatically crossfade the components!
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCommsMode(mode);
  };

  return (
    <View style={styles.rootBackground}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          
          {/* --- SCHRECKNET / SURFACE WEB TOGGLE --- */}
          <View style={styles.modeSwitch}>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.modeBtn, commsMode === 'chat' ? styles.activeChat : styles.inactiveBtn]}
              onPress={() => handleSwitch('chat')}
            >
              <Text style={[styles.modeTitle, commsMode === 'chat' && styles.activeChatText]}>SchreckNet</Text>
              <Text style={[styles.modeSubtitle, commsMode === 'chat' && styles.activeChatText]}>Everything here is safe.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.modeBtn, commsMode === 'email' ? styles.activeEmail : styles.inactiveBtn]}
              onPress={() => handleSwitch('email')}
            >
              <Text style={[styles.modeTitle, commsMode === 'email' && styles.activeEmailText]}>Surface Web</Text>
              <Text style={[styles.modeSubtitle, commsMode === 'email' && styles.activeEmailText]}>Be careful, you are not safe.</Text>
            </TouchableOpacity>
          </View>

          {/* --- DYNAMIC CONTENT AREA --- */}
          <View style={styles.content}>
            {commsMode === 'chat' ? <ChatSystem /> : <EmailSystem />}
          </View>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootBackground: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0b0b0c',
    marginTop: Platform.OS === 'android' ? 30 : 10, 
    marginBottom: 20, 
    marginHorizontal: 8, 
    borderRadius: 20, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1f1f24',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, 
    shadowRadius: 10, 
    elevation: 10,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#141418',
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f24',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  inactiveBtn: {
    opacity: 0.5,
  },
  activeChat: {
    borderBottomColor: '#b40f1f',
    backgroundColor: 'rgba(180, 15, 31, 0.1)',
  },
  activeEmail: {
    borderBottomColor: '#01579b',
    backgroundColor: 'rgba(1, 87, 155, 0.1)',
  },
  modeTitle: {
    color: '#888',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  modeSubtitle: {
    color: '#666',
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  activeChatText: {
    color: '#b40f1f',
  },
  activeEmailText: {
    color: '#01579b',
  },
  content: {
    flex: 1,
  }
});