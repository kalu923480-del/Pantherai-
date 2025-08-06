from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import uuid

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role of the message sender")
    content: str = Field(..., description="Content of the message")

class ChatCompletionRequest(BaseModel):
    model: str = Field(..., description="Model to use for completion")
    messages: List[ChatMessage] = Field(..., description="List of messages")
    max_tokens: Optional[int] = Field(default=1000, description="Maximum tokens to generate")
    temperature: Optional[float] = Field(default=0.7, description="Temperature for randomness")
    top_p: Optional[float] = Field(default=1.0, description="Top-p sampling")
    stream: Optional[bool] = Field(default=False, description="Stream the response")
    stop: Optional[Union[str, List[str]]] = Field(default=None, description="Stop sequences")

class ChatUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class Choice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: str

class ChatCompletionResponse(BaseModel):
    id: str = Field(default_factory=lambda: f"chatcmpl-{uuid.uuid4().hex[:8]}")
    object: str = "chat.completion"
    created: int = Field(default_factory=lambda: int(datetime.now().timestamp()))
    model: str
    choices: List[Choice]
    usage: ChatUsage

class ModelInfo(BaseModel):
    id: str
    object: str = "model"
    created: int = Field(default_factory=lambda: int(datetime.now().timestamp()))
    owned_by: str
    pricing: Dict[str, float]  # {"prompt": cost_per_token, "completion": cost_per_token}
    context_length: int
    description: str
    capabilities: List[str]

class ModelsListResponse(BaseModel):
    object: str = "list"
    data: List[ModelInfo]

class APIKeyInfo(BaseModel):
    key_id: str = Field(..., description="Unique identifier for the API key")
    key_hash: str = Field(..., description="Hashed version of the API key")
    original_key: str = Field(..., description="Original API key for routing")
    supported_models: List[str] = Field(default=[], description="Models this key supports")
    usage_count: int = Field(default=0, description="Number of requests made")
    rate_limit: int = Field(default=1000, description="Requests per hour limit")
    last_used: Optional[datetime] = Field(default=None, description="Last usage timestamp")
    is_active: bool = Field(default=True, description="Whether key is active")
    error_count: int = Field(default=0, description="Number of errors encountered")

class Usage(BaseModel):
    key_id: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_cost: float
    timestamp: datetime = Field(default_factory=datetime.now)
    request_id: str
    status: str  # "success", "error", "rate_limited"

class HealthStatus(BaseModel):
    status: str
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp()))
    version: str = "1.0.0"
    active_keys: int
    total_requests: int
    error_rate: float
    uptime: str