# Siksak AI Tutor - Technical Documentation

> Comprehensive technical explanation for **Agentic AI course**

---

## 1. System Architecture Overview

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
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │   main.py    │────▶│   agent.py   │────▶│    llm.py        │    │
│  │  (Endpoints) │     │  (ReAct Loop)│     │ (LLM Provider)   │    │
│  └──────────────┘     └──────────────┘     └──────────────────┘    │
│         │                    │                       │              │
│         │                    ▼                       │              │
│         │            ┌──────────────┐                │              │
│         │            │  memory.py   │                │              │
│         │            │(Vector Store)│                │              │
│         │            └──────────────┘                │              │
│         │                    │                       │              │
│         └────────────────────┼───────────────────────┘              │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL + pgvector (Database)                │   │
│  │    - Users, Conversations, Messages                         │   │
│  │    - Memories (with 384-dim embeddings for similarity)      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                               │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐    │
│  │   Anthropic  │     │    OpenAI    │     │   DuckDuckGo     │    │
│  │   Claude API │     │   GPT API    │     │   Search API     │    │
│  └──────────────┘     └──────────────┘     └──────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. LLM Provider System (`llm.py`)

### Multi-Provider Architecture

The system supports **multiple LLM providers** through an abstraction layer:

```python
class LLMProvider:
    """Abstract base for LLM interactions"""
    async def generate(messages, tools) -> LLMResponse
    def format_tool_call_message(tool_calls, content) -> dict
    def format_tool_result_message(tool_id, result) -> dict
```

### Supported Providers

| Provider | Model | Configuration |
|----------|-------|---------------|
| **Anthropic Claude** | claude-3-5-sonnet-20241022 | Primary (recommended) |
| **OpenAI GPT** | gpt-4 | Alternative |

### Provider Selection

```python
def get_llm_provider() -> LLMProvider:
    provider = os.getenv("LLM_PROVIDER", "anthropic")
    if provider == "anthropic":
        return AnthropicProvider()
    elif provider == "openai":
        return OpenAIProvider()
```

### Tool Calling Format

Claude uses a specific tool format:
```python
tools = [{
    "name": "tool_name",
    "description": "...",
    "input_schema": {
        "type": "object",
        "properties": {...},
        "required": [...]
    }
}]
```

---

## 3. The Agentic Core: ReAct Loop (`agent.py`)

### What Makes This "Agentic"?

The system implements a **ReAct (Reasoning + Acting) pattern**:

```
┌─────────────────────────────────────────────────────────────┐
│                     ReAct Loop                              │
│                                                             │
│  1. OBSERVE: Receive user message + context                 │
│  2. THINK: LLM processes with system prompt                 │
│  3. ACT: LLM may call tools (quiz, memory, search, etc.)    │
│  4. OBSERVE: Tool results returned to LLM                   │
│  5. THINK: LLM integrates results                           │
│  6. RESPOND: Final response to user                         │
│                                                             │
│  Loop continues until no more tool calls (max 5 iterations) │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```python
while iteration < MAX_ITERATIONS:
    iteration += 1
    
    # 1. Call LLM with messages and tools
    response = await self.llm.generate(turn_messages, tools)
    
    # 2. Capture text content
    if response.content:
        final_response_text += response.content
    
    # 3. Check for tool calls
    if not response.tool_calls:
        break  # Done - no actions needed
    
    # 4. Execute each tool
    for tool in response.tool_calls:
        result = execute_tool(tool)  # See tool implementations below
        
        # 5. Feed result back to LLM for next iteration
        turn_messages.append(format_tool_result(result))
```

### Key Agentic Behaviors

1. **Autonomous Decision Making**: LLM decides which tools to use based on context
2. **Multi-Step Reasoning**: Can chain multiple tool calls in one request
3. **Self-Correction**: Can adjust based on tool results
4. **Context Awareness**: Maintains conversation history + memory

---

## 4. Tool System (Function Calling)

### Available Tools

| Tool | Purpose | When Used |
|------|---------|-----------|
| `save_memory` | Store facts about user | Learning preferences, profile info |
| `update_concept_state` | Track learning progress | After teaching or testing |
| `manage_gamification` | Award XP | Correct answers, engagement |
| `present_quiz` | Visual quiz (3 questions) | Testing understanding |
| `web_search` | Search learning resources | [ACTION: RESOURCES] trigger |
| `generate_cheatsheet` | Create HTML cheatsheet | [ACTION: CHEATSHEET] trigger |

### Tool Execution Flow

```python
elif tool_name == "present_quiz":
    quiz_data = tool_input
    # Create protocol block for frontend parsing
    json_str = json.dumps(quiz_data)
    user_facing_log = f"\n\n:::quiz {json_str} :::"  # Special format
```

### Protocol Blocks

The system uses special markers for frontend rendering:
- `:::quiz {...} :::` → Renders interactive QuizCard
- `:::cheatsheet {...} :::` → Renders CheatsheetCard with preview
- `:::resources {...} :::` → Renders ResourcesCard with links

---

## 5. Memory System (`memory.py`)

### Long-Term Memory Architecture

The memory system enables **persistent learning context** across sessions:

```
User Message → Embedding Model → Vector Store → Similarity Search
                    ↓
          sentence-transformers
          (all-MiniLM-L6-v2)
          384-dimensional vectors
