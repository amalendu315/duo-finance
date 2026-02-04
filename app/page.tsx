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
    AlertTriangle
} from 'lucide-react';
import {
    PieChart as RePieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';

/**
 * DuoFinance: Next.js Client Component
 * Architecture: Modular Sub-Components for stable rendering and focus management.
 * Updates:
 * - Fixed Date Logic for Weekly/Monthly/Yearly filters.
 * - Custom Confirmation Modals (Phone-like) instead of window.confirm/alert.
 */

// --- Types ---

type TransactionType = 'income' | 'expense' | 'settlement';
type Owner = 'me' | 'her';
type SplitType = 'personal' | 'shared';
type ViewState = 'dashboard' | 'add' | 'budgets' | 'analytics' | 'settings';
type FilterState = 'weekly' | 'monthly' | 'yearly';

interface Transaction {
    id: string;
    amount: string; // Keep as string for inputs, parse for math
    category: string;
    date: string;
    note: string;
    type: TransactionType;
    owner: Owner;
    split?: SplitType;
    from?: Owner;
    to?: Owner;
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

// --- Constants ---
const STORAGE_KEY = 'duofinance_next_v1';

const CATEGORIES = [
    'Food & Dining', 'Groceries', 'Rent & Housing', 'Utilities',
    'Transport', 'Shopping', 'Entertainment', 'Health', 'Travel',
    'Savings', 'Income', 'Other'
];

const COLORS = {
    me: '#3b82f6',      // Blue 500
    her: '#d946ef',     // Fuchsia 500
    shared: '#14b8a6',  // Teal 500
    income: '#10b981',  // Emerald 500
    expense: '#f43f5e', // Rose 500
    settlement: '#64748b', // Slate 500
};

const CHART_COLORS = [
    '#3b82f6', '#d946ef', '#14b8a6', '#f59e0b', '#10b981',
    '#6366f1', '#ec4899', '#84cc16', '#06b6d4'
];

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

interface FilterTabsProps {
    filter: FilterState;
    setFilter: (f: FilterState) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ filter, setFilter }) => (
    <div className="flex bg-slate-200 p-1 rounded-xl mb-6">
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
                    <span className="block font-bold text-slate-500">${Number(t.amount).toLocaleString()}</span>
                    <button onClick={() => onDelete(t.id)} className="text-xs text-red-400 mt-1 hover:text-red-600 font-medium">Undo</button>
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
            {isInc ? '+' : '-'}${Number(t.amount).toLocaleString()}
          </span>
                </div>
                <button onClick={() => onDelete(t.id)} className="text-slate-300 hover:text-rose-500 p-1">
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

// --- Views (Defined as Components to prevent re-renders/focus loss) ---

interface DashboardViewProps {
    financials: Financials;
    filter: FilterState;
    setFilter: (f: FilterState) => void;
    filteredTransactions: Transaction[];
    budgetStats: BudgetStat[];
    setView: (v: ViewState) => void;
    setShowSettleModal: (v: boolean) => void;
    onDelete: (id: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
                                                         financials,
                                                         filter,
                                                         setFilter,
                                                         filteredTransactions,
                                                         budgetStats,
                                                         setView,
                                                         setShowSettleModal,
                                                         onDelete
                                                     }) => (
    <div className="pb-24 animate-in fade-in">
        <div className="flex justify-between items-end mb-6">
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">DuoFinance</h1>
                <p className="text-slate-400 text-sm font-medium">Synced</p>
            </div>
            <button onClick={() => setView('settings')} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition">
                <Settings size={20} />
            </button>
        </div>

        <FilterTabs filter={filter} setFilter={setFilter} />

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
                            ${financials.settlement.amount.toFixed(2)}
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
                <p className="text-xl font-bold text-emerald-800">${financials.income.toLocaleString()}</p>
            </div>
            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <div className="flex items-center gap-2 mb-2 text-rose-600">
                    <TrendingDown size={16} /> <span className="text-xs font-bold uppercase">Spent</span>
                </div>
                <p className="text-xl font-bold text-rose-800">${financials.expense.toLocaleString()}</p>
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
            {filteredTransactions.slice(0, 5).map((t) => <TransactionItem key={t.id} t={t} onDelete={onDelete} />)}
            {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No activity found.</div>
            )}
        </div>
    </div>
);

interface AddTransactionViewProps {
    onSave: (tx: Omit<Transaction, 'id'>) => void;
}

const AddTransactionView: React.FC<AddTransactionViewProps> = ({ onSave }) => {
    const [form, setForm] = useState<Omit<Transaction, 'id'>>({
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
                    <input
                        type="number" step="0.01"
                        value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                        className="w-full text-4xl font-black p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00" autoFocus
                    />
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
    budgets: Budgets;
    setBudgets: React.Dispatch<React.SetStateAction<Budgets>>;
}

const BudgetPlannerView: React.FC<BudgetPlannerViewProps> = ({ budgetStats, filter, budgets, setBudgets }) => {
    return (
        <div className="pb-24 animate-in fade-in">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Budget Planner</h2>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex gap-3 items-start">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <div>
                    <p className="text-sm text-blue-800 font-bold">How this works</p>
                    <p className="text-xs text-blue-600 mt-1">
                        Set your <span className="font-bold underline">Monthly Limit</span> below.
                        If you view the dashboard by &quot;Weekly&quot;, we automatically scale this limit (x 0.23) to match the view.
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
                            {filter} cap: ${stat.effectiveLimit.toFixed(0)}
                          </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Monthly Limit</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-24 text-right p-2 bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                        value={budgets[cat] || ''}
                                        onChange={(e) => setBudgets((prev) => ({...prev, [cat]: Number(e.target.value)}))}
                                    />
                                </div>
                            </div>
                            {budgets[cat] > 0 && (
                                <div className="relative pt-1">
                                    <div className="flex justify-between text-xs mb-1 text-slate-500 font-medium">
                                        <span>${stat.spent.toLocaleString()} spent ({filter})</span>
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
    onDelete: (id: string) => void;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ filteredTransactions, filter, setFilter, onDelete }) => {
    const pieData = useMemo(() => {
        return Object.entries(filteredTransactions.filter((t) => t.type === 'expense').reduce<Record<string, number>>((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
            return acc;
        }, {})).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [filteredTransactions]);

    return (
        <div className="pb-24 animate-in fade-in">
            <h2 className="text-2xl font-black text-slate-800 mb-6">Analytics</h2>
            <FilterTabs filter={filter} setFilter={setFilter} />

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <h3 className="font-bold text-slate-700 mb-4">Expense Breakdown</h3>
                <div className="h-64">
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((_e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </RePieChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-400">No Data</div>}
                </div>
            </div>

            <div className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-sm text-slate-600">History</div>
                {filteredTransactions.map((t) => <TransactionItem key={t.id} t={t} onDelete={onDelete} />)}
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
                <p className="text-4xl font-black text-slate-800 mt-4">${financials.settlement.amount.toFixed(2)}</p>
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
    const [showSettleModal, setShowSettleModal] = useState<boolean>(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // New State for Custom Confirmation
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDanger: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isDanger: false
    });

    // Helper to open confirm modal
    const requestConfirm = useCallback((title: string, message: string, onConfirm: () => void, isDanger = false) => {
        setConfirmModal({ isOpen: true, title, message, onConfirm, isDanger });
    }, []);

    const closeConfirm = useCallback(() => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    // --- Persistence Safe for Next.js ---
    useEffect(() => {
        const timer = setTimeout(() => {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    setTransactions(data.transactions || []);
                    setBudgets(data.budgets || {});
                } catch (e) { console.error("Load error", e); }
            }
            setIsLoaded(true);
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions, budgets }));
        }
    }, [transactions, budgets, isLoaded]);

    // --- Logic ---
    const dateRange = useMemo(() => {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);

        if (filter === 'weekly') {
            const day = start.getDay();
            // Calculate start date (Monday)
            // If today is Sunday (0), diff is current date - 6
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            start.setHours(0,0,0,0);

            // Calculate end date (Sunday) by creating a new date from start + 6 days
            // This handles month/year crossovers correctly automatically by setDate
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
    }, [filter]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Robust Date Parsing: Convert YYYY-MM-DD string to local date at midnight
            const [y, m, d] = t.date.split('-').map(Number);
            const tDate = new Date(y, m - 1, d);
            tDate.setHours(0, 0, 0, 0); // Ensure midnight

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

        filteredTransactions.forEach(t => {
            if (t.type === 'settlement') return;
            const val = Number(t.amount);
            if (t.type === 'income') income += val;
            else expense += val;
        });

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

    // --- Handlers ---
    const addTransaction = (form: Omit<Transaction, 'id'>) => {
        if (!form.amount) return;
        const newTx: Transaction = { ...form, id: Date.now().toString() };
        setTransactions([newTx, ...transactions]);
        setView('dashboard');
    };

    const executeSettlement = () => {
        const debt = financials.settlement.amount;
        const payer = financials.settlement.whoOwes;

        if (debt <= 0 || payer === 'none') return;

        const settlementTx: Transaction = {
            id: Date.now().toString(),
            amount: debt.toFixed(2),
            category: 'Settlement',
            date: new Date().toISOString().split('T')[0],
            note: 'Settlement Payment',
            type: 'settlement',
            from: payer,
            to: payer === 'me' ? 'her' : 'me',
            owner: payer,
            split: 'personal' // Not used for settlements but satisfies type
        };
        setTransactions([settlementTx, ...transactions]);
        setShowSettleModal(false);
    };

    const deleteTx = useCallback((id: string) => {
        requestConfirm(
            "Delete Transaction?",
            "This action cannot be undone.",
            () => {
                setTransactions(prev => prev.filter(t => t.id !== id));
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            },
            true
        );
    }, [requestConfirm]);

    const resetData = useCallback(() => {
        requestConfirm(
            "Reset All Data?",
            "This will permanently delete all transactions and budgets. Are you sure?",
            () => {
                localStorage.clear();
                window.location.reload();
            },
            true
        );
    }, [requestConfirm]);

    if (!isLoaded) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading your vault...</div>;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
            <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl">

                <main className="h-full overflow-y-auto p-6 scrollbar-hide">
                    {view === 'dashboard' && (
                        <DashboardView
                            financials={financials}
                            filter={filter}
                            setFilter={setFilter}
                            filteredTransactions={filteredTransactions}
                            budgetStats={budgetStats}
                            setView={setView}
                            setShowSettleModal={setShowSettleModal}
                            onDelete={deleteTx}
                        />
                    )}

                    {view === 'add' && <AddTransactionView onSave={addTransaction} />}

                    {view === 'budgets' && (
                        <BudgetPlannerView
                            budgetStats={budgetStats}
                            filter={filter}
                            budgets={budgets}
                            setBudgets={setBudgets}
                        />
                    )}

                    {view === 'analytics' && (
                        <AnalyticsView
                            filteredTransactions={filteredTransactions}
                            filter={filter}
                            setFilter={setFilter}
                            onDelete={deleteTx}
                        />
                    )}

                    {view === 'settings' && (
                        <div className="pt-10 text-center animate-in fade-in">
                            <h2 className="font-bold text-xl mb-4">Settings</h2>
                            <button
                                onClick={resetData}
                                className="bg-red-50 text-red-500 px-6 py-3 rounded-xl font-bold hover:bg-red-100 transition"
                            >
                                Reset App Data
                            </button>
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
                    onCancel={closeConfirm}
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