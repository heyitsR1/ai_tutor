from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, timedelta
from .llm import get_llm_provider
from .memory import MemoryManager
from .models import Message, User
from typing import List, Dict, Any
from .models import Conversation

class Agent:
    def __init__(self, db: AsyncSession, user_id: int = None):
        self.llm = get_llm_provider(user_id)
        self.memory = MemoryManager(db)
        self.db = db
        self.user_id = user_id
    
    async def generate_title(self, user_message: str) -> str:
        """Generate a concise chat title from the first user message"""
        prompt = f"""Generate a very short, concise title (max 30 characters) for a chat that starts with this message:

"{user_message}"

Rules:
- Maximum 30 characters
- No quotes or special formatting
- Capture the main topic/intent
- Use title case

Examples:
- "teach me python loops" -> "Python Loops"
- "what is machine learning" -> "Machine Learning Intro"
- "help me with calculus derivatives" -> "Calculus Derivatives"

Title:"""
        
        title_messages = [{"role": "user", "content": prompt}]
        response = await self.llm.generate(title_messages, None)
        title = response.content.strip()[:30] if response.content else "New Chat"
        return title

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

## 🚨🚨🚨 MANDATORY ACTION TRIGGERS 🚨🚨🚨
**CRITICAL**: When the user message contains [ACTION: X], you MUST call the specified tool. This is NOT optional.

| User Says | YOU MUST DO |
|-----------|-------------|
| [ACTION: QUIZ] | Call `present_quiz` with 3 questions about recent topics |
| [ACTION: CHEATSHEET] | Call `generate_cheatsheet` with topic and sections array |
| [ACTION: RESOURCES] | Call `web_search` with a query about the recent topic |

**FAILURE TO CALL THE TOOL IS A CRITICAL ERROR.**

When responding to an ACTION:
1. Write ONE short sentence (10 words max) like "Here's your quiz!" or "Let me find resources..."
2. IMMEDIATELY call the required tool
3. DO NOT write explanations, summaries, or repeat previous content

## 📝 RESPONSE FORMATTING (MAKE IT VISUALLY ENGAGING)

Your responses must be SCANNABLE and BEAUTIFUL. Use these techniques:

### Visual Hierarchy
- Use `## Headings` for main sections
- Use `### Subheadings` for subsections  
- Add blank lines between sections for breathing room

### Text Variety
- Use **bold** for key terms and definitions
- Use *italics* for emphasis or foreign terms
- Use `inline code` for technical terms, functions, commands
- Use > blockquotes for important notes, tips, or warnings

### Lists & Structure
- Use bullet points liberally (like this!)
- Use numbered lists for sequential steps
- Keep list items SHORT (one line each)

### Code & Examples
```python
# Use code blocks for any code
def example():
    return "like this"
```

### Emojis (Strategic Use)
- 📌 Pin important points
- ⚠️ Warnings or gotchas
- 💡 Tips and insights
- ✅ Correct approaches
- ❌ Common mistakes
- 🎯 Goals or objectives
- 📚 References

### Spacing & Readability
- Maximum 2-3 sentences per paragraph
- Add TWO line breaks between major sections
- Never write walls of text

### Example Response Format:
```
## 📌 Topic Name

Brief intro that hooks the reader (1-2 sentences).


### 🔑 Key Concept 1

> 💡 **Important**: This is a key insight in a blockquote.

Here's the explanation in plain terms:
- Point one
- Point two
- Point three


### ⚙️ How It Works

Step-by-step breakdown:
1. First step
2. Second step  
3. Third step


### ✅ Summary

**Key Takeaway**: One sentence wrap-up.


---

🎯 Ready to test your knowledge, or shall we explore [specific topic] next?
```


1. **CONTENT DELIVERY FIRST**:
You are an AI Tutor called Siksak, not a general-purpose chatbot.

Your primary responsibility is to TEACH, not just answer.
Your success is measured by learner understanding, retention, and progress over time.

