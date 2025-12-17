# Siksak Project Showcase: Slide Outline

## Slide 1: Title Slide
*   **Title**: Siksak v2.0
*   **Subtitle**: The Future of Agentic Personalized Learning
*   **Visual**: Siksak Logo + "Cyber Core" Grid Background
*   **Presenter**: [Your Name/Team]

## Slide 2: The Problem
*   **Heading**: Why Static Chatbots Fail Education
*   **Points**:
    *   **No Memory**: "ChatGPT forgets who I am after a new chat."
    *   **Passive**: "It just answers me; it doesn't *teach* me."
    *   **No Accountability**: "I read the answer and forget it 5 minutes later."
*   **Visual**: A generic, boring chatbot interface with a "Memory Full" or "Confusion" icon.

## Slide 3: The Solution - Siksak
*   **Heading**: An Active, Agentic Tutor
*   **Core Philosophy**:
    *   **Persistent**: Remembers everything (Learning Profile).
    *   **Active**: Proactively quizzes you using Spaced Repetition.
    *   **Gamified**: Keeps you addicted to learning, not scrolling.
*   **Visual**: Split screen showing "Standard AI" vs. "Siksak Agent" (with Memory & Tools).

## Slide 4: High-Level Architecture
*   **Heading**: Built for Performance & Agency
*   **Diagram**:
    *   Frontend: React + Vite + Tailwind v4 (Cyber Core).
    *   Backend: FastAPI + Python.
    *   Brain: LLM + PostgreSQL (Vector Memory).
*   **Key Takeaway**: "A closed-loop system where memory drives the conversation."

## Slide 5: The "Brain" (Deep Dive)
*   **Heading**: Inside the Agent's Mind
*   **Bullet Points**:
    *   **Semantic Memory**: Uses `pgvector` to find relevant past contexts.
    *   **Tool Use**: It's not just text generation; it *does* things.
        *   `save_memory`: Updates the user profile.
        *   `present_quiz`: Generates UI components.
    *   **The Loop**: Detail -> Explanation -> Verification (Quiz).

## Slide 6: Gamification & Engagement
*   **Heading**: Making Learning Addictive
*   **Features**:
    *   **XP System**: Real-time rewards for curiosity.
    *   **Streaks**: Habit tracking implementation.
    *   **Visual Quizzes**: Interactive cards, not just text blocks.
*   **Visual**: Screenshot of the `QuizCard` component with a "+50 XP" notification.

## Slide 7: Live Demo / Screenshots
*   **Heading**: Siksak in Action
*   **Content**: A carousel of screenshots:
    *   The "Cyber Core" Dashboard.
    *   The "Answer First, Then Quiz" interaction flow.
    *   The Mobile-Responsive Design.

## Slide 8: Technical Innovation
*   **Heading**: Under the Hood
*   **Points**:
    *   **Tailwind v4**: Using the bleeding edge of CSS frameworks.
    *   **Async Python**: High-concurrency backend handling.
    *   **Dockerized**: Fully portable deployment.
    *   **Custom UI Protocols**: The `:::quiz JSON :::` protocol for rendering rich UI.

## Slide 9: Roadmap
*   **Heading**: What's Next?
*   **Items**:
    *   [Planned] **Web Search Integration** (DuckDuckGo).
    *   [Planned] **Voice/Audio Mode**.
    *   [Planned] **Multi-User Classrooms**.
*   **Closing**: "Siksak is not just a bot. It's your second brain."

## Slide 10: Q&A
*   **Visual**: Large Siksak Logo + Contact Info.
