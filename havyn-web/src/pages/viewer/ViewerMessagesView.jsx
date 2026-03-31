import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Send, MessageCircle, Package, Loader2, Building2 } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import GlassCard from '../../components/GlassCard';

const ViewerMessagesView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialChatId = queryParams.get('chatId');

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  
  const messagesEndRef = useRef(null);

  // 1. Fetch user's chats
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('donorId', '==', user.uid), orderBy('lastMessageTime', 'desc'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setChats(list);
      setLoadingChats(false);
      
      // Auto-select chat if passed in URL and not already selected
      if (initialChatId && !activeChat) {
        const chatToSelect = list.find(c => c.id === initialChatId);
        if (chatToSelect) setActiveChat(chatToSelect);
      }
    });

    return () => unsub();
  }, [user, initialChatId, activeChat]);

  // 2. Fetch messages for active chat
  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, 'chats', activeChat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      // Auto-scroll to bottom
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsub();
  }, [activeChat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      // Add message
      await addDoc(collection(db, 'chats', activeChat.id, 'messages'), {
        senderId: user.uid,
        role: 'donor',
        text,
        createdAt: serverTimestamp()
      });

      // Update chat lastMessage
      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: text,
        lastMessageTime: serverTimestamp()
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  if (loadingChats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      <button 
        onClick={() => navigate('/viewer/dashboard')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: '600', width: 'fit-content' }}
      >
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <GlassCard style={{ padding: 0, display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 120px)' }}>
        
        {/* Left Side: Chat List (Hidden on mobile if activeChat exists) */}
        <div style={{ 
          width: '320px', borderRight: '1px solid var(--border)', display: activeChat ? 'none' : 'flex', flexDirection: 'column', 
          background: 'var(--surface)' 
        }} className="chat-list-container">
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'white' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <MessageCircle size={20} color="var(--primary)" /> Messages
            </h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {chats.length > 0 ? chats.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)}
                style={{ 
                  padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: activeChat?.id === chat.id ? 'var(--primary-light)' : 'white',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem', margin: 0, color: 'var(--text)' }}>{chat.institutionName}</h4>
                </div>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Package size={12} /> {chat.needTitle}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                  {chat.lastMessage}
                </p>
              </div>
            )) : (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <MessageCircle size={40} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>No messages yet.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>When you accept a supply need, your chat will appear here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Chat Window */}
        <div style={{ flex: 1, display: activeChat ? 'flex' : 'none', flexDirection: 'column', background: 'white' }} className="chat-window-container">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface)' }}>
                <button onClick={() => setActiveChat(null)} className="back-to-list-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <ArrowLeft size={20} />
                </button>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>{activeChat.institutionName}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Fulfilling: {activeChat.needTitle}
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', background: '#e2e8f0', padding: '4px 12px', borderRadius: '12px' }}>
                    Chat started to fulfill "{activeChat.needTitle}"
                  </span>
                </div>
                
                {messages.map((msg) => {
                  const isMe = msg.role === 'donor';
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ 
                        maxWidth: '75%', 
                        padding: '12px 16px', 
                        borderRadius: '16px', 
                        borderBottomRightRadius: isMe ? '4px' : '16px',
                        borderBottomLeftRadius: isMe ? '16px' : '4px',
                        background: isMe ? 'var(--primary)' : 'white', 
                        color: isMe ? 'white' : 'var(--text)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        border: isMe ? 'none' : '1px solid var(--border)'
                      }}>
                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.4' }}>{msg.text}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.65rem', color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', textAlign: 'right' }}>
                          {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.75rem', background: 'white' }}>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: '0.85rem 1.25rem', borderRadius: '99px', border: '1px solid var(--border)', background: '#f1f5f9', outline: 'none', fontFamily: 'inherit' }}
                />
                <button type="submit" disabled={!newMessage.trim()} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', opacity: newMessage.trim() ? 1 : 0.5, transition: 'all 0.2s' }}>
                  <Send size={20} style={{ marginLeft: '4px' }} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
              <MessageCircle size={64} style={{ opacity: 0.1, marginBottom: '1rem' }} />
              <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>Select a chat to view messages</p>
            </div>
          )}
        </div>
      </GlassCard>

      <style>{`
        @media (min-width: 768px) {
          .chat-list-container { display: flex !important; }
          .chat-window-container { display: flex !important; }
          .back-to-list-btn { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default ViewerMessagesView;
