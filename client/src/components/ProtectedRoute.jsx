import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="container">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.log('Access Denied:', { allowedRoles, userRole: user.role });
        return <div className="container">Access Denied. You do not have permission to view this page.</div>;
    }

    return <Outlet />;
};

export default ProtectedRoute;
