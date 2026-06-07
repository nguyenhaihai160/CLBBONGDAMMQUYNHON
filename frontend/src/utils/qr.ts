export type BankQrSettings = {
  bankBin?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  tuitionQrUrl?: string;
};

export function isImageQrPayload(value?: string | null) {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image');
}

export function buildDynamicPaymentQrUrl(settings: BankQrSettings, amount: number, content: string) {
  const bankBin = String(settings.bankBin || '').trim();
  const bankAccount = String(settings.bankAccountNumber || '').trim();
  const finalAmount = Math.max(0, Math.round(Number(amount || 0)));
  const finalContent = String(content || '').trim().slice(0, 80);
  const accountName = String(settings.bankAccountName || '').trim().slice(0, 80);

  if (!bankBin || !bankAccount || !finalAmount) return '';

  const params = new URLSearchParams({
    amount: String(finalAmount),
    addInfo: finalContent,
  });

  if (accountName) params.set('accountName', accountName);

  return `https://img.vietqr.io/image/${encodeURIComponent(bankBin)}-${encodeURIComponent(bankAccount)}-compact2.png?${params.toString()}`;
}

export function pickQrImage(paymentPayload: string | undefined | null, fallbackUrl?: string) {
  return isImageQrPayload(paymentPayload) ? String(paymentPayload) : (fallbackUrl || '');
}
