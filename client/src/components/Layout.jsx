import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import logo from '../logo.png';

const Layout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (user?.isFirstLogin && location.pathname !== '/change-password') {
            navigate('/change-password');
        }
    }, [user, location, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            <nav className="navbar">
                <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                        <img src={logo} alt="Logo" style={{ height: '40px' }} />
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)' }}>Firemní Jídelna</span>
                    </Link>
                </div>

                <div className="nav-links" style={{ display: 'flex', gap: '1.5rem', marginRight: 'auto', marginLeft: '2rem' }}>
                    {user && user.role === 'EMPLOYEE' && (
                        <>
                            <Link to="/menu" className="nav-link">Jídelní lístek</Link>
                            <Link to="/my-orders" className="nav-link">Moje Objednávky</Link>
                        </>
                    )}
                    {(user && (user.role === 'ADMIN_MEAL' || user.role === 'ADMIN_USER')) && (
                        <Link to="/admin/meals" className="nav-link">Správa Jídel</Link>
                    )}
                    {user && user.role === 'ADMIN_USER' && (
                        <>
                            <Link to="/admin/users" className="nav-link">Správa Uživatelů</Link>
                            <Link to="/admin/reports" className="nav-link">Přehledy</Link>
                        </>
                    )}
                </div>


                {user && (
                    <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                            {user.username} <span style={{ opacity: 0.7 }}>({user.role})</span>
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Link to="/change-password" className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.85rem' }}>Heslo</Link>
                            <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                                Odhlásit
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            <main className="container">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;

