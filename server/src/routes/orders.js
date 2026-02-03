const express = require('express');
const db = require('../db/jsonDb');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Helper to check deadline (midnight before meal date)
const isAfterDeadline = (dateStr) => {
    const deadline = new Date(dateStr);
    deadline.setHours(0, 0, 0, 0);
    return new Date() >= deadline;
};

// Helper to check Exchange deadline (12:00 on the meal date)
const isAfterExchangeDeadline = (dateStr) => {
    const deadline = new Date(dateStr);
    deadline.setHours(12, 0, 0, 0); // 12:00 on the day
    return new Date() >= deadline;
};

// Get My Orders (Limited to Current + Previous Month)
router.get('/my-orders', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Calculate date limit: 1st day of previous month
        const now = new Date();
        const limitDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // Normalize limitDate to string YYYY-MM-DD for comparison if needed, 
        // or compare objects. Our DB dates are "YYYY-MM-DD".
        // String comparison works for ISO dates: "2025-01-01" < "2025-02-01".
        const limitStr = limitDate.toISOString().split('T')[0];

        const orders = await db.order.findMany({
            where: { userId },
            include: { meal: true },
            orderBy: { date: 'asc' }
        });

        const filtered = orders.filter(o => o.date >= limitStr);

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin: Get User History (Full history, meal index only)
router.get('/user-history/:userId', verifyToken, requireRole(['ADMIN_USER', 'ADMIN_MEAL']), async (req, res) => {
    try {
        const userId = parseFloat(req.params.userId);

        // 1. Get all orders for user
        db.load();
        const userOrders = db.data.orders.filter(o => o.userId === userId);

        // 2. Get all meals to determine indices
        // db.load() already called
        const allMeals = db.data.meals;

        // Group meals by date to find index
        // This is a bit inefficient (O(N*M)) but fine for JSON DB scale.
        const mealsByDate = {};
        allMeals.forEach(m => {
            if (!mealsByDate[m.date]) mealsByDate[m.date] = [];
            mealsByDate[m.date].push(m);
        });

        // Ensure meals in each date are sorted by ID or creation order? 
        // The previous "index" logic in Frontend relied on array order.
        // We must ensure consistent ordering. 
        // In jsonDb.create, we push. So array order is creation order.
        // However, if we filtered differently?
        // Let's assume the array order in db.meals is the correct order.
        // But mealsByDate arrays need to preserve that relative order.
        // They do (push order).

        const history = userOrders.map(order => {
            const dateMeals = mealsByDate[order.date] || [];
            // Find index of this order's meal in that day's list
            const mealIndex = dateMeals.findIndex(m => m.id === order.mealId);

            return {
                id: order.id,
                date: order.date,
                mealChoice: mealIndex !== -1 ? mealIndex + 1 : '?', // 1-based index
                inExchange: order.inExchange,
                price: order.price !== undefined ? order.price : null // order doesn't usually store price, meal does. ignoring price as per request "only choice number"
            };
        });

        // Sort by date desc
        history.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Exchange Orders (Available to pick up)
router.get('/exchange', verifyToken, async (req, res) => {
    try {
        // We need to find all orders where inExchange is true
        // adapter findMany might not support custom filter on any field nicely without loading all
        // Loading all orders is fine for prototype
        db.load(); // Ensure loaded
        const allOrders = db.data.orders;
        const exchangeOrders = allOrders.filter(o => o.inExchange === true);

        // Decorate with meal info
        const result = exchangeOrders.map(o => ({
            ...o,
            meal: db.data.meals.find(m => m.id === o.mealId)
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Place Order (Standard)
router.post('/', verifyToken, async (req, res) => {
    try {
        const { mealId } = req.body;
        const userId = req.user.id;

        const meals = await db.meal.findMany();
        const meal = meals.find(m => m.id === mealId);

        if (!meal) {
            return res.status(404).json({ error: 'Meal not found' });
        }

        // Deadline Check
        if (isAfterDeadline(meal.date)) {
            return res.status(400).json({ error: 'Je po termínu pro běžné objednání (půlnoc před dnem jídla).' });
        }

        // Check if already ordered by this user for the same DATE
        // optimization: load orders once
        db.load();
        const existing = db.data.orders.find(o => o.userId === userId && o.date === meal.date);
        if (existing) {
            return res.status(400).json({ error: 'Pro tento den již máte objednané jídlo.' });
        }

        const order = await db.order.create({
            data: {
                userId,
                mealId,
                date: meal.date,
                inExchange: false
            }
        });

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Change Existing Order
router.post('/change', verifyToken, async (req, res) => {
    try {
        const { mealId } = req.body;
        const userId = req.user.id;

        const meals = await db.meal.findMany();
        const meal = meals.find(m => m.id === mealId);

        if (!meal) {
            return res.status(404).json({ error: 'Meal not found' });
        }

        // Deadline Check
        if (isAfterDeadline(meal.date)) {
            return res.status(400).json({ error: 'Je po termínu pro změnu objednávky.' });
        }

        // Find existing order for this date
        db.load();
        const existingOrder = db.data.orders.find(o => o.userId === userId && o.date === meal.date);

        if (!existingOrder) {
            return res.status(404).json({ error: 'Pro tento den nemáte žádnou objednávku ke změně.' });
        }

        // Update the mealId
        // db.data.orders is an array reference
        existingOrder.mealId = mealId;
        // Reset exchange status if it was there? Assume yes.
        existingOrder.inExchange = false;

        db.save();

        res.json({ message: 'Objednávka byla změněna', order: existingOrder });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel Order (Standard) OR Put in Exchange
// We keep DELETE for "Hard Cancel" (before deadline)
// But user calls "Cancel" in UI.
// Strategy:
// IF before deadline -> DELETE
// IF after deadline -> Toggle inExchange (or call separate endpoint?)
// Better to have separate endpoint for Exchange to be explicit in API.
// "Delete" means "I don't want it and I don't pay".
// So DELETE is only valid before deadline.

router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const orderId = parseFloat(id);

        const order = await db.order.findUnique({ where: { id: orderId } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        if (isAfterDeadline(order.date)) {
            return res.status(400).json({ error: 'Nelze zrušit po termínu. Použijte burzu.' });
        }

        await db.order.delete({ where: { id: orderId } });
        res.json({ message: 'Order cancelled' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Put Order in Exchange
router.post('/:id/exchange', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const orderId = parseFloat(id);

        const order = await db.order.findUnique({ where: { id: orderId } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        // NEW: Check Exchange Deadline (12:00 on meal date)
        if (isAfterExchangeDeadline(order.date)) {
            return res.status(400).json({ error: 'Je po 12:00 v den jídla. Nelze vložit do burzy.' });
        }

        // Update inExchange flag
        // We lack a generic update on order in adapter, let's ad-hoc it or assume 'update' works if we added it?
        // We didn't add 'update' to order model in jsonDb... 
        // Let's modify directly via load/save to be safe or add update helper.
        // Direct manipulation for speed:

        db.load();
        const idx = db.data.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
            db.data.orders[idx].inExchange = true;
            db.save();
        }

        res.json({ message: 'Vloženo do burzy' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Claim Order from Exchange
router.post('/:id/claim', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const orderId = parseFloat(id);

        const order = await db.order.findUnique({ where: { id: orderId } });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (!order.inExchange) {
            return res.status(400).json({ error: 'Jídlo není v burze' });
        }

        if (order.userId === userId) {
            return res.status(400).json({ error: 'Nemůžete převzít vlastní jídlo' });
        }

        // Check if user already has meal for this day?
        // Maybe yes, maybe no? Let's allow multiple if they want.

        // Transfer ownership
        db.load();
        const idx = db.data.orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
            db.data.orders[idx].userId = userId;
            db.data.orders[idx].inExchange = false; // No longer in exchange
            db.save();
        }

        res.json({ message: 'Jídlo převzato' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export Daily Orders (CSV)
router.get('/export', verifyToken, requireRole(['ADMIN_USER', 'ADMIN_MEAL']), async (req, res) => {
    try {
        const { date } = req.query; // YYYY-MM-DD
        if (!date) return res.status(400).json({ error: 'Date is required' });

        db.load();

        // 1. Get meals for that date (to determine choice index)
        const dateMeals = db.data.meals.filter(m => m.date === date);
        if (dateMeals.length === 0) {
            return res.send(''); // Empty file
        }

        // Map mealId -> Choice Number (1-based index) & Name
        // We rely on ID order or some deterministic order. 
        // Let's assume the order they are in the array is the choice order.
        const mealMap = {};
        dateMeals.forEach((m, index) => {
            mealMap[m.id] = { number: index + 1, name: m.name };
        });

        // 2. Get orders for that date
        const orders = db.data.orders.filter(o => o.date === date);

        // 3. Enrich with User Info
        const exportData = orders.map(o => {
            const user = db.data.users.find(u => u.id === o.userId);
            const mealInfo = mealMap[o.mealId];

            if (!user || !mealInfo) return null; // Should not happen consistency-wise

            return {
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                personalNumber: user.personalNumber || '',
                mealNumber: mealInfo.number,
                mealName: mealInfo.name,
                username: user.username
            };
        }).filter(item => item !== null);

        // Sort: By Meal Number, then Last Name
        exportData.sort((a, b) => {
            if (a.mealNumber !== b.mealNumber) return a.mealNumber - b.mealNumber;
            return a.lastName.localeCompare(b.lastName, 'cs');
        });

        // Generate CSV
        const header = 'Číslo Volby;Název Jídla;Jméno;Příjmení;Osobní Číslo\n';
        const rows = exportData.map(d =>
            `${d.mealNumber};"${d.mealName}";"${d.firstName}";"${d.lastName}";"${d.personalNumber}"`
        ).join('\n');

        const csvContent = header + rows;

        // Add BOM for Excel utf-8 compatibility
        const bom = '\uFEFF';

        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment(`objednavky_${date}.csv`);
        res.send(bom + csvContent);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Monthly Stats for Payroll (ADMIN_USER only)
router.get('/stats/monthly', verifyToken, requireRole(['ADMIN_USER']), async (req, res) => {
    try {
        const { date } = req.query; // YYYY-MM format expected
        if (!date) return res.status(400).json({ error: 'Date (YYYY-MM) is required' });

        // Validate Past Month
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const requestedDate = new Date(date + '-01');

        if (requestedDate >= currentMonthStart) {
            return res.status(400).json({ error: 'Přehledy jsou dostupné pouze pro ukončené měsíce.' });
        }

        db.load();

        // 1. Get all orders for the month
        // Order date format in DB is YYYY-MM-DD
        const orders = db.data.orders.filter(o => o.date.startsWith(date));

        // 2. Aggregate by user
        const userCounts = {};
        orders.forEach(o => {
            if (!userCounts[o.userId]) userCounts[o.userId] = 0;
            userCounts[o.userId]++;
        });

        // 3. Get all users and map to result
        // We want all users in the report, even if count is 0? 
        // Payroll usually wants everyone or just those with deductions.
        // Let's show all for completeness so they can verify.
        const users = db.data.users;

        const report = users.map(user => {
            return {
                id: user.id,
                personalNumber: user.personalNumber || '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                username: user.username,
                count: userCounts[user.id] || 0
            };
        });

        // Sort by Last Name
        report.sort((a, b) => a.lastName.localeCompare(b.lastName, 'cs'));

        res.json(report);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Monthly Stats Export (CSV)
router.get('/stats/monthly/export', verifyToken, requireRole(['ADMIN_USER']), async (req, res) => {
    try {
        const { date } = req.query; // YYYY-MM
        if (!date) return res.status(400).json({ error: 'Date (YYYY-MM) is required' });

        // Validate Past Month
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const requestedDate = new Date(date + '-01');

        if (requestedDate >= currentMonthStart) {
            return res.status(400).json({ error: 'Přehledy jsou dostupné pouze pro ukončené měsíce.' });
        }

        db.load();

        // Aggregation Logic (Duplicate for now, cleaner to extract if this grows)
        const orders = db.data.orders.filter(o => o.date.startsWith(date));
        const userCounts = {};
        orders.forEach(o => {
            if (!userCounts[o.userId]) userCounts[o.userId] = 0;
            userCounts[o.userId]++;
        });
        const users = db.data.users;
        const report = users.map(user => ({
            personalNumber: user.personalNumber || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            username: user.username,
            count: userCounts[user.id] || 0
        }));
        report.sort((a, b) => a.lastName.localeCompare(b.lastName, 'cs'));

        // Generate CSV
        const header = 'Osobní číslo;Příjmení;Jméno;Login;Počet obědů\n';
        const rows = report.map(d =>
            `"${d.personalNumber}";"${d.lastName}";"${d.firstName}";"${d.username}";${d.count}`
        ).join('\n');

        const csvContent = header + rows;
        const bom = '\uFEFF';

        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment(`prehled_obedu_${date}.csv`);
        res.send(bom + csvContent);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
