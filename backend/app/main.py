from fastapi import FastAPI

from app.routers import auth, redis, users, rpc_node, investigations, background_tasks, price, wallets
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.include_router(auth.router, tags=["auth"])
app.include_router(users.router, tags=["users"])
app.include_router(rpc_node.router, tags=["rpc_node"])
app.include_router(redis.router, tags=["redis"])
app.include_router(investigations.router)

app.include_router(price.router, tags=["price"])

app.include_router(background_tasks.router, tags=["Background Tasks"])

app.include_router(wallets.router, tags=["wallets db routes"])

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
