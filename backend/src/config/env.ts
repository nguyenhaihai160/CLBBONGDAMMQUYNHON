import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  bankBin: process.env.BANK_BIN || '970436',
  bankAccount: process.env.BANK_ACCOUNT || '0123456789',
  bankAccountName: process.env.BANK_ACCOUNT_NAME || 'FOOTBALL ACADEMY',
  zaloAccessToken: process.env.ZALO_ACCESS_TOKEN || '',
  zaloOaId: process.env.ZALO_OA_ID || '',
};
