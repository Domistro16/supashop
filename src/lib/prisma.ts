import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
    prismaConfigVersion: number | undefined
}

// Version number - increment this to force recreation of PrismaClient
const CONFIG_VERSION = 2

// If config version changed, disconnect old client
if (globalForPrisma.prisma && globalForPrisma.prismaConfigVersion !== CONFIG_VERSION) {
    console.log('Prisma config changed, creating new client...')
    globalForPrisma.prisma.$disconnect()
    globalForPrisma.prisma = undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    transactionOptions: {
        maxWait: 10000, // 10 seconds max wait to acquire a transaction
        timeout: 30000, // 30 seconds transaction timeout
        isolationLevel: 'Serializable',
    },
})

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
    globalForPrisma.prismaConfigVersion = CONFIG_VERSION
}
