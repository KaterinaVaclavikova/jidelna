const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/jsonDb'); // Changed from Prisma
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Uses our adapter's "findUnique"
        const user = await db.user.findUnique({ where: { username } });

        if (!user || user.isDeleted) {
            return res.status(400).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, isFirstLogin: user.isFirstLogin },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role, isFirstLogin: user.isFirstLogin } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Register (Only ADMIN_USER can register new users)
router.post('/register', verifyToken, requireRole(['ADMIN_USER']), async (req, res) => {
    try {
        const { username, password, role, firstName, lastName, personalNumber } = req.body;

        const existingUser = await db.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password || 'defaultPassword123', 10);

        const newUser = await db.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || 'EMPLOYEE',
                firstName,
                lastName,
                personalNumber,
                isFirstLogin: true
            }
        });

        res.status(201).json({ message: 'User created successfully', userId: newUser.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Change Password
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const user = await db.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid old password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                isFirstLogin: false
            }
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Get All Users (Admin User only)
router.get('/users', verifyToken, requireRole(['ADMIN_USER']), async (req, res) => {
    try {
        const users = await db.user.findMany();
        // Remove passwords and deleted users
        const safeUsers = users
            .filter(u => !u.isDeleted)
            .map(u => {
                const { password, ...rest } = u;
                return rest;
            });
        res.json(safeUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete User (Admin User only)
router.delete('/users/:id', verifyToken, requireRole(['ADMIN_USER']), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseFloat(id); // JSON DB uses number IDs

        // Prevent self-deletion ??? Or just allow it?
        if (req.user.id === userId) {
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        await db.user.delete({ where: { id: userId } });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
