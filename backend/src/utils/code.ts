export function buildStudentCode(count: number) {
  const year = new Date().getFullYear();
  return `FA${year}${String(count + 1).padStart(4, '0')}`;
}

export function normalizeDateOnly(input: string | Date) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function buildPaymentQrPayload(input: {
  bankBin: string;
  bankAccount: string;
  bankAccountName: string;
  amount: number;
  content: string;
}) {
  return buildVietQrImageUrl(input);
}

export function buildVietQrImageUrl(input: {
  bankBin: string;
  bankAccount: string;
  bankAccountName?: string | null;
  amount: number;
  content: string;
}) {
  const bankBin = String(input.bankBin || '').trim();
  const bankAccount = String(input.bankAccount || '').trim();
  const amount = Math.max(0, Math.round(Number(input.amount || 0)));
  const content = String(input.content || '').trim().slice(0, 80);
  const accountName = String(input.bankAccountName || '').trim().slice(0, 80);

  if (!bankBin || !bankAccount || !amount) return '';

  const params = new URLSearchParams({
    amount: String(amount),
    addInfo: content,
  });

  if (accountName) params.set('accountName', accountName);

  return `https://img.vietqr.io/image/${encodeURIComponent(bankBin)}-${encodeURIComponent(bankAccount)}-compact2.png?${params.toString()}`;
}
