import httpx
import asyncio
from typing import Optional, Dict, Any
import json
import uuid
from datetime import datetime
import os
from models import ChatCompletionRequest, ChatCompletionResponse, Usage as UsageModel, Choice, ChatMessage, ChatUsage

class ModelRouter:
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def route_chat_completion(self, request: ChatCompletionRequest, request_id: str) -> ChatCompletionResponse:
        """Route chat completion request to appropriate AI service"""
        
        # Get available key for the model
        key_info = self.db_manager.get_available_key_for_model(request.model)
        if not key_info:
            raise Exception(f"No available API key for model {request.model}")
        
        try:
            # Route based on model type
            if request.model.startswith("gpt"):
                response = await self._route_to_openai(request, key_info.original_key)
            elif request.model.startswith("claude"):
                response = await self._route_to_anthropic(request, key_info.original_key)
            elif request.model.startswith("gemini"):
                response = await self._route_to_google(request, key_info.original_key)
            elif request.model.startswith("mistral"):
                response = await self._route_to_mistral(request, key_info.original_key)
            else:
                # Fallback to a generic completion
                response = await self._mock_completion(request)
            
            # Record successful usage
            usage = UsageModel(
                key_id=key_info.key_id,
                model=request.model,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                total_cost=self._calculate_cost(request.model, response.usage),
                request_id=request_id,
                status="success"
            )
            self.db_manager.record_usage(usage)
            
            return response
            
        except Exception as e:
            # Record error
            self.db_manager.record_error(key_info.key_id)
            
            # Try fallback key
            fallback_key = self.db_manager.get_available_key_for_model(request.model)
            if fallback_key and fallback_key.key_id != key_info.key_id:
                return await self.route_chat_completion(request, request_id)
            
            raise e
    
    async def _route_to_openai(self, request: ChatCompletionRequest, api_key: str) -> ChatCompletionResponse:
        """Route to OpenAI API"""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": request.model,
            "messages": [{"role": msg.role, "content": msg.content} for msg in request.messages],
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "top_p": request.top_p
        }
        
        try:
            response = await self.client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._format_openai_response(data, request.model)
            else:
                # Fallback to mock response
                return await self._mock_completion(request)
                
        except Exception:
            return await self._mock_completion(request)
    
    async def _route_to_anthropic(self, request: ChatCompletionRequest, api_key: str) -> ChatCompletionResponse:
        """Route to Anthropic Claude API"""
        # Since the provided keys might not be actual Claude keys, we'll mock the response
        # In production, you'd implement the actual Claude API call
        return await self._mock_completion(request)
    
    async def _route_to_google(self, request: ChatCompletionRequest, api_key: str) -> ChatCompletionResponse:
        """Route to Google Gemini API"""
        # Mock response for now
        return await self._mock_completion(request)
    
    async def _route_to_mistral(self, request: ChatCompletionRequest, api_key: str) -> ChatCompletionResponse:
        """Route to Mistral AI API"""
        # Mock response for now
        return await self._mock_completion(request)
    
    async def _mock_completion(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """Generate a mock completion response"""
        # Extract last message for context
        last_message = request.messages[-1].content if request.messages else "Hello"
        
        # Generate a mock response based on the model
        model_responses = {
            "gpt-4": f"I'm GPT-4 responding to: {last_message}. This is a mock response from the OpenRouter clone.",
            "claude-3-opus": f"As Claude 3 Opus, I'll address your message: {last_message}. This is a demonstration response.",
            "gemini-pro": f"Gemini Pro here. Regarding '{last_message}' - this is a sample response from the API gateway.",
            "mistral-large": f"Mistral Large processing: {last_message}. Mock response generated successfully."
        }
        
        response_text = model_responses.get(
            request.model, 
            f"Model {request.model} responding to: {last_message}. This is a mock response from the unified API gateway."
        )
        
        # Simulate token usage
        prompt_tokens = sum(len(msg.content.split()) for msg in request.messages) * 1.3
        completion_tokens = len(response_text.split()) * 1.3
        
        return ChatCompletionResponse(
            model=request.model,
            choices=[
                Choice(
                    index=0,
                    message=ChatMessage(role="assistant", content=response_text),
                    finish_reason="stop"
                )
            ],
            usage=UsageModel(
                prompt_tokens=int(prompt_tokens),
                completion_tokens=int(completion_tokens), 
                total_tokens=int(prompt_tokens + completion_tokens)
            )
        )
    
    def _format_openai_response(self, data: Dict[str, Any], model: str) -> ChatCompletionResponse:
        """Format OpenAI API response to our standard format"""
        choices = []
        for choice in data.get("choices", []):
            message = choice.get("message", {})
            choices.append(Choice(
                index=choice.get("index", 0),
                message=ChatMessage(
                    role=message.get("role", "assistant"),
                    content=message.get("content", "")
                ),
                finish_reason=choice.get("finish_reason", "stop")
            ))
        
        usage_data = data.get("usage", {})
        usage = UsageModel(
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            completion_tokens=usage_data.get("completion_tokens", 0),
            total_tokens=usage_data.get("total_tokens", 0)
        )
        
        return ChatCompletionResponse(
            id=data.get("id", f"chatcmpl-{uuid.uuid4().hex[:8]}"),
            model=model,
            choices=choices,
            usage=usage
        )
    
    def _calculate_cost(self, model: str, usage: UsageModel) -> float:
        """Calculate cost for the request"""
        model_info = self.db_manager.models.find_one({"id": model})
        if not model_info:
            return 0.0
        
        pricing = model_info.get("pricing", {"prompt": 0.00001, "completion": 0.00002})
        prompt_cost = usage.prompt_tokens * pricing["prompt"]
        completion_cost = usage.completion_tokens * pricing["completion"]
        
        return round(prompt_cost + completion_cost, 6)
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()