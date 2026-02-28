// app/emails.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Dimensions, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import { useRouter } from 'expo-router';
import api from '../constants/api';

const { width } = Dimensions.get('window');

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase().slice(0, 2);
};

const getColor = (str) => {
  if (!str) return '#333';
  const colors = ['#b71c1c', '#880e4f', '#4a148c', '#311b92', '#1a237e', '#01579b', '#006064', '#004d40', '#1b5e20', '#33691e', '#827717', '#f57f17', '#ff6f00', '#e65100', '#bf360c'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

export default function EmailScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyBody, setReplyBody] = useState('');
  
  const [composeOpen, setComposeOpen] = useState(false);
  const [formTo, setFormTo] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    const setup = async () => {
      try {
        const t = await AsyncStorage.getItem('token');
        if (t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
        const meRes = await api.get('/auth/me');
        setCurrentUser(meRes.data.user);
        await loadEmails(meRes.data.user.role === 'admin');
      } catch (e) {
        console.error("Auth failed in emails");
      }
    };
    setup();
  }, []);

  const loadEmails = async (isAdmin) => {
    setLoading(true);
    try {
      const url = isAdmin ? '/admin/emails/threads' : '/emails/my-inbox';
      const { data } = await api.get(url);
      setThreads(data.threads || []);
    } catch (e) {
      Alert.alert("Error", "Could not load emails");
    } finally {
      setLoading(false);
    }
  };

  const openThread = async (t) => {
    setSelectedThread(t);
    const isAdmin = currentUser?.role === 'admin';
    try {
      const url = isAdmin ? `/admin/emails/threads/${t.id}` : `/emails/thread/${t.id}`;
      const { data } = await api.get(url);
      setMessages(data.messages || []);
      setThreads(prev => prev.map(th => th.id === t.id ? { ...th, unread_count: 0 } : th));
    } catch (e) {
      Alert.alert("Error", "Could not load thread");
      setSelectedThread(null);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim()) return;
    const isAdmin = currentUser?.role === 'admin';
    try {
      const endpoint = isAdmin ? '/admin/emails/reply' : '/emails/send';
      await api.post(endpoint, { thread_id: selectedThread.id, body: replyBody });
      setReplyBody('');
      openThread(selectedThread); // Reload messages
    } catch (e) {
      Alert.alert("Error", "Failed to send reply");
    }
  };

  const handleSendNew = async () => {
    if (!formTo.trim() || !formSubject.trim() || !formBody.trim()) {
        Alert.alert("Error", "Please fill all fields");
        return;
    }
    try {
      await api.post('/emails/send', { to_email: formTo, subject: formSubject, body: formBody });
      setComposeOpen(false);
      setFormTo(''); setFormSubject(''); setFormBody('');
      loadEmails(currentUser?.role === 'admin');
      Alert.alert("Success", "Email sent via Erebus ISP.");
    } catch (e) {
      if (e.response?.status === 404) Alert.alert("Delivery Failed", "Address does not exist on this server.");
      else Alert.alert("Error", "Failed to send email");
    }
  };

  const renderThreadItem = ({ item }) => {
    const isAdmin = currentUser?.role === 'admin';
    const senderName = isAdmin ? item.user_name : item.from_name;
    const isUnread = item.unread_count > 0;

    return (
      <TouchableOpacity style={[styles.threadCard, isUnread && styles.threadUnread]} onPress={() => openThread(item)}>
        <View style={[styles.avatar, { backgroundColor: getColor(senderName) }]}>
          <Text style={styles.avatarText}>{getInitials(senderName)}</Text>
        </View>
        <View style={styles.threadInfo}>
          <View style={styles.threadRow}>
            <Text style={[styles.senderText, isUnread && styles.boldText]} numberOfLines={1}>{senderName}</Text>
            <Text style={styles.dateText}>{new Date(item.updated_at).toLocaleDateString()}</Text>
          </View>
          <Text style={[styles.subjectText, isUnread && styles.boldText]} numberOfLines={1}>{item.subject}</Text>
          <Text style={styles.snippetText} numberOfLines={1}>
             {item.snippet ? item.snippet.replace(/<[^>]+>/g, '').slice(0, 40) : '...'}
          </Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }) => {
    const isAdmin = currentUser?.role === 'admin';
    let msgName = 'Unknown';
    if (item.sender_type === 'user') {
        msgName = isAdmin ? selectedThread.user_name : 'Me';
    } else {
        msgName = isAdmin ? selectedThread.identity_name : selectedThread.from_name;
    }

    return (
      <View style={styles.messageBox}>
        <View style={styles.msgHeader}>
          <View style={[styles.avatarSmall, { backgroundColor: getColor(msgName) }]}>
            <Text style={styles.avatarTextSmall}>{getInitials(msgName)}</Text>
          </View>
          <View>
            <Text style={styles.msgAuthor}>{msgName}</Text>
            <Text style={styles.dateText}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.htmlWrapper}>
            <RenderHtml
                contentWidth={width - 60}
                source={{ html: item.body }}
                tagsStyles={{ p: { color: '#e8e8ea', marginVertical: 4 }, div: { color: '#e8e8ea' } }}
            />
        </View>
      </View>
    );
  };

  if (loading || !currentUser) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#b40f1f" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {!selectedThread ? (
        <View style={styles.mainView}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>ISP Inbox</Text>
            {currentUser?.role !== 'admin' && (
                <TouchableOpacity onPress={() => setComposeOpen(true)} style={styles.composeBtn}>
                <Ionicons name="pencil" size={20} color="#fff" />
                </TouchableOpacity>
            )}
          </View>
          
          {/* --- ADDED MODE SWITCHER --- */}
          <View style={styles.modeSwitchContainer}>
            <TouchableOpacity 
              style={styles.modeButton} 
              onPress={() => router.replace('/')}
            >
              <Text style={styles.modeTitle}>SchreckNet</Text>
              <Text style={styles.modeSubtitle}>Everything here is safe.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeButton, styles.activeModeButton]}>
              <Text style={[styles.modeTitle, styles.activeModeTitle]}>Surface Web</Text>
              <Text style={[styles.modeSubtitle, styles.activeModeSubtitle]}>Be careful, you are not safe.</Text>
            </TouchableOpacity>
          </View>
          {/* --------------------------- */}

          <FlatList
            data={threads}
            keyExtractor={t => t.id.toString()}
            renderItem={renderThreadItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>Inbox is empty.</Text>}
          />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.mainView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedThread(null)} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#b40f1f" />
              <Text style={styles.backBtnText}>Inbox</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedThread.subject}</Text>
            <View style={{width: 60}}/>
          </View>
          
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={m => m.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.replyContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Draft your reply..."
              placeholderTextColor="#888"
              multiline
              value={replyBody}
              onChangeText={setReplyBody}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleReply} disabled={!replyBody.trim()}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Compose Modal */}
      <Modal visible={composeOpen} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setComposeOpen(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>New Message</Text>
                <TouchableOpacity onPress={handleSendNew}>
                    <Text style={styles.sendText}>Send</Text>
                </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
                <TextInput style={styles.inputField} placeholder="To: (e.g. mayor@city.gov)" placeholderTextColor="#666" value={formTo} onChangeText={setFormTo} autoCapitalize="none" />
                <View style={styles.separator} />
                <TextInput style={styles.inputField} placeholder="Subject:" placeholderTextColor="#666" value={formSubject} onChangeText={setFormSubject} />
                <View style={styles.separator} />
                <TextInput style={styles.textArea} placeholder="Compose email..." placeholderTextColor="#666" value={formBody} onChangeText={setFormBody} multiline textAlignVertical="top" />
            </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0c' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0b0c' },
  mainView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#141418', borderBottomWidth: 1, borderColor: '#1f1f24' },
  headerTitle: { color: '#e8e8ea', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  modeSwitchContainer: {
    flexDirection: 'row', backgroundColor: '#141418', padding: 8,
    borderBottomWidth: 1, borderBottomColor: '#1f1f24', gap: 8,
  },
  modeButton: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center',
    borderRadius: 8, backgroundColor: '#0b0b0c', borderWidth: 1, borderColor: '#1f1f24',
  },
  activeModeButton: {
    backgroundColor: '#1a1418', borderColor: '#b40f1f',
  },
  modeTitle: {
    color: '#a3a3ad', fontSize: 14, fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  activeModeTitle: {
    color: '#b40f1f',
  },
  modeSubtitle: {
    color: '#666', fontSize: 10, marginTop: 2, textAlign: 'center',
  },
  activeModeSubtitle: {
    color: '#e8e8ea',
  },
  composeBtn: { backgroundColor: '#b40f1f', padding: 8, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 80 },
  backBtnText: { color: '#b40f1f', fontSize: 16, marginLeft: 4 },
  listContent: { padding: 12 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40 },
  threadCard: { flexDirection: 'row', backgroundColor: '#141418', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1f1f24', alignItems: 'center' },
  threadUnread: { borderColor: '#b40f1f', backgroundColor: '#1a1418' },
  avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  threadInfo: { flex: 1 },
  threadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  senderText: { color: '#e8e8ea', fontSize: 16, flex: 1, marginRight: 10 },
  dateText: { color: '#a3a3ad', fontSize: 12 },
  subjectText: { color: '#e8e8ea', fontSize: 14, marginBottom: 2 },
  snippetText: { color: '#888', fontSize: 13 },
  boldText: { fontWeight: 'bold', color: '#fff' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#b40f1f', marginLeft: 10 },
  
  messagesList: { padding: 16 },
  messageBox: { backgroundColor: '#141418', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1f1f24' },
  msgHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2b2330', paddingBottom: 10 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarTextSmall: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  msgAuthor: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  htmlWrapper: { marginTop: 4 },
  
  replyContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#141418', borderTopWidth: 1, borderColor: '#1f1f24', alignItems: 'flex-end' },
  replyInput: { flex: 1, backgroundColor: '#1f1f24', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 120, minHeight: 44, borderWidth: 1, borderColor: '#2b2330' },
  sendBtn: { backgroundColor: '#b40f1f', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  modalContainer: { flex: 1, backgroundColor: '#0b0b0c' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#1f1f24' },
  cancelText: { color: '#ff6b6b', fontSize: 16 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  sendText: { color: '#3ecf8e', fontSize: 16, fontWeight: 'bold' },
  modalBody: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  inputField: { color: '#fff', fontSize: 16, paddingVertical: 14 },
  separator: { height: 1, backgroundColor: '#1f1f24' },
  textArea: { color: '#fff', fontSize: 16, paddingVertical: 14, minHeight: 300 }
});