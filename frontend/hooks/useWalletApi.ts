import { useState } from 'react';
import {getCookie} from "cookies-next";

interface Wallet {
    wallet_name?: string;
    wallet_address?: string;
    wallet_type?: string;
    balance?: number;
    suspicious_illegal_activity?: boolean;
}

interface ApiResponse<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
}

export function useWalletApi() {
    const [state, setState] = useState<{
        addWallet: ApiResponse<Wallet>;
        getWallets: ApiResponse<Wallet[]>;
        updateWallet: ApiResponse<Wallet>;
        deleteWallet: ApiResponse<boolean>;
    }>({
        addWallet: { data: null, error: null, loading: false },
        getWallets: { data: null, error: null, loading: false },
        updateWallet: { data: null, error: null, loading: false },
        deleteWallet: { data: null, error: null, loading: false },
    });

    const addWallet = async (walletData: Wallet): Promise<Wallet | null> => {
        setState(prev => ({ ...prev, addWallet: { ...prev.addWallet, loading: true, error: null } }));

        try {
            const token = getCookie("token");

            const response = await fetch('/api/save-wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(walletData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to add wallet');
            }

            setState(prev => ({ ...prev, addWallet: { data, error: null, loading: false } }));
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setState(prev => ({
                ...prev,
                addWallet: { data: null, error: errorMessage, loading: false }
            }));
            return null;
        }
    };

    // TODO: Add other CRUD methods here (getWallets, updateWallet, deleteWallet)
    const getWallets = async (): Promise<Wallet[] | null> => {
        setState(prev => ({ ...prev, getWallets: { ...prev.getWallets, loading: true, error: null } }));

        try {
            const token = getCookie("token");

            const response = await fetch('/api/saved-wallets', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to get wallets');
            }

            setState(prev => ({ ...prev, getWallets: { data, error: null, loading: false } }));
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setState(prev => ({
                ...prev,
                getWallets: { data: null, error: errorMessage, loading: false }
            }));
            return null;
        }
    }

    const flagWallet = async (walletAddress: string, isFlagged: boolean): Promise<Wallet | null> => {
        setState(prev => ({ ...prev, updateWallet: { ...prev.updateWallet, loading: true, error: null } }));

        try {
            const token = getCookie("token");

            const response = await fetch('/api/flag-wallet', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    wallet_address: walletAddress,
                    suspicious_illegal_activity: isFlagged
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to flag wallet');
            }

            setState(prev => ({ ...prev, updateWallet: { data, error: null, loading: false } }));
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setState(prev => ({
                ...prev,
                updateWallet: { data: null, error: errorMessage, loading: false }
            }));
            return null;
        }
    };

    return {
        addWalletStatus: state.addWallet,
        getWalletsStatus: state.getWallets,
        updateWalletStatus: state.updateWallet,
        deleteWalletStatus: state.deleteWallet,
        addWallet,
        getWallets,
        flagWallet,
        // TODO: Add other functions here
    };

}