import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log("Connecting to DB...");
        const shops = await prisma.shop.findMany();
        console.log("--- SHOPS IN DB ---");
        shops.forEach(s => {
            console.log(`Name: '${s.name}', ID: ${s.id}`);
        });
        console.log("-------------------");

        // Check specific 'supashop'
        const supashop = await prisma.shop.findFirst({
            where: { name: { equals: 'supashop', mode: 'insensitive' } }
        });
        console.log("Search for 'supashop':", supashop ? "FOUND" : "NOT FOUND");

    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        await prisma.$disconnect()
    }
}

main();
