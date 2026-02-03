const express = require('express');
const db = require('../db/jsonDb');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Get Meals
router.get('/', verifyToken, async (req, res) => {
    try {
        const meals = await db.meal.findMany({ orderBy: { date: 'asc' } });
        res.json(meals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add Meals (Bulk)
router.post('/bulk', verifyToken, requireRole(['ADMIN_MEAL']), async (req, res) => {
    try {
        const { meals } = req.body;

        if (!Array.isArray(meals)) {
            return res.status(400).json({ error: 'Invalid data format.' });
        }

        // Since our JSON adapter is sync-ish for creates, we can loop
        // No transaction needed for file based (it saves on each write, suboptimal but safe enough for prototype)
        for (const m of meals) {
            await db.meal.create({
                data: {
                    name: m.name,
                    price: m.price !== null ? parseFloat(m.price) : null,
                    date: m.date // String is fine for JSON
                }
            });
        }

        res.status(201).json({ message: 'Meals added successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Meal
router.delete('/:id', verifyToken, requireRole(['ADMIN_MEAL']), async (req, res) => {
    try {
        const { id } = req.params;
        // ID from JSON might be number, param is string
        await db.meal.delete({ where: { id: parseFloat(id) } });
        res.json({ message: 'Meal deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
