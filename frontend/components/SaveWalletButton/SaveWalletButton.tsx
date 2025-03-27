"use client";
import {useWalletApi} from "@/hooks/useWalletApi";
import {Button} from "@/components/ui/button";
import {useState, useEffect} from "react";
import {WalletData} from "@/types/wallet.types";
import {toast} from "@/hooks/use-toast";

export default function SaveWalletButton({walletData}: { walletData: WalletData }) {
    const {addWallet, getWallets, addWalletStatus: {loading}} = useWalletApi();
    const [isSaved, setIsSaved] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    // Use a ref to track if the check has been performed
    useEffect(() => {
        let isMounted = true;

        const checkIfWalletExists = async () => {
            if (!isMounted) return;

            try {
                setIsChecking(true);
                const savedWallets = await getWallets();

                if (!isMounted) return;

                if (savedWallets && savedWallets.length > 0) {
                    // Check if current wallet address exists in saved wallets
                    const walletExists = savedWallets.some(
                        wallet => wallet.wallet_address === walletData.address.toString()
                    );
                    setIsSaved(walletExists);
                }
            } catch (err) {

                console.error("Error checking wallet:", err);
            } finally {
                if (isMounted) {
                    setIsChecking(false);
                }
            }
        };

        checkIfWalletExists();

        // Cleanup function
        return () => {
            isMounted = false;
        };
        // Only run this effect once when component mounts
    }, []);

    const handleSaveWallet = async () => {
        if (isSaved) return;

        const walletToSave = {
            wallet_name: walletData.address.toString().slice(0, 8) + '...',
            wallet_address: walletData.address.toString(),
            wallet_type: 'bitcoin',
            balance: walletData.balance_btc || 0,
        };

        const result = await addWallet(walletToSave);

        if (result) {
            setIsSaved(true);
            toast({
                title: "Wallet saved",
                description: "The wallet has been added to your database.",
            });
        }
    };

    return (
        <Button
            onClick={handleSaveWallet}
            disabled={loading || isSaved || isChecking}
            variant={isSaved ? "outline" : "default"}
            className="ml-auto"
        >
            {loading ? "Saving..." :
                isChecking ? "Checking..." :
                    isSaved ? "Saved ✓" : "Save Wallet"}
        </Button>
    );
}