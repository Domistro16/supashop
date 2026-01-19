
import { prisma } from '../src/lib/prisma';
import 'dotenv/config';

async function main() {
    const shops = await prisma.shop.findMany({
        select: {
            id: true,
            name: true,
            isStorefrontEnabled: true
        }
    });
    console.log('Shops status:', JSON.stringify(shops, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
