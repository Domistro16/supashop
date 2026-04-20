/**
 * Multi-branch service.
 *
 * A "branch" is just a Shop with `parentShopId` set. When a branch is created,
 * we clone the HQ's product catalog into the branch at zero stock so each
 * branch tracks its own inventory while inheriting HQ's names/prices at that
 * moment. Subsequent HQ price changes do NOT auto-propagate — call
 * `syncPricesFromHQ` to replicate them when needed.
 *
 * Stock movement between branches goes through the StockTransfer flow:
 * pending → completed (atomically decrements source, increments destination).
 */

import { prisma } from '@server/prisma';

export async function getRootShopId(shopId: string): Promise<string> {
    const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { parentShopId: true, id: true },
    });
    if (!shop) throw new Error('Shop not found');
    return shop.parentShopId || shop.id;
}

export async function createBranch(args: {
    parentShopId: string;
    name: string;
    branchLabel?: string;
    address?: string;
    ownerId: string;
}): Promise<{ branchId: string; clonedProducts: number }> {
    const parent = await prisma.shop.findUnique({
        where: { id: args.parentShopId },
        include: { products: true },
    });
    if (!parent) throw new Error('Parent shop not found');
    if (parent.parentShopId) {
        throw new Error('Cannot create a branch under another branch');
    }
    if (parent.ownerId !== args.ownerId) {
        throw new Error('Only the HQ owner can create branches');
    }

    return prisma.$transaction(async (tx) => {
        const branch = await tx.shop.create({
            data: {
                name: args.name,
                branchLabel: args.branchLabel,
                address: args.address,
                ownerId: args.ownerId,
                parentShopId: parent.id,
                onboardingCompleted: true,
                primaryColor: parent.primaryColor,
                loyaltyEnabled: parent.loyaltyEnabled,
                loyaltyPointsPerNaira: parent.loyaltyPointsPerNaira,
                loyaltyNairaPerPoint: parent.loyaltyNairaPerPoint,
                loyaltySilverThreshold: parent.loyaltySilverThreshold,
                loyaltyGoldThreshold: parent.loyaltyGoldThreshold,
                loyaltyPlatinumThreshold: parent.loyaltyPlatinumThreshold,
            },
        });

        // Clone products into the new branch at 0 stock.
        if (parent.products.length > 0) {
            await tx.product.createMany({
                data: parent.products.map((p) => ({
                    shopId: branch.id,
                    name: p.name,
                    stock: 0,
                    price: p.price,
                    costPrice: p.costPrice,
                    categoryName: p.categoryName,
                    barcode: p.barcode,
                    isFeatured: p.isFeatured,
                    originProductId: p.id,
                })),
            });
        }

        return { branchId: branch.id, clonedProducts: parent.products.length };
    });
}

export async function syncPricesFromHQ(branchId: string): Promise<{ updated: number }> {
    const branch = await prisma.shop.findUnique({
        where: { id: branchId },
        select: { parentShopId: true },
    });
    if (!branch?.parentShopId) throw new Error('Shop is not a branch');

    const clones = await prisma.product.findMany({
        where: { shopId: branchId, originProductId: { not: null } },
        select: { id: true, originProductId: true, price: true, costPrice: true, name: true },
    });

    const originIds = clones.map((c) => c.originProductId!).filter(Boolean);
    const origins = await prisma.product.findMany({
        where: { id: { in: originIds } },
        select: { id: true, price: true, costPrice: true, name: true },
    });
    const originMap = new Map(origins.map((o) => [o.id, o]));

    let updated = 0;
    for (const clone of clones) {
        const origin = originMap.get(clone.originProductId!);
        if (!origin) continue;
        const needsUpdate =
            String(clone.price) !== String(origin.price) ||
            String(clone.costPrice ?? '') !== String(origin.costPrice ?? '') ||
            clone.name !== origin.name;
        if (needsUpdate) {
            await prisma.product.update({
                where: { id: clone.id },
                data: {
                    price: origin.price,
                    costPrice: origin.costPrice,
                    name: origin.name,
                },
            });
            updated++;
        }
    }
    return { updated };
}

export async function getBranches(rootShopId: string) {
    return prisma.shop.findMany({
        where: { parentShopId: rootShopId },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            name: true,
            branchLabel: true,
            address: true,
            createdAt: true,
            _count: { select: { products: true, sales: true } },
        },
    });
}

type TransferItemInput = { fromProductId: string; quantity: number };

export async function createStockTransfer(args: {
    fromShopId: string;
    toShopId: string;
    items: TransferItemInput[];
    notes?: string;
    createdByUserId: string;
}): Promise<string> {
    if (args.fromShopId === args.toShopId) {
        throw new Error('Source and destination must be different shops');
    }
    if (args.items.length === 0) throw new Error('Transfer must include at least one item');
    for (const item of args.items) {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            throw new Error('Each item must have a positive integer quantity');
        }
    }

    // Both shops must share a root (same org).
    const [fromRoot, toRoot] = await Promise.all([
        getRootShopId(args.fromShopId),
        getRootShopId(args.toShopId),
    ]);
    if (fromRoot !== toRoot) {
        throw new Error('Transfers can only happen within the same organization');
    }

    const fromProducts = await prisma.product.findMany({
        where: { id: { in: args.items.map((i) => i.fromProductId) }, shopId: args.fromShopId },
        select: { id: true, name: true, barcode: true, stock: true, originProductId: true },
    });
    if (fromProducts.length !== args.items.length) {
        throw new Error('One or more source products were not found in the source shop');
    }

    for (const item of args.items) {
        const p = fromProducts.find((fp) => fp.id === item.fromProductId)!;
        if (p.stock < item.quantity) {
            throw new Error(`Not enough stock for ${p.name} (have ${p.stock}, need ${item.quantity})`);
        }
    }

    // Resolve matching destination products (by origin lineage, then barcode, then name)
    const destProducts = await prisma.product.findMany({
        where: { shopId: args.toShopId },
        select: { id: true, name: true, barcode: true, originProductId: true },
    });

    const itemsWithTarget = args.items.map((item) => {
        const src = fromProducts.find((fp) => fp.id === item.fromProductId)!;
        const srcLineage = src.originProductId || src.id;
        const target =
            destProducts.find(
                (d) => (d.originProductId || d.id) === srcLineage
            ) ||
            (src.barcode ? destProducts.find((d) => d.barcode === src.barcode) : undefined) ||
            destProducts.find((d) => d.name === src.name);
        return { ...item, toProductId: target?.id || null };
    });

    const transfer = await prisma.stockTransfer.create({
        data: {
            fromShopId: args.fromShopId,
            toShopId: args.toShopId,
            notes: args.notes,
            createdByUserId: args.createdByUserId,
            status: 'pending',
            items: {
                create: itemsWithTarget.map((i) => ({
                    fromProductId: i.fromProductId,
                    toProductId: i.toProductId,
                    quantity: i.quantity,
                })),
            },
        },
    });

    return transfer.id;
}

