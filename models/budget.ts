import mongoose from 'mongoose';

const BudgetSchema = new mongoose.Schema({
    category: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
});

export default mongoose.models.Budget || mongoose.model('Budget', BudgetSchema);