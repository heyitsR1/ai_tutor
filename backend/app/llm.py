from abc import ABC, abstractmethod
from typing import List, Dict, Any
import os
import json
import anthropic
import openai

from dataclasses import dataclass, field

@dataclass
class LLMResponse:
    content: str
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)

class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]] = None) -> LLMResponse:
        pass

    @abstractmethod
    def format_tool_call_message(self, tool_calls: List[Dict[str, Any]], content: str = None) -> Dict[str, Any]:
        """Format the assistant's tool call message for the message history."""
        pass

    @abstractmethod
    def format_tool_result_message(self, tool_call_id: str, result: str) -> Dict[str, Any]:
        """Format the tool execution result for the message history."""
        pass

class ClaudeProvider(LLMProvider):
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-3-haiku-20240307"

    async def generate(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]] = None) -> LLMResponse:
        # Extract system message from messages list if present
        system_message = "You are a helpful AI tutor."  # Default fallback
        filtered_messages = []
        
        for m in messages:
            if m["role"] == "system":
                system_message = m["content"]  # Use the actual system prompt from agent.py
            else:
                filtered_messages.append(m)
        
        kwargs = {
            "model": self.model,
            "max_tokens": 4096,
            "messages": filtered_messages,
            "system": system_message
        }
        if tools:
            kwargs["tools"] = tools

        response = await self.client.messages.create(**kwargs)
        
        content = ""
        tool_calls = []
        
        for block in response.content:
            if block.type == "text":
                content += block.text
            elif block.type == "tool_use":
                tool_calls.append({
                    "name": block.name,
                    "input": block.input,
                    "id": block.id
                })
                
        return LLMResponse(content=content, tool_calls=tool_calls)

    def format_tool_call_message(self, tool_calls: List[Dict[str, Any]], content: str = None) -> Dict[str, Any]:
        # For Claude, the assistant message that initiates tools must contain the tool_use blocks
        # And potentially text blocks
        blocks = []
        if content:
            blocks.append({"type": "text", "text": content})
            
        for tc in tool_calls:
            blocks.append({"type": "tool_use", "id": tc["id"], "name": tc["name"], "input": tc["input"]})
            
        return {
            "role": "assistant",
            "content": blocks
        }

    def format_tool_result_message(self, tool_call_id: str, result: str) -> Dict[str, Any]:
        return {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": tool_call_id,
                    "content": result
                }
            ]
        }

class LocalProvider(LLMProvider):
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            base_url=os.getenv("LOCAL_LLM_URL", "http://host.docker.internal:11434/v1"),
            api_key="sk-dummy"
        )
        self.model = "llama3" 
    
    async def generate(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]] = None) -> LLMResponse:
        kwargs = {
            "model": self.model,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        response = await self.client.chat.completions.create(**kwargs)
        message = response.choices[0].message
        
        tool_calls = []
        if message.tool_calls:
            for tc in message.tool_calls:
                tool_calls.append({
                    "name": tc.function.name,
                    "input": json.loads(tc.function.arguments),
                    "id": tc.id
                })
                
        return LLMResponse(content=message.content or "", tool_calls=tool_calls)

    def format_tool_call_message(self, tool_calls: List[Dict[str, Any]], content: str = None) -> Dict[str, Any]:
        # OpenAI expects an assistant message with 'tool_calls' field and optional content
        return {
            "role": "assistant",
            "content": content,
            "tool_calls": [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": {
                        "name": tc["name"],
                        "arguments": json.dumps(tc["input"])
                    }
                }
                for tc in tool_calls
            ]
        }

    def format_tool_result_message(self, tool_call_id: str, result: str) -> Dict[str, Any]:
        return {
            "role": "tool",
            "tool_call_id": tool_call_id,
            "name": "unknown", # Optional but good
            "content": result
        }

class GroqProvider(LLMProvider):
    """GROQ API provider - uses OpenAI-compatible format"""
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.client = openai.AsyncOpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=self.api_key
        )
        # GROQ models: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    async def generate(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]] = None) -> LLMResponse:
        # Convert Claude-style system message to OpenAI format
        processed_messages = []
        for m in messages:
            if m["role"] == "system":
                processed_messages.append({"role": "system", "content": m["content"]})
            else:
                processed_messages.append(m)
        
        kwargs = {
            "model": self.model,
            "messages": processed_messages,
            "max_tokens": 4096,
        }
        if tools:
            # Convert Claude tool format to OpenAI format
            openai_tools = []
            for tool in tools:
                openai_tools.append({
                    "type": "function",
                    "function": {
                        "name": tool["name"],
                        "description": tool.get("description", ""),
                        "parameters": tool.get("input_schema", {})
                    }
                })
            kwargs["tools"] = openai_tools
            kwargs["tool_choice"] = "auto"

        response = await self.client.chat.completions.create(**kwargs)
        message = response.choices[0].message
        
        tool_calls = []
        if message.tool_calls:
            for tc in message.tool_calls:
                tool_calls.append({
                    "name": tc.function.name,
                    "input": json.loads(tc.function.arguments),
                    "id": tc.id
                })
                
        return LLMResponse(content=message.content or "", tool_calls=tool_calls)

    def format_tool_call_message(self, tool_calls: List[Dict[str, Any]], content: str = None) -> Dict[str, Any]:
        return {
            "role": "assistant",
            "content": content,
            "tool_calls": [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": {
                        "name": tc["name"],
                        "arguments": json.dumps(tc["input"])
                    }
                }
                for tc in tool_calls
            ]
        }

    def format_tool_result_message(self, tool_call_id: str, result: str) -> Dict[str, Any]:
        return {
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": result
        }

# Global store for user-specific API keys (in production, store in DB)
_user_llm_settings: Dict[int, Dict[str, str]] = {}

def set_user_llm_settings(user_id: int, provider: str, api_key: str = None):
    """Store user's LLM provider preference and API key"""
    _user_llm_settings[user_id] = {
        "provider": provider,
        "api_key": api_key
    }

def get_user_llm_settings(user_id: int) -> Dict[str, str]:
    """Get user's LLM settings"""
    return _user_llm_settings.get(user_id, {"provider": "claude", "api_key": None})

def get_llm_provider(user_id: int = None) -> LLMProvider:
    """Get LLM provider, optionally checking user-specific settings"""
    # Check user-specific settings first
    if user_id and user_id in _user_llm_settings:
        settings = _user_llm_settings[user_id]
        provider = settings.get("provider", "claude")
        api_key = settings.get("api_key")
        
        if provider == "groq" and api_key:
            return GroqProvider(api_key=api_key)
    
    # Fall back to environment-based provider
    provider = os.getenv("LLM_PROVIDER", "claude")
    if provider == "local":
        return LocalProvider()
    elif provider == "groq":
        return GroqProvider()
    return ClaudeProvider()

