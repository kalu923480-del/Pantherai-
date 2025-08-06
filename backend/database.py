from pymongo import MongoClient
from typing import List, Dict, Optional
import os
from datetime import datetime, timedelta
import hashlib
import json
from models import APIKeyInfo, Usage, ModelInfo

class DatabaseManager:
    def __init__(self):
        mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017/openrouter_clone')
        self.client = MongoClient(mongo_url)
        self.db = self.client.openrouter_clone
        self.api_keys = self.db.api_keys
        self.usage = self.db.usage
        self.models = self.db.models
        self.init_data()
    
    def init_data(self):
        """Initialize database with API keys and model information"""
        # Initialize API keys from environment
        api_keys_str = os.getenv('API_KEYS', '[]')
        try:
            api_keys = json.loads(api_keys_str)
        except:
            api_keys = []
        
        # Add API keys if they don't exist
        for i, key in enumerate(api_keys):
            key_hash = hashlib.sha256(key.encode()).hexdigest()
            existing = self.api_keys.find_one({"key_hash": key_hash})
            if not existing:
                key_info = APIKeyInfo(
                    key_id=f"key_{i+1}",
                    key_hash=key_hash,
                    original_key=key,
                    supported_models=self._detect_supported_models(key),
                    usage_count=0,
                    rate_limit=1000,
                    last_used=None,
                    is_active=True,
                    error_count=0
                )
                self.api_keys.insert_one(key_info.dict())
        
        # Initialize model information
        self._init_models()
    
    def _detect_supported_models(self, api_key: str) -> List[str]:
        """Detect which models an API key supports"""
        # For now, assume all keys support all models
        # In production, you'd test each key against different endpoints
        return [
            "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo",
            "claude-3-opus", "claude-3-sonnet", "claude-3-haiku",
            "gemini-pro", "gemini-pro-vision",
            "mistral-large", "mistral-medium", "mistral-small",
            "llama-2-70b", "llama-2-13b", "llama-2-7b"
        ]
    
    def _init_models(self):
        """Initialize model information in database"""
        models_data = [
            {
                "id": "gpt-4",
                "owned_by": "openai",
                "pricing": {"prompt": 0.00003, "completion": 0.00006},
                "context_length": 8192,
                "description": "GPT-4 is OpenAI's most capable model",
                "capabilities": ["chat", "completion", "reasoning"]
            },
            {
                "id": "gpt-4-turbo",
                "owned_by": "openai", 
                "pricing": {"prompt": 0.00001, "completion": 0.00003},
                "context_length": 128000,
                "description": "GPT-4 Turbo with 128k context",
                "capabilities": ["chat", "completion", "reasoning", "vision"]
            },
            {
                "id": "claude-3-opus",
                "owned_by": "anthropic",
                "pricing": {"prompt": 0.000015, "completion": 0.000075},
                "context_length": 200000,
                "description": "Claude 3 Opus - most capable Claude model",
                "capabilities": ["chat", "completion", "reasoning", "analysis"]
            },
            {
                "id": "claude-3-sonnet",
                "owned_by": "anthropic",
                "pricing": {"prompt": 0.000003, "completion": 0.000015},
                "context_length": 200000,
                "description": "Claude 3 Sonnet - balanced performance",
                "capabilities": ["chat", "completion", "reasoning"]
            },
            {
                "id": "gemini-pro",
                "owned_by": "google",
                "pricing": {"prompt": 0.000001, "completion": 0.000002},
                "context_length": 32768,
                "description": "Google's Gemini Pro model",
                "capabilities": ["chat", "completion", "multimodal"]
            },
            {
                "id": "mistral-large",
                "owned_by": "mistral",
                "pricing": {"prompt": 0.000008, "completion": 0.000024},
                "context_length": 32768,
                "description": "Mistral Large - flagship model",
                "capabilities": ["chat", "completion", "multilingual"]
            }
        ]
        
        for model_data in models_data:
            existing = self.models.find_one({"id": model_data["id"]})
            if not existing:
                model = ModelInfo(**model_data)
                self.models.insert_one(model.dict())
    
    def get_available_key_for_model(self, model: str) -> Optional[APIKeyInfo]:
        """Get an available API key that supports the requested model"""
        keys = list(self.api_keys.find({
            "is_active": True,
            "supported_models": model
        }).sort("usage_count", 1))
        
        for key_data in keys:
            key_info = APIKeyInfo(**key_data)
            # Check rate limit
            if self._check_rate_limit(key_info.key_id):
                return key_info
        
        return None
    
    def _check_rate_limit(self, key_id: str) -> bool:
        """Check if key is within rate limits"""
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_usage = self.usage.count_documents({
            "key_id": key_id,
            "timestamp": {"$gte": one_hour_ago}
        })
        
        key_info = self.api_keys.find_one({"key_id": key_id})
        if key_info:
            return recent_usage < key_info.get("rate_limit", 1000)
        return False
    
    def record_usage(self, usage: Usage):
        """Record API usage"""
        self.usage.insert_one(usage.dict())
        
        # Update key usage count
        self.api_keys.update_one(
            {"key_id": usage.key_id},
            {
                "$inc": {"usage_count": 1},
                "$set": {"last_used": datetime.now()}
            }
        )
    
    def record_error(self, key_id: str):
        """Record an error for a key"""
        self.api_keys.update_one(
            {"key_id": key_id},
            {"$inc": {"error_count": 1}}
        )
    
    def get_models(self) -> List[ModelInfo]:
        """Get all available models"""
        models = []
        for model_data in self.models.find():
            models.append(ModelInfo(**model_data))
        return models
    
    def get_usage_stats(self) -> Dict:
        """Get usage statistics"""
        total_requests = self.usage.count_documents({})
        
        # Get error rate from last 24 hours
        yesterday = datetime.now() - timedelta(hours=24)
        recent_usage = self.usage.count_documents({"timestamp": {"$gte": yesterday}})
        recent_errors = self.usage.count_documents({
            "timestamp": {"$gte": yesterday},
            "status": "error"
        })
        
        error_rate = (recent_errors / recent_usage * 100) if recent_usage > 0 else 0
        
        active_keys = self.api_keys.count_documents({"is_active": True})
        
        return {
            "total_requests": total_requests,
            "error_rate": round(error_rate, 2),
            "active_keys": active_keys,
            "recent_usage": recent_usage
        }