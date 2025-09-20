from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    admin_code: Optional[str] = None

class UserLogin(BaseModel):
    email:str
    password:str