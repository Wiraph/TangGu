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

async function postToGas<T>(payload: unknown): Promise<T> {
  if (!endpoint) {
    throw new Error('Missing VITE_GAS_WEB_APP_URL');
  }

  const response = await fetchGas(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...(payload as Record<string, unknown>), token: accessToken }),
  });

  const json = await parseGasResponse(response);
  if (!response.ok || json.success === false) {
    throw new Error(json.error || 'Google Apps Script request failed');
  }

  return json.data as T;
}

export async function getTransactions(): Promise<Transaction[]> {
  if (!endpoint) {
    return readLocal().sort((a, b) => b.date.localeCompare(a.date));
  }

  const url = new URL(endpoint);
  url.searchParams.set('action', 'getTransactions');
  if (accessToken) {
    url.searchParams.set('token', accessToken);
  }
  const response = await fetchGas(url);
  const json = await parseGasResponse(response);
  if (!response.ok || json.success === false) {
    throw new Error(json.error || 'Unable to load transactions');
  }

  return json.data as Transaction[];
}

async function fetchGas(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Cannot reach Google Apps Script. Check that the Web App URL is the latest /exec deployment and that Code.gs contains doGet and doPost.');
    }

    throw error;
  }
}

async function parseGasResponse(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text) as { success?: boolean; data?: unknown; error?: string };
  } catch {
    const scriptError = text.match(/<div[^>]*>\s*([^<]*(?:doGet|doPost)[^<]*)\s*<\/div>/i)?.[1];
    if (scriptError) {
      throw new Error(scriptError);
    }

    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    throw new Error(cleanText || `Google Apps Script returned ${response.status}`);
  }
}

export async function createTransaction(data: TransactionInput): Promise<Transaction> {
  if (!endpoint) {
    const transaction = { ...data, id: makeId(data.date) };
    writeLocal([transaction, ...readLocal()]);
    return transaction;
  }

  return postToGas<Transaction>({ action: 'CREATE', data });
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

  return postToGas<Transaction>({ action: 'UPDATE', id, data });
}

export async function deleteTransaction(id: string): Promise<{ id: string }> {
  if (!endpoint) {
    writeLocal(readLocal().filter((transaction) => transaction.id !== id));
    return { id };
  }

  return postToGas<{ id: string }>({ action: 'DELETE', id });
}
