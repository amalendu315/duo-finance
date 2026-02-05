import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Todo from '@/models/todo';

export async function GET() {
    await dbConnect();
    try {
        // Sort by completion (pending first) then by date (newest first)
        const todos = await Todo.find({}).sort({ completed: 1, createdAt: -1 });
        return NextResponse.json({ success: true, data: todos });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }
}

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        const todo = await Todo.create(body);
        return NextResponse.json({ success: true, data: todo });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }
}

export async function PUT(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        const { _id, ...updateData } = body;
        const todo = await Todo.findByIdAndUpdate(_id, updateData, { new: true });
        return NextResponse.json({ success: true, data: todo });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false }, { status: 400 });

    try {
        await Todo.findByIdAndDelete(id);
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }
}
