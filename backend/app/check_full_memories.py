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
            print(f"\n{'='*80}")
            print(f"ID: {m.id}")
            print(f"Category: {m.metadata_.get('category')}")
            print(f"Content: {m.content}")
            print(f"{'='*80}")

if __name__ == "__main__":
    asyncio.run(check_memories())
