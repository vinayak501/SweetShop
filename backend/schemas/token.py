from pydantic import BaseModel, EmailStr
from typing import Optional, List

class Token(BaseModel):
    access_token: str
    token_type: str