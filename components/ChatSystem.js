// components/ChatSystem.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, 
  Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Modal, Linking, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api, { BASE_URL } from '../constants/api';

const { width } = Dimensions.get('window');

// Tell Expo how to handle notifications when the app is OPEN
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// --- NOTIFICATION REGISTRATION ---
async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern:[0, 250, 250, 250],
      lightColor: '#b40f1f',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null; 
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      token = (await Notifications.getExpoPushTokenAsync()).data;
    }
  }
  return token;
}

/* --- Clan Colors & Images --- */
const CLAN_COLORS = {
  Brujah: '#b40f1f', Gangrel: '#2f7a3a', Malkavian: '#713c8b', Nosferatu: '#6a4b2b',
  Toreador: '#b8236b', Tremere: '#7b1113', Ventrue: '#1b4c8c', 'Banu Haqim': '#7a2f57',
  Hecata: '#2b6b6b', Lasombra: '#191a5a', 'The Ministry': '#865f12',
  Caitiff: '#636363', 'Thin-blood': '#6e6e2b',
};

const CLAN_IMAGES = {
  'Brujah': require('../assets/images/clans/330px-Brujah_symbol.png'),
  'Gangrel': require('../assets/images/clans/330px-Gangrel_symbol.png'),
  'Malkavian': require('../assets/images/clans/330px-Malkavian_symbol.png'),
  'Nosferatu': require('../assets/images/clans/330px-Nosferatu_symbol.png'),
  'Toreador': require('../assets/images/clans/330px-Toreador_symbol.png'),
  'Tremere': require('../assets/images/clans/330px-Tremere_symbol.png'),
  'Ventrue': require('../assets/images/clans/330px-Ventrue_symbol.png'),
  'Banu Haqim': require('../assets/images/clans/330px-Banu_Haqim_symbol.png'),
  'Hecata': require('../assets/images/clans/330px-Hecata_symbol.png'),
  'Lasombra': require('../assets/images/clans/330px-Lasombra_symbol.png'),
  'The Ministry': require('../assets/images/clans/330px-Ministry_symbol.png'),
  'Caitiff': require('../assets/images/clans/330px-Caitiff_symbol.png'),
  'Thin-blood': require('../assets/images/clans/330px-Thinblood_symbol.png'),
  'Admin': null 
};

const isContactAdmin = (u) => u?.role === 'admin' || u?.permission_level === 'admin' || !!u?.is_admin;

// --- SORTING HELPER ---
const sortContacts = (list) => {
  return [...list].sort((a, b) => {
    const unreadA = a.unread_count || 0;
    const unreadB = b.unread_count || 0;
    if (unreadA !== unreadB) return unreadB - unreadA; // Unread always floats to top

    const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA; // Most recent message next

    const nameA = a.display_name || a.name || '';
    const nameB = b.display_name || b.name || '';
    return nameA.localeCompare(nameB); // Alphabetical fallback
  });
};

