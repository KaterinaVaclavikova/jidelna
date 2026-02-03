import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { getEmployeeViewDates, getDayName, formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

const MenuPage = () => {
    const [meals, setMeals] = useState([]);
    const [dates, setDates] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [exchangeOrders, setExchangeOrders] = useState([]);
    const { user } = useAuth();

    useEffect(() => {
        setDates(getEmployeeViewDates());
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [mealsRes, ordersRes, exchangeRes] = await Promise.all([
                api.get('/meals'),
                api.get('/orders/my-orders'),
                api.get('/orders/exchange')
            ]);
            setMeals(mealsRes.data);
            setMyOrders(ordersRes.data);
            setExchangeOrders(exchangeRes.data);
        } catch (err) {
            console.error("Failed to load data", err);
        }
    };

    const handleOrder = async (meal) => {
        try {
            await api.post('/orders', { mealId: meal.id });
            // alert('Jídlo objednáno!');
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Chyba při objednávání');
        }
    };

    const handleClaim = async (orderId) => {
        if (!window.confirm('Chcete převzít toto jídlo z burzy? (Zaplatíte ho vy)')) return;
        try {
            await api.post(`/orders/${orderId}/claim`);
            // alert('Jídlo převzato z burzy!');
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Chyba při převzetí');
        }
    };

    const isOrdered = (mealId) => {
        return myOrders.some(o => o.mealId === mealId);
    };

    const getMealsForDate = (dateObj) => {
        const dateStr = formatDate(dateObj);
        return meals.filter(m => m.date.startsWith(dateStr));
    };

    // Get exchange orders for a specific meal (that I don't own)
    const getExchangeOffers = (mealId) => {
        return exchangeOrders.filter(o => o.mealId === mealId && o.userId !== user.id);
    };

    // Helper to check deadline (midnight before meal date)
    const isAfterDeadline = (dateStr) => {
        const deadline = new Date(dateStr);
        deadline.setHours(0, 0, 0, 0);
        return new Date() >= deadline;
    };

    // Helper for 12:00 deadline on the day
    const isAfterExchangeDeadline = (dateStr) => {
        const deadline = new Date(dateStr);
        deadline.setHours(12, 0, 0, 0);
        return new Date() >= deadline;
    };

    const handleAction = async (order) => {
        const afterDeadline = isAfterDeadline(order.date);
        const afterExchangeDeadline = isAfterExchangeDeadline(order.date);

        if (!afterDeadline) {
            // Standard Cancel
            if (!window.confirm('Opravdu zrušit tuto objednávku?')) return;
            try {
                await api.delete(`/orders/${order.id}`);
                // alert('Objednávka zrušena');
                loadData();
            } catch (err) {
                alert(err.response?.data?.error || 'Chyba při rušení');
            }
        } else {
            // Exchange Logic
            if (afterExchangeDeadline) {
                alert('Je po 12:00. Již nelze vložit do burzy.');
                return;
            }
            if (order.inExchange) {
                alert('Jídlo již je v burze.');
                return;
            }
            if (!window.confirm('Je po termínu pro zrušení. Chcete dát jídlo do burzy? (Pokud si ho nikdo nevezme, zaplatíte ho).')) return;

            try {
                await api.post(`/orders/${order.id}/exchange`);
                alert('Vloženo do burzy');
                loadData();
            } catch (err) {
                alert(err.response?.data?.error || 'Chyba při vkládání do burzy');
            }
        }
    };

    const handleChangeOrder = async (meal) => {
        if (!window.confirm(`Opravdu chcete změnit objednávku na: ${meal.name}?`)) return;
        try {
            await api.post('/orders/change', { mealId: meal.id });
            // alert('Objednávka změněna!');
            loadData();
        } catch (err) {
            alert(err.response?.data?.error || 'Chyba při změně objednávky');
        }
    };



    return (
        <div>
            <h2 style={{ marginBottom: '2rem' }}>Jídelní lístek</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {dates.map(date => {
                    const dayName = getDayName(date);
                    const isWeekend = dayName === 'Sobota' || dayName === 'Neděle';
                    const dayMeals = getMealsForDate(date);

                    if (isWeekend) return null;

                    return (
                        <div key={date.toISOString()} className="card">
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                {dayName} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>{date.toLocaleDateString('cs-CZ')}</span>
                            </h3>

                            {dayMeals.length === 0 ? (
                                <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Žádná nabídka</p>
                            ) : (
                                <ul style={{ listStyle: 'none' }}>
                                    {dayMeals.map((meal, index) => {
                                        // Find actual order object
                                        const myOrder = myOrders.find(o => o.mealId === meal.id);
                                        const ordered = !!myOrder;
                                        // Check if ANY meal on this date is ordered by me
                                        const dateOrdered = myOrders.some(o => o.date === meal.date);
                                        const exchangeOffers = getExchangeOffers(meal.id);
                                        const afterDeadline = isAfterDeadline(meal.date);

                                        return (
                                            <li key={meal.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '0.5rem',
                                                padding: '0.75rem',
                                                backgroundColor: ordered ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-hover)', // success green hint
                                                borderRadius: '6px',
                                                border: ordered ? '1px solid var(--success)' : '1px solid transparent'
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: '500' }}>
                                                        <span style={{ color: 'var(--primary)', marginRight: '0.5rem', fontWeight: 'bold' }}>{index + 1}.</span>
                                                        {meal.name}
                                                    </div>
                                                    {meal.price !== null && (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Cena: {meal.price},- Kč</div>
                                                    )}
                                                    {exchangeOffers.length > 0 && !ordered && !dateOrdered && (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '0.25rem' }}>
                                                            &#9889; {exchangeOffers.length}x volné v burze
                                                        </div>
                                                    )}
                                                </div>

                                                {ordered ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.9rem' }}>Objednáno</span>

                                                        {!myOrder.inExchange && (
                                                            <button
                                                                onClick={() => handleAction(myOrder)}
                                                                className={`btn ${afterDeadline ? 'btn-warning' : 'btn-danger'}`}
                                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                                title={afterDeadline ? "Do Burzy" : "Zrušit"}
                                                            >
                                                                {afterDeadline ? "Do Burzy" : "Zrušit"}
                                                            </button>
                                                        )}
                                                        {myOrder.inExchange && (
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>(V burze)</span>
                                                        )}
                                                    </div>
                                                ) : (

                                                    // Action Button
                                                    <>
                                                        {dateOrdered ? (
                                                            // If ordered another meal on this day
                                                            // Show Change button if NOT after deadline
                                                            !afterDeadline ? (
                                                                <button
                                                                    onClick={() => handleChangeOrder(meal)}
                                                                    className="btn btn-secondary"
                                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                                >
                                                                    Změna
                                                                </button>
                                                            ) : (
                                                                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontStyle: 'italic' }}>Jiná volba</span>
                                                            )
                                                        ) : (
                                                            !afterDeadline ? (
                                                                <button
                                                                    onClick={() => handleOrder(meal)}
                                                                    className="btn btn-primary"
                                                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem' }}
                                                                >
                                                                    Objednat
                                                                </button>
                                                            ) : (
                                                                // After deadline: Can only take from exchange
                                                                exchangeOffers.length > 0 ? (
                                                                    <button
                                                                        onClick={() => handleClaim(exchangeOffers[0].id)}
                                                                        className="btn btn-warning"
                                                                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem' }}
                                                                    >
                                                                        Vzít z burzy
                                                                    </button>
                                                                ) : (
                                                                    <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Po termínu</span>
                                                                )
                                                            )
                                                        )}
                                                    </>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MenuPage;
