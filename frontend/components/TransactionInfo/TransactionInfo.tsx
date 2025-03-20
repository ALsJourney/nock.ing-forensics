import {TransactionDetails} from "@/components/TransactionDetails/TransactionDetails";
import {TransactionFlow} from "@/components/TransactionFlow/TransactionFlow";
import {MempoolTransaction, Transaction, TransactionInfoProps} from "@/types/transactions.types";

export default function TransactionInfo({ transaction, mempoolTransaction }: TransactionInfoProps) {
    return (
        <div className="space-y-6">
            <TransactionDetails txData={(transaction?.transaction as Transaction)} />
            <TransactionFlow txData={(mempoolTransaction?.transaction as MempoolTransaction)} />
        </div>
    )
}

