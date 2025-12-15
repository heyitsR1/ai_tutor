import asyncio
from app.database import AsyncSessionLocal
from app.models import Memory
from sqlalchemy import select

async def check_memories():
    async with AsyncSessionLocal() as session:
        stmt = select(Memory).order_by(Memory.created_at.desc())
        result = await session.execute(stmt)
        memories = result.scalars().all()
        
        for m in memories:
            print(f"ID: {m.id}, Content: {m.content[:50]}..., Metadata: {m.metadata_}")

if __name__ == "__main__":
    asyncio.run(check_memories())
