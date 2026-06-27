import { seedTransactions } from './seed';
import type { Transaction, TransactionInput } from '../types';

const endpoint = import.meta.env.VITE_GAS_WEB_APP_URL as string | undefined;
const accessToken = import.meta.env.VITE_TANGGU_ACCESS_TOKEN as string | undefined;
const storageKey = 'tanggu.transactions';

function readLocal(): Transaction[] {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    localStorage.setItem(storageKey, JSON.stringify(seedTransactions));
    return seedTransactions;
  }

  return JSON.parse(saved) as Transaction[];
}

function writeLocal(transactions: Transaction[]) {
  localStorage.setItem(storageKey, JSON.stringify(transactions));
}

function makeId(date: string) {
  const suffix = crypto.randomUUID().slice(0, 8);
  return `tx_${date.replaceAll('-', '')}_${suffix}`;
}

async function callGas<T>(payload: Record<string, unknown>): Promise<T> {
  if (!endpoint) {
    throw new Error('Missing VITE_GAS_WEB_APP_URL');
  }

  const json = await requestJsonp(endpoint, { ...payload, token: accessToken });
  if (json.success === false) {
    throw new Error(json.error || 'Google Apps Script request failed');
  }

  return json.data as T;
}

export async function getTransactions(): Promise<Transaction[]> {
  if (!endpoint) {
    return readLocal().sort((a, b) => b.date.localeCompare(a.date));
  }

  const json = await requestJsonp(endpoint, { action: 'getTransactions', token: accessToken });
  if (json.success === false) {
    throw new Error(json.error || 'Unable to load transactions');
  }

  return json.data as Transaction[];
}

export async function createTransaction(data: TransactionInput): Promise<Transaction> {
  if (!endpoint) {
    const transaction = { ...data, id: makeId(data.date) };
    writeLocal([transaction, ...readLocal()]);
    return transaction;
  }

  return callGas<Transaction>({ action: 'CREATE', data: JSON.stringify(data) });
}

export async function updateTransaction(id: string, data: Partial<TransactionInput>): Promise<Transaction> {
  if (!endpoint) {
    const transactions = readLocal();
    const index = transactions.findIndex((transaction) => transaction.id === id);
    if (index < 0) throw new Error('Transaction not found');
    const updated = { ...transactions[index], ...data };
    transactions[index] = updated;
    writeLocal(transactions);
    return updated;
  }

  return callGas<Transaction>({ action: 'UPDATE', id, data: JSON.stringify(data) });
}

export async function deleteTransaction(id: string): Promise<{ id: string }> {
  if (!endpoint) {
    writeLocal(readLocal().filter((transaction) => transaction.id !== id));
    return { id };
  }

  return callGas<{ id: string }>({ action: 'DELETE', id });
}

function requestJsonp(url: string, params: Record<string, unknown>) {
  return new Promise<{ success?: boolean; data?: unknown; error?: string }>((resolve, reject) => {
    const callbackName = `__tanggu_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const requestUrl = new URL(url);
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Google Apps Script request timed out'));
    }, 20000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callbackName];
    }

    (window as unknown as Record<string, unknown>)[callbackName] = (payload: { success?: boolean; data?: unknown; error?: string }) => {
      cleanup();
      resolve(payload);
    };

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        requestUrl.searchParams.set(key, String(value));
      }
    });
    requestUrl.searchParams.set('callback', callbackName);

    script.src = requestUrl.toString();
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error('Cannot reach Google Apps Script. Check the Web App URL, access setting, and deployed Code.gs version.'));
    };

    document.head.appendChild(script);
  });
}
