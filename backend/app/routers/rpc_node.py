import json

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import get_current_active_user
from app.schema.walletschema import WalletForensicsRequest
from app.utils.bitcoin_rpc import bitcoin_rpc_call

from collections import defaultdict

from app.utils.mempool_api import mempool_api_call

router = APIRouter()

@router.get("/node-info", response_model=dict)
async def get_node_info(current_user: dict = Depends(get_current_active_user)):
    """
    Fetch basic information about the Bitcoin node.
    """
    try:
        blockchain_info = bitcoin_rpc_call("getblockchaininfo")
        return {"blockchain_info": blockchain_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/latest-blocks", response_model=dict)
async def get_latest_blocks(
    count: int = 7,  # Number of blocks to fetch
    current_user: dict = Depends(get_current_active_user)
):
    """
    Fetch the latest blocks.
    """
    try:
        # Fetch the latest block height
        blockchain_info = bitcoin_rpc_call("getblockchaininfo")
        latest_height = blockchain_info["blocks"]

        # Adjust count if it exceeds available blocks
        if count > latest_height:
            count = latest_height

        # Collect details of the latest blocks
        blocks = []
        for i in range(latest_height, latest_height - count, -1):
            block_hash = bitcoin_rpc_call("getblockhash", [i])
            block = bitcoin_rpc_call("getblock", [block_hash])
            blocks.append({
                "height": i,
                "hash": block["hash"],
                "time": block["time"],
                "transactions": len(block["tx"]),
            })

        return {"latest_blocks": blocks}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/current-wallet", response_model=dict)
async def get_current_wallet():
    """
    Return information about the currently loaded wallet.
    """
    try:
        # Fetch wallet info
        wallet_info = bitcoin_rpc_call("getwalletinfo")
        return wallet_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/related-tx", response_model=dict)
async def transaction_forensics(
    txid: str,
    depth: int = 5,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Perform forensic analysis on a given transaction.
    Fetch the last `depth` transactions related to the given transaction.
    """
    try:
        # Fetch raw transaction details
        raw_tx = bitcoin_rpc_call("getrawtransaction", [txid, True])

        # Ensure the response is valid
        if not raw_tx or "vin" not in raw_tx or "vout" not in raw_tx:
            raise HTTPException(
                status_code=404,
                detail=f"Transaction {txid} not found or not decodable."
            )

        # Extract inputs and outputs
        inputs = raw_tx["vin"]
        outputs = raw_tx["vout"]

        # Related transactions
        related_transactions = []

        # Trace previous transactions for inputs
        for vin in inputs:
            if "txid" in vin:
                prev_txid = vin["txid"]
                prev_tx = bitcoin_rpc_call("getrawtransaction", [prev_txid, True])
                if prev_tx:
                    related_transactions.append({
                        "txid": prev_txid,
                        "details": prev_tx
                    })
                if len(related_transactions) >= depth:
                    break

        # Trace outputs for spending transactions
        for vout in outputs:
            script_pub_key = vout.get("scriptPubKey", {})
            addresses = script_pub_key.get("addresses", [])
            for address in addresses:
                unspent = bitcoin_rpc_call("listunspent", [0, 9999999, [address]])
                for utxo in unspent:
                    if utxo["txid"] not in [tx["txid"] for tx in related_transactions]:
                        spent_txid = utxo["txid"]
                        spent_tx = bitcoin_rpc_call("getrawtransaction", [spent_txid, True])
                        if spent_tx:
                            related_transactions.append({
                                "txid": spent_txid,
                                "details": spent_tx
                            })
                            if len(related_transactions) >= depth:
                                break
                if len(related_transactions) >= depth:
                    break

        return {"related_transactions": related_transactions[:depth]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/wallet-forensics", response_model=dict)
async def wallet_forensics(
    request: WalletForensicsRequest,  # Assume this now includes only "address" and "max_depth"
    current_user: dict = Depends(get_current_active_user)
):
    """
    Perform forensic analysis on a single wallet address.
    Dynamically import the address and analyze its activity.
    """
    try:
        # Extract data from the request
        address = request.wallet_address
        max_depth = request.max_depth

        # Fetch address info
        address_info = bitcoin_rpc_call("getaddressinfo", [address])
        print(f"Address info: {address_info}")  # Debugging

        if not address_info.get("ismine") and not address_info.get("iswatchonly"):
            # Construct the addr() descriptor for the address
            try:
                descriptor_info = bitcoin_rpc_call("getdescriptorinfo", [f"addr({address})"])
                descriptor_with_checksum = descriptor_info["descriptor"]

                # Prepare descriptor payload without "active"
                descriptor_payload = [
                    {
                        "desc": descriptor_with_checksum,
                        "timestamp": "now",
                        "label": "forensic_analysis"
                    }
                ]
                print(f"Descriptor payload: {json.dumps(descriptor_payload, indent=2)}")  # Debugging

                # Import descriptor
                import_response = bitcoin_rpc_call("importdescriptors", [descriptor_payload])
                if not import_response[0].get("success"):
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to import address: {address}. Error: {import_response[0].get('error')}"
                    )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to construct or import descriptor for address: {address}. Error: {str(e)}"
                )

        # Initialize metrics
        total_received = 0
        total_sent = 0
        total_transactions = 0
        unspent_outputs = []
        linked_transactions = []

        # Fetch all transactions for the wallet
        raw_transactions = bitcoin_rpc_call("listtransactions", ["*", max_depth])

        for tx in raw_transactions:
            linked_transactions.append(tx)
            if tx["category"] == "receive":
                total_received += tx["amount"]
            elif tx["category"] == "send":
                total_sent += tx["amount"]
            total_transactions += 1

        # Fetch unspent outputs for the provided address
        unspent = bitcoin_rpc_call("listunspent", [0, 9999999, [address]])
        print(f"Unspent outputs: {unspent}")  # Debugging

        # Calculate wallet balance
        wallet_balance = sum(utxo["amount"] for utxo in unspent)
        print(f"Wallet balance: {wallet_balance}")  # Debugging

        # Return forensic data
        return {
            "wallet_address": address,
            "total_transactions": total_transactions,
            "total_received": total_received,
            "total_sent": total_sent,
            "wallet_balance": wallet_balance,
            "linked_transactions": linked_transactions[:max_depth],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tx-info", response_model=dict)
async def get_tx_info(
    txid: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Fetch details about a specific transaction by its txid.
    """
    try:
        # Fetch transaction details
        raw_tx = bitcoin_rpc_call("getrawtransaction", [txid, True])

        # Check if transaction details are valid
        if not raw_tx:
            raise HTTPException(
                status_code=404,
                detail=f"Transaction {txid} not found."
            )

        return {"transaction": raw_tx}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mempool/tx/info", response_model=dict)
async def get_tx_info_mempool(
    txid: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Fetch all transactions related to a given address.
    """
    try:
        # Fetch address transactions
        tx_info= mempool_api_call(f"api/tx/{txid}")

        return {
            "txid": txid,
            "transaction": tx_info,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tx/wallet")
async def get_tx_wallet(
    txid: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get the wallet address from a given transaction ID.
    """

    try:
        # Fetch raw transaction details
        tx_info= mempool_api_call(f"api/tx/{txid}")

        if not tx_info:
            raise HTTPException(status_code=404, detail=f"Transaction {txid} not found.")


    # scriptpubkey_address is in vin
        scriptpubkey_address = tx_info["vin"][0]["prevout"]["scriptpubkey_address"]

        if not scriptpubkey_address:
            raise HTTPException(status_code=404, detail=f"Transaction {txid} not found.")

        return {
            "txid": txid,
            "scriptpubkey_address": scriptpubkey_address,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@router.get("/coin-age/txid", response_model=dict)
async def get_coin_age_by_txid(
    hashid: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get the age of coins from a transaction ID.
    """
    try:
        # Fetch raw transaction details
        raw_tx = bitcoin_rpc_call("getrawtransaction", [hashid, True])

        if not raw_tx or "blockhash" not in raw_tx:
            raise HTTPException(status_code=404, detail=f"Transaction {hashid} not found.")

        # Get the block details where the transaction was confirmed
        block_hash = raw_tx["blockhash"]
        block = bitcoin_rpc_call("getblock", [block_hash])

        # Calculate coin age in blocks
        current_block = bitcoin_rpc_call("getblockcount")
        coin_creation_block = block["height"]
        age_in_blocks = current_block - coin_creation_block
        age_in_days = (age_in_blocks * 10) / (60 * 24)  # Approx 10 minutes per block

        return {
            "hashid": hashid,
            "coin_creation_block": coin_creation_block,
            "current_block": current_block,
            "age_in_blocks": age_in_blocks,
            "age_in_days": round(age_in_days, 2),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/coin-age/address", response_model=dict)
async def get_coin_age_by_address(
    address: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get the age of coins for a wallet address.
    """
    try:
        # Fetch unspent outputs for the address
        unspent_outputs = bitcoin_rpc_call("listunspent", [0, 9999999, [address]])

        if not unspent_outputs:
            raise HTTPException(status_code=404, detail=f"No UTXOs found for address {address}.")

        current_block = bitcoin_rpc_call("getblockcount")
        coin_ages = []

        for utxo in unspent_outputs:
            confirmations = utxo["confirmations"]
            creation_block = current_block - confirmations
            age_in_days = (confirmations * 10) / (60 * 24)  # Approx 10 minutes per block

            coin_ages.append({
                "txid": utxo["txid"],
                "vout": utxo["vout"],
                "amount": utxo["amount"],
                "confirmations": confirmations,
                "creation_block": creation_block,
                "age_in_days": round(age_in_days, 2),
            })

        return {
            "address": address,
            "utxos": coin_ages,
            "current_block": current_block,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/address/txs", response_model=dict)
async def get_address_txs(
    address: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Fetch all transactions related to a given address.
    """
    try:
        # Fetch address transactions
        address_txs = mempool_api_call(f"api/address/{address}/txs")

        return {
            "address": address,
            "transactions": address_txs,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/received-by-address", response_model=dict)
async def get_received_by_address(
    address: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get the total amount received by a specific Bitcoin address.
    """
    try:
        received_amount = bitcoin_rpc_call("getreceivedbyaddress", [address])

        return {
            "address": address,
            "total_received": received_amount
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

