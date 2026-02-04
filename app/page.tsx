'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Plus,
    PieChart,
    Settings,
    ArrowRightLeft,
    TrendingUp,
    TrendingDown,
    Check,
    Trash2,
    PiggyBank,
    RefreshCcw,
    Info,
    Home,
    Menu,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Loader2
} from 'lucide-react';
import {
    PieChart as RePieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';

/**
 * DuoFinance: MongoDB Connected Version
 * Features:
 * - Real-time sync (Polling)
 * - MongoDB Persistence
 * - Full History Access
 * - Type-Safe & ESLint Compliant
 */

// --- Types ---

type TransactionType = 'income' | 'expense' | 'settlement';
type Owner = 'me' | 'her';
type SplitType = 'personal' | 'shared';
type ViewState = 'dashboard' | 'add' | 'budgets' | 'analytics' | 'settings';
type FilterState = 'weekly' | 'monthly' | 'yearly';

interface Transaction {
    _id: string; // MongoDB ID
    amount: string;
    category: string;
    date: string; // ISO YYYY-MM-DD
    note: string;
    type: TransactionType;
    owner: Owner;
    split?: SplitType;
    from?: Owner;
    to?: Owner;
}

// Form state usually doesn't have an ID yet
interface TransactionFormState {
    amount: string;
    category: string;
    date: string;
    note: string;
    type: TransactionType;
    owner: Owner;
    split: SplitType;
}

type Budgets = Record<string, number>;

interface Financials {
    income: number;
    expense: number;
    balance: number;
    settlement: {
        amount: number;
        whoOwes: Owner | 'none';
        raw: number;
    };
}

interface BudgetStat {
    category: string;
    monthlyLimit: number;
    effectiveLimit: number;
    spent: number;
    pct: number;
}

interface DateRange {
    start: Date;
    end: Date;
}

// --- Constants ---
const CATEGORIES = [
    'Food & Dining', 'Groceries', 'Rent & Housing', 'Utilities',
    'Transport', 'Shopping', 'Entertainment', 'Health', 'Travel',
    'Savings', 'Income', 'Other'
];

const COLORS = {
    me: '#3b82f6',
    her: '#d946ef',
    shared: '#14b8a6',
    income: '#10b981',
    expense: '#f43f5e',
    settlement: '#64748b',
};

const CHART_COLORS = [
    '#3b82f6', '#d946ef', '#14b8a6', '#f59e0b', '#10b981',
    '#6366f1', '#ec4899', '#84cc16', '#06b6d4'
];

// --- Helpers ---

const formatDateRange = (date: Date, filter: FilterState): string => {
    const d = new Date(date);

    if (filter === 'weekly') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d);
        start.setDate(diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (filter === 'monthly') {
        return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } else {
        return d.getFullYear().toString();
    }
};

// --- Sub-Components ---

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDanger?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel, isDanger = false }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${isDanger ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
                    {isDanger ? <AlertTriangle size={24} /> : <Info size={24} />}
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2 text-center">{title}</h3>
                <p className="text-slate-500 mb-6 text-center text-sm">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 font-bold text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 font-bold text-white rounded-xl shadow-lg transition-colors ${isDanger ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                    >
                        {isDanger ? 'Delete' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface DateFilterControlProps {
    filter: FilterState;
    setFilter: (f: FilterState) => void;
    selectedDate: Date;
    onPrev: () => void;
    onNext: () => void;
}

const DateFilterControl: React.FC<DateFilterControlProps> = ({ filter, setFilter, selectedDate, onPrev, onNext }) => (
    <div className="mb-6">
        <div className="flex bg-slate-200 p-1 rounded-xl mb-3">
            {(['weekly', 'monthly', 'yearly'] as FilterState[]).map(f => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                        filter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {f}
                </button>
            ))}
        </div>
        <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            <button onClick={onPrev} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors">
                <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Calendar size={16} className="text-slate-400" />
                {formatDateRange(selectedDate, filter)}
            </div>
            <button onClick={onNext} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors">
                <ChevronRight size={20} />
            </button>
        </div>
    </div>
);

interface TransactionItemProps {
    t: Transaction;
    onDelete: (id: string) => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ t, onDelete }) => {
    if (t.type === 'settlement') {
        return (
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3 opacity-80">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                        <RefreshCcw size={18} />
                    </div>
                    <div>
                        <p className="font-bold text-slate-700 text-sm">Settlement</p>
                        <p className="text-xs text-slate-500">
                            {t.from === 'me' ? 'Me' : 'Her'} paid {t.to === 'me' ? 'Me' : 'Her'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block font-bold text-slate-500">₹{Number(t.amount).toLocaleString()}</span>
                    <button onClick={() => onDelete(t._id)} className="text-xs text-red-400 mt-1 hover:text-red-600 font-medium">Undo</button>
                </div>
            </div>
        );
    }

    const isInc = t.type === 'income';
    const ownerColor = t.owner === 'me' ? COLORS.me : COLORS.her;
    const splitColor = t.split === 'shared' ? COLORS.shared : ownerColor;

    return (
        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-3 relative overflow-hidden transition-transform active:scale-[0.99]">
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: splitColor }}></div>
            <div className="flex items-center gap-4 pl-2">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm text-xs shrink-0"
                    style={{ backgroundColor: ownerColor }}
                >
                    {t.owner === 'me' ? 'ME' : 'HER'}
                </div>
                <div className="overflow-hidden">
                    <p className="font-bold text-slate-800 text-sm truncate max-w-[140px]">{t.category}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                        {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {t.split === 'shared' && <span className="bg-teal-100 text-teal-700 px-1.5 rounded text-[10px] font-bold">SHARED</span>}
                    </p>
                </div>
            </div>
            <div className="text-right flex items-center gap-3">
                <div>
          <span className={`block font-bold ${isInc ? 'text-emerald-600' : 'text-slate-800'}`}>
            {isInc ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
          </span>
                </div>
                <button onClick={() => onDelete(t._id)} className="text-slate-300 hover:text-rose-500 p-1">
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

// --- Views ---

interface DashboardViewProps {
    financials: Financials;
    filter: FilterState;
    setFilter: (f: FilterState) => void;
    selectedDate: Date;
    onPrev: () => void;
    onNext: () => void;
    filteredTransactions: Transaction[];
    budgetStats: BudgetStat[];
    setView: (v: ViewState) => void;
    setShowSettleModal: (v: boolean) => void;
    onDelete: (id: string) => void;
    loading: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({
                                                         financials, filter, setFilter, selectedDate, onPrev, onNext,
                                                         filteredTransactions, budgetStats, setView, setShowSettleModal, onDelete, loading
                                                     }) => (
    <div className="pb-24 animate-in fade-in">
        <div className="flex justify-between items-end mb-6">
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">DuoFinance</h1>
                <p className="text-slate-400 text-sm font-medium flex items-center gap-1">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                    Synced
                </p>
            </div>
            <button onClick={() => setView('settings')} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition">
                <Settings size={20} />
            </button>
        </div>

        <DateFilterControl
            filter={filter}
            setFilter={setFilter}
            selectedDate={selectedDate}
            onPrev={onPrev}
            onNext={onNext}
        />

        {financials.settlement.amount > 1 && (
            <div className="bg-slate-800 text-white p-5 rounded-2xl shadow-xl shadow-slate-200 mb-8 relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-slate-400 text-xs font-bold uppercase">Settlement Pending</p>
                            <span className="bg-slate-700 text-[10px] px-1.5 py-0.5 rounded text-slate-300">All Time</span>
                        </div>
                        <p className="text-lg font-medium">
                            {financials.settlement.whoOwes === 'me' ? 'You owe Her' : 'She owes You'}
                        </p>
                        <p className="text-3xl font-black text-teal-400 mt-1">
                            ₹{financials.settlement.amount.toFixed(2)}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowSettleModal(true)}
                        className="bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition"
                    >
                        Settle Up
                    </button>
                </div>
                <ArrowRightLeft className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-700 opacity-20" />
            </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2 mb-2 text-emerald-600">
                    <TrendingUp size={16} /> <span className="text-xs font-bold uppercase">Income</span>
                </div>
                <p className="text-xl font-bold text-emerald-800">₹{financials.income.toLocaleString()}</p>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <div className="flex items-center gap-2 mb-2 text-rose-600">
                    <TrendingDown size={16} /> <span className="text-xs font-bold uppercase">Spent</span>
                </div>
                <p className="text-xl font-bold text-rose-800">₹{financials.expense.toLocaleString()}</p>
            </div>
        </div>

        <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-800">Budget Watch</h3>
                <button onClick={() => setView('budgets')} className="text-blue-500 text-xs font-bold hover:text-blue-700">EDIT</button>
            </div>
            <div className="space-y-3">
                {budgetStats.slice(0, 3).map((b) => (
                    b.effectiveLimit > 0 && (
                        <div key={b.category} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between text-xs mb-1.5 font-medium">
                                <span>{b.category}</span>
                                <span className={b.pct > 100 ? 'text-rose-500' : 'text-slate-500'}>
                   {Math.round(b.pct)}% used
                 </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${b.pct > 100 ? 'bg-rose-500' : 'bg-blue-500'}`}
                                    style={{width: `${Math.min(b.pct, 100)}%`}}
                                />
                            </div>
                        </div>
                    )
                ))}
                {budgetStats.length === 0 && <p className="text-sm text-slate-400 italic">No budgets set yet.</p>}
            </div>
        </div>

        <div>
            <h3 className="font-bold text-slate-800 mb-3">Recent</h3>
            {filteredTransactions.slice(0, 5).map((t) => <TransactionItem key={t._id} t={t} onDelete={onDelete} />)}
            {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No activity found.</div>
            )}
        </div>
    </div>
);

interface AddTransactionViewProps {
    onSave: (tx: TransactionFormState) => void;
}

const AddTransactionView: React.FC<AddTransactionViewProps> = ({ onSave }) => {
    const [form, setForm] = useState<TransactionFormState>({
        amount: '',
        category: 'Food & Dining',
        date: new Date().toISOString().split('T')[0],
        note: '',
        type: 'expense',
        owner: 'me',
        split: 'shared'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="pb-24 animate-in slide-in-from-bottom duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-6">New Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-6">

                <div className="bg-slate-100 p-1 rounded-xl flex">
                    <button type="button" onClick={() => setForm({...form, type: 'expense'})}
                            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${form.type === 'expense' ? 'bg-white shadow text-rose-500' : 'text-slate-400'}`}>
                        Expense
                    </button>
                    <button type="button" onClick={() => setForm({...form, type: 'income'})}
                            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all ${form.type === 'income' ? 'bg-white shadow text-emerald-500' : 'text-slate-400'}`}>
                        Income
                    </button>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">₹</span>
                        <input
                            type="number" step="0.01"
                            value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                            className="w-full text-4xl font-black p-4 pl-10 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="0.00" autoFocus
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Who Paid?</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setForm({...form, owner: 'me'})}
                                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${form.owner === 'me' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-100 text-slate-400'}`}>
                                Me
                            </button>
                            <button type="button" onClick={() => setForm({...form, owner: 'her'})}
                                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${form.owner === 'her' ? 'bg-fuchsia-50 border-fuchsia-500 text-fuchsia-600' : 'bg-white border-slate-100 text-slate-400'}`}>
                                Her
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Split</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setForm({...form, split: 'personal'})}
                                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${form.split === 'personal' ? 'bg-slate-50 border-slate-500 text-slate-600' : 'bg-white border-slate-100 text-slate-400'}`}>
                                Personal
                            </button>
                            <button type="button" onClick={() => setForm({...form, split: 'shared'})}
                                    className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${form.split === 'shared' ? 'bg-teal-50 border-teal-500 text-teal-600' : 'bg-white border-slate-100 text-slate-400'}`}>
                                Shared
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                                className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-slate-100">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                        <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                               className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-slate-100" />
                    </div>
                </div>

                <input type="text" placeholder="Note (Optional)" value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                       className="w-full p-3 bg-white border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-slate-100" />

                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all">
                    Save Transaction
                </button>
            </form>
        </div>
    );
};

interface BudgetPlannerViewProps {
    budgetStats: BudgetStat[];
    filter: FilterState;
    setFilter: (f: FilterState) => void;
    selectedDate: Date;
    onPrev: () => void;
    onNext: () => void;
    budgets: Budgets;
    setBudgets: React.Dispatch<React.SetStateAction<Budgets>>;
    onSaveBudget: (category: string, amount: number) => void;
}

const BudgetPlannerView: React.FC<BudgetPlannerViewProps> = ({
                                                                 budgetStats, filter, setFilter, selectedDate, onPrev, onNext, budgets, setBudgets, onSaveBudget
                                                             }) => {
    return (
        <div className="pb-24 animate-in fade-in">
            <h2 className="text-2xl font-black text-slate-800 mb-4">Budget Planner</h2>

            <DateFilterControl
                filter={filter}
                setFilter={setFilter}
                selectedDate={selectedDate}
                onPrev={onPrev}
                onNext={onNext}
            />

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex gap-3 items-start">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <div>
                    <p className="text-sm text-blue-800 font-bold">How this works</p>
                    <p className="text-xs text-blue-600 mt-1">
                        Set your <span className="font-bold underline">Monthly Limit</span> below.
                        If you view by &quot;Weekly&quot;, we scale this limit (x0.23). The progress shows spending for the selected period.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {CATEGORIES.filter(c => c !== 'Income' && c !== 'Savings').map(cat => {
                    const stat = budgetStats.find((s) => s.category === cat) || { spent: 0, monthlyLimit: 0, effectiveLimit: 0, pct: 0, category: cat };
                    return (
                        <div key={cat} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${stat.pct > 100 ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
                                    <div>
                                        <span className="font-bold text-slate-700 block">{cat}</span>
                                        {filter !== 'monthly' && stat.monthlyLimit > 0 && (
                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {filter} cap: ₹{stat.effectiveLimit.toFixed(0)}
                          </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Monthly Limit</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            className="w-24 text-right p-2 pl-5 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                            value={budgets[cat] || ''}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                setBudgets((prev) => ({...prev, [cat]: val}));
                                                onSaveBudget(cat, val);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            {budgets[cat] > 0 && (
                                <div className="relative pt-1">
                                    <div className="flex justify-between text-xs mb-1 text-slate-500 font-medium">
                                        <span>₹{stat.spent.toLocaleString()} spent ({formatDateRange(selectedDate, filter)})</span>
                                        <span className={stat.pct > 100 ? 'text-rose-500 font-bold' : ''}>{Math.round(stat.pct)}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${stat.pct > 100 ? 'bg-rose-500' : 'bg-blue-500'}`}
                                             style={{width: `${Math.min(stat.pct, 100)}%`}}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface AnalyticsViewProps {
    filteredTransactions: Transaction[];
    filter: FilterState;
    setFilter: (f: FilterState) => void;
    selectedDate: Date;
    onPrev: () => void;
    onNext: () => void;
    onDelete: (id: string) => void;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({
                                                         filteredTransactions, filter, setFilter, selectedDate, onPrev, onNext, onDelete
                                                     }) => {
    const pieData = useMemo(() => {
        return Object.entries(filteredTransactions.filter((t) => t.type === 'expense').reduce<Record<string, number>>((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
            return acc;
        }, {})).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [filteredTransactions]);

    return (
        <div className="pb-24 animate-in fade-in">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Analytics</h2>
            <DateFilterControl
                filter={filter}
                setFilter={setFilter}
                selectedDate={selectedDate}
                onPrev={onPrev}
                onNext={onNext}
            />

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <h3 className="font-bold text-slate-700 mb-4">Expense Breakdown</h3>
                <div className="h-64">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((_e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                {/*@ts-ignore*/}
                                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                                <Legend />
                            </RePieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-400">No Data</div>}
                </div>
            </div>

            <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-sm text-slate-600">History</div>
                {filteredTransactions.map((t) => <TransactionItem key={t._id} t={t} onDelete={onDelete} />)}
                {filteredTransactions.length === 0 && <p className="p-4 text-center text-slate-400 text-sm">No transactions in this period.</p>}
            </div>
        </div>
    );
};

interface SettleModalProps {
    financials: Financials;
    onCancel: () => void;
    onConfirm: () => void;
}

const SettleModal: React.FC<SettleModalProps> = ({ financials, onCancel, onConfirm }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800">Settle Up?</h3>
                <p className="text-slate-500 mt-2">
                    Record a payment from <b>{financials.settlement.whoOwes === 'me' ? 'Me' : 'Her'}</b> to <b>{financials.settlement.whoOwes === 'me' ? 'Her' : 'Me'}</b> of:
                </p>
                <p className="text-4xl font-black text-slate-800 mt-4">₹{financials.settlement.amount.toFixed(2)}</p>
            </div>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 font-bold text-slate-600 rounded-xl">Cancel</button>
                <button onClick={onConfirm} className="flex-1 py-3 bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-200">Confirm</button>
            </div>
        </div>
    </div>
);

// --- Main Page Component ---

export default function DuoFinancePage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [budgets, setBudgets] = useState<Budgets>({});
    const [view, setView] = useState<ViewState>('dashboard');
    const [filter, setFilter] = useState<FilterState>('monthly');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);
    const [showSettleModal, setShowSettleModal] = useState<boolean>(false);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDanger: boolean;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, isDanger: false });

    // --- API Functions ---

    const fetchData = useCallback(async () => {
        try {
            const [txRes, budgetRes] = await Promise.all([
                fetch('/api/transactions'),
                fetch('/api/budgets')
            ]);
            const txData = await txRes.json();
            const budgetData = await budgetRes.json();

            if (txData.success) setTransactions(txData.data);
            if (budgetData.success) setBudgets(budgetData.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial Load & Polling for Real-time Sync
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [fetchData]);

    // --- Actions ---

    const saveTransaction = async (form: TransactionFormState) => {
        setLoading(true);
        await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        await fetchData();
        setView('dashboard');
    };

    const deleteTx = useCallback((id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Transaction?",
            message: "This action cannot be undone.",
            isDanger: true,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setLoading(true);
                await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
                await fetchData();
            }
        });
    }, [fetchData]);

    const saveBudget = async (category: string, amount: number) => {
        // API Call (State updated in component optimistically via setBudgets passed down)
        await fetch('/api/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, amount })
        });
    };

    const executeSettlement = async () => {
        const debt = financials.settlement.amount;
        const payer = financials.settlement.whoOwes;
        if (debt <= 0 || payer === 'none') return;

        await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: debt.toFixed(2),
                category: 'Settlement',
                date: new Date().toISOString().split('T')[0],
                note: 'Settlement Payment',
                type: 'settlement',
                from: payer,
                to: payer === 'me' ? 'her' : 'me',
                owner: payer,
                split: 'personal'
            })
        });
        setShowSettleModal(false);
        fetchData();
    };

    // --- Logic ---

    const navigatePeriod = useCallback((direction: -1 | 1) => {
        const newDate = new Date(selectedDate);
        if (filter === 'weekly') {
            newDate.setDate(newDate.getDate() + (direction * 7));
        } else if (filter === 'monthly') {
            newDate.setMonth(newDate.getMonth() + direction);
        } else {
            newDate.setFullYear(newDate.getFullYear() + direction);
        }
        setSelectedDate(newDate);
    }, [filter, selectedDate]);

    const handlePrev = () => navigatePeriod(-1);
    const handleNext = () => navigatePeriod(1);

    // Reset date when filter changes
    useEffect(() => {
        setSelectedDate(new Date());
    }, [filter]);

    const dateRange = useMemo(() => {
        const start = new Date(selectedDate);
        const end = new Date(selectedDate);

        if (filter === 'weekly') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            start.setHours(0,0,0,0);
            end.setTime(start.getTime());
            end.setDate(start.getDate() + 6);
            end.setHours(23,59,59,999);
        } else if (filter === 'monthly') {
            start.setDate(1);
            start.setHours(0,0,0,0);
            end.setMonth(end.getMonth() + 1, 0);
            end.setHours(23,59,59,999);
        } else {
            start.setMonth(0, 1);
            start.setHours(0,0,0,0);
            end.setMonth(11, 31);
            end.setHours(23,59,59,999);
        }
        return { start, end };
    }, [filter, selectedDate]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const [y, m, d] = t.date.split('-').map(Number);
            const tDate = new Date(y, m - 1, d);
            tDate.setHours(0, 0, 0, 0);
            return tDate >= dateRange.start && tDate <= dateRange.end;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, dateRange]);

    const financials = useMemo<Financials>(() => {
        let income = 0;
        let expense = 0;
        let meSharedPaid = 0;
        let herSharedPaid = 0;
        let meSettledToHer = 0;
        let herSettledToMe = 0;

        // View based stats
        filteredTransactions.forEach(t => {
            if (t.type === 'settlement') return;
            const val = Number(t.amount);
            if (t.type === 'income') income += val;
            else expense += val;
        });

        // All time stats for settlement (using full transactions list)
        transactions.forEach(t => {
            const val = Number(t.amount);
            if (t.type === 'settlement') {
                if (t.from === 'me' && t.to === 'her') meSettledToHer += val;
                if (t.from === 'her' && t.to === 'me') herSettledToMe += val;
            }
            else if (t.type === 'expense' && t.split === 'shared') {
                if (t.owner === 'me') meSharedPaid += val;
                if (t.owner === 'her') herSharedPaid += val;
            }
        });

        const baseDebt = (herSharedPaid / 2) - (meSharedPaid / 2);
        const netDebt = baseDebt - meSettledToHer + herSettledToMe;

        return {
            income,
            expense,
            balance: income - expense,
            settlement: {
                amount: Math.abs(netDebt),
                whoOwes: netDebt > 0.01 ? 'me' : netDebt < -0.01 ? 'her' : 'none',
                raw: netDebt
            }
        };
    }, [filteredTransactions, transactions]);

    const budgetStats = useMemo<BudgetStat[]>(() => {
        const usage: Record<string, number> = {};
        filteredTransactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                usage[t.category] = (usage[t.category] || 0) + Number(t.amount);
            });

        const scale = filter === 'weekly' ? 0.23 : filter === 'yearly' ? 12 : 1;

        return Object.keys(budgets).map(cat => {
            const monthlyLimit = budgets[cat] || 0;
            const effectiveLimit = monthlyLimit * scale;
            const spent = usage[cat] || 0;
            const pct = effectiveLimit > 0 ? (spent / effectiveLimit) * 100 : 0;
            return { category: cat, monthlyLimit, effectiveLimit, spent, pct };
        }).sort((a,b) => b.pct - a.pct);
    }, [filteredTransactions, budgets, filter]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
            <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl">

                <main className="h-full overflow-y-auto p-6 scrollbar-hide">
                    {view === 'dashboard' && (
                        <DashboardView
                            financials={financials}
                            filter={filter}
                            setFilter={setFilter}
                            selectedDate={selectedDate}
                            onPrev={handlePrev}
                            onNext={handleNext}
                            filteredTransactions={filteredTransactions}
                            budgetStats={budgetStats}
                            setView={setView}
                            setShowSettleModal={setShowSettleModal}
                            onDelete={deleteTx}
                            loading={loading}
                        />
                    )}

                    {view === 'add' && <AddTransactionView onSave={saveTransaction} />}

                    {view === 'budgets' && (
                        <BudgetPlannerView
                            budgetStats={budgetStats}
                            filter={filter}
                            setFilter={setFilter}
                            selectedDate={selectedDate}
                            onPrev={handlePrev}
                            onNext={handleNext}
                            budgets={budgets}
                            setBudgets={setBudgets}
                            onSaveBudget={saveBudget}
                        />
                    )}

                    {view === 'analytics' && (
                        <AnalyticsView
                            filteredTransactions={filteredTransactions}
                            filter={filter}
                            setFilter={setFilter}
                            selectedDate={selectedDate}
                            onPrev={handlePrev}
                            onNext={handleNext}
                            onDelete={deleteTx}
                        />
                    )}

                    {view === 'settings' && (
                        <div className="pt-10 text-center animate-in fade-in">
                            <h2 className="font-bold text-xl mb-4">Settings</h2>
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-4 text-left">
                                <p className="text-sm text-slate-500 mb-1">Database Status</p>
                                <p className="font-bold text-green-600 flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Connected to MongoDB</p>
                            </div>
                            <button onClick={() => setView('dashboard')} className="block mx-auto mt-6 text-slate-400 font-medium">Back to Home</button>
                        </div>
                    )}
                </main>

                {showSettleModal && (
                    <SettleModal
                        financials={financials}
                        onCancel={() => setShowSettleModal(false)}
                        onConfirm={executeSettlement}
                    />
                )}

                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
                    isDanger={confirmModal.isDanger}
                />

                {/* Bottom Nav */}
                <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center z-40 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
                    <button onClick={() => setView('dashboard')} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-colors ${view === 'dashboard' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Home size={22} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold mt-1">Home</span>
                    </button>

                    <button onClick={() => setView('budgets')} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-colors ${view === 'budgets' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'}`}>
                        <PiggyBank size={22} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold mt-1">Plan</span>
                    </button>

                    <div className="relative -top-6">
                        <button onClick={() => setView('add')} className="bg-slate-900 text-white w-14 h-14 rounded-2xl shadow-xl shadow-slate-300 border-[4px] border-slate-50 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
                            <Plus size={28} strokeWidth={3} />
                        </button>
                    </div>

                    <button onClick={() => setView('analytics')} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-colors ${view === 'analytics' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'}`}>
                        <PieChart size={22} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold mt-1">Stats</span>
                    </button>

                    <button onClick={() => setView('settings')} className={`flex flex-col items-center p-2 rounded-xl w-16 transition-colors ${view === 'settings' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Menu size={22} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold mt-1">Menu</span>
                    </button>
                </nav>

            </div>
        </div>
    );
}