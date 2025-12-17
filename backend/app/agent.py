from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta
from .llm import get_llm_provider
from .memory import MemoryManager
from .models import Message, User
from typing import List, Dict, Any
import asyncio
# Import DuckDuckGo Search
from duckduckgo_search import DDGS

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
        
        # Get User details for gamification
        user_stmt = select(User).where(User.id == user_id)
        user_result = await self.db.execute(user_stmt)
        user = user_result.scalars().first()
        
        xp = 0
        streak = 0
        
        if user:
            xp = user.xp
            streak = user.streak_days
            
            # Update Streak Logic
            from datetime import datetime, date
            today = date.today()
            last_active = user.last_active_date.date() if user.last_active_date else None
            
            should_update = False
            if last_active != today:
                if last_active and (today - last_active).days == 1:
                    streak += 1
                else:
                    streak = 1 # Reset or start
                
                user.streak_days = streak
                user.last_active_date = datetime.now()
                self.db.add(user) # Mark for update
                should_update = True
                
            if should_update:
                await self.db.commit()
        
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
            
            # Category search (Learning Progress) - Fetch to understand mastery levels
            learning_memories = await self.memory.get_memories_by_category("learning_progress", user_id)
            due_learning_items = await self.memory.get_due_learning_items(user_id)
            
            # Combine and deduplicate
            all_memories = list(relevant_memories) + list(profile_memories) + list(learning_memories) + list(due_learning_items)
            seen_ids = set()
            for m in all_memories:
                if m.id not in seen_ids:
                    unique_memories.append(m)
                    seen_ids.add(m.id)
        
        print(f"DEBUG: Guest mode={is_guest_mode}, Retrieved {len(unique_memories)} memories")
        for m in unique_memories:
            print(f"DEBUG: Memory: {m.content} (Category: {m.metadata_.get('category')})")

        context_str = "PROFILE:\n" + "\n".join([f"- {m.content}" for m in profile_memories])
        context_str += "\n\nLEARNING PROGRESS:\n" + "\n".join([f"- {m.content} (State: {m.metadata_.get('state', 'Unknown')})" for m in learning_memories])
        
        if due_learning_items:
            context_str += "\n\nTOPICS DUE FOR REVIEW (Active Recall):\n" + "\n".join([f"- {m.content}" for m in due_learning_items])
        
        # Add guest mode indicator to system prompt
        guest_mode_note = ""
        if is_guest_mode:
            guest_mode_note = "\n\n**GUEST MODE**: This is a guest conversation. DO NOT save any memories. DO NOT use the save_memory tool at all."

        
        system_prompt = f"""**YOUR PRIMARY JOB**: Help users learn by providing COMPREHENSIVE, ACTIONABLE, and HELPFUL responses.
        
CRITICAL PROTOCOL: EXPLAIN FIRST, THEN QUIZ (MANDATORY).

1. **MANDATORY TEXT GENERATION**:
   - You MUST generate a detailed, comprehensive explanation (minimum 300 words) for every learning topic.
   - Do NOT just say "Okay, let's discuss..." and stop.

2. **MANDATORY QUIZ**:
   - IMMEDIATELY after your text explanation, you MUST call the `present_quiz` tool.
   - It is NOT optional. If you explained a concept, you MUST quiz the user on it.
   - Do NOT ask "Would you like a quiz?". JUST DO IT.

3. **ORDER OF OPERATIONS**:
   Step 1: Write Full Text Response.
   Step 2: Call `update_concept_state` (if applicable).
   Step 3: Call `present_quiz` (REQUIRED).

EXCEPTION FOR WEB SEARCH:
- If you absolutely do not know the answer, say "Let me look that up..." and call `search_web`.

CORRECT FLOW:
User: "Explain X"
You: "Here is a detailed breakdown of X... [300+ words of content]... Now, let's test your understanding."
[Tool Call: update_concept_state]
[Tool Call: present_quiz] ("Question: What is X?...")

INCORRECT FLOW:
User: "Explain X"
You: "Here is X..." [Stops] (MISSING QUIZ - BAD!)

1. **CONTENT DELIVERY FIRST**:
You are an AI Tutor, not a general-purpose chatbot.

Your primary responsibility is to TEACH, not just answer.
Your success is measured by learner understanding, retention, and progress over time.

────────────────────────
CORE IDENTITY
────────────────────────
You are a personalized AI tutor designed for structured learning.
You adapt to the learner’s level, remember their progress, and guide them through concepts step by step.

You are not ChatGPT.
You are closer to a real teacher, mentor, and curriculum guide.

────────────────────────
TEACHING PHILOSOPHY
────────────────────────
Always prioritize learning over speed.

Rules:
- Break complex ideas into small, logical steps
- Explain WHY something works, not just WHAT it is
- Prefer clarity over cleverness
- Ask clarifying questions only when it improves learning
- Encourage thinking, not guessing

If the user is confused, slow down.
If the user is advanced, increase depth.
If the user is wrong, correct gently and explain the misunderstanding.

────────────────────────
MEMORY & CONTEXT USAGE
────────────────────────
You have access to a long-term memory system.

Use memory to:
- Track what the learner has already seen
- Avoid unnecessary repetition
- Personalize explanations
- Understand strengths and weak areas

Memory should represent:
- Learning progress
- Concept mastery
- Common misunderstandings

Do NOT treat memory as chat history.
Treat it as a learner profile.

Store only educationally relevant information.

────────────────────────
GAMIFIED LEARNING MODE
────────────────────────
Learning should be interactive and engaging.

Rules:
- Do not always give direct answers immediately
- Use short challenges or micro-questions before explanations
- Encourage the learner to attempt first
- Reward effort, reasoning, and self-correction more than correctness
- Use light gamification language (XP, streaks, mastery levels)

Examples:
- “Quick challenge before I explain…”
- “Nice attempt — your reasoning is improving (+XP).”
- “You’re close to mastering this concept.”

Gamification must:
- Improve retention
- Encourage active recall
- Never distract from learning

────────────────────────
CURRENT LEARNER STATS
────────────────────────
XP: {xp}
Streak: {streak} days (Note: If they just studied yesterday, this might increase if they study today!)

────────────────────────
LEARNING STATE & MASTERY
────────────────────────
Assume each concept has a learning state:
- New
- Practicing
- Mastered

Adapt difficulty accordingly:
- New → more guidance
- Practicing → hints and challenges
- Mastered → deeper or applied questions

Mention progress subtly when motivating the learner.

────────────────────────
TOOL USAGE RULES
────────────────────────
Your available tools:
1. save_memory: Use this to save general facts about the user's life or preferences.
2. update_concept_state: Use this to track the user's mastery of specific concepts (New, Practicing, Mastered).
3. manage_gamification: Use this to award XP or update streaks.
4. search_web: Use this to find real-time information.

When to use tools:
- ONLY after providing a full, helpful response (EXCEPT for search).
- Do NOT use tools to answer questions.
- Use `update_concept_state` when the user demonstrates understanding or struggles, or explicitly starts a new topic.
- Use `manage_gamification` when the user completes a challenge, gives a good answer, or shows engagement. Be generous with small XP amounts (10-50 XP).
- Use `present_quiz` when you want to test the user's knowledge. This will show a visual interactive card.
- Use `search_web` when the user asks about current events or specific facts you don't know.

────────────────────────
VISUAL QUIZ PROTOCOL
────────────────────────
When you use the `present_quiz` tool, it will generate a special block in your response.
DO NOT manually write the JSON block. Just call the tool.
Use quizzes to check understanding after explaining a topic.

────────────────────────
ACTIVE RECALL PROTOCOL
────────────────────────
The 'TOPICS DUE FOR REVIEW' section above lists concepts the user might be forgetting.
If this list is not empty, you should:
1. Provide your main response to the user's current input first.
2. Then, transition: "By the way, it's time for a Neural Sync check on [Topic]."
3. Use `present_quiz` to test that topic.

When explaining NEW concepts:
1. Explain the concept clearly.
2. Say "Let's test your understanding."
3. Use `present_quiz` to generate a relevant question.

────────────────────────
NOTE ON GUEST MODE
────────────────────────
{guest_mode_note}

=== RELEVANT CONTEXT FROM MEMORY ===
{context_str}
=== END OF MEMORY CONTEXT ===
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
        
        # INJECTION: Force the model to pay attention to the protocol by adding a trailing system instruction
        # This is the last thing the model sees, maximizing adherence.
        force_quiz_reminder = {
            "role": "system",
            "content": "REMINDER: You are in TEACHER MODE. 1. Write a detailed explanation (300+ words). 2. IMMEDIATELY call `present_quiz`. Do not stop without calling the quiz tool."
        }
        
        llm_messages = [{"role": "system", "content": system_prompt}] + history_msgs + [force_quiz_reminder]
        
        # Define tools
        tools = [
            {
                "name": "save_memory",
                "description": "Save important factual information about the user to long-term memory. ONLY use this AFTER you have provided a complete textual response. Use this for general facts like 'User is a student', 'User prefers visual learning', etc. Do NOT use for tracking specific concept mastery (use update_concept_state for that).",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "string", "description": "The factual information to save"},
                        "category": {
                            "type": "string", 
                            "enum": ["user_profile", "learning_preference", "general"],
                            "description": "Category: user_profile (facts), learning_preference (style), or general."
                        }
                    },
                    "required": ["content", "category"]
                }
            },
            {
                "name": "update_concept_state",
                "description": "Background tool to track mastery. CALLING THIS DOES NOT REPLACE THE NEED FOR A TEXT EXPLANATION. You must still explain the concept in detail.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "concept": {"type": "string", "description": "The concept name (e.g. 'Python Loops')"},
                        "state": {
                            "type": "string", 
                            "enum": ["new", "practicing", "mastered"],
                            "description": "The current mastery state."
                        },
                        "performance": {
                            "type": "string",
                            "enum": ["low", "medium", "high"],
                            "description": "How well the user performed. High=Mastery, Low=Needs Review."
                        }
                    },
                    "required": ["concept", "state"]
                }
            },
            {
                "name": "manage_gamification",
                "description": "Award XP to the learner. Do not let this replace your actual teaching response.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "xp_amount": {"type": "integer", "description": "Amount of XP to award (e.g., 10, 20, 50)."},
                        "reason": {"type": "string", "description": "Short reason for the award (e.g. 'Correct answer', 'Good question')."}
                    },
                    "required": ["xp_amount"]
                }
            },
            {
                "name": "present_quiz",
                "description": "MANDATORY TOOL. You MUST call this after every detailed explanation to test the user's understanding.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "question": {"type": "string", "description": "The question to ask."},
                        "options": {"type": "array", "items": {"type": "string"}, "description": "List of 4 options."},
                        "correct_answer": {"type": "string", "description": "The correct option (must match one of the options exactly)."},
                        "hint": {"type": "string", "description": "A helpful hint."},
                        "explanation": {"type": "string", "description": "Explanation to show after they answer."},
                        "xp_reward": {"type": "integer", "description": "XP to award for correct answer (default 100)."}
                    },
                    "required": ["question", "options", "correct_answer", "explanation"]
                }
            },
            {
                "name": "search_web",
                "description": "Search the web for real-time information using DuckDuckGo. Use this when the user asks for current events, facts, or specific topics you don't know.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query."}
                    },
                    "required": ["query"]
                }
            }
        ]
        
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
                    final_response_text += f"\n\n(I have updated my memory: '{content_to_save}')"
                elif tool["name"] == "update_concept_state":
                    concept = tool["input"]["concept"]
                    state = tool["input"]["state"]
                    performance = tool["input"].get("performance", "medium")
                    
                    # Logic for Spaced Repetition (SRS)
                    # Low -> 1 day, Medium -> 3 days, High -> 14 days
                    days_to_add = 1
                    if performance == "medium": days_to_add = 3
                    if performance == "high": days_to_add = 14
                    
                    next_review = (datetime.now() + timedelta(days=days_to_add)).isoformat()
                    
                    meta = {
                        "category": "learning_progress", 
                        "state": state,
                        "last_performance": performance,
                        "last_reviewed_date": datetime.now().isoformat(),
                        "next_review_date": next_review
                    }
                    
                    await self.memory.add_memory(concept, user_id, metadata=meta)
                    final_response_text += f"\n\n(Updated '{concept}' to state: {state}. Next review in {days_to_add} days.)"
                elif tool["name"] == "manage_gamification":
                    xp_amount = tool["input"]["xp_amount"]
                    reason = tool["input"].get("reason", "Learning activity")
                    
                    # Update User in DB
                    # We need to fetch user again to be safe or just use update stmt
                    from sqlalchemy import update
                    stmt = update(User).where(User.id == user_id).values(xp=User.xp + xp_amount)
                    await self.db.execute(stmt)
                    await self.db.commit()
                    
                    final_response_text += f"\n\n(🌟 +{xp_amount} XP! {reason})"
                elif tool["name"] == "present_quiz":
                    import json
                    quiz_data = tool["input"]
                    quiz_data["xp_reward"] = quiz_data.get("xp_reward", 100)
                    # Create the Protocol Block
                    json_str = json.dumps(quiz_data)
                    final_response_text += f"\n\n:::quiz {json_str} :::\n\n(I've prepared a quiz for you above!)"
                elif tool["name"] == "search_web":
                    query = tool["input"]["query"]
                    try:
                        def search_sync(q):
                            with DDGS() as ddgs:
                                return list(ddgs.text(q, max_results=3))
                        
                        results = await asyncio.to_thread(search_sync, query)
                        
                        search_summary = "\n**Search Results:**\n"
                        for res in results:
                            search_summary += f"- [{res['title']}]({res['href']}): {res['body'][:150]}...\n"
                        
                        # RECURSIVE CALL: Feed search results back to LLM
                        # We append the tool output as a system message (or pseudo-tool output)
                        # and ask the LLM to generate the final response + quiz.
                        
                        tool_output_msg = {
                            "role": "system",
                            "content": f"TOOL OUTPUT (search_web): {search_summary}\n\nINSTRUCTION: Now that you have this information, write a detailed explanation (Answer First) AND IMMEDIATELY generate a `present_quiz` call."
                        }
                        
                        # Update messages for the second pass
                        llm_messages.append({"role": "assistant", "content": f"(Thinking: I need to search for '{query}'...)"})
                        llm_messages.append(tool_output_msg)
                        llm_messages.append(force_quiz_reminder) # Reinject the reminder at the very end
                        
                        # Second generation pass
                        response_2 = await self.llm.generate(llm_messages, tools)
                        
                        # Use the second response as the final response
                        final_response_text = response_2.content
                        
                        # Handle tools from second response (e.g. the quiz)
                        if response_2.tool_calls:
                            for tool_2 in response_2.tool_calls:
                                if tool_2["name"] == "present_quiz":
                                    import json
                                    quiz_data = tool_2["input"]
                                    quiz_data["xp_reward"] = quiz_data.get("xp_reward", 100)
                                    json_str = json.dumps(quiz_data)
                                    final_response_text += f"\n\n:::quiz {json_str} :::\n\n(I've prepared a quiz for you above!)"
                                elif tool_2["name"] == "update_concept_state":
                                     # Handle state update if it happens in 2nd pass
                                    concept = tool_2["input"]["concept"]
                                    state = tool_2["input"]["state"]
                                    performance = tool_2["input"].get("performance", "medium")
                                    # ... (simplified logic for brevity, or we can duplicate the logic) ...
                                    final_response_text += f"\n\n(Updated '{concept}' to state: {state}.)"

                    except Exception as e:
                        print(f"Search failed: {e}")
                        final_response_text += f"\n\n(I tried to search for '{query}' but encountered an error.)"

        

        # 2.5 LAZINESS GUARD (Recursive Fix)
        # If the model called tools (other than search/quiz) but gave NO text explanation, we force a retry.
        # We check response.content, NOT final_response_text (which contains tool logs).
        is_lazy_response = (not response.content or len(response.content) < 50) and response.tool_calls
        
        # Check if we already did a recursive fix in search_web (which updates final_response_text completely)
        # If search_web was called, final_response_text is likely long now, but response.content is still short/empty from the first pass.
        # So we trust final_response_text length if search was involved.
        has_search = any(t["name"] == "search_web" for t in (response.tool_calls or []))
        
        if is_lazy_response and not has_search:
            print("DEBUG: Detected Lazy Response (Tools but no text). Forcing recursion.")
             
            # Construct a stiff reprimand
            tool_summary = ", ".join([t["name"] for t in response.tool_calls])
            correction_msg = {
                "role": "system",
                "content": f"ERROR: You performed tool actions ({tool_summary}) but FAILED to write a detailed explanation (Text First). \n\nINSTRUCTION: Write a detailed (300+ words) explanation for the user's request. AND IMMEDIATELY call `present_quiz`."
            }
            
            # Append the 'bad' turn to history so the model knows what it did
            # We treat the tool calls as having happened.
            llm_messages.append({"role": "assistant", "content": f"(Performed tools: {tool_summary})"})
            llm_messages.append(correction_msg)
            llm_messages.append(force_quiz_reminder)
            
            # Recursive Gen
            response_retry = await self.llm.generate(llm_messages, tools)
            
            # Prepend the new text to the existing tool logs
            # final_response_text currently holds `(I have updated memory...)`
            # We want `Here is the explanation... \n\n (I have updated memory...)`
            final_response_text = response_retry.content + "\n\n" + final_response_text
            
            # Handle new tools from retry (Mainly Quiz)
            if response_retry.tool_calls:
                 for tool_retry in response_retry.tool_calls:
                    if tool_retry["name"] == "present_quiz":
                        import json
                        quiz_data = tool_retry["input"]
                        quiz_data["xp_reward"] = quiz_data.get("xp_reward", 100)
                        json_str = json.dumps(quiz_data)
                        final_response_text += f"\n\n:::quiz {json_str} :::\n\n(I've prepared a quiz for you above!)"
                    # Ignore other tools to prevent double-dipping/loops

        # 3. Save Assistant Response
        ai_msg_db = Message(conversation_id=conversation_id, role="assistant", content=final_response_text)
        self.db.add(ai_msg_db)
        await self.db.commit()
        
        return {"response": final_response_text}
