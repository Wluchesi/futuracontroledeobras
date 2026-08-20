export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0,0%';
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function calculateQuotationFinalPrice(
  quantity: number,
  unitPrice: number,
  freight: number = 0,
  discount: number = 0,
  taxes: number = 0
): number {
  const subtotal = quantity * unitPrice;
  return Math.max(0, subtotal + freight + taxes - discount);
}

export type PayableStatus = 'PAGO' | 'A_VENCER' | 'VENCIDO';

export function getAccountPayableStatus(
  dueDateInput: string | Date,
  paymentDateInput?: string | Date | null
): { status: PayableStatus; daysOverdue: number; label: string; badgeColor: string } {
  if (paymentDateInput) {
    return {
      status: 'PAGO',
      daysOverdue: 0,
      label: '🟢 PAGO',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(dueDateInput);
  dueDate.setHours(0, 0, 0, 0);

  if (dueDate >= today) {
    return {
      status: 'A_VENCER',
      daysOverdue: 0,
      label: '🟡 A VENCER',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    };
  }

  const diffTime = Math.abs(today.getTime() - dueDate.getTime());
  const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    status: 'VENCIDO',
    daysOverdue,
    label: `🔴 VENCIDO (${daysOverdue}d)`,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  };
}
