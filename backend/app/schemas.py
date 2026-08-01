from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BookResponse(BaseModel):
    id: int
    title: str
    filename: str
    page_count: int
    size_bytes: int
    chunk_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    session_id: int | None = None


class Citation(BaseModel):
    index: int
    book_id: int
    book_title: str
    page: int
    excerpt: str


class MessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    citations: list[Any] = []
    created_at: datetime


class SessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: list[MessageResponse] = []

    model_config = {"from_attributes": True}


class HistoryResponse(BaseModel):
    sessions: list[SessionResponse]
