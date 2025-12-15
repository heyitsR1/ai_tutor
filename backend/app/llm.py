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

def get_llm_provider():
    provider = os.getenv("LLM_PROVIDER", "claude")
    if provider == "local":
        return LocalProvider()
    return ClaudeProvider()
