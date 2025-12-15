from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .models import Conversation, Message
from .llm import get_llm_provider

async def rollover_session(conversation_id: int, db: AsyncSession):
    # 1. Fetch current conversation messages
    stmt = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at)
    result = await db.execute(stmt)
    messages = result.scalars().all()
    
    if not messages:
        return None

    # 2. Generate Summary
    llm = get_llm_provider()
    history_text = "\n".join([f"{m.role}: {m.content}" for m in messages])
    
    summary_prompt = [
        {"role": "system", "content": "You are a helpful assistant. Summarize the following conversation, capturing the key topics, user preferences, and important context. The summary will be used to start a new session so the AI remembers what happened."},
        {"role": "user", "content": history_text}
    ]
    
    # We don't need tools for summarization
    summary_response = await llm.generate(summary_prompt, tools=[])
    summary_text = summary_response.content

    # 3. Create New Conversation
    # Get user_id from the old conversation
    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    conv_result = await db.execute(conv_stmt)
    old_conv = conv_result.scalar_one()
    
    new_conv = Conversation(user_id=old_conv.user_id, title=f"Follow-up: {old_conv.title}")
    db.add(new_conv)
    await db.commit()
    await db.refresh(new_conv)
    
    # 4. Add Summary as System/Context Message
    # We can add it as a 'system' message or a special 'assistant' message at the start.
    # Let's add it as a system message to be injected by the Agent, 
    # BUT since we store messages in DB, we might want to store it as a 'system' role message 
    # so it's loaded when history is fetched.
    
    summary_msg = Message(
        conversation_id=new_conv.id,
        role="system",
        content=f"PREVIOUS SESSION SUMMARY:\n{summary_text}"
    )
    db.add(summary_msg)
    await db.commit()
    
    return new_conv.id
