import React from 'react';
import {
    X,
    Trash2,
    Calendar,
    User,
    Wallet,
    FileText,
    Tag
} from 'lucide-react';
import { Transaction } from '@/types';

interface TransactionDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    onDelete: (id: string) => void;
}

const COLORS = {
    me: '#3b82f6',
    her: '#d946ef',
    income: '#10b981',
    expense: '#f43f5e',
    settlement: '#64748b',
};

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
                                                                                    isOpen,
                                                                                    onClose,
                                                                                    transaction,
                                                                                    onDelete
                                                                                }) => {
    if (!isOpen || !transaction) return null;

    const isIncome = transaction.type === 'income';
    const isSettlement = transaction.type === 'settlement';

    // Format date
    const dateObj = new Date(transaction.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const handleDelete = () => {
        onDelete(transaction._id);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200">

                {/* Header / Banner */}
                <div className={`relative h-24 flex items-start justify-end p-4 ${isIncome ? 'bg-emerald-50' : isSettlement ? 'bg-slate-100' : 'bg-rose-50'}`}>
                    <button
                        onClick={onClose}
                        className="bg-white/80 p-2 rounded-full hover:bg-white transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>

                    {/* Icon Bubble */}
                    <div className="absolute -bottom-8 left-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white ${isIncome ? 'bg-emerald-500' : isSettlement ? 'bg-slate-500' : 'bg-rose-500'}`}>
                            <Tag size={32} className="text-white" />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="pt-10 px-6 pb-6">
                    <div className="mb-6">
                        <h2 className="text-2xl font-black text-slate-800">{transaction.category}</h2>
                        <p className={`text-3xl font-bold mt-1 ${isIncome ? 'text-emerald-600' : isSettlement ? 'text-slate-600' : 'text-rose-600'}`}>
                            {isIncome ? '+' : ''}₹{Number(transaction.amount).toLocaleString()}
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* Date Row */}
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                            <Calendar className="text-slate-400" size={20} />
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Date</p>
                                <p className="text-slate-700 font-medium">{formattedDate}</p>
                            </div>
                        </div>

                        {/* Owner / Split Row */}
                        <div className="flex gap-3">
                            <div className="flex-1 flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <User className="text-slate-400" size={20} />
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">Paid By</p>
                                    <p className="font-bold capitalize" style={{ color: transaction.owner === 'me' ? COLORS.me : COLORS.her }}>
                                        {transaction.owner}
                                    </p>
                                </div>
                            </div>

                            {!isSettlement && (
                                <div className="flex-1 flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                    <Wallet className="text-slate-400" size={20} />
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Split</p>
                                        <p className="text-slate-700 font-medium capitalize">{transaction.split}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Note Row */}
                        {transaction.note && (
                            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                <FileText className="text-slate-400 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">Note</p>
                                    <p className="text-slate-700">{transaction.note}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center">
                        <button onClick={onClose} className="font-bold text-slate-400 text-sm hover:text-slate-600">
                            Close
                        </button>

                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-lg font-bold hover:bg-rose-100 transition-colors"
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};