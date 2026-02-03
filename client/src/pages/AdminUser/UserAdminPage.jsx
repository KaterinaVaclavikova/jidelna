import { useState, useEffect } from 'react';
import api from '../../utils/api';

const UserAdminPage = () => {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'EMPLOYEE',
        firstName: '',
        lastName: '',
        personalNumber: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // History Modal State
    const [historyUser, setHistoryUser] = useState(null);
    const [userHistory, setUserHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/auth/users');
            setUsers(response.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await api.post('/auth/register', formData);
            setSuccess('Uživatel úspěšně vytvořen');
            setFormData({
                username: '',
                password: '',
                role: 'EMPLOYEE',
                firstName: '',
                lastName: '',
                personalNumber: ''
            });
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Chyba při vytváření uživatele');
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Opravdu chcete smazat tohoto uživatele?')) return;

        try {
            await api.delete(`/auth/users/${userId}`);
            setSuccess('Uživatel smazán');
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Chyba při mazání uživatele');
        }
    };

    const handleShowHistory = async (user) => {
        setHistoryUser(user);
        try {
            const res = await api.get(`/orders/user-history/${user.id}`);
            setUserHistory(res.data);
            setShowHistory(true);
        } catch (err) {
            alert('Nepodařilo se načíst historii');
        }
    };

    const closeHistory = () => {
        setShowHistory(false);
        setHistoryUser(null);
        setUserHistory([]);
    };

    return (
        <div className="container">
            <h2 className="mb-2">Správa Uživatelů</h2>

            <div className="glass-panel mb-2" style={{ padding: '1.5rem' }}>
                <h3 className="mb-1">Přidat nového uživatele</h3>
                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                    <div>
                        <label className="label">Jméno</label>
                        <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className="input"
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Příjmení</label>
                        <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className="input"
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Osobní číslo</label>
                        <input
                            type="text"
                            name="personalNumber"
                            value={formData.personalNumber}
                            onChange={handleChange}
                            className="input"
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Uživatelské jméno (Login)</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="label">Heslo</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="input"
                            placeholder="Zadejte heslo..."
                        />
                    </div>
                    <div>
                        <label className="label">Role</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="input"
                        >
                            <option value="EMPLOYEE">Zaměstnanec</option>
                            <option value="ADMIN_MEAL">Správce Jídel</option>
                            <option value="ADMIN_USER">Správce Uživatelů</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>Přidat</button>
                </form>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 className="mb-1">Seznam uživatelů</h3>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Osobní číslo</th>
                            <th>Jméno a Příjmení</th>
                            <th>Login</th>
                            <th>Role</th>
                            <th>Akce</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.personalNumber || '-'}</td>
                                <td>{user.firstName} {user.lastName}</td>
                                <td>{user.username}</td>
                                <td>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        backgroundColor: user.role.includes('ADMIN') ? 'rgba(167, 139, 250, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                                        color: user.role.includes('ADMIN') ? '#a78bfa' : '#34d399',
                                        fontSize: '0.85rem'
                                    }}>
                                        {user.role}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                            onClick={() => handleShowHistory(user)}
                                        >
                                            Historie
                                        </button>
                                        <button
                                            className="btn btn-danger"
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                            onClick={() => handleDelete(user.id)}
                                        >
                                            Smazat
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* History Modal */}
            {showHistory && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3>Historie: {historyUser?.username}</h3>
                            <button onClick={closeHistory} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>

                        <p>Celkem objednáno: <strong>{userHistory.length}</strong> jídel</p>

                        <table className="table" style={{ marginTop: '1rem' }}>
                            <thead>
                                <tr>
                                    <th>Datum</th>
                                    <th>Volba č.</th>
                                    <th>Stav</th>
                                </tr>
                            </thead>
                            <tbody>
                                {userHistory.map(h => (
                                    <tr key={h.id}>
                                        <td>{new Date(h.date).toLocaleDateString('cs-CZ')}</td>
                                        <td style={{ fontWeight: 'bold' }}>{h.mealChoice}</td>
                                        <td>
                                            {h.inExchange ? (
                                                <span style={{ color: 'var(--warning)' }}>V burze</span>
                                            ) : (
                                                <span style={{ color: 'var(--success)' }}>Odebráno</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserAdminPage;
