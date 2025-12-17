import { useState, useEffect } from 'react';
import { Chat } from './components/Chat';
import { Sidebar } from './components/Sidebar';
import { Profile } from './components/Profile';
import { Menu, Sparkles, Zap, BrainCircuit } from 'lucide-react';
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
    <div className="flex h-screen overflow-hidden text-slate-800 font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
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

        {/* Dynamic Background Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -mr-40 -mt-40 mix-blend-multiply"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -ml-40 -mb-40 mix-blend-multiply"></div>

        <header className="h-16 border-b border-indigo-100 bg-white/70 backdrop-blur-xl flex items-center px-4 justify-between shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-xl md:hidden text-slate-600 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <BrainCircuit className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">
                Siksak
              </h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/50 border border-white/50 rounded-full shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-500">SYSTEM ONLINE</span>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative z-10 h-full flex flex-col">
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
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="max-w-2xl w-full space-y-10 relative">

                {/* Hero Card */}
                <div className="relative bg-white/80 backdrop-blur-xl border border-indigo-50 p-8 sm:p-12 rounded-3xl shadow-2xl shadow-indigo-500/10 overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600"></div>

                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-purple-500/30 mb-6 rotate-3 hover:rotate-6 transition-transform duration-500">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>

                  <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 mb-4 tracking-tight">
                    Ready to Learn?
                  </h2>
                  <p className="text-lg text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Your AI-powered mentor is ready. Experience adaptive learning with the new <span className="font-semibold text-indigo-600">Siksak</span> engine.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                    <button
                      onClick={() => handleNewChat(false)}
                      className="group relative px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="relative z-10 flex items-center gap-2">
                        <Zap className="w-5 h-5 fill-current" />
                        Start Learning
                      </span>
                    </button>
                    <button
                      onClick={() => handleNewChat(true)}
                      className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl font-bold transition-all shadow-sm flex items-center justify-center hover:border-slate-300"
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
