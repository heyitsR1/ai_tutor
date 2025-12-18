import { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { Sidebar } from './components/Sidebar';
import { Profile } from './components/Profile';
import { Settings } from './components/Settings';
import { Menu, Zap, Settings as SettingsIcon } from 'lucide-react';
import axios from 'axios';
import aiTutorIcon from './assets/ai_tutor.svg';

// Configure axios base URL
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number>(1);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`/conversations?user_id=${currentUserId}`);
      setConversations(res.data);
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [currentUserId]);

  const handleNewChat = async (isGuestMode: boolean = false) => {
    try {
      const res = await axios.post('/conversations', {
        title: isGuestMode ? "Guest Chat" : "New Chat",
        user_id: currentUserId,
        is_guest_mode: isGuestMode
      });
      const newConv = res.data;
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(newConv.id);
      setShowProfile(false);
      // On mobile, close sidebar after selection
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    } catch (err) {
      console.error("Failed to create conversation", err);
    }
  };

  const handleSelectConversation = (id: number) => {
    setCurrentConversationId(id);
    setShowProfile(false);
    setShowSettings(false);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleUserChange = (userId: number) => {
    setCurrentUserId(userId);
    setCurrentConversationId(null);
    setShowProfile(false);
  };

  const handleProfileClick = () => {
    setShowProfile(true);
    setShowSettings(false);
    setCurrentConversationId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
    setShowProfile(false);
    setCurrentConversationId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleTitleUpdate = (convId: number, newTitle: string) => {
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, title: newTitle } : c)
    );
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ color: 'var(--color-text-primary)' }}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          conversations={conversations}
          currentId={currentConversationId}
          currentUserId={currentUserId}
          onSelect={handleSelectConversation}
          onNewChat={() => handleNewChat(false)}
          onNewGuestChat={() => handleNewChat(true)}
          onUserChange={handleUserChange}
          onProfileClick={handleProfileClick}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 w-full h-full transition-all duration-300">

        {/* Subtle warm background accents */}
        <div
          className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none -mr-32 -mt-32 opacity-30"
          style={{ backgroundColor: 'var(--color-main)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none -ml-32 -mb-32 opacity-20"
          style={{ backgroundColor: 'var(--color-secondary)' }}
        />

        <header
          className="h-16 flex items-center px-4 justify-between sticky top-0 z-20 backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderBottom: '1px solid var(--color-border-light)'
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl md:hidden transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--color-secondary)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2.5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(116, 82, 59, 0.25)',
                  boxShadow: '0 2px 8px rgba(116, 82, 59, 0.25)'
                }}
              >
                <img src={aiTutorIcon} alt="Siksak" className="w-10 h-10" />
              </div>
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Siksak
              </h1>
            </div>
          </div>
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: 'var(--color-surface-warm)',
              border: '1px solid var(--color-border-light)'
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--color-success)' }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Ready to Learn
            </span>
          </div>
          {/* Settings Button */}
          <button
            onClick={handleSettingsClick}
            className="p-2 rounded-xl transition-colors hover:bg-gray-100"
            style={{ color: 'var(--color-text-secondary)' }}
            title="Settings"
          >
            <SettingsIcon size={20} />
          </button>
        </header>

        <main className="flex-1 overflow-hidden relative z-10 h-full flex flex-col">
          {showSettings ? (
            <Settings userId={currentUserId} onClose={() => setShowSettings(false)} />
          ) : showProfile ? (
            <Profile userId={currentUserId} onClose={() => setShowProfile(false)} />
          ) : currentConversationId ? (
            <Chat
              conversationId={currentConversationId}
              onRollover={(newId) => {
                fetchConversations();
                setCurrentConversationId(newId);
              }}
              onTitleUpdate={handleTitleUpdate}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="max-w-xl w-full space-y-8">

                {/* Hero Card */}
                <div
                  className="relative p-8 sm:p-10 rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border-light)',
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  {/* Subtle top accent bar */}
                  <div
                    className="absolute top-0 left-0 w-full h-1"
                    style={{ backgroundColor: 'var(--color-main)' }}
                  />

                  <div
                    className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-6 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: 'rgba(116, 82, 59, 0.25)',
                      boxShadow: '0 4px 16px rgba(175, 157, 142, 0.35)'
                    }}
                  >
                    <img src={aiTutorIcon} alt="Siksak" className="w-10 h-10" />
                  </div>

                  <h2
                    className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    Ready to Learn?
                  </h2>
                  <p
                    className="text-base max-w-md mx-auto leading-relaxed mb-8"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Your AI-powered tutor is here to help. Let's explore new concepts together at your own pace.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => handleNewChat(false)}
                      className="group px-6 py-3.5 text-white rounded-xl font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: 'var(--color-accent)',
                        boxShadow: '0 4px 12px rgba(116, 82, 59, 0.3)'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5D4130'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
                    >
                      <Zap className="w-4 h-4" />
                      Start Learning
                    </button>
                    <button
                      onClick={() => handleNewChat(true)}
                      className="px-6 py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-warm)';
                        e.currentTarget.style.borderColor = 'var(--color-main)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                      }}
                    >
                      Guest Mode
                    </button>
                  </div>

                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App

