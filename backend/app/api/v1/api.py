from fastapi import APIRouter
from backend.app.api.v1.endpoints import auth, platform, problem_admin

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(platform.router)
api_router.include_router(problem_admin.router)
