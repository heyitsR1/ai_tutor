from sentence_transformers import SentenceTransformer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, text
from datetime import datetime
from .models import Memory
import json

# Load model once
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

class MemoryManager:
    def __init__(self, db: AsyncSession):
        self.db = db

    def get_embedding(self, text: str):
        return embedding_model.encode(text).tolist()

    async def add_memory(self, content: str, user_id: int, metadata: dict = None):
        embedding = self.get_embedding(content)
        memory = Memory(content=content, user_id=user_id, embedding=embedding, metadata_=metadata or {})
        self.db.add(memory)
        await self.db.commit()
        await self.db.refresh(memory)
        return memory

    async def search_memory(self, query: str, user_id: int, limit: int = 5):
        query_embedding = self.get_embedding(query)
        # pgvector l2_distance or cosine_distance
        # Note: pgvector syntax might vary slightly by version, using l2_distance (<->)
        stmt = select(Memory).where(Memory.user_id == user_id).order_by(Memory.embedding.l2_distance(query_embedding)).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_memories_by_category(self, category: str, user_id: int, limit: int = 10):
        stmt = select(Memory).where(
            Memory.user_id == user_id,
            Memory.metadata_.op("->>")("category") == category
        ).order_by(Memory.created_at.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_all_memories(self, user_id: int):
        """Get all memories for a user, ordered by creation date (newest first)"""
        stmt = select(Memory).where(Memory.user_id == user_id).order_by(Memory.created_at.desc())
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def delete_all_memories(self, user_id: int):
        """Delete all memories for a specific user"""
        stmt = delete(Memory).where(Memory.user_id == user_id)
        await self.db.execute(stmt)
        await self.db.commit()

    async def get_due_learning_items(self, user_id: int):
        """Get learning progress items that are due for review"""
        # We look for memories where metadata->'next_review_date' exists and is <= now()
        # and category is 'learning_progress'
        now_str = datetime.now().isoformat()
        stmt = select(Memory).where(
            Memory.user_id == user_id,
            Memory.metadata_.op("->>")("category") == "learning_progress",
            Memory.metadata_.op("->>")("next_review_date") <= now_str
        ).order_by(Memory.metadata_.op("->>")("next_review_date"))
        
        result = await self.db.execute(stmt)
        return result.scalars().all()
