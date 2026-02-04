import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    amount: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: String, required: true },
    note: { type: String },
    type: { type: String, enum: ['income', 'expense', 'settlement'], required: true },
    owner: { type: String, enum: ['me', 'her'], required: true },
    split: { type: String, enum: ['personal', 'shared'] },
    from: { type: String }, // For settlements
    to: { type: String },   // For settlements
}, { timestamps: true });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);