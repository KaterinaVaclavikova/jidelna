import { useState, useEffect } from 'react';
import api from '../../utils/api';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const { data } = await api.get('/orders/my-orders');
            setOrders(data);
        } catch (err) {
            console.error("Failed to load orders", err);
        }
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
                loadOrders();
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
            if (!window.confirm('Je po termínu. Chcete dát jídlo do burzy? (Pokud si ho nikdo nevezme, zaplatíte ho).')) return;

            try {
                await api.post(`/orders/${order.id}/exchange`);
                alert('Vloženo do burzy');
                loadOrders();
            } catch (err) {
                alert(err.response?.data?.error || 'Chyba při vkládání do burzy');
            }
        }
    };

    return (
        <div className="container">
            <h2 className="mb-2">Moje Objednávky</h2>

            {orders.length === 0 ? (
                <div className="card">
                    <p style={{ textAlign: 'center', color: 'var(--text-dim)' }}>Nemáte žádné aktivní objednávky.</p>
                </div>
            ) : (
                <div className="card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Datum</th>
                                <th>Jídlo</th>
                                <th>Cena</th>
                                <th>Stav</th>
                                <th>Akce</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => {
                                const afterDeadline = isAfterDeadline(order.date);
                                return (
                                    <tr key={order.id}>
                                        <td>{new Date(order.date).toLocaleDateString('cs-CZ')}</td>
                                        <td>{order.meal ? order.meal.name : 'Neznámé jídlo'}</td>
                                        <td>
                                            {order.meal && order.meal.price !== null
                                                ? `${order.meal.price},- Kč`
                                                : '-'}
                                        </td>
                                        <td>
                                            {order.inExchange ? (
                                                <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>V burze</span>
                                            ) : (
                                                <span style={{ color: 'var(--success)' }}>Objednáno</span>
                                            )}
                                        </td>
                                        <td>
                                            {order.inExchange ? (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Čeká na převzetí</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(order)}
                                                    className={`btn ${afterDeadline ? (isAfterExchangeDeadline(order.date) ? 'btn-secondary' : 'btn-warning') : 'btn-danger'}`}
                                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem', cursor: afterDeadline && isAfterExchangeDeadline(order.date) ? 'not-allowed' : 'pointer', opacity: afterDeadline && isAfterExchangeDeadline(order.date) ? 0.6 : 1 }}
                                                    disabled={afterDeadline && isAfterExchangeDeadline(order.date)}
                                                >
                                                    {afterDeadline ? (isAfterExchangeDeadline(order.date) ? 'Nelze (po 12:00)' : 'Do burzy') : 'Odhlásit'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default OrdersPage;
