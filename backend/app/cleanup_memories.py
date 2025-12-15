import asyncio
from app.database import AsyncSessionLocal
from app.models import Memory
from sqlalchemy import select, delete

async def cleanup():
    async with AsyncSessionLocal() as session:
        # Delete memories containing "who am i" or "who am I"
        stmt = delete(Memory).where(Memory.content.ilike("%who am i%"))
        await session.execute(stmt)
        await session.commit()
        print("Deleted junk memories.")

if __name__ == "__main__":
    asyncio.run(cleanup())
