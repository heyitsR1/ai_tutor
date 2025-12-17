from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta
from .llm import get_llm_provider
from .memory import MemoryManager
from .models import Message, User
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
        
CRITICAL RULE: TEXT FIRST, THEN QUIZ (MANDATORY)
1. WRITE A DETAILED EXPLANATION (min 300 words).
   - Use headings, bold text, and lists.
   - Explain the concept deeply.
2. ONLY AFTER THE TEXT, call `present_quiz`.
3. Do NOT call `save_memory` before you have written the full explanation.
4. Do NOT call `present_quiz` without writing text first.

"Here is a detailed explanation... [Long Text]... Now let's test your knowledge." -> [present_quiz]

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

When to use tools:
- ONLY after providing a full, helpful response.
- Do NOT use tools to answer questions.
- Use `update_concept_state` when the user demonstrates understanding or struggles, or explicitly starts a new topic.
- Use `manage_gamification` when the user completes a challenge, gives a good answer, or shows engagement. Be generous with small XP amounts (10-50 XP).
- Use `present_quiz` when you want to test the user's knowledge. This will show a visual interactive card.

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
        
        llm_messages = [{"role": "system", "content": system_prompt}] + history_msgs
        
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
                "description": "Update the state of a learning concept (e.g. from 'new' to 'practicing') and record performance for Spaced Repetition.",
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
                "description": "Award XP to the learner or update their streak. Use this to reinforce positive learning behaviors.",
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
                "description": "Display a visual, interactive multiple-choice quiz to the user.",
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
        
        # 3. Save Assistant Response
        ai_msg_db = Message(conversation_id=conversation_id, role="assistant", content=final_response_text)
        self.db.add(ai_msg_db)
        await self.db.commit()
        
        return {"response": final_response_text}
