export function generateCode(prefix = "", length = 6): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return prefix ? `${prefix}${code}` : code;
}

export function makeCode(prefix = "", length = 6): string {
  return generateCode(prefix, length);
}

export function normalizeDateOnly(input?: string | Date | null): Date {
  const date = input ? new Date(input) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function buildPaymentQrPayload(data: any): string {
  const bankCode = data?.bankCode || data?.bank || "";
  const accountNumber = data?.accountNumber || data?.account || "";
  const amount = data?.amount || 0;
  const content = data?.content || data?.description || data?.note || "Thanh toan hoc phi";

  return JSON.stringify({
    bankCode,
    accountNumber,
    amount,
    content
  });
}

export default generateCode;
