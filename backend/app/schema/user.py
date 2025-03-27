from sqlmodel import SQLModel

class UserBase(SQLModel):
    id: int | None = None
    username: str
    email: str | None = None


class UserCreate(UserBase, SQLModel):
    password: str

class UserInDB(UserBase, SQLModel):
    hashed_password: str

class Token(SQLModel):
    access_token: str
    token_type: str
