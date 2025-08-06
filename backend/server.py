from fastapi import FastAPI, HTTPException, Depends, Security, status
from fastapi.security.api_key import APIKeyHeader, APIKey
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import uuid
from datetime import datetime, timedelta
import os
from models import (
    ChatCompletionRequest, ChatCompletionResponse, ModelsListResponse, 
    ModelInfo, HealthStatus
)
from database import DatabaseManager
from router import ModelRouter

app = FastAPI(
    title="OpenRouter Clone API",
    description="Unified API Gateway for Multiple AI Models",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and router
db_manager = DatabaseManager()
model_router = ModelRouter(db_manager)

# API Key authentication
API_KEY_NAME = "Authorization"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

ADMIN_API_KEY = os.getenv('ADMIN_API_KEY', 'admin-key-12345')
VALID_API_KEYS = [ADMIN_API_KEY, "user-key-demo"]  # In production, store in database

async def get_api_key(api_key: str = Security(api_key_header)) -> str:
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )
    
    # Remove 'Bearer ' prefix if present
    if api_key.startswith('Bearer '):
        api_key = api_key[7:]
    
    if api_key not in VALID_API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return api_key

@app.get("/")
async def root():
    return {
        "message": "OpenRouter Clone API Gateway",
        "version": "1.0.0",
        "endpoints": {
            "chat_completions": "/v1/chat/completions",
            "models": "/v1/models",
            "status": "/v1/status"
        }
    }

@app.post("/v1/chat/completions", response_model=ChatCompletionResponse)
async def chat_completions(
    request: ChatCompletionRequest,
    api_key: str = Depends(get_api_key)
):
    """
    Create a chat completion using the specified model.
    Compatible with OpenAI's chat completions API.
    """
    try:
        request_id = f"req-{uuid.uuid4().hex[:8]}"
        response = await model_router.route_chat_completion(request, request_id)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing request: {str(e)}"
        )

@app.get("/v1/models", response_model=ModelsListResponse)
async def list_models(api_key: str = Depends(get_api_key)):
    """
    List all available models with pricing and capabilities.
    Compatible with OpenAI's models API.
    """
    try:
        models = db_manager.get_models()
        return ModelsListResponse(data=models)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching models: {str(e)}"
        )

@app.get("/v1/status", response_model=HealthStatus)
async def get_status(api_key: str = Depends(get_api_key)):
    """
    Get system health status and key usage statistics.
    """
    try:
        stats = db_manager.get_usage_stats()
        
        # Calculate uptime (mock for now)
        uptime = "24h 30m"
        
        return HealthStatus(
            status="healthy" if stats["error_rate"] < 10 else "degraded",
            active_keys=stats["active_keys"],
            total_requests=stats["total_requests"],
            error_rate=stats["error_rate"],
            uptime=uptime
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching status: {str(e)}"
        )

# Admin endpoints
@app.get("/admin/usage", dependencies=[Depends(get_api_key)])
async def get_usage_details():
    """Get detailed usage statistics (Admin only)"""
    try:
        # Get usage by model
        pipeline = [
            {
                "$group": {
                    "_id": "$model",
                    "total_requests": {"$sum": 1},
                    "total_tokens": {"$sum": {"$add": ["$prompt_tokens", "$completion_tokens"]}},
                    "total_cost": {"$sum": "$total_cost"}
                }
            }
        ]
        
        usage_by_model = list(db_manager.usage.aggregate(pipeline))
        
        # Get usage by key
        key_pipeline = [
            {
                "$group": {
                    "_id": "$key_id",
                    "requests": {"$sum": 1},
                    "errors": {"$sum": {"$cond": [{"$eq": ["$status", "error"]}, 1, 0]}}
                }
            }
        ]
        
        usage_by_key = list(db_manager.usage.aggregate(key_pipeline))
        
        return {
            "usage_by_model": usage_by_model,
            "usage_by_key": usage_by_key
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching usage details: {str(e)}"
        )

@app.get("/admin/keys", dependencies=[Depends(get_api_key)])
async def get_api_keys_status():
    """Get status of all API keys (Admin only)"""
    try:
        keys = []
        for key_data in db_manager.api_keys.find():
            keys.append({
                "key_id": key_data["key_id"],
                "supported_models": key_data["supported_models"],
                "usage_count": key_data["usage_count"],
                "error_count": key_data["error_count"],
                "is_active": key_data["is_active"],
                "last_used": key_data.get("last_used")
            })
        
        return {"api_keys": keys}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching API keys: {str(e)}"
        )

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await model_router.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)