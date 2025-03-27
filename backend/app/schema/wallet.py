from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime


# Schema class - used for API input/output
class Wallet(SQLModel):
    wallet_address: str
    created_at: Optional[float] = None
    suspicious_illegal_activity: bool = False


class WalletDB(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    wallet_name: str = Field(index=True)
    wallet_type: str = Field(index=True)
    wallet_address: str = Field(index=True)
    balance: str = Field(index=True)
    created_at: float = Field(default_factory=lambda: datetime.timestamp(datetime.now()))
    suspicious_illegal_activity: bool = Field(default=False)


class WalletForensicsRequest(Wallet):
    max_depth: int = 5