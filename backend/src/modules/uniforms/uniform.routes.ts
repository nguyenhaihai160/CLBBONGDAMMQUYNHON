// @ts-nocheck
import { Router } from 'express';
import { InventoryTransactionType, Role, UniformOrderStatus, UniformType } from '@prisma/client';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';

export const uniformRoutes = Router();
uniformRoutes.use(authenticate, authorize(Role.ADMIN, Role.COACH));

const productSchema = z.object({
  name: z.string().min(2),
  type: z.nativeEnum(UniformType),
  size: z.string().min(1).default('Không size'),
  sku: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  stock: z.number().int().nonnegative(),
  minStock: z.number().int().nonnegative().default(3),
});

const stockSchema = z.object({
  type: z.enum(['IMPORT', 'EXPORT', 'ADJUST', 'RESTORE']),
  quantity: z.number().int().nonnegative(),
  note: z.string().optional(),
});

function productStatus(product: { stock: number; minStock: number; isActive: boolean }) {
  if (!product.isActive) return 'Đã xóa/ẩn';
  if (product.stock <= 0) return 'Hết hàng';
  if (product.stock <= product.minStock) return 'Sắp hết';
  return 'Còn hàng';
}

function withInventoryStatus<T extends { stock: number; minStock: number; isActive: boolean }>(product: T) {
  return { ...product, inventoryStatus: productStatus(product) };
}

async function createInventoryLog(input: {
  productId: string;
  type: InventoryTransactionType;
  quantityChange: number;
  beforeStock: number;
  afterStock: number;
  note?: string;
  createdById?: string;
}, tx: any = prisma) {
  return tx.inventoryTransaction.create({ data: input });
}

uniformRoutes.get('/products', async (req, res, next) => {
  try {
    const includeInactive = req.user?.role === Role.ADMIN && req.query.includeInactive === 'true';
    const products = await prisma.uniformProduct.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: { _count: { select: { orderItems: true, transactions: true } } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(products.map(withInventoryStatus));
  } catch (error) { next(error); }
});

uniformRoutes.get('/summary', authorize(Role.ADMIN), async (_req, res, next) => {
  try {
    const products = await prisma.uniformProduct.findMany({ where: { isActive: true } });
    const totalItems = products.reduce((sum, p) => sum + p.stock, 0);
    const totalValue = products.reduce((sum, p) => sum + Number(p.price) * p.stock, 0);
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
    const outOfStock = products.filter((p) => p.stock <= 0).length;
    const byType = products.reduce<Record<string, { stock: number; value: number; count: number }>>((acc, p) => {
      acc[p.type] ||= { stock: 0, value: 0, count: 0 };
      acc[p.type].stock += p.stock;
      acc[p.type].value += Number(p.price) * p.stock;
      acc[p.type].count += 1;
      return acc;
    }, {});
    res.json({ totalItems, totalValue, lowStock, outOfStock, byType });
  } catch (error) { next(error); }
});

uniformRoutes.get('/transactions', authorize(Role.ADMIN), async (_req, res, next) => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      include: { product: true, createdBy: { select: { id: true, fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(transactions);
  } catch (error) { next(error); }
});

uniformRoutes.post('/products', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = productSchema.parse(req.body);
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.uniformProduct.create({ data: { ...body, size: body.size || 'Không size' } });
      await createInventoryLog({
        productId: created.id,
        type: InventoryTransactionType.IMPORT,
        quantityChange: created.stock,
        beforeStock: 0,
        afterStock: created.stock,
        note: 'Tạo mới hàng tồn',
        createdById: req.user?.id,
      }, tx);
      return created;
    });
    res.status(201).json(withInventoryStatus(product));
  } catch (error) { next(error); }
});

uniformRoutes.put('/products/:id', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = productSchema.partial().parse(req.body);
    const current = await prisma.uniformProduct.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy hàng tồn' });
    const updated = await prisma.uniformProduct.update({ where: { id: req.params.id }, data: body });
    res.json(withInventoryStatus(updated));
  } catch (error) { next(error); }
});

