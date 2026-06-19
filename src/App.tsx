import { useEffect, useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownUp,
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Landmark,
  Pencil,
  PiggyBank,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Trash2,
  WalletCards,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { accounts, categoryOptionsByType, transactionTypes, type Account, type Transaction, type TransactionInput, type ViewMode } from './types';
import { createTransaction, deleteTransaction, getTransactions, updateTransaction } from './lib/api';
import { dailyStats, monthlyStats, weeklyStats, yearlyStats } from './lib/analytics';
import { cn } from './lib/utils';
import { formatDateThai, formatMonthThai, money, monthKey, todayIso, yearKey } from './lib/utils';
import { ConcreteScene } from './components/ConcreteScene';

const palette = ['#111111', '#f05a28', '#8f8f89', '#d8d6cf', '#5f5f5f', '#ffffff'];
const accountIcons = {
  MAKE: WalletCards,
  Dime: PiggyBank,
  MyMo: CircleDollarSign,
  Krungthai: Landmark,
  Cash: Banknote,
  TrueMoney: Smartphone,
} satisfies Record<Account, typeof WalletCards>;

const emptyForm: TransactionInput = {
  date: todayIso(),
  type: 'expense',
  amount: 0,
  account: 'MAKE',
  to_account: null,
  category: 'อาหาร',
  note: '',
};

function App() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>('monthly');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TransactionInput>(emptyForm);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [selectedWeekDate, setSelectedWeekDate] = useState(todayIso());
  const [selectedMonth, setSelectedMonth] = useState(monthKey(todayIso()));
  const [selectedYear, setSelectedYear] = useState(yearKey(todayIso()));
  const reportYear = isYearString(selectedYear) ? selectedYear : yearKey(todayIso());

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  });

  const transactions = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);
  const availableYears = useMemo(() => {
    const years = new Set([reportYear, yearKey(todayIso())]);
    transactions.forEach((transaction) => years.add(yearKey(transaction.date)));
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [reportYear, transactions]);
  const daily = useMemo(() => dailyStats(transactions, selectedDate), [selectedDate, transactions]);
  const weekly = useMemo(() => weeklyStats(transactions, selectedWeekDate), [selectedWeekDate, transactions]);
  const monthly = useMemo(() => monthlyStats(transactions, selectedMonth), [selectedMonth, transactions]);
  const yearly = useMemo(() => yearlyStats(transactions, reportYear), [reportYear, transactions]);
  const visibleHistory = useMemo(
    () => filterTransactionsForView(transactions, view, selectedDate, selectedWeekDate, selectedMonth, reportYear),
    [selectedDate, selectedMonth, selectedWeekDate, reportYear, transactions, view],
  );

  const saveMutation = useMutation({
    mutationFn: () => (editingId ? updateTransaction(editingId, form) : createTransaction(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setEditingId(null);
      setForm({ ...emptyForm, date: todayIso() });
    },
    onError: (error) => {
      console.error('Save transaction failed', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setEditingId(null);
      setForm({ ...emptyForm, date: todayIso() });
    },
    onError: (error) => {
      console.error('Delete transaction failed', error);
    },
  });

  function editTransaction(transaction: Transaction) {
    setEditingId(transaction.id);
    setForm({
      date: transaction.date,
      type: transaction.type,
      amount: transaction.amount,
      account: transaction.account,
      to_account: transaction.to_account,
      category: transaction.category,
      note: transaction.note,
    });
  }

  const netBalance = monthly.accountBalances.reduce((sum, item) => sum + item.balance, 0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-paper text-ink">
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-25 grayscale" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}concrete-structure.png)` }} />
      <div className="fixed inset-0 z-0 bg-[linear-gradient(90deg,rgba(244,243,239,0.92)_0%,rgba(244,243,239,0.74)_52%,rgba(244,243,239,0.94)_100%)]" />
      <ConcreteScene />
      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-6">
        <header className="grid min-h-24 gap-4 border-y-[5px] border-ink bg-paper/90 py-4 lg:col-span-2 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-1">
            <p className="text-sm font-black uppercase text-accent">TangGu / Private Ledger</p>
            <h1 className="max-w-4xl text-4xl font-black uppercase leading-none sm:text-6xl lg:text-7xl">Personal Finance Tracker</h1>
          </div>
          <div className="grid min-w-56 border-[5px] border-ink bg-white px-4 py-3 text-right">
            <span className="text-xs font-black uppercase text-concrete">Net Balance</span>
            <strong className="text-3xl font-black text-accent">{money(netBalance)}</strong>
          </div>
        </header>

        <section className="grid content-start gap-4">
          {transactionsQuery.error && (
            <StatusAlert title="Google Sheet connection failed" message={transactionsQuery.error.message} />
          )}

          <div className="grid grid-cols-2 gap-1.5 border-b-[5px] border-line pb-2 sm:grid-cols-4 sm:gap-2">
            {(['daily', 'weekly', 'monthly', 'yearly'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                className={cn(
                  'h-10 min-w-0 border-[3px] px-1 text-xs font-black uppercase transition sm:h-11 sm:text-sm',
                  view === mode ? 'border-ink bg-accent text-ink' : 'border-line bg-white text-ink hover:bg-raw',
                )}
                onClick={() => setView(mode)}
              >
                {mode}
              </button>
            ))}
          </div>

          <PeriodControls
            view={view}
            selectedDate={selectedDate}
            selectedWeekDate={selectedWeekDate}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            availableYears={availableYears}
            onDateChange={(date) => {
              setSelectedDate(date);
              setSelectedMonth(monthKey(date));
              setSelectedYear(yearKey(date));
            }}
            onWeekDateChange={(date) => {
              setSelectedWeekDate(date);
              setSelectedMonth(monthKey(date));
              setSelectedYear(yearKey(date));
            }}
            onMonthChange={(month) => {
              setSelectedMonth(month);
              setSelectedYear(yearKey(month));
            }}
            onYearChange={setSelectedYear}
            onReset={() => {
              const today = todayIso();
              setSelectedDate(today);
              setSelectedWeekDate(today);
              setSelectedMonth(monthKey(today));
              setSelectedYear(yearKey(today));
            }}
          />

          {view === 'daily' && <DailyView daily={daily} />}
          {view === 'weekly' && <WeeklyView weekly={weekly} />}
          {view === 'monthly' && <MonthlyView monthly={monthly} />}
          {view === 'yearly' && <YearlyView yearly={yearly} />}
        </section>

        <aside className="grid content-start gap-4">
          <TransactionForm
            editingId={editingId}
            form={form}
            setForm={setForm}
            isSaving={saveMutation.isPending}
            saveError={saveMutation.error}
            deleteError={deleteMutation.error}
            onSave={() => saveMutation.mutate()}
            onDelete={() => editingId && deleteMutation.mutate(editingId)}
            onCancel={() => {
              setEditingId(null);
              setForm({ ...emptyForm, date: todayIso() });
            }}
          />
          <History transactions={visibleHistory} onEdit={editTransaction} selectedId={editingId} />
        </aside>
      </div>
    </main>
  );
}

function PeriodControls(props: {
  view: ViewMode;
  selectedDate: string;
  selectedWeekDate: string;
  selectedMonth: string;
  selectedYear: string;
  availableYears: string[];
  onDateChange: (date: string) => void;
  onWeekDateChange: (date: string) => void;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
  onReset: () => void;
}) {
  const { view, selectedDate, selectedWeekDate, selectedMonth, selectedYear, availableYears, onDateChange, onWeekDateChange, onMonthChange, onYearChange, onReset } = props;
  const weekLabel = formatWeekRangeThai(selectedWeekDate);
  const periodLabel = view === 'daily' ? formatDateThai(selectedDate) : view === 'weekly' ? weekLabel : view === 'monthly' ? formatMonthThai(selectedMonth) : isYearString(selectedYear) ? selectedYear : yearKey(todayIso());

  return (
    <div className="grid gap-3 border-[3px] border-line bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <div className="grid gap-2">
        <span className="text-xs font-black uppercase text-concrete">เลือกช่วงข้อมูล</span>
        {view === 'daily' && (
          <ThemeDatePicker label="เลือกวันที่" value={selectedDate} onChange={onDateChange} />
        )}
        {view === 'weekly' && (
          <ThemeDatePicker label="เลือกสัปดาห์" value={selectedWeekDate} onChange={onWeekDateChange} />
        )}
        {view === 'monthly' && (
          <ThemeMonthPicker label="เลือกเดือน" value={selectedMonth} onChange={onMonthChange} />
        )}
        {view === 'yearly' && (
          <input
            aria-label="เลือกปี"
            className="field"
            inputMode="numeric"
            list="available-years"
            maxLength={4}
            pattern="[0-9]{4}"
            type="text"
            value={selectedYear}
            onChange={(event) => onYearChange(event.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        )}
        <datalist id="available-years">
          {availableYears.map((year) => (
            <option key={year} value={year} />
          ))}
        </datalist>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:min-w-72">
        <div className="grid min-h-12 content-center border-[3px] border-line bg-raw px-3">
          <span className="text-[11px] font-black uppercase text-concrete">Showing</span>
          <strong className="truncate text-sm font-black uppercase">{periodLabel}</strong>
        </div>
        <button type="button" className="icon-button" title="กลับไปช่วงเวลาปัจจุบัน" onClick={onReset}>
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}

function ThemeDatePicker({ label, value, onChange }: { label: string; value: string; onChange: (date: string) => void }) {
  const pickerId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(monthKey(value));
  const today = todayIso();
  const days = getCalendarDays(visibleMonth);
  const weekdayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  useEffect(() => {
    const handleOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== pickerId) {
        setIsOpen(false);
      }
    };

    window.addEventListener('tanggu-date-picker-open', handleOpen);
    return () => window.removeEventListener('tanggu-date-picker-open', handleOpen);
  }, [pickerId]);

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label={label}
        className="field grid grid-cols-[1fr_auto] items-center text-left"
        type="button"
        onClick={() => {
          setVisibleMonth(monthKey(value));
          if (!isOpen) {
            window.dispatchEvent(new CustomEvent('tanggu-date-picker-open', { detail: pickerId }));
          }
          setIsOpen(!isOpen);
        }}
      >
        <span>{formatDateThai(value)}</span>
        <CalendarDays size={18} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-2rem))] border-[3px] border-ink bg-paper p-3 shadow-panel">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b-[3px] border-line pb-2">
            <button className="icon-button h-9 w-9" title="เดือนก่อนหน้า" type="button" onClick={() => setVisibleMonth(shiftMonth(visibleMonth, -1))}>
              <ChevronLeft size={17} />
            </button>
            <strong className="truncate text-center text-sm font-black uppercase">{formatMonthThai(visibleMonth)}</strong>
            <button className="icon-button h-9 w-9" title="เดือนถัดไป" type="button" onClick={() => setVisibleMonth(shiftMonth(visibleMonth, 1))}>
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center">
            {weekdayLabels.map((weekday) => (
              <span key={weekday} className="text-[11px] font-black uppercase text-concrete">
                {weekday}
              </span>
            ))}
            {days.map((day) => {
              const isoDate = toIsoDate(day.date);
              const isCurrentMonth = monthKey(isoDate) === visibleMonth;
              const isSelected = isoDate === value;
              return (
                <button
                  key={isoDate}
                  className={cn(
                    'grid h-9 place-items-center border-[2px] text-sm font-black transition',
                    isSelected ? 'border-ink bg-accent text-ink' : 'border-transparent bg-white hover:border-ink',
                    !isCurrentMonth && 'text-concrete opacity-60',
                    isoDate === today && !isSelected && 'border-accent text-accent',
                  )}
                  type="button"
                  onClick={() => {
                    onChange(isoDate);
                    setIsOpen(false);
                  }}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t-[3px] border-line pt-3">
            <button
              className="h-10 border-[3px] border-line bg-white text-xs font-black uppercase hover:bg-raw"
              type="button"
              onClick={() => {
                onChange(today);
                setIsOpen(false);
              }}
            >
              Today
            </button>
            <button className="h-10 border-[3px] border-line bg-ink text-xs font-black uppercase text-white hover:bg-accent hover:text-ink" type="button" onClick={() => setIsOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeMonthPicker({ label, value, onChange }: { label: string; value: string; onChange: (month: string) => void }) {
  const pickerId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleYear, setVisibleYear] = useState(yearKey(value));
  const todayMonth = monthKey(todayIso());
  const monthLabels = Array.from({ length: 12 }, (_, index) => ({
    label: new Date(`${visibleYear}-${String(index + 1).padStart(2, '0')}-01T00:00:00`).toLocaleDateString('th-TH', { month: 'short' }),
    value: `${visibleYear}-${String(index + 1).padStart(2, '0')}`,
  }));

  useEffect(() => {
    const handleOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== pickerId) {
        setIsOpen(false);
      }
    };

    window.addEventListener('tanggu-date-picker-open', handleOpen);
    return () => window.removeEventListener('tanggu-date-picker-open', handleOpen);
  }, [pickerId]);

  return (
    <div className="relative">
      <button
        aria-expanded={isOpen}
        aria-label={label}
        className="field grid grid-cols-[1fr_auto] items-center text-left"
        type="button"
        onClick={() => {
          setVisibleYear(yearKey(value));
          if (!isOpen) {
            window.dispatchEvent(new CustomEvent('tanggu-date-picker-open', { detail: pickerId }));
          }
          setIsOpen(!isOpen);
        }}
      >
        <span>{formatMonthThai(value)}</span>
        <CalendarDays size={18} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-2rem))] border-[3px] border-ink bg-paper p-3 shadow-panel">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b-[3px] border-line pb-2">
            <button className="icon-button h-9 w-9" title="ปีก่อนหน้า" type="button" onClick={() => setVisibleYear(String(Number(visibleYear) - 1))}>
              <ChevronLeft size={17} />
            </button>
            <strong className="truncate text-center text-sm font-black uppercase">{visibleYear}</strong>
            <button className="icon-button h-9 w-9" title="ปีถัดไป" type="button" onClick={() => setVisibleYear(String(Number(visibleYear) + 1))}>
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {monthLabels.map((month) => {
              const isSelected = month.value === value;
              return (
                <button
                  key={month.value}
                  className={cn(
                    'h-11 border-[3px] text-sm font-black uppercase transition',
                    isSelected ? 'border-ink bg-accent text-ink' : 'border-line bg-white hover:bg-raw',
                    month.value === todayMonth && !isSelected && 'border-accent text-accent',
                  )}
                  type="button"
                  onClick={() => {
                    onChange(month.value);
                    setIsOpen(false);
                  }}
                >
                  {month.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t-[3px] border-line pt-3">
            <button
              className="h-10 border-[3px] border-line bg-white text-xs font-black uppercase hover:bg-raw"
              type="button"
              onClick={() => {
                onChange(todayMonth);
                setIsOpen(false);
              }}
            >
              This Month
            </button>
            <button className="h-10 border-[3px] border-line bg-ink text-xs font-black uppercase text-white hover:bg-accent hover:text-ink" type="button" onClick={() => setIsOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function filterTransactionsForView(transactions: Transaction[], view: ViewMode, selectedDate: string, selectedWeekDate: string, selectedMonth: string, selectedYear: string) {
  if (view === 'daily') {
    return transactions.filter((transaction) => transaction.date === selectedDate);
  }

  if (view === 'weekly') {
    const { weekStart, weekEnd } = getWeekRange(selectedWeekDate);
    return transactions.filter((transaction) => transaction.date >= weekStart && transaction.date <= weekEnd);
  }

  if (view === 'monthly') {
    return transactions.filter((transaction) => monthKey(transaction.date) === selectedMonth);
  }

  return transactions.filter((transaction) => yearKey(transaction.date) === selectedYear);
}

function isYearString(value: string) {
  return /^\d{4}$/.test(value);
}

function toIsoDate(date: Date) {
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function formatWeekRangeThai(selectedDate: string) {
  const { weekStart, weekEnd } = getWeekRange(selectedDate);
  return `${formatDateThai(weekStart)} - ${formatDateThai(weekEnd)}`;
}

function getWeekRange(selectedDate: string) {
  const date = new Date(`${selectedDate}T00:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + mondayOffset);

  return {
    weekStart: toIsoDate(start),
    weekEnd: toIsoDate(addDays(start, 6)),
  };
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function shiftMonth(month: string, amount: number) {
  const date = new Date(`${month}-01T00:00:00`);
  date.setMonth(date.getMonth() + amount);
  return monthKey(toIsoDate(date));
}

function getCalendarDays(month: string) {
  const firstDay = new Date(`${month}-01T00:00:00`);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date };
  });
}

function DailyView({ daily }: { daily: ReturnType<typeof dailyStats> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Metric label={daily.selectedDate} value={money(daily.todayExpense)} />
      <Metric label="Weekly Avg" value={money(daily.weeklyAverage)} tone="accent" />
      <div className="panel md:col-span-2">
        <SectionTitle icon={CalendarDays} title="Daily Timeline" />
        <Timeline transactions={daily.todayTransactions} />
      </div>
    </div>
  );
}

function WeeklyView({ weekly }: { weekly: ReturnType<typeof weeklyStats> }) {
  const [chartRef, chartSize] = useMeasuredElement();

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Weekly Income" value={money(weekly.income)} />
        <Metric label="Weekly Expense" value={money(weekly.expense)} tone="accent" />
        <Metric label="Weekly Net" value={money(weekly.net)} />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="panel min-h-80 min-w-0">
          <SectionTitle icon={CalendarDays} title="Weekly Flow" />
          <div ref={chartRef} className="h-72 min-w-0 px-2 pb-4">
            {chartSize && (
              <BarChart width={chartSize.width} height={chartSize.height} data={weekly.dailyFlow}>
                <CartesianGrid stroke="#111111" strokeOpacity={0.2} />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#111111" />
                <Bar dataKey="expense" name="Expense" fill="#f05a28" />
              </BarChart>
            )}
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div className="panel min-w-0">
            <SectionTitle icon={CircleDollarSign} title="Weekly Categories" />
            <div className="grid gap-2 p-4 pt-0">
              {weekly.byCategory.length === 0 && <p className="font-bold text-concrete">No weekly expenses</p>}
              {weekly.byCategory.map((item) => (
                <div key={item.name} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b-[3px] border-line py-2 last:border-0">
                  <span className="truncate font-black">{item.name}</span>
                  <span className="font-black text-accent">{money(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel min-w-0">
            <SectionTitle icon={ArrowDownUp} title="Weekly Timeline" />
            <Timeline transactions={weekly.weekly} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthlyView({ monthly }: { monthly: ReturnType<typeof monthlyStats> }) {
  const [chartRef, chartSize] = useMeasuredElement();

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="panel min-h-80 min-w-0">
        <SectionTitle icon={CircleDollarSign} title="Category Share" />
        <div ref={chartRef} className="h-72 min-w-0">
          {chartSize && (
            <PieChart width={chartSize.width} height={chartSize.height}>
              <Pie data={monthly.byCategory} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                {monthly.byCategory.map((item, index) => (
                  <Cell key={item.name} fill={palette[index % palette.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => money(Number(value))} />
              <Legend />
            </PieChart>
          )}
        </div>
      </div>
      <div className="grid gap-4">
        <div className="panel">
          <SectionTitle icon={PiggyBank} title="Account Balance" />
          <div className="grid gap-2 p-4 pt-0">
            {monthly.accountBalances.map((item) => (
              <div key={item.account} className="grid grid-cols-[1fr_auto] items-center border-b-[3px] border-line py-2 last:border-0">
                <span className="font-black uppercase">{item.account}</span>
                <span className={cn('font-black', item.balance < 0 ? 'text-accent' : 'text-ink')}>{money(item.balance)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <SectionTitle icon={ArrowDownUp} title="Top Expenses" />
          <Timeline transactions={monthly.popularExpenses} />
        </div>
      </div>
    </div>
  );
}

function YearlyView({ yearly }: { yearly: ReturnType<typeof yearlyStats> }) {
  const [chartRef, chartSize] = useMeasuredElement();

  return (
    <div className="panel min-h-96 min-w-0">
      <SectionTitle icon={CalendarDays} title="Income vs Expense" />
      <div ref={chartRef} className="h-80 min-w-0 px-2 pb-4">
        {chartSize && (
          <BarChart width={chartSize.width} height={chartSize.height} data={yearly}>
            <CartesianGrid stroke="#111111" strokeOpacity={0.2} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} />
            <Tooltip formatter={(value) => money(Number(value))} />
            <Legend />
            <Bar dataKey="income" name="Income" fill="#111111" />
            <Bar dataKey="expense" name="Expense" fill="#f05a28" />
          </BarChart>
        )}
      </div>
      <div className="grid gap-2 border-t-[3px] border-line p-4 sm:grid-cols-4">
        {yearly.slice(-4).map((item) => (
          <div key={item.month} className="grid border-[3px] border-line bg-white p-3">
            <span className="text-xs font-black uppercase text-concrete">{item.month}</span>
            <strong className="text-xl font-black text-accent">{item.savingsRate}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionForm(props: {
  editingId: string | null;
  form: TransactionInput;
  setForm: (form: TransactionInput) => void;
  isSaving: boolean;
  saveError: Error | null;
  deleteError: Error | null;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const { editingId, form, setForm, isSaving, saveError, deleteError, onSave, onDelete, onCancel } = props;
  const isTransfer = form.type === 'transfer';
  const transferTargets = accounts.filter((account) => account !== form.account);
  const categoryOptions = categoryOptionsByType[form.type];
  const chooseFallbackTransferTarget = (account: Account) => accounts.find((candidate) => candidate !== account) ?? 'Cash';
  const mutationError = saveError ?? deleteError;

  return (
    <form
      className="panel relative z-20 grid gap-4 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="flex items-center justify-between border-b-[3px] border-line pb-3">
        <h2 className="text-xl font-black uppercase">{editingId ? 'Edit Transaction' : 'Quick Entry'}</h2>
        {editingId && (
          <button type="button" className="icon-button" title="Cancel edit" onClick={onCancel}>
            <Plus className="rotate-45" size={20} />
          </button>
        )}
      </div>

      <input
        data-testid="amount-input"
        className="h-20 w-full border-[5px] border-ink bg-white px-4 text-right text-5xl font-black outline-none focus:bg-accent/10"
        inputMode="decimal"
        min="0"
        step="0.01"
        type="number"
        value={form.amount || ''}
        placeholder="0"
        onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })}
      />

      <div className="grid grid-cols-3 gap-2">
        {transactionTypes.map((type) => (
          <button
            key={type}
            type="button"
            className={cn('h-11 border-[3px] text-sm font-black uppercase', form.type === type ? 'border-ink bg-accent text-ink' : 'border-line bg-white')}
            onClick={() =>
              setForm({
                ...form,
                type,
                category: categoryOptionsByType[type][0],
                to_account: type === 'transfer' ? (form.to_account && form.to_account !== form.account ? form.to_account : chooseFallbackTransferTarget(form.account)) : null,
              })
            }
          >
            {type}
          </button>
        ))}
      </div>

      <BankSelector
        label={isTransfer ? 'Transfer From' : form.type === 'income' ? 'Money In Account' : 'Money Out Account'}
        value={form.account}
        options={accounts}
        onChange={(account) =>
          setForm({
            ...form,
            account,
            to_account: isTransfer && form.to_account === account ? chooseFallbackTransferTarget(account) : form.to_account,
          })
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <ThemeDatePicker label="วันที่ทำรายการ" value={form.date} onChange={(date) => setForm({ ...form, date })} />
        <select className="field sm:col-span-2" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as TransactionInput['category'] })}>
          {categoryOptions.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <input data-testid="note-input" className="field sm:col-span-2" value={form.note} placeholder="Note" onChange={(event) => setForm({ ...form, note: event.target.value })} />
      </div>

      {isTransfer && (
        <BankSelector label="Transfer To" value={form.to_account ?? transferTargets[0]} options={transferTargets} onChange={(account) => setForm({ ...form, to_account: account })} />
      )}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button data-testid="save-transaction" className="h-12 border-[3px] border-ink bg-ink px-4 font-black uppercase text-white transition hover:bg-accent hover:text-ink disabled:opacity-50" disabled={isSaving || form.amount <= 0}>
          <Save className="mr-2 inline" size={18} />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        {editingId && (
          <button type="button" className="icon-button border-accent text-accent" title="Delete transaction" onClick={onDelete}>
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {mutationError && (
        <StatusAlert title="Save failed" message={mutationError.message} />
      )}
    </form>
  );
}

function StatusAlert({ title, message }: { title: string; message: string }) {
  return (
    <div className="border-[3px] border-accent bg-accent/10 p-3 text-sm font-black text-ink" role="alert">
      <span className="block uppercase text-accent">{title}</span>
      <span className="break-words">{message}</span>
    </div>
  );
}

function BankSelector({ label, value, options, onChange }: { label: string; value: Account; options: readonly Account[]; onChange: (account: Account) => void }) {
  return (
    <div className="grid gap-2 border-[3px] border-line bg-white p-2">
      <span className="px-1 text-xs font-black uppercase text-concrete">{label}</span>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {options.map((account) => {
          const Icon = accountIcons[account];
          return (
            <button
              key={account}
              data-testid={`bank-${label.toLowerCase().replace(/\s+/g, '-')}-${account}`}
              type="button"
              className={cn('grid h-14 place-items-center border-[3px] text-[11px] font-black', value === account ? 'border-ink bg-accent text-ink' : 'border-line bg-white')}
              title={account}
              onClick={() => onChange(account)}
            >
              <Icon size={18} />
              <span className="max-w-full truncate px-1">{account}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function History({ transactions, selectedId, onEdit }: { transactions: Transaction[]; selectedId: string | null; onEdit: (transaction: Transaction) => void }) {
  return (
    <div className="panel relative z-0">
      <SectionTitle icon={Pencil} title="History" />
      <div className="max-h-[34rem] overflow-auto">
        {transactions.map((transaction) => (
          <button
            key={transaction.id}
            data-testid={`history-${transaction.id}`}
            className={cn('grid w-full grid-cols-[1fr_auto] gap-2 border-b-[3px] border-line p-4 text-left transition last:border-0 hover:bg-raw', selectedId === transaction.id && 'bg-accent/20')}
            onClick={() => onEdit(transaction)}
          >
            <span className="grid gap-1">
              <strong className="truncate">{transaction.note || transaction.category}</strong>
              <small className="font-bold text-concrete">
                {transaction.date} · {transaction.account}
                {transaction.to_account ? ` → ${transaction.to_account}` : ''}
              </small>
            </span>
            <span className={cn('font-black', transaction.type === 'income' ? 'text-ink' : transaction.type === 'expense' ? 'text-accent' : 'text-concrete')}>
              {money(transaction.amount)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Timeline({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="p-4 font-bold text-concrete">No transactions</p>;
  }

  return (
    <div className="grid">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b-[3px] border-line p-4 last:border-0">
          <span className={cn('h-3 w-3 border border-ink', transaction.type === 'income' ? 'bg-ink' : transaction.type === 'expense' ? 'bg-accent' : 'bg-concrete')} />
          <span className="min-w-0">
            <strong className="block truncate">{transaction.note || transaction.category}</strong>
            <small className="font-bold text-concrete">{transaction.account}</small>
          </span>
          <strong>{money(transaction.amount)}</strong>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof WalletCards; title: string }) {
  return (
    <div className="flex h-14 items-center gap-2 border-b-[3px] border-line px-4">
      <Icon size={20} />
      <h2 className="text-lg font-black uppercase">{title}</h2>
    </div>
  );
}

function Metric({ label, value, tone = 'ink' }: { label: string; value: string; tone?: 'ink' | 'accent' }) {
  return (
    <div className="panel grid min-h-36 min-w-0 content-between p-4">
      <span className="text-xs font-black uppercase text-concrete">{label}</span>
      <strong className={cn('min-w-0 text-[clamp(1.25rem,2.25vw,1.85rem)] font-black leading-none', tone === 'ink' ? 'text-ink' : 'text-accent')}>{value}</strong>
    </div>
  );
}

function useMeasuredElement() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!element) return undefined;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize(rect.width > 0 && rect.height > 0 ? { width: Math.floor(rect.width), height: Math.floor(rect.height) } : null);
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();

    return () => observer.disconnect();
  }, [element]);

  return [setElement, size] as const;
}

export default App;
