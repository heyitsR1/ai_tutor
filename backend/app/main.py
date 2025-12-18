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
    allow_origins=["*"],  # Allow all origins to fix CORS issues in dev
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

class EnhancePromptRequest(BaseModel):
    prompt: str

@app.post("/enhance-prompt")
async def enhance_prompt(request: EnhancePromptRequest, db: AsyncSession = Depends(get_db)):
    """Enhance a user prompt for better learning outcomes"""
    from .llm import get_llm_provider
    
    llm = get_llm_provider()
    
    enhancement_prompt = f"""Improve this learning question to be clearer and more specific. Keep it concise (1-2 sentences max).

    CRITICAL: ONLY RETURN THE ENHANCED PROMPT. DO NOT RETURN ANYTHING ELSE.NO "HERE IS THE ENHANCED PROMPT:" OR ANYTHING LIKE THAT. THIS IS NON NEGOTIABLE.

Original prompt: "{request.prompt}"

Rules:
- Make it more specific if too vague
- Add context if it helps
- Keep it natural and conversational
- Don't make it too long
- If the prompt is already good, return it mostly unchanged

Enhanced prompt:"""
    
    messages = [{"role": "user", "content": enhancement_prompt}]
    response = await llm.generate(messages, None)
    
    enhanced = response.content.strip() if response.content else request.prompt
    # Remove any quotes the LLM might add
    enhanced = enhanced.strip('"\'')
    
    return {"original": request.prompt, "enhanced": enhanced}

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
    
    agent = Agent(db, user_id=conversation.user_id)
    response_data = await agent.process_message(
        request.message, 
        conversation_id, 
        conversation.user_id,
        bool(conversation.is_guest_mode)
    )
    return response_data

class UpdateConversationRequest(BaseModel):
    title: str

@app.patch("/conversations/{conversation_id}")
async def update_conversation(conversation_id: int, request: UpdateConversationRequest, db: AsyncSession = Depends(get_db)):
    """Update conversation title"""
    from sqlalchemy import update as sql_update
    
    stmt = sql_update(Conversation).where(Conversation.id == conversation_id).values(title=request.title)
    await db.execute(stmt)
    await db.commit()
    return {"id": conversation_id, "title": request.title}

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

@app.get("/users/{user_id}/stats")
async def get_user_stats(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get user XP, level, and streak stats"""
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    xp = user.xp or 0
    streak = user.streak_days or 0
    
    # Calculate level using triangular numbers: Level N requires 100 * N * (N+1) / 2 XP
    # Level 1: 0-100, Level 2: 100-300, Level 3: 300-600, etc.
    def get_level_info(total_xp: int):
        level = 1
        xp_for_current_level = 0
        while True:
            xp_for_next_level = 100 * level * (level + 1) // 2
            if total_xp < xp_for_next_level:
                return {
                    "level": level,
                    "current_xp": total_xp - xp_for_current_level,
                    "xp_for_next_level": xp_for_next_level - xp_for_current_level,
                    "total_xp": total_xp
                }
            xp_for_current_level = xp_for_next_level
            level += 1
    
    level_info = get_level_info(xp)
    
    # Level titles
    level_titles = {
        1: "Novice",
        2: "Apprentice", 
        3: "Scholar",
        4: "Sage",
        5: "Master",
        6: "Grandmaster",
        7: "Legend"
    }
    title = level_titles.get(level_info["level"], "Mythic")
    
    return {
        "user_id": user_id,
        "username": user.username,
        "total_xp": xp,
        "level": level_info["level"],
        "level_title": title,
        "current_xp": level_info["current_xp"],
        "xp_for_next_level": level_info["xp_for_next_level"],
        "progress_percent": round((level_info["current_xp"] / level_info["xp_for_next_level"]) * 100, 1),
        "streak_days": streak
    }

# ====== Model Settings Endpoints ======
from .llm import get_user_llm_settings, set_user_llm_settings

class ModelSettingsRequest(BaseModel):
    provider: str  # "claude" or "groq"
    api_key: Optional[str] = None  # Required for GROQ

@app.get("/users/{user_id}/settings/model")
async def get_model_settings(user_id: int):
    """Get user's current LLM provider settings"""
    settings = get_user_llm_settings(user_id)
    return {
        "provider": settings.get("provider", "claude"),
        "has_api_key": bool(settings.get("api_key")),
        "available_providers": [
            {"id": "claude", "name": "Claude (Default)", "requires_key": False},
            {"id": "groq", "name": "GROQ (Llama 3.3 70B)", "requires_key": True}
        ]
    }

@app.post("/users/{user_id}/settings/model")
async def update_model_settings(user_id: int, settings: ModelSettingsRequest):
    """Update user's LLM provider settings"""
    if settings.provider == "groq" and not settings.api_key:
        raise HTTPException(status_code=400, detail="GROQ API key is required")
    
    set_user_llm_settings(user_id, settings.provider, settings.api_key)
    return {"message": f"Switched to {settings.provider}", "provider": settings.provider}

@app.get("/")
async def root():
    return {"message": "Agentic AI Tutor Backend Running"}