────────────────────────
CORE IDENTITY
────────────────────────
You are Siksak, a personalized AI tutor designed for structured learning.
You adapt to the learner's level, remember their progress, and guide them through concepts step by step.

You are not ChatGPT. You are a real teacher, mentor, and curriculum guide.

────────────────────────
TEACHING PHILOSOPHY
────────────────────────
Always prioritize learning over speed.

Rules:
- Break complex ideas into small, logical steps
- Explain WHY something works, not just WHAT it is
- Prefer clarity over cleverness
- Keep responses SHORT and digestible (under 150 words)
- Always suggest what to explore next

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

IMPORTANT: Do NOT mention memory operations to the user.
Memory operations happen silently in the background.

Store only educationally relevant information.

────────────────────────
GAMIFIED LEARNING MODE
────────────────────────
Learning should be interactive and engaging.

Rules:
- Do not always give direct answers immediately
- Use short challenges or micro-questions
- Encourage the learner to attempt first
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
Streak: {streak} days

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
4. present_quiz: Display a visual interactive quiz with 3 questions.
5. web_search: Search the web for learning resources, tutorials, and documentation.
6. generate_cheatsheet: Create a clean, printable HTML cheatsheet summarizing key concepts.

When to use tools:
- ONLY after providing a full, helpful response.
- Do NOT use tools to answer questions.
- Use `update_concept_state` when the user demonstrates understanding or struggles, or explicitly starts a new topic.
- Use `manage_gamification` when the user completes a challenge, gives a good answer, or shows engagement. Be generous with small XP amounts (10-50 XP).
- Use `present_quiz` when you want to test the user's knowledge OR when the user asks to be quizzed.
- Use `web_search` when the user asks for learning resources, tutorials, or external references.
- Use `generate_cheatsheet` when the user asks for a summary, cheatsheet, or wants to consolidate learning.

────────────────────────
VISUAL QUIZ PROTOCOL
────────────────────────
When you use the `present_quiz` tool, provide an array of 3 questions.
The quiz will display them sequentially to the user.
Use quizzes to check understanding after explaining a topic.