export default function ChatSystem() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [groups, setGroups] = useState([]);
  
  const [selectedContact, setSelectedContact] = useState(null);
  
  // --- ADMIN NPC STATES ---
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [npcConvos, setNpcConvos] = useState([]);
  const [adminPlayerTab, setAdminPlayerTab] = useState('recent'); // 'recent' or 'all'

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [imageUri, setImageUri] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const pollRef = useRef(null);
  const flatListRef = useRef(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.permission_level === 'admin';

  // 1. Authentication & Initial Load
  useEffect(() => {
    const setup = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (!storedToken) {
          router.replace('/login'); 
          return;
        }
        setToken(storedToken);
        
        // Fix: Attach token to API
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        const meRes = await api.get('/auth/me');
        setCurrentUser(meRes.data.user);

        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await api.post('/push/subscribe', {
            subscription: { endpoint: pushToken, expoPushToken: pushToken }
          }).catch(() => {});
        }

        await loadContacts();
      } catch (e) {
        await AsyncStorage.removeItem('token');
        router.replace('/login');
      }
    };
    setup();
  },[]);

  const loadContacts = async () => {
    try {
      const [{ data: u }, { data: n }, { data: g }] = await Promise.all([
        api.get('/chat/users'), api.get('/chat/npcs'), api.get('/chat/groups')
      ]);
      
      // Apply sorting to ensure recent chats bubble to top
      setUsers(sortContacts(u.users || []));
      setNpcs(sortContacts(n.npcs || []));
      setGroups(sortContacts(g.groups || []));
    } catch (e) {
      console.error("Failed to load contacts", e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Global Contacts Polling (Updates the main list every 10 seconds)
  useEffect(() => {
    if (!token) return;
    const contactInterval = setInterval(() => {
      loadContacts();
    }, 10000);
    return () => clearInterval(contactInterval);
  }, [token]);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await AsyncStorage.removeItem('token');
    router.replace('/login');
  };

  const handleClearCache = async () => {
    Alert.alert(
      "Clear Cache",
      "This will log you out and clear local data. Continue?",[
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: async () => {
            setIsMenuOpen(false);
            await AsyncStorage.clear();
            router.replace('/login');
        }}
      ]
    );
  };

  const openLink = (url) => {
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

  // 3. Polling Messages (Updates active chat every 6 seconds)
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedContact) return;

    const loadMessagesAndConvos = async () => {
      try {
        let msgs = [];

        if (isAdmin && selectedContact.type === 'npc') {
          const convoRes = await api.get(`/admin/chat/npc-conversations/${selectedContact.id}`).catch(()=>({data:{conversations:[]}}));
          setNpcConvos(convoRes.data.conversations || []);

          if (selectedPlayerId) {
            const res = await api.get(`/admin/chat/npc-history/${selectedContact.id}/${selectedPlayerId}`);
            msgs = (res.data.messages || []).map(m => ({
              ...m, 
              sender_id: m.from_side === 'npc' ? 'npc' : selectedPlayerId
            }));
          }
        } else if (selectedContact.type === 'group') {
          const res = await api.get(`/chat/groups/${selectedContact.id}/history`);
          msgs = res.data.messages || [];
        } else if (selectedContact.type === 'user') {
          const res = await api.get(`/chat/history/${selectedContact.id}`);
          msgs = res.data.messages || [];
          api.post('/chat/read', { sender_id: selectedContact.id }).catch(()=> {});
        } else {
          const res = await api.get(`/chat/npc-history/${selectedContact.id}`);
          msgs = (res.data.messages || []).map(m => ({
            ...m,
            sender_id: m.from_side === 'user' ? currentUser.id : 'npc'
          }));
        }

        setMessages(msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
      } catch (e) {
        console.error("Failed to load data", e);
      }
    };

    loadMessagesAndConvos();
    pollRef.current = setInterval(loadMessagesAndConvos, 6000);

    return () => clearInterval(pollRef.current);
  }, [selectedContact, selectedPlayerId, isAdmin]);

  // 4. Select Image
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  // 5. Send Message
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

      if (isAdmin && selectedContact.type === 'npc') {
        await api.post('/admin/chat/npc/messages', { 
          npc_id: selectedContact.id, 
          user_id: selectedPlayerId, 
          ...payload 
        });
      } else if (selectedContact.type === 'group') {
        await api.post(`/chat/groups/${selectedContact.id}/messages`, payload);
      } else if (selectedContact.type === 'user') {
        await api.post('/chat/messages', { recipient_id: selectedContact.id, ...payload });
      } else {
        await api.post('/chat/npc/messages', { npc_id: selectedContact.id, ...payload });
      }

      setText('');
      setImageUri(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      loadContacts(); // Refresh sorting instantly
    } catch (e) {
      Alert.alert("Error", "Failed to send message");
      console.error(e);
    }
  };

  // --- RENDERERS ---
  const renderContact = ({ item, type }) => {
    const showAdminIcon = isContactAdmin(item);
    let avatarSource = showAdminIcon ? CLAN_IMAGES['Admin'] : (item.clan ? CLAN_IMAGES[item.clan] : null);
    const tint = CLAN_COLORS[item.clan] || '#1f1f24';

    return (
      <TouchableOpacity 
        style={styles.contactCard} 
        activeOpacity={0.7}
        onPress={() => {
          setMessages([]); 
          setSelectedPlayerId(null); 
          setSelectedContact({ ...item, type });
        }}
      >
        <View style={[styles.avatar, { borderColor: tint, borderWidth: 2 }]}>
          {avatarSource ? (
             <Image source={avatarSource} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>
              {item.name ? item.name[0].toUpperCase() : (item.display_name || '?')[0].toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.char_name || item.name || item.display_name}
          </Text>
          <Text style={styles.contactSub} numberOfLines={1}>
            {item.display_name || 'NPC'} {showAdminIcon ? '• Admin' : ''}
          </Text>
        </View>
        {item.unread_count > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{item.unread_count}</Text></View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }) => {
    let isMine = false;
    
    if (isAdmin && selectedContact?.type === 'npc') {
      isMine = item.sender_id === 'npc';
    } else if (selectedContact?.type === 'npc') {
      isMine = item.sender_id !== 'npc';
    } else {
      isMine = item.sender_id === currentUser?.id || item.sender_id === 'user';
    }

    const imageUrl = item.attachment_id ? `${BASE_URL}/chat/media/${item.attachment_id}?token=${token}` : null;

    return (
      <View style={[styles.messageRow, isMine ? styles.msgRight : styles.msgLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {item.sender_name && !isMine && selectedContact.type === 'group' && (
            <Text style={styles.senderName}>{item.sender_name}</Text>
          )}
          {imageUrl && (
            <Image source={{ uri: imageUrl }} style={styles.chatImage} resizeMode="cover" />
          )}
          {item.body ? <Text style={styles.messageText}>{item.body}</Text> : null}
          <View style={styles.messageMeta}>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMine && <Ionicons name="checkmark-done" size={14} color="#888" style={{marginLeft: 4}} />}
          </View>
        </View>
      </View>
    );
  };

  const renderAdminRoster = () => {
    // We sort the roster as well so active conversations bubble up
    const listData = adminPlayerTab === 'recent' 
      ? npcConvos.map(c => ({ id: c.user_id, ...c })).sort((a,b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()) 
      : users;

    return (
      <View style={styles.rosterContainer}>
        <View style={styles.rosterTabs}>
          <TouchableOpacity 
            style={[styles.rosterTab, adminPlayerTab === 'recent' && styles.rosterTabActive]} 
            onPress={() => setAdminPlayerTab('recent')}
          >
            <Text style={[styles.rosterTabText, adminPlayerTab === 'recent' && styles.rosterTabTextActive]}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.rosterTab, adminPlayerTab === 'all' && styles.rosterTabActive]} 
            onPress={() => setAdminPlayerTab('all')}
          >
            <Text style={[styles.rosterTabText, adminPlayerTab === 'all' && styles.rosterTabTextActive]}>All Players</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={listData}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={<Text style={{color:'#888', textAlign:'center', marginTop:20}}>No players found.</Text>}
          renderItem={({ item }) => {
            const tint = CLAN_COLORS[item.clan] || '#8a0f1a';
            const avatarSource = item.clan ? CLAN_IMAGES[item.clan] : null;

            return (
              <TouchableOpacity style={styles.rosterCard} onPress={() => setSelectedPlayerId(item.id)}>
                <View style={[styles.rosterAvatar, { borderColor: tint }]}>
                  {avatarSource ? (
                    <Image source={avatarSource} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarText}>{(item.display_name || '?')[0].toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName} numberOfLines={1}>
                    {item.char_name || 'No Character'}
                  </Text>
                  <Text style={styles.contactSub} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            )
          }}
        />
      </View>
    );
  };

  if (loading || !currentUser) {
    return (
      <View style={[styles.childContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#b40f1f" />
      </View>
    );
  }

  return (
    <View style={styles.childContainer}>
      
      {/* HAMBURGER MENU MODAL */}
      <Modal visible={isMenuOpen} transparent={true} animationType="fade">
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={styles.menuBackdrop} onPress={() => setIsMenuOpen(false)} />
          <View style={styles.menuContent}>
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Text style={styles.menuAvatarText}>{currentUser.display_name[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.menuUserName}>{currentUser.display_name}</Text>
              <Text style={styles.menuUserEmail}>{currentUser.email}</Text>
            </View>
            <View style={styles.menuItems}>
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#e8e8ea" />
                <Text style={styles.menuItemText}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleClearCache}>
                <Ionicons name="trash-bin-outline" size={24} color="#ff6b6b" />
                <Text style={[styles.menuItemText, { color: '#ff6b6b' }]}>Clear Cache</Text>
              </TouchableOpacity>
            </View>
            <View style={{flex: 1}} />
            <View style={styles.menuFooter}>
              <Text style={styles.footerBrand}>Erebus Portal</Text>
              <Text style={styles.footerByline}>
                Athens Through-Time LARP{'\n'}Powered by Cerebral Productions
              </Text>
              <TouchableOpacity onPress={() => openLink('https://www.paradoxinteractive.com/games/world-of-darkness/community/dark-pack-agreement')}>
                <Text style={styles.footerLink}>Dark Pack Agreement</Text>
              </TouchableOpacity>
              <Text style={styles.footerLegal}>
                Portions of the materials are the copyrights and trademarks of Paradox Interactive AB, and are used with permission. Unofficial fan content.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* MAIN VIEW CONTENT */}
      {!selectedContact ? (
        <View style={styles.mainView}>
          <View style={styles.homeHeader}>
            <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={styles.menuBtn}>
              <Ionicons name="menu" size={28} color="#e8e8ea" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>SchreckNet Comms</Text>
            <View style={{width: 28}} /> 
          </View>

          <FlatList
            data={[
              ...groups.map(g => ({ ...g, type: 'group' })),
              ...users.map(u => ({ ...u, type: 'user' })),
              ...npcs.map(n => ({ ...n, type: 'npc' }))
            ]}
            keyExtractor={item => `${item.type}-${item.id}`}
            renderItem={({ item }) => renderContact({ item, type: item.type })}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      ) : (
        <KeyboardAvoidingView 
          style={styles.chatContainer} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity 
              onPress={() => {
                if (isAdmin && selectedContact.type === 'npc' && selectedPlayerId) {
                  setSelectedPlayerId(null); // Go back to Roster
                } else {
                  setSelectedContact(null); // Go back to Contacts
                }
              }} 
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={26} color="#b40f1f" />
              <Text style={styles.backBtnText}>
                {isAdmin && selectedContact.type === 'npc' && selectedPlayerId ? 'Roster' : 'Contacts'}
              </Text>
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatTitle} numberOfLines={1}>
                {isAdmin && selectedContact.type === 'npc' && selectedPlayerId
                  ? `${selectedContact.name} ➜ ${users.find(u => u.id === selectedPlayerId)?.char_name || 'Player'}`
                  : (selectedContact.char_name || selectedContact.name || selectedContact.display_name)}
              </Text>
              {selectedContact.clan && !selectedPlayerId && (
                <Text style={styles.chatSubtitle}>{selectedContact.clan}</Text>
              )}
            </View>
          </View>

          {/* RENDER ROSTER OR CHAT MESSAGES */}
          {isAdmin && selectedContact.type === 'npc' && !selectedPlayerId ? (
            renderAdminRoster()
          ) : (
            <>
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
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                
                <View style={styles.inputRow}>
                  <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
                    <Ionicons name="image-outline" size={26} color="#a3a3ad" />
                  </TouchableOpacity>
                  
                  <View style={styles.textInputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      value={text}
                      onChangeText={setText}
                      placeholder="Message..."
                      placeholderTextColor="#888"
                      multiline
                      keyboardType="default" 
                    />
                  </View>
                  
                  <TouchableOpacity 
                    onPress={sendMessage} 
                    style={[styles.sendBtn, (!text.trim() && !imageUri) && styles.sendBtnDisabled]}
                    disabled={!text.trim() && !imageUri}
                  >
                    <MaterialCommunityIcons name="send" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  childContainer: { flex: 1, backgroundColor: '#0b0b0c' },
  mainView: { flex: 1 },
  homeHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: '#1f1f24', backgroundColor: '#141418',
  },
  headerTitle: {
    color: '#e8e8ea', fontSize: 20, fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', letterSpacing: 1,
  },
  menuBtn: { padding: 4 },
  menuOverlay: { flex: 1, flexDirection: 'row' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  menuContent: {
    width: width * 0.75, backgroundColor: '#141418', borderRightWidth: 1,
    borderRightColor: '#1f1f24', paddingTop: Platform.OS === 'ios' ? 50 : 20, 
  },
  menuHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f24', alignItems: 'center' },
  menuAvatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#b40f1f',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  menuAvatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  menuUserName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  menuUserEmail: { color: '#a3a3ad', fontSize: 13, marginTop: 4 },
  menuItems: { padding: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  menuItemText: { color: '#e8e8ea', fontSize: 16, marginLeft: 16, fontWeight: '500' },
  menuFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#1f1f24', backgroundColor: '#0b0b0c' },
  footerBrand: {
    color: '#b40f1f', fontSize: 16, fontWeight: 'bold', marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  footerByline: { color: '#a3a3ad', fontSize: 11, marginBottom: 12, lineHeight: 16 },
  footerLink: { color: '#8ab4f8', fontSize: 12, textDecorationLine: 'underline', marginBottom: 12 },
  footerLegal: { color: '#666', fontSize: 9, lineHeight: 14 },
  contactCard: {
    flexDirection: 'row', padding: 14, marginHorizontal: 10, marginTop: 8,
    backgroundColor: '#141418', borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#1f1f24',
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#2a2a30',
    justifyContent: 'center', alignItems: 'center', marginRight: 14, overflow: 'hidden',
  },
  avatarImg: { width: '90%', height: '90%', resizeMode: 'contain' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  contactInfo: { flex: 1, justifyContent: 'center' },
  contactName: { color: '#e8e8ea', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  contactSub: { color: '#a3a3ad', fontSize: 13 },
  badge: {
    backgroundColor: '#b40f1f', minWidth: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  chatContainer: { flex: 1 },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1f1f24', backgroundColor: '#141418',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 12, paddingRight: 8 },
  backBtnText: { color: '#b40f1f', fontSize: 16, fontWeight: '500', marginLeft: 2 },
  chatHeaderInfo: { flex: 1 },
  chatTitle: { color: '#e8e8ea', fontSize: 16, fontWeight: 'bold' },
  chatSubtitle: { color: '#a3a3ad', fontSize: 12, marginTop: 2 },
  messagesList: { padding: 16 },
  messageRow: { marginBottom: 16, flexDirection: 'row' },
  msgLeft: { justifyContent: 'flex-start' },
  msgRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  bubbleTheirs: { backgroundColor: '#1f1f24', borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: '#8a0f1a', borderBottomRightRadius: 4 },
  senderName: { color: '#a3a3ad', fontSize: 11, marginBottom: 4, fontWeight: 'bold' },
  messageText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  timestamp: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  chatImage: { width: 220, height: 220, borderRadius: 12, marginBottom: 8 },
  inputContainer: {
    borderTopWidth: 1, borderTopColor: '#1f1f24', paddingHorizontal: 12,
    paddingVertical: 10, backgroundColor: '#141418',
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  attachBtn: { padding: 8, marginRight: 4, justifyContent: 'center', alignItems: 'center' },
  textInputWrapper: {
    flex: 1, backgroundColor: '#1f1f24', borderRadius: 20, borderWidth: 1, borderColor: '#2b2330',
    minHeight: 40, maxHeight: 120, justifyContent: 'center', paddingHorizontal: 16, marginRight: 8,
  },
  textInput: { color: '#e8e8ea', fontSize: 16, paddingTop: 10, paddingBottom: 10 },
  sendBtn: {
    backgroundColor: '#b40f1f', width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', shadowColor: '#ff2c52',
    shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  sendBtnDisabled: { backgroundColor: '#333', shadowOpacity: 0, elevation: 0 },
  imagePreviewContainer: { position: 'relative', marginBottom: 10, alignSelf: 'flex-start', marginLeft: 44 },
  imagePreview: { width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderColor: '#444' },
  removeImage: {
    position: 'absolute', top: -8, right: -8, backgroundColor: '#b40f1f', borderRadius: 12,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#141418',
  },

  /* --- ADMIN ROSTER STYLES --- */
  rosterContainer: { flex: 1, backgroundColor: '#0b0b0c' },
  rosterTabs: { flexDirection: 'row', backgroundColor: '#141418', borderBottomWidth: 1, borderColor: '#1f1f24' },
  rosterTab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  rosterTabActive: { borderBottomColor: '#b40f1f' },
  rosterTabText: { color: '#888', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  rosterTabTextActive: { color: '#fff' },
  rosterCard: {
    flexDirection: 'row', padding: 12, marginHorizontal: 10, marginTop: 8,
    backgroundColor: '#141418', borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#1f1f24',
  },
  rosterAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2a2a30',
    justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden', borderWidth: 2,
  }
});