uniformRoutes.patch('/products/:id/stock', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const body = stockSchema.parse(req.body);
    const current = await prisma.uniformProduct.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy hàng tồn' });

    let afterStock = current.stock;
    let quantityChange = 0;
    let transactionType: InventoryTransactionType = body.type as InventoryTransactionType;

    if (body.type === 'IMPORT') {
      afterStock = current.stock + body.quantity;
      quantityChange = body.quantity;
    } else if (body.type === 'EXPORT') {
      if (current.stock < body.quantity) return res.status(400).json({ message: 'Số lượng xuất lớn hơn tồn kho hiện tại' });
      afterStock = current.stock - body.quantity;
      quantityChange = -body.quantity;
    } else if (body.type === 'ADJUST') {
      afterStock = body.quantity;
      quantityChange = afterStock - current.stock;
    } else if (body.type === 'RESTORE') {
      afterStock = current.stock;
      quantityChange = 0;
      transactionType = InventoryTransactionType.RESTORE;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.uniformProduct.update({
        where: { id: current.id },
        data: { stock: afterStock, isActive: body.type === 'RESTORE' ? true : undefined, deletedAt: body.type === 'RESTORE' ? null : undefined },
      });
      await createInventoryLog({
        productId: current.id,
        type: transactionType,
        quantityChange,
        beforeStock: current.stock,
        afterStock,
        note: body.note,
        createdById: req.user?.id,
      }, tx);
      return product;
    });

    res.json(withInventoryStatus(updated));
  } catch (error) { next(error); }
});

uniformRoutes.delete('/products/:id', authorize(Role.ADMIN), async (req, res, next) => {
  try {
    const current = await prisma.uniformProduct.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Không tìm thấy hàng tồn' });

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.uniformProduct.update({ where: { id: current.id }, data: { isActive: false, deletedAt: new Date(), stock: 0 } });
      await createInventoryLog({
        productId: current.id,
        type: InventoryTransactionType.DELETE,
        quantityChange: -current.stock,
        beforeStock: current.stock,
        afterStock: 0,
        note: typeof req.query.reason === 'string' ? req.query.reason : 'Admin xóa hàng tồn',
        createdById: req.user?.id,
      }, tx);
      await tx.auditLog.create({
        data: { userId: req.user?.id, action: 'DELETE_INVENTORY_PRODUCT', entity: 'UniformProduct', entityId: current.id, metadata: { name: current.name, size: current.size, beforeStock: current.stock } },
      });
      return product;
    });

    res.json(withInventoryStatus(updated));
  } catch (error) { next(error); }
});

const orderSchema = z.object({
  studentId: z.string(),
  status: z.nativeEnum(UniformOrderStatus).default(UniformOrderStatus.PAID),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
});

uniformRoutes.post('/orders', async (req, res, next) => {
  try {
    const body = orderSchema.parse(req.body);
    const products = await prisma.uniformProduct.findMany({ where: { id: { in: body.items.map(i => i.productId) }, isActive: true } });
    const productMap = new Map(products.map(p => [p.id, p]));

    const lines = body.items.map(item => {
      const product = productMap.get(item.productId);
      if (!product) throw new Error('Sản phẩm không tồn tại hoặc đã bị xóa khỏi kho');
      if (product.stock < item.quantity) throw new Error(`Không đủ tồn kho: ${product.name} size ${product.size}`);
      const unitPrice = Number(product.price);
      return { ...item, unitPrice, subtotal: unitPrice * item.quantity, beforeStock: product.stock, afterStock: product.stock - item.quantity };
    });

    const totalAmount = lines.reduce((sum, item) => sum + item.subtotal, 0);

    const order = await prisma.$transaction(async tx => {
      const created = await tx.uniformOrder.create({
        data: {
          studentId: body.studentId,
          totalAmount,
          status: body.status,
          paidAt: body.status === 'PAID' ? new Date() : null,
          createdById: req.user?.id,
          items: { create: lines.map(item => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal })) },
        },
        include: { items: { include: { product: true } }, student: true },
      });

      for (const item of lines) {
        await tx.uniformProduct.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
        await createInventoryLog({
          productId: item.productId,
          type: InventoryTransactionType.SALE,
          quantityChange: -item.quantity,
          beforeStock: item.beforeStock,
          afterStock: item.afterStock,
          note: `Bán cho học viên ${created.student.fullName}`,
          createdById: req.user?.id,
        }, tx);
      }

      return created;
    });

    res.status(201).json(order);
  } catch (error) { next(error); }
});

uniformRoutes.get('/orders', async (req, res, next) => {
  try {
    const where: any = {};
    if (req.user?.role === Role.COACH) where.student = { class: { coachId: req.user.id } };
    const orders = await prisma.uniformOrder.findMany({ where, include: { student: { include: { class: true } }, items: { include: { product: true } }, createdBy: { select: { fullName: true, role: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(orders);
  } catch (error) { next(error); }
});
