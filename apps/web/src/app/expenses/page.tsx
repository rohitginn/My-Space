'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, TrendingDown, TrendingUp, Plus, MoreHorizontal, ShoppingCart, Loader2, AlertCircle, Edit, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/Modal';
import { useDialog } from '@/components/DialogProvider';

type Expense = {
  id: string;
  title: string;
  amount: string;
  currency: string;
  category: string | null;
  date: string;
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { confirm } = useDialog();
  const [expenseModal, setExpenseModal] = useState<{isOpen: boolean, isEdit: boolean, data: any}>({isOpen: false, isEdit: false, data: null});
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const { data: expenses, isLoading, isError } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data } = await api.get('/expenses');
      return data.data as Expense[];
    }
  });

  const saveExpenseMutation = useMutation({
    mutationFn: async (vars: { id?: string, title: string, amount: string, currency: string, category: string, date: string }) => {
      if (vars.id) {
        const { data } = await api.patch(`/expenses/${vars.id}`, vars);
        return data.data;
      } else {
        const { data } = await api.post('/expenses', vars);
        return data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setExpenseModal({isOpen: false, isEdit: false, data: null});
    }
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    }
  });

  const totalExpenses = expenses ? expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0) : 0;

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex-1 overflow-y-auto p-12 z-10 relative">
        <div className="max-w-4xl mx-auto w-full">
          
          <header className="flex justify-between items-end mb-12">
            <div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">Expenses</h1>
              <p className="text-muted text-lg">Track your spending and subscriptions.</p>
            </div>
            <button 
              onClick={() => setExpenseModal({isOpen: true, isEdit: false, data: {title: '', amount: '', currency: 'USD', category: 'Miscellaneous', date: new Date().toISOString().split('T')[0]}})}
              className="bg-foreground text-background hover:bg-foreground/90 px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-foreground/10 flex items-center gap-2"
            >
              <Plus size={20} />
              Add Expense
            </button>
          </header>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-surface-glass border border-border p-6 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 text-muted font-medium mb-4">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><DollarSign size={18} /></div>
                Total Spent
              </div>
              <h2 className="text-4xl font-bold text-foreground">
                ${totalExpenses.toFixed(2)}
              </h2>
            </div>
            
            <div className="bg-surface-glass border border-border p-6 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 text-muted font-medium mb-4">
                <div className="p-2 bg-accent-blue/10 text-accent-blue rounded-lg"><TrendingDown size={18} /></div>
                vs Last Month
              </div>
              <h2 className="text-4xl font-bold text-foreground flex items-end gap-2">
                -0% <span className="text-sm text-accent-green mb-1.5 font-medium">↓</span>
              </h2>
            </div>
            
            <div className="bg-surface-glass border border-border p-6 rounded-3xl shadow-sm bg-gradient-to-br from-surface to-accent-blue/5">
              <div className="flex items-center gap-3 text-muted font-medium mb-4">
                <div className="p-2 bg-accent-green/10 text-accent-green rounded-lg"><TrendingUp size={18} /></div>
                Budget Remaining
              </div>
              <h2 className="text-4xl font-bold text-accent-green">$2,000.00</h2>
            </div>
          </div>

          {/* Recent Expenses List */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Recent Transactions</h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-8 text-muted">
                <Loader2 size={24} className="animate-spin mr-2" /> Loading...
              </div>
            ) : isError ? (
              <div className="p-6 bg-red-500/10 text-red-500 rounded-xl flex items-center gap-3">
                <AlertCircle size={20} /> Failed to load expenses.
              </div>
            ) : !expenses || expenses.length === 0 ? (
              <div className="bg-surface border border-dashed border-border rounded-2xl p-12 text-center text-muted">
                No expenses logged yet.
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map(expense => (
                  <div key={expense.id} className="group flex items-center justify-between bg-surface-glass border border-border hover:border-border/80 p-5 rounded-2xl transition-all duration-200 shadow-sm">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-muted">
                        <ShoppingCart size={18} />
                      </div>
                      <div>
                        <h3 className="text-foreground font-semibold text-lg">{expense.title}</h3>
                        <p className="text-muted text-sm">{expense.category}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-foreground font-bold text-lg">-${parseFloat(expense.amount).toFixed(2)}</p>
                        <p className="text-muted text-sm">
                          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(expense.date))}
                        </p>
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setActiveDropdownId(activeDropdownId === expense.id ? null : expense.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted hover:text-foreground p-2 rounded-lg hover:bg-surface transition-all"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                        {activeDropdownId === expense.id && (
                          <div className="absolute right-0 mt-2 w-36 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20">
                            <button 
                              onClick={() => { setExpenseModal({isOpen: true, isEdit: true, data: {...expense, date: expense.date.split('T')[0]}}); setActiveDropdownId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-hover flex items-center gap-2"
                            >
                              <Edit size={14} /> Edit
                            </button>
                            <button 
                              onClick={async () => { if(await confirm('Delete expense?')) deleteExpenseMutation.mutate(expense.id); setActiveDropdownId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={expenseModal.isOpen} onClose={() => setExpenseModal({...expenseModal, isOpen: false})} title={expenseModal.isEdit ? "Edit Expense" : "New Expense"}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Title</label>
            <input 
              type="text" 
              value={expenseModal.data?.title || ''}
              onChange={e => setExpenseModal({...expenseModal, data: {...expenseModal.data, title: e.target.value}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              placeholder="e.g. Groceries"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={expenseModal.data?.amount || ''}
                  onChange={e => setExpenseModal({...expenseModal, data: {...expenseModal.data, amount: e.target.value}})}
                  className="w-full bg-surface border border-border rounded-lg pl-8 pr-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Date</label>
              <input 
                type="date" 
                value={expenseModal.data?.date || ''}
                onChange={e => setExpenseModal({...expenseModal, data: {...expenseModal.data, date: e.target.value}})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Category</label>
            <select
              value={expenseModal.data?.category || 'Miscellaneous'}
              onChange={e => setExpenseModal({...expenseModal, data: {...expenseModal.data, category: e.target.value}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
            >
              <option>Groceries</option>
              <option>Housing</option>
              <option>Transportation</option>
              <option>Entertainment</option>
              <option>Software</option>
              <option>Miscellaneous</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setExpenseModal({...expenseModal, isOpen: false})} className="px-4 py-2 text-muted hover:text-foreground font-medium">Cancel</button>
            <button 
              onClick={() => {
                const dateISO = new Date(expenseModal.data.date).toISOString();
                saveExpenseMutation.mutate({ ...expenseModal.data, date: dateISO, amount: expenseModal.data.amount.toString() });
              }}
              disabled={saveExpenseMutation.isPending || !expenseModal.data?.title || !expenseModal.data?.amount}
              className="bg-foreground text-background px-6 py-2 rounded-lg font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {saveExpenseMutation.isPending ? 'Saving...' : (expenseModal.isEdit ? 'Save Changes' : 'Add Expense')}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