────────────────────────
ACTIVE RECALL PROTOCOL
────────────────────────
The 'TOPICS DUE FOR REVIEW' section above lists concepts the user might be forgetting.
If this list is not empty, you should:
1. Provide your main response to the user's current input first.
2. Then, transition: "By the way, it's time for a Neural Sync check on [Topic]."
3. Use `present_quiz` to test that topic.

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
                "description": "Display a visual, interactive multiple-choice quiz with 3 questions to the user.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "questions": {
                            "type": "array",
                            "description": "Array of 3 quiz questions",
                            "items": {
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
                            },
                            "minItems": 3,
                            "maxItems": 3
                        }
                    },
                    "required": ["questions"]
                }
            },
            {
                "name": "web_search",
                "description": "Search the web for learning resources, tutorials, documentation, or other educational content relevant to the current topic.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query to find relevant resources."},
                        "num_results": {"type": "integer", "description": "Number of results to return (default 5, max 10)."}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "generate_cheatsheet",
                "description": "Generate a clean, printable HTML cheatsheet summarizing key concepts from the conversation.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "topic": {"type": "string", "description": "The main topic of the cheatsheet."},
                        "sections": {
                            "type": "array",
                            "description": "Array of sections to include in the cheatsheet.",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "title": {"type": "string", "description": "Section title."},
                                    "content": {"type": "string", "description": "Section content (can include code, examples, key points)."}
                                },
                                "required": ["title", "content"]
                            }
                        },
                        "tips": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of quick tips or mnemonics."
                        }
                    },
                    "required": ["topic", "sections"]
                }
            }
        ]
        
        # Execution Loop (ReAct Pattern)
        turn_messages = llm_messages.copy()
        final_response_text = ""
        iteration = 0
        MAX_ITERATIONS = 5
        
        while iteration < MAX_ITERATIONS:
            iteration += 1
            # Call LLM
            response = await self.llm.generate(turn_messages, tools if not is_guest_mode else None)
            
            # Append text content to the final user response
            if response.content:
                final_response_text += response.content
            
            # If no tool calls or guest mode, we are done
            if not response.tool_calls or is_guest_mode:
                break
            
            # Add Assistant Message (with tools) to history
            # We use the helper to format it correctly for the provider (Claude vs OpenAI)
            asst_msg = self.llm.format_tool_call_message(response.tool_calls, response.content)
            turn_messages.append(asst_msg)
            
            # Execute Tools
            for tool in response.tool_calls:
                tool_name = tool["name"]
                tool_input = tool["input"]
                tool_id = tool["id"]
                
                tool_result_for_llm = "Tool executed successfully." # Default
                user_facing_log = ""
                
                try:
                    if tool_name == "save_memory":
                        content_to_save = tool_input["content"]
                        category = tool_input.get("category", "general")
                        await self.memory.add_memory(content_to_save, user_id, metadata={"category": category})
                        
                        tool_result_for_llm = f"Saved memory: {content_to_save}"
                        # No user-facing log - memory operations are silent
                        print(f"[DEBUG] Memory saved: {content_to_save}")
                        
                    elif tool_name == "update_concept_state":
                        concept = tool_input["concept"]
                        state = tool_input["state"]
                        performance = tool_input.get("performance", "medium")
                        
                        # Logic for Spaced Repetition (SRS)
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
                        
                        tool_result_for_llm = f"Updated concept '{concept}' to state '{state}'."
                        # No user-facing log - concept state updates are silent
                        print(f"[DEBUG] Concept state updated: {concept} -> {state}")
                        
                    elif tool_name == "manage_gamification":
                        xp_amount = tool_input["xp_amount"]
                        reason = tool_input.get("reason", "Learning activity")
                        
                        # Update User in DB
                        stmt = update(User).where(User.id == user_id).values(xp=User.xp + xp_amount)
                        await self.db.execute(stmt)
                        await self.db.commit()
                        
                        tool_result_for_llm = f"Awarded {xp_amount} XP."
                        # No user-facing log - XP awards are silent
                        print(f"[DEBUG] XP awarded: +{xp_amount} for {reason}")
                        
                    elif tool_name == "present_quiz":
                        import json
                        quiz_data = tool_input
                        # Ensure each question has xp_reward
                        if "questions" in quiz_data:
                            for q in quiz_data["questions"]:
                                q["xp_reward"] = q.get("xp_reward", 100)
                        # Create the Protocol Block
                        json_str = json.dumps(quiz_data)
                        
                        tool_result_for_llm = "Quiz presented to user."
                        user_facing_log = f"\n\n:::quiz {json_str} :::"
                    
                    elif tool_name == "web_search":
                        import json
                        from duckduckgo_search import DDGS
                        
                        query = tool_input["query"]
                        num_results = min(tool_input.get("num_results", 5), 10)
                        
                        try:
                            with DDGS() as ddgs:
                                # region='wt-wt' = worldwide English, ensures English results
                                results = list(ddgs.text(query, region='wt-wt', max_results=num_results))
                            
                            # Format results for display
                            resources = []
                            for r in results:
                                resources.append({
                                    "title": r.get("title", ""),
                                    "url": r.get("href", r.get("link", "")),
                                    "description": r.get("body", r.get("snippet", ""))
                                })
                            
                            resource_data = {
                                "query": query,
                                "resources": resources
                            }
                            json_str = json.dumps(resource_data)
                            
                            tool_result_for_llm = f"Found {len(resources)} resources for '{query}'."
                            user_facing_log = f"\n\n:::resources {json_str} :::"
                            print(f"[DEBUG] Web search for '{query}': found {len(resources)} results")
                        except Exception as e:
                            tool_result_for_llm = f"Web search failed: {str(e)}"
                            print(f"[DEBUG] Web search error: {e}")
                    
                    elif tool_name == "generate_cheatsheet":
                        import json
                        
                        topic = tool_input["topic"]
                        sections = tool_input.get("sections", [])
                        tips = tool_input.get("tips", [])
                        
                        # Generate styled HTML cheatsheet
                        sections_html = ""
                        for section in sections:
                            # Escape HTML and convert newlines
                            content = section["content"].replace("\n", "<br>")
                            sections_html += f'''
                            <div class="section">
                                <h3>{section["title"]}</h3>
                                <div class="content">{content}</div>
                            </div>'''
                        
                        tips_html = ""
                        if tips:
                            tips_items = "".join([f"<li>{tip}</li>" for tip in tips])
                            tips_html = f'''
                            <div class="tips">
                                <h3>💡 Quick Tips</h3>
                                <ul>{tips_items}</ul>
                            </div>'''
                        
                        html_content = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{topic} - Cheatsheet</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 24px;
            background: #faf8f5;
            color: #2d2a26;
            line-height: 1.6;
        }}
        .header {{
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #74523b;
        }}
        h1 {{ color: #74523b; font-size: 28px; margin-bottom: 8px; }}
        .subtitle {{ color: #6b5d4d; font-size: 14px; }}
        .section {{
            background: white;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            border-left: 4px solid #af9d8e;
        }}
        h3 {{ color: #74523b; margin-bottom: 12px; font-size: 18px; }}
        .content {{ color: #4a4541; }}
        .tips {{
            background: #f0ebe4;
            border-radius: 8px;
            padding: 16px;
            margin-top: 24px;
        }}
        .tips h3 {{ color: #74523b; }}
        .tips ul {{ margin-left: 20px; margin-top: 8px; }}
        .tips li {{ margin-bottom: 4px; color: #5a5046; }}
        code {{
            background: #f5f0eb;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 14px;
        }}
        @media print {{
            body {{ padding: 12px; background: white; }}
            .section {{ break-inside: avoid; }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>📚 {topic}</h1>
        <div class="subtitle">Cheatsheet • Generated by Siksak</div>
    </div>
    {sections_html}
    {tips_html}
</body>
</html>'''
                        
                        cheatsheet_data = {
                            "topic": topic,
                            "html": html_content
                        }
                        json_str = json.dumps(cheatsheet_data)
                        
                        tool_result_for_llm = f"Cheatsheet for '{topic}' generated successfully."
                        user_facing_log = f"\n\n:::cheatsheet {json_str} :::"
                        print(f"[DEBUG] Generated cheatsheet for '{topic}'")
                        
                    else:
                        tool_result_for_llm = f"Error: Unknown tool {tool_name}"
                
                except Exception as e:
                    tool_result_for_llm = f"Error executing tool {tool_name}: {str(e)}"
                    print(f"Tool Execution Error: {e}")
                
                # Append user facing log -> We want the user to see these updates immediately in the text stream
                # usually, but here we just append to the final block.
                final_response_text += user_facing_log
                
                # Append Tool Result to history
                res_msg = self.llm.format_tool_result_message(tool_id, tool_result_for_llm)
                turn_messages.append(res_msg)
        
        # 3. Save Assistant Response
        ai_msg_db = Message(conversation_id=conversation_id, role="assistant", content=final_response_text)
        self.db.add(ai_msg_db)
        await self.db.commit()
        
        # 4. Auto-generate title if this is the first message
        response_data = {"response": final_response_text}
        
        if len(messages) == 0 and not is_guest_mode:
            try:
                new_title = await self.generate_title(user_message)
                # Update conversation title in DB
                conv_stmt = update(Conversation).where(Conversation.id == conversation_id).values(title=new_title)
                await self.db.execute(conv_stmt)
                await self.db.commit()
                response_data["new_title"] = new_title
                print(f"[DEBUG] Auto-generated title: {new_title}")
            except Exception as e:
                print(f"[DEBUG] Failed to generate title: {e}")
        
        return response_data
