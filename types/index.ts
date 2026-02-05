export type TransactionType = 'income' | 'expense' | 'settlement';
export type Owner = 'me' | 'her';
export type BudgetOwner = 'me' | 'her' | 'joint';
export type SplitType = 'personal' | 'shared';
export type ViewState = 'dashboard' | 'add' | 'budgets' | 'analytics' | 'todos' | 'settings';
export type FilterState = 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
    _id: string;
    amount: string;
    category: string;
    date: string;
    note: string;
    type: TransactionType;
    owner: Owner;
    split?: SplitType;
    from?: Owner;
    to?: Owner;
}

export interface TransactionFormState {
    amount: string;
    category: string;
    date: string;
    note: string;
    type: TransactionType;
    owner: Owner;
    split: SplitType;
}

export interface Budget {
    _id: string;
    category: string;
    amount: number;
    owner: BudgetOwner;
}

export interface Todo {
    _id: string;
    text: string;
    completed: boolean;
    createdBy: Owner;
}

export interface Financials {
    income: number;
    expense: number;
    balance: number;
    settlement: {
        amount: number;
        whoOwes: Owner | 'none';
        raw: number;
    };
}

export interface BudgetStat {
    category: string;
    monthlyLimit: number;
    effectiveLimit: number;
    spent: number;
    pct: number;
}