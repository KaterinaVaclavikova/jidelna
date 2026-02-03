import { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ChangePasswordPage = () => {
    const [formData, setFormData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Nová hesla se neshodují');
            return;
        }

        try {
            await api.post('/auth/change-password', {
                oldPassword: formData.oldPassword,
                newPassword: formData.newPassword
            });
            setSuccess('Heslo úspěšně změněno. Probíhá odhlášení...');
            setTimeout(() => {
                logout();
                navigate('/login');
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Chyba při změně hesla');
        }
    };

    return (
        <div className="container" style={{ maxWidth: '500px' }}>
            <h2 className="mb-2" style={{ textAlign: 'center' }}>Změna Hesla</h2>
            <div className="glass-panel" style={{ padding: '2rem' }}>
                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                        <label className="label">Stávající heslo</label>
                        <input
                            type="password"
                            name="oldPassword"
                            value={formData.oldPassword}
                            onChange={handleChange}
                            required
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="label">Nové heslo (min. 6 znaků)</label>
                        <input
                            type="password"
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            required
                            className="input"
                            minLength={6}
                        />
                    </div>
                    <div>
                        <label className="label">Potvrzení nového hesla</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            className="input"
                            minLength={6}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Změnit heslo
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
