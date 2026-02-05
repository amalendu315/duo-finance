import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Budget from '@/models/budget';

export async function GET() {
    await dbConnect();
    try {
        // Return an ARRAY of budgets, not a Map/Object
        const budgets = await Budget.find({});
        return NextResponse.json({ success: true, data: budgets });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }
}

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        // Update or Insert based on BOTH category AND owner
        // This allows "Me" to have a Food budget and "Her" to have a separate Food budget
        await Budget.findOneAndUpdate(
            { category: body.category, owner: body.owner },
            { amount: body.amount },
            { upsert: true, new: true }
        );
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }
}