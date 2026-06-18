import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(value: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function todayIso() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function yearKey(date: string) {
  return date.slice(0, 4);
}

export function formatDateThai(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonthThai(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });
}
