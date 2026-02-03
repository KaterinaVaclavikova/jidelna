const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../../db.json');

class JsonUserArgs {
    constructor() {
        this.data = {
            users: [],
            meals: [],
            orders: []
        };
        this.load();
    }

    load() {
        if (!fs.existsSync(DB_FILE)) {
            this.save();
        } else {
            try {
                const raw = fs.readFileSync(DB_FILE, 'utf-8');
                this.data = JSON.parse(raw);
                // Ensure structure
                if (!this.data.users) this.data.users = [];
                if (!this.data.meals) this.data.meals = [];
                if (!this.data.orders) this.data.orders = [];
            } catch (e) {
                console.error("Failed to load DB, resetting", e);
                this.save();
            }
        }
    }

    save() {
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
    }

    // Generic helpers simulating Prisma-like API
    get user() {
        return {
            findMany: async () => {
                this.load();
                return this.data.users;
            },
            findUnique: async ({ where }) => {
                this.load();
                if (where.id) return this.data.users.find(u => u.id === where.id) || null;
                if (where.username) return this.data.users.find(u => u.username === where.username) || null;
                return null;
            },

            create: async ({ data }) => {
                this.load();
                const newUser = { id: Date.now(), ...data };
                this.data.users.push(newUser);
                this.save();
                return newUser;
            },
            update: async ({ where, data }) => {
                this.load();
                const idx = this.data.users.findIndex(u => u.id === where.id);
                if (idx === -1) throw new Error("User not found");
                this.data.users[idx] = { ...this.data.users[idx], ...data };
                this.save();
                return this.data.users[idx];
            },
            delete: async ({ where }) => {
                this.load();
                const idx = this.data.users.findIndex(u => u.id === where.id);
                if (idx !== -1) {
                    this.data.users[idx] = { ...this.data.users[idx], isDeleted: true };
                }
                this.save();
            }

        };
    }

    get meal() {
        return {
            findMany: async ({ where, orderBy } = {}) => {
                this.load();
                let results = this.data.meals;
                // Simple filtering (start/end date) only if needed, currently returning all is fine for prototype
                // Implementing basic date range if requested.
                if (orderBy) {
                    results.sort((a, b) => new Date(a.date) - new Date(b.date));
                }
                return results;
            },
            create: async ({ data }) => {
                this.load();
                const newMeal = { id: Date.now() + Math.random(), ...data };
                this.data.meals.push(newMeal);
                this.save();
                return newMeal;
            },
            delete: async ({ where }) => {
                this.load();
                this.data.meals = this.data.meals.filter(m => m.id !== where.id);
                this.save();
            }
        };
    }

    get order() {
        return {
            findMany: async ({ where, include, orderBy } = {}) => {
                this.load();
                let results = this.data.orders.filter(o => o.userId === where.userId);

                if (include?.meal) {
                    results = results.map(o => ({
                        ...o,
                        meal: this.data.meals.find(m => m.id === o.mealId)
                    }));
                }
                if (orderBy) {
                    results.sort((a, b) => new Date(a.date) - new Date(b.date));
                }
                return results;
            },
            create: async ({ data }) => {
                this.load();
                // Check if exists?
                const newOrder = { id: Date.now(), ...data };
                this.data.orders.push(newOrder);
                this.save();
                return newOrder;
            },
            findUnique: async ({ where }) => {
                this.load();
                return this.data.orders.find(o => o.id === where.id);
            },
            delete: async ({ where }) => {
                this.load();
                this.data.orders = this.data.orders.filter(o => o.id !== where.id);
                this.save();
            }
        };
    }
}

const db = new JsonUserArgs();
module.exports = db;
