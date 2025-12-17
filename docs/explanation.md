# Siksak Project Explanation

## 1. Executive Summary

**Project Name**: Siksak (formerly AI Tutor)
**Version**: 2.0 (Cyber Core)

**Siksak** is an advanced, agentic AI learning platform designed to replace passive chatbots with an active, pedagogical mentor. Unlike generic LLM interfaces, Siksak employs a persistent memory architecture, gamification loops, and an "Active Recall" protocol to ensure deep learning retention.

The system is built on a modern **Client-Server architecture**, utilizing a high-performance **FastAPI** backend with **PostgreSQL/pgvector** for memory and a reactive **React/Vite** frontend with a distinctive "Cyber Core" aesthetic.

---

## 2. Core Features

### 2.1 Agentic Pedagogy ("The Siksak Protocol")
The core differentiator is the Agent's behavior, governed by strict system prompts and tool usage rules:
*   **Answer First, Then Quiz**: The agent must provide a comprehensive text explanation (min 300 words) before testing the user.
*   **Active Recall**: The system tracks "Topics Due for Review" and proactively quizzes users on past concepts to combat the forgetting curve.
*   **Spaced Repetition System (SRS)**: Concepts are tagged with mastery states (`New`, `Practicing`, `Mastered`) and scheduled for review based on performance.

### 2.2 Long-Term Semantic Memory
Siksak remembers *everything* relevant to learning, not just the current chat window.
*   **User Profile**: Facts about the user (e.g., "User is a visual learner").
*   **Learning Progress**: Specific concepts tracked by mastery level.
*   **Vector Search**: Uses `pgvector` to retrieve relevant past interactions based on semantic similarity to the current query.

### 2.3 Gamification Engine
To maintain engagement, the system implements a lightweight RPG layer:
*   **XP (Experience Points)**: Awarded for good questions, completing quizzes, and consistent study.
*   **Streaks**: Tracks daily activity to encourage habit formation.
*   **Visual Feedback**: UI elements (badges, progress bars) reflect these stats.

### 2.4 "Cyber Core" User Interface
A distinct visual identity designed to feel "premium" and "futuristic":
*   **Glassmorphism**: Translucent panels with background blurs.
*   **Grid Background**: A subtle, animated grid on a light canvas (`#F0F4F8`).
*   **Grounded Layout**: A tightly integrated chat interface that avoids "floating" elements.
*   **Interactive Components**: Custom-built `QuizCard` for interactive multiple-choice testing within the chat stream.

---

## 3. High-Level Architecture

The system follows a containerized microservices pattern managed by Docker Compose.

```mermaid
graph TD
    User[User Browser] <-->|HTTP/REST| FE[Frontend Container (Nginx/Vite)]
    FE <-->|API Calls| BE[Backend Container (FastAPI)]
    BE <-->|SQL/Vector| DB[Database (PostgreSQL + pgvector)]
    BE <-->|API| LLM[LLM Provider (OpenAI/Anthropic)]
```

---

## 4. Technical Stack & Tools

### 4.1 Frontend (`/frontend`)
*   **Framework**: React 18 + Vite (TypeScript)
*   **Styling**: Tailwind CSS v4, `clsx`, `tailwind-merge`.
*   **State/Network**: Axios for API communication.
*   **Icons**: `lucide-react`.
*   **Rendering**: `react-markdown` for rich text responses.
*   **Key Components**:
    *   `Chat.tsx`: Main interface, handles message history and tool rendering (`:::quiz` blocks).
    *   `Sidebar.tsx`: Navigation, history management, user stats.
    *   `QuizCard.tsx`: Interactive component for gamified testing.

### 4.2 Backend (`/backend`)
*   **Framework**: FastAPI (Python 3.10+).
*   **ORM**: SQLAlchemy (Async) with Pydantic for data validation.
*   **Database**: PostgreSQL 15 with `pgvector` extension.
*   **Migrations**: Alembic.
*   **Dependencies**:
    *   `asyncpg`: Async database driver.
    *   `sentence-transformers`: For generating local embeddings (or API-based).
    *   `duckduckgo-search` (Planned): For real-time web retrieval.

### 4.3 The "Brain" (`agent.py`)
The `Agent` class encapsulates the intelligence logic:
*   **Tool Definitions**: JSON schemas passed to the LLM (e.g., `present_quiz`, `save_memory`).
*   **Prompt Engineering**: A complex system prompt that enforcing the "Teacher Persona" and "Three-Step Loop" (Explain -> Quiz -> Update Memory).
*   **Tool Execution**: Logic to parse LLM tool calls and execute DB updates or internal functions.

---

## 5. Detailed Component Flows

### 5.1 The Message Loop
1.  **Receive**: Backend receives `user_message`.
2.  **Context Retrieval**:
    *   `MemoryManager` fetches semantic matches + forced "User Profile" memories.
    *   Checks for "Due" SRS items.
3.  **Prompt Assembly**:
    *   Constructs system prompt + Retrieved Memories + Conversation History.
4.  **LLM Generation**:
    *   Model generates text response AND potential tool calls.
5.  **Tool Execution**:
    *   If `present_quiz` is called -> Generate special `:::quiz JSON :::` block.
    *   If `save_memory` is called -> Write value to `memories` table + Embed.
    *   If `update_concept_state` is called -> Update `memories` metadata (SRS date).
6.  **Response**: Final text + tool outputs sent to Frontend.

### 5.2 The Gamification Loop
1.  **Action**: User answers a quiz correctly in the UI.
2.  **Request**: Frontend sends `POST /messages` with a system event (e.g., "[System] User earned 50 XP").
3.  **Update**: Agent sees this message, calls `manage_gamification` tool.
4.  **Persist**: Experience points are written to the `users` table in Postgres.

---

## 6. Directory Structure

```
ai_tutor/
├── backend/
│   ├── app/
│   │   ├── agent.py       # Core Logic
│   │   ├── memory.py      # Vector Store & Retrieval
│   │   ├── models.py      # DB Schema (User, Message, Memory)
│   │   ├── main.py        # API Routes
│   │   └── ...
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat.tsx
│   │   │   ├── QuizCard.tsx
│   │   │   └── ...
│   │   ├── App.tsx
│   │   └── index.css      # Cyber Core Theme
│   └── Dockerfile
└── docker-compose.yml
```

## 7. Future Roadmap
*   **Web Search**: Real-time fact-checking using `duckduckgo-search`.
*   **Voice Mode**: Audio input/output for conversational practice.
*   **Deployment**: Cloud deployment via AWS/GCP with persistent volumes.
