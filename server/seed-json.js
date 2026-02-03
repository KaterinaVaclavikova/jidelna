const db = require('./src/db/jsonDb');
const bcrypt = require('bcrypt');

async function main() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const existingAdmin = await db.user.findUnique({ where: { username: 'admin' } });

    if (!existingAdmin) {
        await db.user.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                role: 'ADMIN_USER',
                isFirstLogin: false
            }
        });
        console.log("Created User Admin");
    }

    const mealAdminPass = await bcrypt.hash('jidlo123', 10);
    const existingMealAdmin = await db.user.findUnique({ where: { username: 'jidelna' } });

    if (!existingMealAdmin) {
        await db.user.create({
            data: {
                username: 'jidelna',
                password: mealAdminPass,
                role: 'ADMIN_MEAL',
                isFirstLogin: false
            }
        });
        console.log("Created Meal Admin");
    }

    console.log("Seeding done.");
}

main();
