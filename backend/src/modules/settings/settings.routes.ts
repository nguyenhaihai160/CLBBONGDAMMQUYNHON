import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';
import { env } from '../../config/env.js';

export const settingsRoutes = Router();
settingsRoutes.use(authenticate);

const settingSchema = z.object({
  academyName: z.string().min(2).max(120).optional(),
  academyShortName: z.string().max(40).optional().nullable(),
  logoUrl: z.string().max(2_000_000).optional().nullable(),
  hotline: z.string().max(30).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  primaryColor: z.string().max(30).optional().nullable(),
  tuitionQrUrl: z.string().max(2_000_000).optional().nullable(),
  bankName: z.string().max(120).optional().nullable(),
  bankBin: z.string().max(30).optional().nullable(),
  bankAccountName: z.string().max(120).optional().nullable(),
  bankAccountNumber: z.string().max(60).optional().nullable(),
  paymentNotePrefix: z.string().max(80).optional().nullable(),
});

const defaultSettings = {
  academyName: 'Football Academy Manager Pro',
  academyShortName: 'FAM Pro',
  logoUrl: '',
  hotline: '',
  address: '',
  primaryColor: '#15803d',
  tuitionQrUrl: '',
  bankName: '',
  bankBin: env.bankBin,
  bankAccountName: env.bankAccountName,
  bankAccountNumber: env.bankAccount,
  paymentNotePrefix: 'HP',
};

type SettingKey = keyof typeof defaultSettings;

async function readSettings() {
  const rows = await prisma.academySetting.findMany();
  const result: Record<string, string> = { ...defaultSettings };
  rows.forEach((row) => {
    result[row.key] = row.value;
  });
  return result;
}

settingsRoutes.get('/academy', async (_req, res, next) => {
  try {
    res.json(await readSettings());
  } catch (error) { next(error); }
});

settingsRoutes.put('/academy', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = settingSchema.parse(req.body);
    const entries = Object.entries(body).filter(([, value]) => value !== undefined) as Array<[SettingKey, string | null]>;

    await prisma.$transaction(entries.map(([key, value]) => prisma.academySetting.upsert({
      where: { key },
      update: { value: value ?? '' },
      create: { key, value: value ?? '' },
    })));

    res.json(await readSettings());
  } catch (error) { next(error); }
});