export async function completeStockTransfer(transferId: string): Promise<void> {
    const transfer = await prisma.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
    });
    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status !== 'pending') {
        throw new Error(`Transfer is already ${transfer.status}`);
    }

    await prisma.$transaction(async (tx) => {
        for (const item of transfer.items) {
            const src = await tx.product.findUnique({
                where: { id: item.fromProductId },
                select: { id: true, stock: true, name: true, price: true, costPrice: true, categoryName: true, barcode: true, isFeatured: true },
            });
            if (!src) throw new Error('Source product missing');
            if (src.stock < item.quantity) {
                throw new Error(`Not enough stock for ${src.name} at source`);
            }

            await tx.product.update({
                where: { id: src.id },
                data: { stock: { decrement: item.quantity } },
            });

            let toProductId = item.toProductId;
            if (!toProductId) {
                // Auto-create a matching product at destination as a clone of the source.
                const created = await tx.product.create({
                    data: {
                        shopId: transfer.toShopId,
                        name: src.name,
                        stock: 0,
                        price: src.price,
                        costPrice: src.costPrice,
                        categoryName: src.categoryName,
                        barcode: src.barcode,
                        isFeatured: src.isFeatured,
                        originProductId: src.id,
                    },
                });
                toProductId = created.id;
                await tx.stockTransferItem.update({
                    where: { id: item.id },
                    data: { toProductId: created.id },
                });
            }

            await tx.product.update({
                where: { id: toProductId },
                data: { stock: { increment: item.quantity } },
            });
        }

        await tx.stockTransfer.update({
            where: { id: transferId },
            data: { status: 'completed', completedAt: new Date() },
        });
    });
}

export async function cancelStockTransfer(transferId: string): Promise<void> {
    const t = await prisma.stockTransfer.findUnique({ where: { id: transferId }, select: { status: true } });
    if (!t) throw new Error('Transfer not found');
    if (t.status !== 'pending') throw new Error('Only pending transfers can be cancelled');
    await prisma.stockTransfer.update({
        where: { id: transferId },
        data: { status: 'cancelled', completedAt: new Date() },
    });
}

export async function listTransfersForShop(shopId: string) {
    return prisma.stockTransfer.findMany({
        where: { OR: [{ fromShopId: shopId }, { toShopId: shopId }] },
        orderBy: { createdAt: 'desc' },
        include: {
            fromShop: { select: { id: true, name: true, branchLabel: true } },
            toShop: { select: { id: true, name: true, branchLabel: true } },
            items: true,
        },
        take: 50,
    });
}

export async function getConsolidatedReport(rootShopId: string) {
    const root = await prisma.shop.findUnique({
        where: { id: rootShopId },
        select: { id: true, name: true, parentShopId: true },
    });
    if (!root) throw new Error('Shop not found');
    if (root.parentShopId) throw new Error('Consolidated report only runs on the root shop');

    const shopIds = [
        root.id,
        ...(await prisma.shop.findMany({
            where: { parentShopId: root.id },
            select: { id: true },
        })).map((s) => s.id),
    ];

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const perShop = await Promise.all(
        shopIds.map(async (id) => {
            const [shop, salesAgg, productCount, outstanding] = await Promise.all([
                prisma.shop.findUnique({
                    where: { id },
                    select: { id: true, name: true, branchLabel: true, parentShopId: true },
                }),
                prisma.sale.aggregate({
                    where: { shopId: id, createdAt: { gte: thirtyDaysAgo } },
                    _sum: { totalAmount: true },
                    _count: true,
                }),
                prisma.product.count({ where: { shopId: id } }),
                prisma.sale.aggregate({
                    where: { shopId: id, paymentStatus: 'pending' },
                    _sum: { outstandingBalance: true },
                }),
            ]);
            return {
                shopId: id,
                name: shop!.name,
                branchLabel: shop!.branchLabel,
                isHQ: !shop!.parentShopId,
                revenue30d: Number(salesAgg._sum.totalAmount || 0),
                sales30d: salesAgg._count,
                productCount,
                outstandingBalance: Number(outstanding._sum.outstandingBalance || 0),
            };
        })
    );

    const totals = perShop.reduce(
        (acc, s) => ({
            revenue30d: acc.revenue30d + s.revenue30d,
            sales30d: acc.sales30d + s.sales30d,
            outstandingBalance: acc.outstandingBalance + s.outstandingBalance,
        }),
        { revenue30d: 0, sales30d: 0, outstandingBalance: 0 }
    );

    return { perShop, totals };
}
