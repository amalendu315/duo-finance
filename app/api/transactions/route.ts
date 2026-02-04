import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Transaction from '@/models/transactions';

export async function GET() {
    await dbConnect();
    try {
        const transactions = await Transaction.find({}).sort({ date: -1, createdAt: -1 });
        return NextResponse.json({ success: true, data: transactions });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }
}

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        const transaction = await Transaction.create(body);
        return NextResponse.json({ success: true, data: transaction });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

    try {
        await Transaction.findByIdAndDelete(id);
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }
}