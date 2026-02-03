const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Check if admin exists
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedPassword,
            role: 'ADMIN_USER',
            isFirstLogin: false
        },
    });

    console.log({ admin });

    const mealAdminPass = await bcrypt.hash('jidlo123', 10);
    const mealAdmin = await prisma.user.upsert({
        where: { username: 'jidelna' },
        update: {},
        create: {
            username: 'jidelna',
            password: mealAdminPass,
            role: 'ADMIN_MEAL',
            isFirstLogin: false
        },
    });

    console.log({ mealAdmin });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
