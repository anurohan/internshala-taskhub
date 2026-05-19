"""
TaskHub — Pydantic v2 Request/Response Schemas
"""
from __future__ import annotations
from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


# ============================================================
# Enums
# ============================================================
class TaskStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    ACCEPTED = "accepted"
    REVISION_REQUESTED = "revision_requested"


class ImageType(str, Enum):
    WHITE_BG = "white_bg"
    THEME_MARBLE = "theme_marble"
    THEME_VELVET = "theme_velvet"
    LIFESTYLE_BEACH = "lifestyle_beach"
    LIFESTYLE_STUDIO = "lifestyle_studio"
    MODEL_FRONT = "model_front"
    MODEL_SIDE = "model_side"
    MODEL_CLOSEUP = "model_closeup"


class ImageStatus(str, Enum):
    PENDING = "pending"
    GENERATING = "generating"
    DONE = "done"
    FAILED = "failed"


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


# ============================================================
# User Schemas
# ============================================================
class UserProfile(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: UserRole
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None


class UserListItem(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: UserRole
    avatar_url: Optional[str] = None


# ============================================================
# Task Schemas
# ============================================================
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    # product_image_url comes from file upload, set by route handler

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be blank")
        return v.strip()


class TaskAssign(BaseModel):
    assigned_to: str = Field(..., description="User UUID to assign the task to")


class TaskRevisionRequest(BaseModel):
    admin_notes: str = Field(..., min_length=1, max_length=1000)


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    product_image_url: str
    product_image_removed_bg_url: Optional[str] = None
    created_by: Optional[str] = None
    assigned_to: Optional[str] = None
    status: TaskStatus
    admin_notes: Optional[str] = None
    generation_seed: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    # Joined fields
    created_by_profile: Optional[UserListItem] = None
    assigned_to_profile: Optional[UserListItem] = None
    generation_count: int = 0


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int


# ============================================================
# Generated Image Schemas
# ============================================================
class GenerateRequest(BaseModel):
    image_types: Optional[List[ImageType]] = None  # None = generate all 8


class GeneratedImageResponse(BaseModel):
    id: str
    task_id: str
    image_type: ImageType
    image_url: Optional[str] = None
    prompt_used: Optional[str] = None
    metadata: Dict[str, Any] = {}
    angle: Optional[str] = None
    is_final: bool
    status: ImageStatus
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class GenerationsListResponse(BaseModel):
    generations: List[GeneratedImageResponse]
    total: int
    completed: int


# ============================================================
# Job Schemas
# ============================================================
class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # queued | started | finished | failed | deferred
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None


class GenerateJobResponse(BaseModel):
    job_id: str
    generation_id: str
    image_type: str
    message: str = "Generation job enqueued"


# ============================================================
# Auth Schemas
# ============================================================
class OAuthCallbackRequest(BaseModel):
    access_token: str
    refresh_token: str


class AuthMeResponse(BaseModel):
    user: UserProfile
    is_admin: bool


# ============================================================
# Error Schema
# ============================================================
class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None
