import { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { Sidebar } from './components/Sidebar';
import { Profile } from './components/Profile';
import { Menu } from 'lucide-react';
import axios from 'axios';

// Configure axios base URL
axios.defaults.baseURL = 'http://localhost:8000';

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
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleUserChange = (userId: number) => {
    setCurrentUserId(userId);
    setCurrentConversationId(null);
    setShowProfile(false);
  };

  const handleProfileClick = () => {
    setShowProfile(true);
    setCurrentConversationId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
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
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-md flex items-center px-4 justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg md:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Agentic AI Tutor
            </h1>
          </div>
          <div className="text-xs text-gray-500 hidden sm:block">
            Powered by Claude & Local LLM
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {showProfile ? (
            <Profile userId={currentUserId} onClose={() => setShowProfile(false)} />
          ) : currentConversationId ? (
            <Chat
              conversationId={currentConversationId}
              onRollover={(newId) => {
                fetchConversations();
                setCurrentConversationId(newId);
              }}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <div className="max-w-md space-y-6">
                <h2 className="text-2xl font-bold text-white">Welcome to AI Tutor</h2>
                <p>Start a new conversation to begin your personalized learning journey.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => handleNewChat(false)}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                  >
                    Start Learning
                  </button>
                  <button
                    onClick={() => handleNewChat(true)}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-xl font-medium transition-colors"
                  >
                    Guest Mode
                  </button>
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
