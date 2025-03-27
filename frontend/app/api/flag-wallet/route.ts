import { getBearerTokenFromHeaders } from '@/lib/auth';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function PATCH(req: Request) {
    try {
        const token = await getBearerTokenFromHeaders();

        const walletData = await req.json();

        const response = await fetch(
            `${BACKEND_URL}/wallets/${walletData.wallet_address}/flag`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(walletData),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { detail: data.detail || 'Failed to add wallet' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error('Wallet creation error:', error);
        return NextResponse.json(
            { detail: 'Internal server error' },
            { status: 500 }
        );
    }
}