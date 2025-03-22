import { getBearerTokenFromHeaders } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const wallet = url.searchParams.get('address');
    const token = await getBearerTokenFromHeaders();

    const response = await fetch(
      `${BACKEND_URL}/address/txs/summary?address=${wallet}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { detail: data.detail || 'Failed to fetch node information' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Node info fetch error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
