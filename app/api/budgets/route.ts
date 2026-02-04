import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Budget from '@/models/budget';

export async function GET() {
    await dbConnect();
    try {
        const budgets = await Budget.find({});
        // Convert array to object map for frontend { "Food": 500 }
        const budgetMap = budgets.reduce((acc, curr) => {
            acc[curr.category] = curr.amount;
            return acc;
        }, {});
        return NextResponse.json({ success: true, data: budgetMap });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }
}

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        // Upsert (Update if exists, Insert if not)
        await Budget.findOneAndUpdate(
            { category: body.category },
            { amount: body.amount },
            { upsert: true, new: true }
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }
}