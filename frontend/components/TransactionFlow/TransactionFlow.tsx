"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { formatAddress, formatBTC, satoshisToBTC } from "@/utils/formatters";
import { MempoolTransaction } from "@/types/transactions.types";

export function TransactionFlow({ txData }: { txData: MempoolTransaction }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Transaction Flow</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col space-y-4">
                    {/* Inputs Section */}
                    <div className="flex flex-col space-y-2">
                        <h4 className="text-md font-medium">Inputs</h4>
                        {txData.vin.map((input, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                                <span className="font-medium">
                                    {formatAddress(input.prevout.scriptpubkey_address)}
                                </span>
                                <span className="text-muted-foreground">
                                    {formatBTC(input.prevout.value / 100000000)} BTC
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Arrow Icon */}
                    <ArrowRight className="h-6 w-6 mx-auto" />

                    {/* Outputs Section */}
                    <div className="flex flex-col space-y-2">
                        <h4 className="text-md font-medium">Outputs</h4>
                        {txData.vout?.map((output, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                                <span className="font-medium">
                                    {formatAddress(output.scriptpubkey_address)}
                                </span>
                                <span className="text-muted-foreground">
                                    {formatBTC(parseInt(satoshisToBTC(output.value)))} BTC
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
