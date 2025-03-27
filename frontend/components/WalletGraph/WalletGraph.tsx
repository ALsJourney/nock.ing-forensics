import {ReactFlow, useNodesState, useEdgesState, Background, Controls, NodeMouseHandler} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {useEffect} from "react";
import {formatAddress} from "@/utils/formatters";
import {useRouter} from "next/navigation";
import type {WalletData} from "@/types/wallet.types";

type WalletGraphProps = {
    walletData: WalletData;
    relatedWallets: Set<string>;
    onNodeClick?: (address: string) => void;
};

type WalletNode = {
    id: string;
    data: {
        label: string;
        address: string;
    };
    position: { x: number; y: number };
    style?: React.CSSProperties;
};

type WalletEdge = {
    id: string;
    source: string;
    target: string;
    animated: boolean;
    style?: React.CSSProperties;
};


export default function WalletGraph({walletData, relatedWallets, onNodeClick}: WalletGraphProps) {
    const router = useRouter();

    const [nodes, setNodes, onNodesChange] = useNodesState<WalletNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<WalletEdge>([]);

    // Build nodes and edges for React Flow
    useEffect(() => {
        if (!walletData || relatedWallets.size === 0) return;

        // Create central node for main wallet
        const mainNode: WalletNode = {
            id: 'main-wallet',
            data: {
                label: `Main Wallet\n${formatAddress(walletData.address.toString())}`,
                address: walletData.address.toString()
            },
            position: {x: 250, y: 250},
            style: {
                background: '#ff9900',
                color: 'white',
                border: '2px solid #ff7700',
                borderRadius: '8px',
                padding: '10px',
                width: 180,
                textAlign: 'center',
                cursor: 'pointer',
            }
        };

        // Create nodes for connected wallets
        const connectedNodes = Array.from(relatedWallets).map((address, index) => {
            // Calculate position in a circle around main node
            const angle = (index * (2 * Math.PI)) / relatedWallets.size;
            const radius = 200;
            const x = 250 + radius * Math.cos(angle);
            const y = 250 + radius * Math.sin(angle);

            return {
                id: `connected-${index}`,
                data: {
                    label: `Connected Wallet\n${formatAddress(address)}`,
                    address: address
                },
                position: {x, y},
                style: {
                    background: '#1a73e8',
                    color: 'white',
                    border: '2px solid #0e4bba',
                    borderRadius: '8px',
                    padding: '10px',
                    width: 180,
                    textAlign: 'center',
                    cursor: 'pointer',
                }
            };
        });

        // Create edges from main wallet to all connected wallets
        const newEdges = Array.from(relatedWallets).map((_, index) => ({
            id: `edge-${index}`,
            source: 'main-wallet',
            target: `connected-${index}`,
            animated: true,
            style: {stroke: '#888'}
        }));

        // Set nodes and edges
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        setNodes([mainNode, ...connectedNodes]);
        setEdges(newEdges);
    }, [walletData, relatedWallets, setNodes, setEdges]);

    // Handle node click to navigate to wallet details
    const handleNodeClick: NodeMouseHandler = (_, node) => {
        const address = node.data?.address;
        if (address) {
            if (address && typeof address === 'string') {
                if (onNodeClick) {
                    onNodeClick(address);
                }
            } else {
                router.push(`/wallet/${address}`);
            }
        }
    };

    return (
        <div style={{width: '100%', height: '400px'}}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                fitView
            >
                <Controls className={"dark:text-black"}/>
                <Background color="#aaa" gap={16}/>
            </ReactFlow>
        </div>
    );
}