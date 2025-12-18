# Siksak AI Tutor - Presentation Outline

> 10-slide structure for demo presentation (for AI presentation generator)

---

## Slide 1: Title Slide

**Title:** Siksak - An Agentic AI Tutor  
**Subtitle:** Personalized Learning with Long-Term Memory & Gamification  
**Visual:** Siksak logo (ai_tutor.svg) centered  
**Tagline:** "Learn smarter, not harder."

---

## Slide 2: The Problem

**Title:** Why Traditional AI Tutors Fall Short

**Content:**
- ChatGPT/Claude forget everything after each session
- No tracking of learning progress or mastery
- No motivation system to keep learners engaged
- Users must manually type commands for quizzes, resources, etc.
- Generic responses that don't adapt to the learner's level

**Visual:** Split screen showing a frustrated student vs. happy student with Siksak

---

## Slide 3: Introducing Siksak

**Title:** Meet Siksak - Your Personal AI Tutor

**Content:**
- An **agentic AI system** that remembers you across sessions
- Built with a **ReAct (Reasoning + Acting) loop** for autonomous decision-making
- Stores user profiles, learning preferences, and progress in **long-term memory**
- Features **gamification** with XP, levels, and streaks to boost motivation
- **One-click tools**: Quiz, Cheatsheet, Web Search - no prompting needed

**Visual:** Screenshot of Siksak chat interface with Quick Actions visible

---

## Slide 4: System Architecture

**Title:** How Siksak Works

**Content:**
```
User (Browser) 
    ↓ HTTP/REST
Backend (FastAPI)
    ├── agent.py (ReAct Loop - max 5 iterations)
    ├── llm.py (Multi-Provider: Claude, GPT, Groq, Local)
    └── memory.py (Vector Store with pgvector)
        ↓
PostgreSQL + pgvector
    └── 384-dim embeddings for semantic search
        ↓
External Services
    ├── Anthropic Claude API
    ├── Groq API
    └── DuckDuckGo Search
```

**Visual:** Architecture diagram (ASCII or visual flowchart)

---

## Slide 5: The Agentic Core - ReAct Loop

**Title:** Autonomous Reasoning & Acting

**Content:**
1. **OBSERVE**: Receive user message + retrieve relevant memories
2. **THINK**: LLM processes with system prompt and context
3. **ACT**: LLM may call tools (save_memory, present_quiz, web_search, etc.)
4. **OBSERVE**: Tool results returned to LLM
5. **THINK**: LLM integrates results
6. **RESPOND**: Final response delivered to user

**Key Point:** The loop continues until no more tool calls needed (max 5 iterations)

**Visual:** Circular flowchart showing the ReAct cycle

---

## Slide 6: Long-Term Memory System

**Title:** Remembering Every Learner

**Content:**
- **Vector Embeddings**: Uses `sentence-transformers` (all-MiniLM-L6-v2) for 384-dim vectors
- **Semantic Search**: `pgvector` extension enables similarity-based memory retrieval
- **Memory Categories**:
  - `user_profile`: Facts about the user ("User is a college freshman")
  - `learning_preference`: How they like to learn ("Prefers visual examples")
  - `learning_progress`: Concept mastery states ("Python Loops: Practicing")
- **Spaced Repetition (SRS)**: Automatically schedules reviews based on performance

**Visual:** Diagram showing embedding → vector store → similarity search

---

## Slide 7: Agentic Tools in Action

**Title:** Tools the AI Can Use Autonomously

| Tool | Purpose | When Used |
|------|---------|-----------|
| `save_memory` | Store facts about user | Learning preferences, profile info |
| `update_concept_state` | Track learning progress | After teaching or testing |
| `manage_gamification` | Award XP | Correct answers, engagement |
| `present_quiz` | Visual 3-question quiz | [ACTION: QUIZ] trigger |
| `web_search` | Search learning resources | [ACTION: RESOURCES] trigger |
| `generate_cheatsheet` | Print-ready HTML cheatsheet | [ACTION: CHEATSHEET] trigger |

**Visual:** Screenshots of Quiz Card, Cheatsheet Card, and Resources Card

---

## Slide 8: Gamification & Motivation

**Title:** XP, Levels, and Streaks

**Content:**
- **XP System**: 
  - +100 XP per correct quiz answer
  - -50 XP for using hints
  - +10-50 XP for good engagement
- **Level Progression**:
  - Level 1: Novice (0-100 XP)
  - Level 2: Apprentice (100-300 XP)
  - Level 3: Scholar (300-600 XP)
  - Level 4: Sage (600-1000 XP)
  - Level 5+: Master, Grandmaster, Legend
- **Streaks**: Daily login tracking to encourage consistency

**Visual:** Profile card showing level, XP bar, and streak counter

---

## Slide 9: What Makes Siksak Different

**Title:** Siksak vs. ChatGPT/Claude

| Feature | Siksak | ChatGPT/Claude |
|---------|--------|----------------|
| **Long-term Memory** | ✅ Persists across sessions | ❌ Starts fresh |
| **Spaced Repetition** | ✅ Tracks learning over time | ❌ No learning tracking |
| **Gamification** | ✅ XP, levels, streaks | ❌ No motivation system |
| **Interactive Quizzes** | ✅ Visual quiz cards | ❌ Text-only |
| **Learning Context** | ✅ Knows user's level | ❌ No personalization |
| **One-Click Actions** | ✅ Quiz/Cheatsheet/Resources | ❌ Manual prompting |
| **Multi-LLM Support** | ✅ Claude, GPT, Groq, Local | ❌ Single provider |

**Visual:** Side-by-side comparison table

---

## Slide 10: Demo & Future Roadmap

**Title:** Live Demo + What's Next

**Demo Flow:**
1. Start new conversation → Personalization questions
2. Ask about a topic → Rich formatted response
3. Click "Quiz Me!" → Interactive quiz with XP
4. Click "Cheatsheet" → Print-ready HTML preview
5. Return later → AI remembers user's context and progress

**Future Roadmap:**
- 📚 Course/curriculum builder (multi-week paths)
- 🎙 Voice input for hands-free learning
- 💻 Code execution sandbox
- 📜 PDF certificate export
- 🌍 Multi-language support

**Visual:** QR code linking to live demo or GitHub repo

---

## Technical Details for Presenter Notes

### Tech Stack
- **Backend**: FastAPI (Python 3.11), SQLAlchemy Async
- **Database**: PostgreSQL 16 + pgvector
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4
- **LLM**: Anthropic Claude 3 Haiku (default), OpenAI, Groq, Local LLM support
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2)
- **Deployment**: Docker Compose

### Key Files
- `agent.py` - ReAct loop implementation (758 lines)
- `llm.py` - Multi-provider abstraction (267 lines)
- `memory.py` - Vector memory management

### Pros of This Approach
1. **True Personalization**: Memory persists, enabling adaptive learning paths
2. **Agentic Autonomy**: AI decides when to use tools without explicit prompts
3. **Modular LLM Support**: Easy to swap providers based on cost/speed needs
4. **Interactive UI**: Visual quiz/cheatsheet cards enhance engagement
5. **Gamification**: Proven motivation technique from language learning apps

### Areas for Improvement
1. **Scalability**: Current memory retrieval could be optimized for many users
2. **Curriculum Planning**: No structured course/pathway generation yet
3. **Offline Mode**: Requires internet connectivity for all features
4. **Analytics Dashboard**: No admin view for learning analytics
5. **Mobile Experience**: UI could be more responsive for mobile devices
