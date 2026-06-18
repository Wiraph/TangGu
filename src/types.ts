export const accounts = ['MAKE', 'Dime', 'MyMo', 'Krungthai', 'Cash'] as const;
export const transactionTypes = ['income', 'expense', 'transfer'] as const;
export const incomeCategories = ['เงินเดือน', 'ฟรีแลนซ์', 'ขายของ', 'ดอกเบี้ย', 'เงินคืน', 'รายรับอื่นๆ'] as const;
export const expenseCategories = ['อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'ที่อยู่อาศัย', 'ลงทุน', 'อื่นๆ'] as const;
export const transferCategories = ['โอนย้ายบัญชี'] as const;
export const categories = [...incomeCategories, ...expenseCategories, ...transferCategories] as const;
export const categoryOptionsByType = {
  income: incomeCategories,
  expense: expenseCategories,
  transfer: transferCategories,
} as const;

export type Account = (typeof accounts)[number];
export type TransactionType = (typeof transactionTypes)[number];
export type Category = (typeof categories)[number];

export type Transaction = {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  account: Account;
  to_account: Account | null;
  category: Category;
  note: string;
};

export type TransactionInput = Omit<Transaction, 'id'>;

export type ViewMode = 'daily' | 'weekly' | 'monthly' | 'yearly';
