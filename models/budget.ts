import mongoose from 'mongoose';

const BudgetSchema = new mongoose.Schema({
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    owner: { type: String, enum: ['me', 'her', 'joint'], default: 'joint', required: true }
});

// Create a compound index so (Category + Owner) is unique
// e.g. You can't have two "Food" budgets for "Me"
// Note: You might need to drop the existing 'category_1' index in MongoDB Atlas if you get duplicate key errors.
BudgetSchema.index({ category: 1, owner: 1 }, { unique: true });

export default mongoose.models.Budget || mongoose.model('Budget', BudgetSchema);