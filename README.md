# Agentic AI Tutor

An intelligent, AI-powered tutoring application with long-term memory capabilities. This project features a React-based chat interface and a FastAPI backend that leverages RAG (Retrieval-Augmented Generation) to provide personalized learning experiences.

## 🚀 Features

- **Personalized Tutoring**: AI agent that adapts to your learning pace (`Agent` class).
- **Long-term Memory**: Stores and retrieves past interactions using `pgvector` for semantic search.
- **Guest Mode**: Try the tutor without persistent history.
- **Modern UI**: Clean, responsive interface built with React, Tailwind CSS, and Framer Motion.
- **LLM Integration**: Supports Anthropic (Claude) and local LLMs.
- **Dockerized**: specific `docker-compose` setup for easy deployment.

## 🛠 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State/Animations**: Framer Motion
- **HTTP Client**: Axios

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11)
- **Database**: PostgreSQL 16 + `pgvector`
- **ORM**: SQLAlchemy (Async)
- **AI/ML**: LangChain (implied concepts), Sentence Transformers, Anthropic API

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL with `pgvector` extension

## 📋 Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- Node.js 18+ (for local frontend development only)
- Python 3.11+ (for local backend development only)
- Anthropic API Key

## ⚡ Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository_url>
   cd ai_tutor
   ```

2. **Environment Setup**
   The project uses environment variables for configuration. The `docker-compose.yml` expects an `.env` file in the root directory.
   
   Create a `.env` file:
   ```bash
   # .env
   ANTHROPIC_API_KEY=your_api_key_here
   ```

3. **Start with Docker**
   Run the entire application stack:
   ```bash
   docker compose up --build
   ```
   
   This will start:
   - **Frontend**: http://localhost:5173
   - **Backend**: http://localhost:8000
   - **Database**: localhost:5435

4. **Access the Application**
   Open your browser and navigate to `http://localhost:5173`.

## 🔧 Manual Development Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
./start.sh # or uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔌 API Documentation

Once the backend is running, you can access the interactive API docs (Swagger UI) at:
http://localhost:8000/docs

### Key Endpoints
- `POST /conversations`: Create a new chat session.
- `POST /conversations/{id}/messages`: Send a message to the AI.
- `GET /memories`: Retrieve stored memories for the user.
- `DELETE /memories`: Flush user memory.

## 📂 Project Structure

```
.
├── backend/            # FastAPI application
│   ├── app/            # Application source code
│   │   ├── agent.py    # AI logic
│   │   ├── memory.py   # RAG/Memory management
│   │   └── models.py   # Database models
│   └── requirements.txt
├── frontend/           # React application
│   ├── src/
│   └── package.json
├── docker-compose.yml  # Container orchestration
└── .env               # Configuration
```

## 📝 License

[MIT](LICENSE)
