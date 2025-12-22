#  Siksak AI Tutor

An intelligent, **agentic AI tutoring system** with long-term memory, gamification, and personalized learning experiences. Built with a ReAct (Reasoning + Acting) loop architecture that autonomously decides when to use tools, store memories, and adapt to learner needs.

<p align="center">
  <img src="ai_tutor.svg" alt="Siksak AI Tutor" width="120" height="120" />
</p>

---

## Key Features

### Agentic Capabilities
- **ReAct Loop Architecture**: Autonomous reasoning with multi-step tool calling (max 5 iterations per request)
- **Autonomous Decision Making**: AI decides when to save memories, generate quizzes, or search for resources
- **Context-Aware Responses**: Maintains conversation history + retrieved memories for personalized interactions

### Long-Term Memory (RAG)
- **Persistent Memory**: User profiles, learning preferences, and progress stored across sessions
- **Vector Similarity Search**: Uses `pgvector` with 384-dimensional embeddings for semantic retrieval
- **Spaced Repetition System (SRS)**: Automatically schedules topic reviews based on performance

###  Gamification System
- **XP & Leveling**: Earn points for correct answers, engagement, and learning milestones
- **Streak Tracking**: Daily streak counter to encourage consistent learning
- **Level Titles**: Progress from Novice → Apprentice → Scholar → Sage → Master → Grandmaster

###  Interactive Tools
| Tool | Description |
|------|-------------|
| **Quiz Generator** | 3-question interactive quizzes with visual UI |
| **Cheatsheet Generator** | Print-ready HTML cheatsheets with branding |
| **Web Search** | DuckDuckGo integration for curated learning resources |
| **Memory Manager** | Stores and retrieves user context autonomously |

###  Multi-Provider LLM Support
- **Anthropic Claude** (Default): Claude 3 Haiku
- **OpenAI GPT**: GPT-4 compatible
- **Groq**: Lightning-fast inference with Llama 3
- **Local LLM**: Ollama/vLLM support via OpenAI-compatible API

---

##  Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER (Browser)                            │
│                        Frontend (React/Vite)                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/REST API
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI + Python)                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐     │
│  │   main.py    │────▶│   agent.py   │────▶│    llm.py        │     │
│  │  (Endpoints) │     │  (ReAct Loop)│     │ (LLM Provider)   │     │
│  └──────────────┘     └──────────────┘     └──────────────────┘     │
│         │                    │                       │              │
│         │                    ▼                       │              │
│         │            ┌──────────────┐                │              │
│         │            │  memory.py   │                │              │
│         │            │(Vector Store)│                │              │
│         │            └──────────────┘                │              │
│         │                    │                       │              │
│         └────────────────────┼───────────────────────┘              │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              PostgreSQL + pgvector (Database)               │    │
│  │    - Users, Conversations, Messages                         │    │
│  │    - Memories (with 384-dim embeddings for similarity)      │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                               │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐     │
│  │   Anthropic  │     │    Groq      │     │   DuckDuckGo     │     │
│  │   Claude API │     │   LLM API    │     │   Search API     │     │
│  └──────────────┘     └──────────────┘     └──────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

---

##  Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) + TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: Framer Motion
- **HTTP Client**: Axios

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11)
- **Database**: PostgreSQL 16 + `pgvector` extension
- **ORM**: SQLAlchemy (Async)
- **Embeddings**: Sentence Transformers (`all-MiniLM-L6-v2`)
- **LLM SDKs**: Anthropic, OpenAI

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL with `pgvector` extension

---

##  Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- Node.js 18+ (for local frontend development only)
- Python 3.11+ (for local backend development only)
- At least one LLM API Key (Anthropic, OpenAI, or Groq)

---

##  Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository_url>
   cd ai_tutor
   ```

2. **Environment Setup**
   Create a `.env` file in the root directory:
   ```bash
   # Required: At least one LLM API key
   ANTHROPIC_API_KEY=your_anthropic_key_here
   
   # Optional: Additional providers
   OPENAI_API_KEY=your_openai_key_here
   GROQ_API_KEY=your_groq_key_here
   
   # Optional: LLM provider selection (default: anthropic)
   LLM_PROVIDER=anthropic  # Options: anthropic, openai, groq, local
   ```

3. **Start with Docker**
   ```bash
   docker compose --profile dev up --build
   ```
   
   This will start:
   - **Frontend**: http://localhost:5173
   - **Backend**: http://localhost:8000
   - **Database**: localhost:5435

4. **Access the Application**
   Open your browser and navigate to `http://localhost:5173`

---

##  Manual Development Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
./start.sh  # or uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

##  API Documentation

Once the backend is running, access the interactive API docs (Swagger UI) at:
`http://localhost:8000/docs`

### Key Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/conversations` | POST | Create a new chat session |
| `/conversations/{id}/messages` | POST | Send a message to the AI |
| `/conversations/{id}/title` | PATCH | Update conversation title |
| `/memories` | GET | Retrieve stored memories for user |
| `/memories` | DELETE | Flush user memory |
| `/llm-settings` | POST | Configure LLM provider per user |

---

##  Project Structure

```
.
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── agent.py            # ReAct loop & tool execution
│   │   ├── llm.py              # Multi-provider LLM abstraction
│   │   ├── memory.py           # RAG/Vector memory management
│   │   ├── models.py           # SQLAlchemy database models
│   │   └── main.py             # API endpoints
│   └── requirements.txt
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/         # UI components (Chat, Quiz, etc.)
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml          # Container orchestration
├── project_explanation.md      # Technical documentation
├── demo_flow.md                # Demo narrative & user story
└── .env                        # Configuration (create this)
```

---

##  What Makes Siksak Different?

| Feature | Siksak | ChatGPT/Claude |
|---------|--------|----------------|
| **Long-term Memory** | ✅ Persists across sessions | ❌ Starts fresh |
| **Spaced Repetition** | ✅ Tracks learning over time | ❌ No learning tracking |
| **Gamification** | ✅ XP, levels, streaks | ❌ No motivation system |
| **Interactive Quizzes** | ✅ Visual quiz cards | ❌ Text-only |
| **Learning Context** | ✅ Knows user's level | ❌ No personalization |
| **One-Click Actions** | ✅ Quiz/Cheatsheet/Resources | ❌ Manual prompting |

---

##  Future Roadmap

- [ ] Course/curriculum builder (multi-week learning paths)
- [ ] Voice input for hands-free learning
- [ ] Code execution sandbox for programming topics
- [ ] Export learning progress as PDF certificate
- [ ] Multi-language support

---

##  License

[MIT](LICENSE)
