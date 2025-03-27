"use client";
import type {WalletData, WalletTxData} from "@/types/wallet.types";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Separator} from "@/components/ui/separator";
import "@xyflow/react/dist/style.css";
import WalletGraph from "@/components/WalletGraph/WalletGraph";
import {useEffect, useState} from "react";
import {ScrollArea} from "@/components/ui/scroll-area";
import {formatAddress} from "@/utils/formatters";
import {useRouter} from 'next/navigation'
import {AlertCircle, ExternalLink, Flag} from "lucide-react";
import SaveWalletButton from "@/components/SaveWalletButton/SaveWalletButton";
import {Button} from "@/components/ui/button";
import {useWalletApi} from "@/hooks/useWalletApi";


type WalletInfoProps = {
    walletData: WalletData;
    walletLoading: boolean;
    walletError: string | null;
    walletTransactions?: WalletTxData;
};

export default function WalletInfo({
                                       walletData,
                                       walletLoading,
                                       walletError,
                                       walletTransactions,
                                   }: WalletInfoProps) {

    const [isFlagged, setIsFlagged] = useState<boolean>(false);
    const [flagLoading, setFlagLoading] = useState<boolean>(false);
    const {flagWallet, getWallets} = useWalletApi();


    const [relatedWallets, setRelatedWallets] = useState<Set<string>>(new Set());
    const router = useRouter();

    useEffect(() => {
        const checkIfWalletIsFlagged = async () => {
            if (!walletData) return;

            try {
                const savedWallets = await getWallets();

                if (savedWallets && savedWallets.length > 0) {
                    const wallet = savedWallets.find(
                        w => w.wallet_address === walletData.address.toString()
                    );

                    if (wallet) {
                        setIsFlagged(!!wallet.suspicious_illegal_activity);
                    }
                }
            } catch (err) {
                console.error("Error checking wallet flag status:", err);
            }
        };

        checkIfWalletIsFlagged();
    }, [walletData]);

    const handleFlagWallet = async () => {
        if (!walletData) return;

        setFlagLoading(true);
        try {
            const newFlagStatus = !isFlagged;
            const result = await flagWallet(walletData.address.toString(), newFlagStatus);

            if (result) {
                setIsFlagged(newFlagStatus);
            }
        } catch (error) {
            console.error("Error flagging wallet:", error);
        } finally {
            setFlagLoading(false);
        }
    };


    useEffect(() => {
        if (!walletTransactions || !walletData) return;

        const connectedAddresses = new Set<string>();

        // Extract unique addresses from transaction inputs and outputs
        walletTransactions.transactions.forEach(tx => {
            // Extract addresses from inputs (sending to our wallet)
            tx.vin.forEach(input => {
                if (input.prevout && input.prevout.scriptpubkey_address) {
                    const address = input.prevout.scriptpubkey_address;
                    if (address !== walletData.address.toString()) {
                        connectedAddresses.add(address);
                    }
                }
            });

            // Extract addresses from outputs (our wallet sending to others)
            tx.vout.forEach(output => {
                if (output.scriptpubkey_address) {
                    const address = output.scriptpubkey_address;
                    if (address !== walletData.address.toString()) {
                        connectedAddresses.add(address);
                    }
                }
            });
        });

        setRelatedWallets(connectedAddresses);
    }, [walletTransactions, walletData]);


    const handleWalletClick = (address: string) => {
        router.push(`/forensics?input=${address}&isTxid=false`);
    };

    const getLastActiveDays = () => {
        if (!walletTransactions || walletTransactions.transactions.length === 0) {
            return null;
        }

        // Filter transactions that have valid block_time before sorting
        const validTransactions = walletTransactions.transactions.filter(
            tx => tx.status && typeof tx.status.block_time === 'number'
        );

        if (validTransactions.length === 0) {
            return null;
        }

        // Sort transactions by time (descending)
        const sortedTransactions = [...validTransactions].sort(
            (a, b) => (b.status?.block_time || 0) - (a.status?.block_time || 0)
        );

        // Get the most recent transaction time
        const lastTxTime = sortedTransactions[0].status?.block_time;
        if (lastTxTime === undefined) {
            return null;
        }

        const lastTxDate = new Date(lastTxTime * 1000); // Convert UNIX timestamp to milliseconds
        const currentDate = new Date();

        // Calculate difference in days
        const diffTime = currentDate.getTime() - lastTxDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    };


    const getLastActiveDate = () => {
        if (!walletTransactions || walletTransactions.transactions.length === 0) {
            return null;
        }

        // Filter transactions that have valid block_time before sorting
        const validTransactions = walletTransactions.transactions.filter(
            tx => tx.status && typeof tx.status.block_time === 'number'
        );

        if (validTransactions.length === 0) {
            return null;
        }

        // Sort transactions by time (descending)
        const sortedTransactions = [...validTransactions].sort(
            (a, b) => (b.status?.block_time || 0) - (a.status?.block_time || 0)
        );

        // Get the most recent transaction time
        const lastTxTime = sortedTransactions[0].status?.block_time;
        if (lastTxTime === undefined) {
            return null;
        }

        const lastTxDate = new Date(lastTxTime * 1000); // Convert UNIX timestamp to milliseconds

        // Format the date: YYYY-MM-DD HH:MM
        return lastTxDate.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 w-full">
            <Card className="w-1/3">
                <CardHeader className={"flex justify-between pb-2"}>
                    <CardTitle>Wallet Data Analysis </CardTitle>
                    {!walletLoading && walletData && (
                        <SaveWalletButton walletData={walletData}/>
                    )}

                    <Button
                        onClick={handleFlagWallet}
                        disabled={flagLoading}
                        variant={isFlagged ? "destructive" : "outline"}
                        className="ml-2"
                    >
                        {flagLoading ? "Updating..." :
                            isFlagged ? "Flagged" : "Flag as Suspicious"}
                        <Flag className="ml-2 h-4 w-4"/>
                    </Button>

                </CardHeader>
                <CardContent>
                    {walletLoading && (
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-3/4"/>
                            <Skeleton className="h-6 w-1/2"/>
                            <Skeleton className="h-6 w-2/3"/>
                            <Skeleton className="h-6 w-1/2"/>
                        </div>
                    )}

                    {walletError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4"/>
                            <AlertDescription>{walletError}</AlertDescription>
                        </Alert>
                    )}

                    {!walletLoading && !walletError && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-medium text-sm text-muted-foreground">Wallet Address</h3>
                                <p className="mt-1">{walletData.address}</p>

                            </div>

                            <Separator/>

                            <div>
                                <h3 className="font-medium text-sm text-muted-foreground">Last Activity</h3>
                                <p className="mt-1">
                                    {getLastActiveDate() !== null
                                        ? `${getLastActiveDate()} (${getLastActiveDays()} days ago) `
                                        : 'No transaction data available'}
                                </p>
                            </div>

                            <Separator/>


                            <div>
                                <h3 className="font-medium text-sm text-muted-foreground">Balance</h3>
                                <p className="mt-1">{walletData.balance_btc < 0 ? 0 : walletData.balance_sats} BTC</p>
                                <p className="mt-1 text-xs text-muted-foreground">{walletData.balance_sats < 0 ? 0 : walletData.balance_sats} sats</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex flex-col w-2/3 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {/* Wallet Graph */}
                    <Card className="col-span-1">
                        <CardContent className="h-96">
                            {!walletLoading && !walletError && walletData && (
                                <WalletGraph
                                    walletData={walletData}
                                    relatedWallets={relatedWallets}
                                    onNodeClick={handleWalletClick}
                                />
                            )}
                            {walletLoading && (
                                <div className="h-full flex items-center justify-center">
                                    <Skeleton className="h-full w-full"/>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Connected Wallets List */}
                    <Card className="col-span-1">
                        <CardHeader className="pb-2">
                            <CardTitle>Linked to</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {walletLoading && (
                                <div className="space-y-2">
                                    {Array.from({length: 5}).map((_, i) => (
                                        <Skeleton key={i} className="h-10 w-full"/>
                                    ))}
                                </div>
                            )}

                            {!walletLoading && !walletError && relatedWallets.size === 0 && (
                                <p className="text-sm text-muted-foreground">This wallet was with no wallet in
                                    contact</p>
                            )}

                            {!walletLoading && !walletError && relatedWallets.size > 0 && (
                                <ScrollArea className="h-80 pr-4">
                                    <div className="space-y-2">
                                        {Array.from(relatedWallets).map((address, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 rounded-md border border-border transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                                onClick={() => handleWalletClick(address)}
                                            >
                                                <span className="font-medium">{formatAddress(address)}</span>
                                                <ExternalLink className="h-4 w-4 text-muted-foreground"/>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}