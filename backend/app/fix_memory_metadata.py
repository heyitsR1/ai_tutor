import asyncio
from app.database import AsyncSessionLocal
from app.models import Memory
from sqlalchemy import select

async def fix_metadata():
    async with AsyncSessionLocal() as session:
        # Find the specific memory
        stmt = select(Memory).where(Memory.content.contains("Aarohan"))
        result = await session.execute(stmt)
        memories = result.scalars().all()
        
        for memory in memories:
            print(f"Updating memory: {memory.content[:50]}...")
            # Update metadata
            # Note: In SQLAlchemy, mutating a JSON field might require re-assignment or flag_modified
            current_meta = memory.metadata_ or {}
            current_meta["category"] = "user_profile"
            memory.metadata_ = dict(current_meta) # Re-assign to trigger update
            session.add(memory)
        
        if memories:
            await session.commit()
            print(f"Updated {len(memories)} memories.")
        else:
            print("No matching memories found.")

if __name__ == "__main__":
    asyncio.run(fix_metadata())
