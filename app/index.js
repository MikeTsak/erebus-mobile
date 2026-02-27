// app/index.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, 
  Image, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import api, { BASE_URL } from '../constants/api';

export default function ChatScreen() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [groups, setGroups] = useState([]);
  
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const[text, setText] = useState('');
  const [imageUri, setImageUri] = useState(null);
  
  const [loading, setLoading] = useState(true); // Start loading while checking Auth
  const[token, setToken] = useState('');
  const pollRef = useRef(null);
  const flatListRef = useRef(null);

  // 1. Authentication & Initial Load
  useEffect(() => {
    const setup = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (!storedToken) {
          router.replace('/login'); // Not logged in? Go to login!
          return;
        }
        
        setToken(storedToken);
        
        // Fetch real user data from server.js
        const meRes = await api.get('/auth/me');
        setCurrentUser(meRes.data.user);

        // Fetch contacts
        await loadContacts();
      } catch (e) {
        // If the token is expired/invalid, logout and go to login
        await AsyncStorage.removeItem('token');
        router.replace('/login');
      }
    };
    setup();
  },[]);

  const loadContacts = async () => {
    try {
      const[{ data: u }, { data: n }, { data: g }] = await Promise.all([
        api.get('/chat/users'),
        api.get('/chat/npcs'),
        api.get('/chat/groups')
      ]);
      setUsers(u.users ||[]);
      setNpcs(n.npcs ||[]);
      setGroups(g.groups ||[]);
    } catch (e) {
      console.error("Failed to load contacts", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/login');
  };

  // 2. Polling Messages
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedContact) return;

    const loadMessages = async () => {
      try {
        let res;
        if (selectedContact.type === 'group') {
          res = await api.get(`/chat/groups/${selectedContact.id}/history`);
        } else if (selectedContact.type === 'user') {
          res = await api.get(`/chat/history/${selectedContact.id}`);
        } else {
          res = await api.get(`/chat/npc-history/${selectedContact.id}`);
        }

        const msgs = res.data.messages ||[];
        setMessages(msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        
        if (selectedContact.type === 'user') {
          api.post('/chat/read', { sender_id: selectedContact.id }).catch(()=> {});
        }
      } catch (e) {
        console.error("Failed to load messages", e);
      }
    };

    loadMessages();
    pollRef.current = setInterval(loadMessages, 6000);

    return () => clearInterval(pollRef.current);
  }, [selectedContact]);

  // 3. Select Image
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // 4. Send Message
  const sendMessage = async () => {
    if (!text.trim() && !imageUri) return;

    let attachmentId = null;

    try {
      if (imageUri) {
        const formData = new FormData();
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('file', { uri: imageUri, name: filename, type });

        const uploadRes = await api.post('/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        attachmentId = uploadRes.data.id;
      }

      const payload = { body: text, attachment_id: attachmentId };

      if (selectedContact.type === 'group') {
        await api.post(`/chat/groups/${selectedContact.id}/messages`, payload);
      } else if (selectedContact.type === 'user') {
        await api.post('/chat/messages', { recipient_id: selectedContact.id, ...payload });
      } else {
        await api.post('/chat/npc/messages', { npc_id: selectedContact.id, ...payload });
      }

      setText('');
      setImageUri(null);
    } catch (e) {
      Alert.alert("Error", "Failed to send message");
      console.error(e);
    }
  };

  // --- RENDERERS ---

  const renderContact = ({ item, type }) => (
    <TouchableOpacity 
      style={styles.contactCard} 
      onPress={() => {
        setMessages([]); 
        setSelectedContact({ ...item, type });
      }}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name ? item.name[0] : (item.display_name || '?')[0]}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.char_name || item.name || item.display_name}</Text>
        <Text style={styles.contactSub}>{type.toUpperCase()} {item.clan ? `• ${item.clan}` : ''}</Text>
      </View>
      {item.unread_count > 0 && (
        <View style={styles.badge}><Text style={styles.badgeText}>{item.unread_count}</Text></View>
      )}
    </TouchableOpacity>
  );

  const renderMessage = ({ item }) => {
    // We now use the REAL currentUser.id we fetched from /auth/me
    const isMine = item.sender_id === currentUser?.id || item.sender_id === 'user';
    const imageUrl = item.attachment_id ? `${BASE_URL}/chat/media/${item.attachment_id}?token=${token}` : null;

    return (
      <View style={[styles.messageRow, isMine ? styles.msgRight : styles.msgLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {item.sender_name && !isMine && selectedContact.type === 'group' && (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          )}
          
          {imageUrl && (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.chatImage} 
              resizeMode="cover" 
            />
          )}

          {item.body ? <Text style={styles.messageText}>{item.body}</Text> : null}
          
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  // --- VIEWS ---

  // Don't render anything until auth checks are done
  if (loading || !currentUser) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#b40f1f" />
      </View>
    );
  }

  if (!selectedContact) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Comms</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={[
            ...groups.map(g => ({ ...g, type: 'group' })),
            ...users.map(u => ({ ...u, type: 'user' })),
            ...npcs.map(n => ({ ...n, type: 'npc' }))
          ]}
          keyExtractor={item => `${item.type}-${item.id}`}
          renderItem={({ item }) => renderContact({ item, type: item.type })}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.chatContainer} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setSelectedContact(null)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{"< Back"}</Text>
          </TouchableOpacity>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {selectedContact.char_name || selectedContact.name || selectedContact.display_name}
          </Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          {imageUri && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeImage}>
                <Text style={styles.removeImageText}>X</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
              <Text style={styles.iconText}>📷</Text>
            </TouchableOpacity>
            
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="Message..."
              placeholderTextColor="#888"
              multiline
            />
            
            <TouchableOpacity 
              onPress={sendMessage} 
              style={[styles.sendBtn, (!text && !imageUri) && styles.sendBtnDisabled]}
              disabled={!text && !imageUri}
            >
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0c', 
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  headerTitle: {
    color: '#e8e8ea',
    fontSize: 24,
    fontWeight: 'bold',
    margin: 16,
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    color: '#a3a3ad',
    fontSize: 14,
  },
  contactCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f24',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: '#e8e8ea',
    fontSize: 16,
    fontWeight: '600',
  },
  contactSub: {
    color: '#a3a3ad',
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#b40f1f',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // CHAT STYLES
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f24',
    backgroundColor: '#141418',
  },
  backBtn: {
    marginRight: 16,
  },
  backBtnText: {
    color: '#b40f1f',
    fontSize: 16,
  },
  chatTitle: {
    color: '#e8e8ea',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  msgLeft: {
    justifyContent: 'flex-start',
  },
  msgRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleTheirs: {
    backgroundColor: '#1f1f24',
    borderBottomLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: '#b40f1f',
    borderBottomRightRadius: 4,
  },
  senderName: {
    color: '#a3a3ad',
    fontSize: 11,
    marginBottom: 4,
  },
  messageText: {
    color: '#e8e8ea',
    fontSize: 15,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  
  // INPUT STYLES
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1f1f24',
    padding: 12,
    backgroundColor: '#141418',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 10,
  },
  iconText: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1f1f24',
    color: '#e8e8ea',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    marginHorizontal: 8,
  },
  sendBtn: {
    backgroundColor: '#b40f1f',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendBtnDisabled: {
    backgroundColor: '#444',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'black',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  }
});