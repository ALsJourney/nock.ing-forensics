import time

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import get_current_active_user
from app.database.database import get_db
from app.schema.user import UserBase
from app.schema.wallet import Wallet, WalletDB
from app.models.users import Users
from app.models.wallets import Wallets
from sqlalchemy import select

router = APIRouter(prefix="/wallets", tags=["wallets"])


@router.post("/add", response_model=Wallet)
async def add_wallet(
        wallet: WalletDB,
        db: AsyncSession = Depends(get_db),
        current_user: UserBase = Depends(get_current_active_user)
):
    """
    Add a new wallet for the current user.
    """
    try:

        query = select(Wallets).where(Wallets.wallet_address == wallet.wallet_address)
        result = await db.execute(query)
        existing_wallet = result.scalar_one_or_none()

        if existing_wallet:
            raise HTTPException(status_code=400, detail="Wallet with this address already exists")

        # Fetch the complete user entity using the username from current_user
        query = select(Users).where(Users.username == current_user.username)
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        db_wallet = Wallets(
            user_id=user.id,  # Use the ID from the complete user entity
            wallet_name=wallet.wallet_name,
            wallet_address=wallet.wallet_address,
            wallet_type=wallet.wallet_type,
            created_at=time.time(),
            balance=wallet.balance if wallet.balance else 0.0,
            suspicious_illegal_activity=False
        )

        db.add(db_wallet)
        await db.commit()
        await db.refresh(db_wallet)
        return db_wallet
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to add wallet: {str(e)}")


@router.get("/{wallet_address}", response_model=Wallet)
async def get_wallet(
        wallet_address: str,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(get_current_active_user)
):
    """
    Get a wallet by its address.

    Parameters:
    - wallet_address: The address of the wallet to retrieve

    Returns:
    - The wallet object if found
    """
    wallet = await db.query(Wallets).filter(Wallets.wallet_address == wallet_address).first()
    if wallet is None:
        raise HTTPException(status_code=404, detail=f"Wallet with address {wallet_address} not found")
    return wallet

@router.get("/", response_model=List[Wallet])
async def list_wallets(
        owner: Optional[str] = None,
        suspicious: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(get_current_active_user),
):
    """
    List wallets with optional filtering.

    Parameters:
    - owner: Optional filter by owner
    - suspicious: Optional filter by suspicious activity flag
    - skip: Number of records to skip (pagination)
    - limit: Maximum number of records to return (pagination)

    Returns:
    - List of wallet objects
    """
    # Start with a base select statement
    stmt = select(Wallets)

    # Apply filters
    if owner:
        stmt = stmt.where(Wallets.owner == owner)

    if suspicious is not None:
        stmt = stmt.where(Wallets.suspicious_illegal_activity == suspicious)

    # Apply pagination
    stmt = stmt.offset(skip).limit(limit)

    # Execute the query
    result = await db.execute(stmt)

    # Get all results
    wallets = result.scalars().all()
    return wallets

@router.delete("/{wallet_address}", response_model=dict)
async def delete_wallet(
        wallet_address: str,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(get_current_active_user)
):
    """
    Delete a wallet.

    Parameters:
    - wallet_address: The address of the wallet to delete

    Returns:
    - A message confirming deletion
    """
    stmt = select(Wallets).where(Wallets.wallet_address == wallet_address)
    result = await db.execute(stmt)
    db_wallet = result.scalar_one_or_none()

    if db_wallet is None:
        raise HTTPException(status_code=404, detail=f"Wallet with address {wallet_address} not found")

    try:
        await db.delete(db_wallet)
        await db.commit()
        return {"message": f"Wallet with address {wallet_address} successfully deleted"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete wallet: {str(e)}")


@router.patch("/{wallet_address}/flag", response_model=Wallet)
async def flag_suspicious_activity(
        wallet_address: str,
        suspicious: bool = True,
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(get_current_active_user)
):
    """
    Flag a wallet for suspicious activity.

    Parameters:
    - wallet_address: The address of the wallet to flag
    - suspicious: Whether to flag or unflag (default: True)

    Returns:
    - The updated wallet object
    """
    stmt = select(Wallets).where(Wallets.wallet_address == wallet_address)
    result = await db.execute(stmt)
    db_wallet = result.scalar_one_or_none()

    if db_wallet is None:
        raise HTTPException(status_code=404, detail=f"Wallet with address {wallet_address} not found")

    db_wallet.suspicious_illegal_activity = suspicious

    try:
        await db.commit()
        await db.refresh(db_wallet)
        return db_wallet
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update wallet status: {str(e)}")
