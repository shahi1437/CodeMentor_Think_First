from fastapi import APIRouter
from backend.app.api.v1.endpoints import auth, platform

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(platform.router)
