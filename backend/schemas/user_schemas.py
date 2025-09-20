from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    admin_code: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserAdminLogin(BaseModel):
    email: EmailStr
    password: str
    login_as_admin: bool = True  # This field indicates admin login attempt