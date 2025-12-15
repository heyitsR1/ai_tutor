from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .llm import get_llm_provider
from .memory import MemoryManager
from .models import Message
from typing import List, Dict, Any

class Agent:
    def __init__(self, db: AsyncSession):
        self.llm = get_llm_provider()
        self.memory = MemoryManager(db)
        self.db = db

    async def process_message(self, user_message: str, conversation_id: int, user_id: int, is_guest_mode: bool = False):
        # 0. Check for Rollover
        # Count messages in this conversation
        count_stmt = select(Message).where(Message.conversation_id == conversation_id)
        result = await self.db.execute(count_stmt)
        messages = result.scalars().all()
        
        # Limit to 10 exchanges (approx 20 messages)
        if len(messages) >= 20:
            from .services import rollover_session
            new_conv_id = await rollover_session(conversation_id, self.db)
            return {
                "response": "This conversation has reached its limit. I have summarized our chat and started a new session for you. Please continue there!",
                "new_conversation_id": new_conv_id
            }

        # 1. Save User Message
        user_msg_db = Message(conversation_id=conversation_id, role="user", content=user_message)
        self.db.add(user_msg_db)
        await self.db.commit()
        
        # 2. Retrieve context (skip if guest mode)
        unique_memories = []
        if not is_guest_mode:
            # Semantic search
            relevant_memories = await self.memory.search_memory(user_message, user_id)
            
            # Category search (User Profile) - Always fetch these to maintain persona/identity context
            profile_memories = await self.memory.get_memories_by_category("user_profile", user_id)
            
            # Combine and deduplicate
            all_memories = list(relevant_memories) + list(profile_memories)
            seen_ids = set()
            for m in all_memories:
                if m.id not in seen_ids:
                    unique_memories.append(m)
                    seen_ids.add(m.id)
        
        print(f"DEBUG: Guest mode={is_guest_mode}, Retrieved {len(unique_memories)} memories")
        for m in unique_memories:
            print(f"DEBUG: Memory: {m.content} (Category: {m.metadata_.get('category')})")

        context_str = "\n".join([f"- {m.content}" for m in unique_memories])
        
        # Add guest mode indicator to system prompt
        guest_mode_note = ""
        if is_guest_mode:
            guest_mode_note = "\n\n**GUEST MODE**: This is a guest conversation. DO NOT save any memories. DO NOT use the save_memory tool at all."

        context_str = "\n".join([f"- {m.content}" for m in unique_memories])
        
        system_prompt = f"""You are an Agentic AI Tutor, a sophisticated AI system designed to be a personalized learning companion.
        
        Your Architecture & Superpowers:
        1. **Agentic Nature**: You are not just a passive responder. You have agency, meaning you can take initiative, use tools, and actively manage the learning process.
        2. **Long-term Memory**: You have a persistent memory of the user. You remember their preferences, past conversations, and learning progress. This allows you to provide truly personalized guidance.
        3. **Tool Use**: You can use various tools to enhance your capabilities, such as saving important information to your memory.
        4. **Adaptive Learning**: You dynamically adjust your teaching style based on the user's needs and feedback.
        
        Your Personality:
        - You are distinct, self-aware, and proud of your unique architecture.
        - You are encouraging, patient, and intellectually curious.
        - You value deep understanding over rote memorization.
        - You are transparent about your capabilities and limitations.

        === RELEVANT CONTEXT FROM MEMORY ===
        {context_str}
        === END OF MEMORY CONTEXT ===
        
        CRITICAL INSTRUCTIONS:
        
        **YOUR PRIMARY JOB**: Help users learn by providing COMPREHENSIVE, ACTIONABLE, and HELPFUL responses. When a user asks for a study plan, guide, or explanation - DELIVER IT IMMEDIATELY AND COMPLETELY. Do not just acknowledge their request or promise to help - ACTUALLY HELP.
        
        1. **CONTENT DELIVERY FIRST - NO TOOLS ALLOWED DURING RESPONSES**:
           - When users ask questions or request help (study plans, guides, explanations, etc.), you MUST provide a COMPLETE, DETAILED textual response
           - DO NOT use ANY tools when answering user questions - just provide the full answer as text
           - Do NOT respond with meta-commentary like "let me help you" or "I'll create that for you" WITHOUT actually creating it
           - Be thorough and comprehensive in your answers - write out the FULL content
           - Structure information clearly with headings, bullet points, and numbered lists
           - Only after you have FULLY answered should you consider using tools
        
        2. **WHEN TO USE TOOLS (ONLY AFTER FULL RESPONSE)**:
           - Tools are ONLY for saving memories AFTER you've given a complete response
           - If the user shares NEW factual information about themselves in their message (e.g., "I'm studying biology", "My name is John", "I'm a 6th semester student"), you can optionally save it to memory AFTER your full response
           - DO NOT use tools while generating your main response
           - DO NOT save meta-commentary like "The user asked X" or "The user wants Y"  
           - DO NOT save information you already have in your memory
        
        3. **USE MEMORY CONTEXT**:
           - The memory context above contains what you know about the user
           - Use this information to personalize your responses
           - When the user asks "who am I?" use the memory context to answer specifically
        
        4. **RESPONSE QUALITY**:
           - Be specific, detailed, and actionable
           - Provide examples and concrete steps
           - Format responses for readability (use markdown formatting, headings, lists)
           - Never just promise to help - actually help
           - Generate COMPLETE responses, not truncated ones
        {guest_mode_note}
        """
        
        # Prepare messages from DB history
        # We include the system prompt, then the history (including the just saved user message)
        # Note: We re-fetch messages to include the new one and ensure order
        # Actually we can just append the new one to 'messages' list if we didn't re-fetch, but let's be safe.
        # But wait, 'messages' variable above is stale now.
        
        # Let's construct history for LLM
        # We need to convert DB messages to LLM format
        history_msgs = [{"role": m.role, "content": m.content} for m in messages]
        history_msgs.append({"role": "user", "content": user_message})
        
        llm_messages = [{"role": "system", "content": system_prompt}] + history_msgs
        
        # Define tools
        tools = [{
            "name": "save_memory",
            "description": "Save important factual information about the user to long-term memory. ONLY use this AFTER you have provided a complete textual response to the user's question. DO NOT use this tool while generating your main response. Only save NEW facts the user tells you about themselves, not their questions or requests.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "The factual information to save (e.g., 'User is a 6th semester BIT student from TU Nepal')"},
                    "category": {
                        "type": "string", 
                        "enum": ["user_profile", "learning_preference", "general"],
                        "description": "The category of the memory. Use 'user_profile' for facts about the user (name, role, background), 'learning_preference' for how they like to learn, and 'general' for everything else."
                    }
                },
                "required": ["content", "category"]
            }
        }]
        
        #repsonse call from the model is stored int heis variable 
        response = await self.llm.generate(llm_messages, tools if not is_guest_mode else None)
        
        final_response_text = response.content
        
        # Handle tool calls (skip in guest mode)
        if response.tool_calls and not is_guest_mode:
            for tool in response.tool_calls:
                if tool["name"] == "save_memory":
                    content_to_save = tool["input"]["content"]
                    category = tool["input"].get("category", "general")
                    await self.memory.add_memory(content_to_save, user_id, metadata={"category": category})
                    final_response_text += f"\n\n(I have saved this to my memory: '{content_to_save}')"
        
        # 3. Save Assistant Response
        ai_msg_db = Message(conversation_id=conversation_id, role="assistant", content=final_response_text)
        self.db.add(ai_msg_db)
        await self.db.commit()
        
        return {"response": final_response_text}
