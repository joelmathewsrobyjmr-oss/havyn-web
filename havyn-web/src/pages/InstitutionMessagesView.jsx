import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Send, MessageCircle, Package, Loader2, User } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/GlassCard';

const InstitutionMessagesView = () => {
  const { institutionId } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  
  const messagesEndRef = useRef(null);

  // 1. Fetch institution's chats
  useEffect(() => {
    if (!institutionId) return;
    const q = query(
      collection(db, 'chats'), 
      where('institutionId', '==', institutionId), 
      orderBy('lastMessageTime', 'desc')
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setChats(list);
      setLoadingChats(false);
      
      if (activeChat) {
        const updatedActive = list.find(c => c.id === activeChat.id);
        if (updatedActive) setActiveChat(updatedActive);
      } else if (list.length > 0 && window.innerWidth >= 768) {
        setActiveChat(list[0]);
      }
    }, (err) => {
      console.error('Firestore Admin Chat Error:', err);
      setLoadingChats(false);
    });

    return () => unsub();
  }, [institutionId, activeChat]);

  // 2. Fetch messages for active chat
  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, 'chats', activeChat.id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.error('Firestore Admin Message Error:', err);
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
        senderId: institutionId,
        role: 'institution',
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={40} color="var(--primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', animation: 'fadeIn 0.3s ease-out' }}>
      
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'var(--text)' }}>Messages</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Respond to donors who have accepted your supply needs.</p>
      </header>

      <GlassCard style={{ padding: 0, display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Side: Chat List (Hidden on mobile if activeChat exists) */}
        <div style={{ 
          width: '350px', borderRight: '1px solid var(--border)', display: activeChat ? 'none' : 'flex', flexDirection: 'column', 
          background: 'var(--surface)' 
        }} className="chat-list-container">
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', background: 'white' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <MessageCircle size={20} color="var(--primary)" /> Active Chats
            </h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {chats.length > 0 ? chats.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)}
                style={{ 
                  padding: '1.25rem', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: activeChat?.id === chat.id ? 'var(--primary-light)' : 'white',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h4 style={{ fontWeight: '700', fontSize: '1rem', margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} color="var(--text-muted)" /> {chat.donorName}
                  </h4>
                </div>
                <p style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {chat.donorEmail}
                </p>
                <p style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(59,130,246,0.1)', padding: '4px 8px', borderRadius: '4px', width: 'fit-content' }}>
                  <Package size={12} /> {chat.needTitle}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                  {chat.lastMessage}
                </p>
              </div>
            )) : (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <MessageCircle size={40} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>No active chats.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Chats will appear here when a donor accepts a supply need.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Chat Window */}
        <div style={{ flex: 1, display: activeChat ? 'flex' : 'none', flexDirection: 'column', background: 'white' }} className="chat-window-container">
          {activeChat ? (
            <>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface)' }}>
                <button 
                  onClick={() => setActiveChat(null)} 
                  style={{ background: 'var(--primary-light)', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                  className="show-on-mobile-only"
                >
                  <ArrowLeft size={18} />
                </button>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1.1rem' }}>{activeChat.donorName?.charAt(0)}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeChat.donorName}</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeChat.donorEmail}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--primary)', background: 'var(--primary-light)', padding: '6px 16px', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)' }}>
                    Fulfilling Supply Need: <strong>{activeChat.needTitle}</strong>
                  </span>
                </div>
                
                {messages.map((msg) => {
                  const isMe = msg.role === 'institution';
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ 
                        maxWidth: '70%', 
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
              <form onSubmit={handleSendMessage} style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', background: 'white' }}>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  style={{ flex: 1, padding: '0.85rem 1.25rem', borderRadius: '99px', border: '1px solid var(--border)', background: '#f1f5f9', outline: 'none', fontFamily: 'inherit', fontSize: '1rem' }}
                />
                <button type="submit" disabled={!newMessage.trim()} style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newMessage.trim() ? 'pointer' : 'not-allowed', opacity: newMessage.trim() ? 1 : 0.5, transition: 'all 0.2s', padding: 0 }}>
                  <Send size={20} style={{ marginLeft: '2px' }} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)', background: '#f8fafc' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                <MessageCircle size={40} color="var(--border)" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text)', marginBottom: '0.5rem' }}>Your Messages</h2>
              <p style={{ fontSize: '1rem' }}>Select a chat from the sidebar to start corresponding.</p>
            </div>
          )}
        </div>
      </GlassCard>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (max-width: 767px) {
          .chat-list-container { width: 100% !important; border: none !important; }
          .chat-window-container { width: 100% !important; }
          .show-on-mobile-only { display: flex !important; }
        }
        @media (min-width: 768px) {
          .chat-list-container { display: flex !important; }
          .chat-window-container { display: flex !important; }
          .show-on-mobile-only { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default InstitutionMessagesView;
