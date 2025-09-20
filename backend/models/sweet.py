from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class Sweet(SQLModel, table=True):
    __tablename__ = "sweets" 
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    category: str
    price: float
    quantity: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)