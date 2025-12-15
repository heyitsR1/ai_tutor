from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from contextlib import asynccontextmanager
from .database import get_db, engine, Base
from .agent import Agent
from .models import Conversation, Message, User
from .memory import MemoryManager
from typing import List, Dict, Optional

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: cleanup if needed

app = FastAPI(title="Agentic AI Tutor", lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Explicitly allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CreateConversationRequest(BaseModel):
    user_id: int = 1 # Default to 1 for now since we don't have auth
    title: Optional[str] = "New Chat"
    is_guest_mode: bool = False

class ChatRequest(BaseModel):
    message: str

@app.post("/conversations")
async def create_conversation(request: CreateConversationRequest, db: AsyncSession = Depends(get_db)):
    # Ensure user exists (hack for no auth)
    user_stmt = select(User).where(User.id == request.user_id)
    result = await db.execute(user_stmt)
    user = result.scalar_one_or_none()
    if not user:
        user = User(id=request.user_id, username=f"user_{request.user_id}")
        db.add(user)
        await db.commit()
    
    conv = Conversation(
        user_id=request.user_id, 
        title=request.title,
        is_guest_mode=1 if request.is_guest_mode else 0
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return {"id": conv.id, "title": conv.title, "is_guest_mode": bool(conv.is_guest_mode)}

@app.get("/conversations")
async def list_conversations(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    stmt = select(Conversation).where(Conversation.user_id == user_id).order_by(desc(Conversation.created_at))
    result = await db.execute(stmt)
    conversations = result.scalars().all()
    return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in conversations]

@app.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return [{"role": m.role, "content": m.content} for m in messages]

@app.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: int, request: ChatRequest, db: AsyncSession = Depends(get_db)):
    # Get conversation to check guest mode and user_id
    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    result = await db.execute(conv_stmt)
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    agent = Agent(db)
    response_data = await agent.process_message(
        request.message, 
        conversation_id, 
        conversation.user_id,
        bool(conversation.is_guest_mode)
    )
    return response_data

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a specific conversation and all its messages"""
    from sqlalchemy import delete as sql_delete
    
    # Delete messages first (foreign key constraint)
    await db.execute(sql_delete(Message).where(Message.conversation_id == conversation_id))
    # Delete conversation
    await db.execute(sql_delete(Conversation).where(Conversation.id == conversation_id))
    await db.commit()
    return {"status": "deleted"}

@app.delete("/conversations")
async def delete_all_conversations(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """Delete all conversations for a user"""
    from sqlalchemy import delete as sql_delete
    
    # Get all conversation IDs for the user
    conv_stmt = select(Conversation.id).where(Conversation.user_id == user_id)
    result = await db.execute(conv_stmt)
    conv_ids = [row[0] for row in result.all()]
    
    # Delete messages for all conversations
    if conv_ids:
        await db.execute(sql_delete(Message).where(Message.conversation_id.in_(conv_ids)))
    
    # Delete all conversations
    await db.execute(sql_delete(Conversation).where(Conversation.user_id == user_id))
    await db.commit()
    return {"status": "deleted", "count": len(conv_ids)}

@app.delete("/memories")
async def delete_all_memories(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """Flush all memories for a user"""
    memory_manager = MemoryManager(db)
    await memory_manager.delete_all_memories(user_id)
    return {"status": "flushed"}

@app.get("/memories")
async def get_all_memories(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """Get all memories for a user (for profile dashboard)"""
    memory_manager = MemoryManager(db)
    memories = await memory_manager.get_all_memories(user_id)
    return [{
        "id": m.id,
        "content": m.content,
        "category": m.metadata_.get("category", "general"),
        "created_at": m.created_at.isoformat()
    } for m in memories]

@app.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    """List all users"""
    stmt = select(User).order_by(User.id)
    result = await db.execute(stmt)
    users = result.scalars().all()
    return [{"id": u.id, "username": u.username} for u in users]

@app.get("/")
async def root():
    return {"message": "Agentic AI Tutor Backend Running"}