```

### Memory Operations

```python
class MemoryManager:
    async def add_memory(content, user_id, metadata)
        # 1. Generate embedding from text
        embedding = self.get_embedding(content)
        
        # 2. Store in PostgreSQL with pgvector
        memory = Memory(
            user_id=user_id,
            content=content,
            embedding=embedding,
            metadata_=metadata
        )
    
    async def search_memory(query, user_id, limit=5)
        # Semantic similarity search using cosine distance
        query_embedding = self.get_embedding(query)
        # pgvector: ORDER BY embedding <=> query_embedding LIMIT 5
```

### Memory Categories

| Category | Purpose | Example |
|----------|---------|---------|
| `user_profile` | Facts about the user | "User is a college freshman" |
| `learning_preference` | How they prefer to learn | "Prefers visual examples" |
| `learning_progress` | Concept mastery states | "Python Loops: Practicing" |

### Spaced Repetition (SRS)

Each learning concept has:
- `state`: new → practicing → mastered
- `last_reviewed_date`: When last tested
- `next_review_date`: Calculated based on performance

```python
# Spaced Repetition intervals
if performance == "low":    days_to_add = 1
if performance == "medium": days_to_add = 3
if performance == "high":   days_to_add = 14

next_review = datetime.now() + timedelta(days=days_to_add)
```

---

## 6. System Prompting

### Prompt Structure

The system prompt is a **2500+ token instruction set** that defines:

1. **Identity**: "You are Siksak, an AI Tutor..."
2. **Formatting Rules**: Rich markdown, emojis, visual hierarchy
3. **Action Triggers**: `[ACTION: QUIZ]`, `[ACTION: CHEATSHEET]`, etc.
4. **Tool Usage Rules**: When and how to use each tool
5. **Gamification Language**: XP, streaks, mastery levels
6. **Memory Context**: Injected profile + learning progress

### Dynamic Context Injection

```python
system_prompt = f"""
...
CURRENT LEARNER STATS
─────────────────────
XP: {xp}
Streak: {streak} days

=== RELEVANT CONTEXT FROM MEMORY ===
{context_str}  # Retrieved memories
=== END OF MEMORY CONTEXT ===
"""
```

### Prompt Engineering for Agentic Behavior

Key techniques used:
1. **Explicit Tool Instructions**: Tell LLM exactly when to use tools
2. **Action Triggers**: `[ACTION: X]` as clear signals for tool use
3. **Output Formatting**: Protocol blocks for frontend parsing
4. **Role Framing**: "You are a teacher, not a chatbot"

---

## 7. Database Schema

### Tables

```sql
-- Users (with gamification)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE,
    xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_active_date TIMESTAMP
);

-- Conversations
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR,
    is_guest_mode INTEGER DEFAULT 0,
    created_at TIMESTAMP
);

-- Messages
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    role VARCHAR,  -- 'user', 'assistant', 'system'
    content TEXT,
    created_at TIMESTAMP
);

-- Memories (Long-term memory with vector embeddings)
CREATE TABLE memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    content TEXT,
    embedding VECTOR(384),  -- pgvector extension
    metadata_ JSONB,
    created_at TIMESTAMP
);
```

---

## 8. Gamification System

### XP & Leveling

```python
# Level calculation (triangular numbers)
# Level N requires: 100 * N * (N+1) / 2 total XP

Level 1: 0-100 XP
Level 2: 100-300 XP
Level 3: 300-600 XP
Level 4: 600-1000 XP
...
```

### Level Titles
| Level | Title | XP Range |
|-------|-------|----------|
| 1 | Novice | 0-100 |
| 2 | Apprentice | 100-300 |
| 3 | Scholar | 300-600 |
| 4 | Sage | 600-1000 |
| 5 | Master | 1000-1500 |
| 6+ | Grandmaster/Legend | 1500+ |

### XP Awards
- Correct quiz answer: 100 XP
- Using hint: -50 XP
- Good question/engagement: 10-50 XP

---

## 9. Web Search Integration

### DuckDuckGo Search (No API Key Required)

```python
from duckduckgo_search import DDGS

with DDGS() as ddgs:
    results = list(ddgs.text(query, max_results=5))
    
# Returns: title, url (href), description (body)
```

### Why DuckDuckGo?
- No API key needed
- No rate limits for moderate use
- Privacy-focused
- Returns quality results

---

## 10. Cheatsheet Generation

### HTML Generation

The cheatsheet tool generates **print-ready HTML** with:
- Custom CSS for clean printing
- Section-based layout
- Tips/notes section
- Responsive design

```python
html_content = f'''<!DOCTYPE html>
<html>
<head>
    <style>
        /* Print-optimized styling */
        @media print {{ body {{ background: white; }} }}
    </style>
</head>
<body>
    <div class="header">📚 {topic}</div>
    {sections_html}
    {tips_html}
</body>
</html>'''
```

---

## 11. Key Differentiators from ChatGPT/Claude

| Feature | Siksak | ChatGPT/Claude |
|---------|--------|----------------|
| **Long-term Memory** | ✅ Persists across sessions | ❌ Starts fresh |
| **Spaced Repetition** | ✅ Tracks learning over time | ❌ No learning tracking |
| **Gamification** | ✅ XP, levels, streaks | ❌ No motivation system |
| **Interactive Quizzes** | ✅ Visual quiz cards | ❌ Text-only |
| **Learning Context** | ✅ Knows user's level | ❌ No personalization |
| **One-Click Actions** | ✅ Quiz/Cheatsheet/Resources | ❌ Manual prompting |

---

## 12. Technology Stack Summary

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python 3.11) |
| Database | PostgreSQL + pgvector |
| LLM | Anthropic Claude 3.5 Sonnet |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Web Search | DuckDuckGo Search |
| Deployment | Docker Compose |
