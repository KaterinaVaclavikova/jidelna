import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import MealAdminPage from './pages/AdminMeal/MealAdminPage';

// Placeholder Pages
const Dashboard = () => {
    const { user } = useAuth();
    if (user.role === 'ADMIN_MEAL') return <Navigate to="/admin/meals" />;
    if (user.role === 'ADMIN_USER') return <Navigate to="/admin/users" />;
    return <Navigate to="/menu" />;
};

import UserAdminPage from './pages/AdminUser/UserAdminPage';
import ReportsPage from './pages/AdminReports/ReportsPage';
import MenuPage from './pages/Employee/MenuPage';
import OrdersPage from './pages/Employee/OrdersPage';
import ChangePasswordPage from './pages/ChangePasswordPage';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route element={<Layout />}>
                        <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/change-password" element={<ChangePasswordPage />} />
                        </Route>

                        {/* Employee Routes */}
                        <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
                            <Route path="/menu" element={<MenuPage />} />
                            <Route path="/my-orders" element={<OrdersPage />} />
                        </Route>

                        {/* Meal Admin Routes (Also accessible by User Admin for Exports) */}
                        <Route element={<ProtectedRoute allowedRoles={['ADMIN_MEAL', 'ADMIN_USER']} />}>
                            <Route path="/admin/meals" element={<MealAdminPage />} />
                        </Route>

                        {/* User Admin Routes */}
                        <Route element={<ProtectedRoute allowedRoles={['ADMIN_USER']} />}>
                            <Route path="/admin/users" element={<UserAdminPage />} />
                            <Route path="/admin/reports" element={<ReportsPage />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}


export default App;
