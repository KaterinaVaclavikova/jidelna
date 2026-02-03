import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { getAdminViewDates, getDayName, formatDate } from '../../utils/dateUtils';
import AddMealModal from '../../components/AddMealModal';
import { useAuth } from '../../context/AuthContext';

const MealAdminPage = () => {
    const [meals, setMeals] = useState([]);
    const [dates, setDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null); // For modal
    const { user } = useAuth();

    const loadMeals = async () => {
        try {
            // Fetch all meals? Or range? Simplest is all for now or range logic.
            // Let's fetch all and filter in frontend for simplicity of this prototype.
            const { data } = await api.get('/meals');
            setMeals(data);
        } catch (err) {
            console.error("Failed to load meals", err);
        }
    };

    useEffect(() => {
        setDates(getAdminViewDates());
        loadMeals();
    }, []);

    const handleExport = async (dateObj) => {
        try {
            const dateStr = formatDate(dateObj);
            const response = await api.get(`/orders/export?date=${dateStr}`, { responseType: 'blob' });

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `objednavky_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('Chyba při stahování exportu');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Opravdu smazat toto jídlo?')) {
            try {
                await api.delete(`/meals/${id}`);
                loadMeals();
            } catch (err) {
                alert('Chyba při mazání');
            }
        }
    };

    const getMealsForDate = (dateObj) => {
        const dateStr = formatDate(dateObj);
        // creating date from string might introduce timezone issues if not careful.
        // Backend stores as DateTime. 
        // Best approach: compare YYYY-MM-DD parts.
        return meals.filter(m => m.date.startsWith(dateStr));
    };

    const isMealAdmin = user?.role === 'ADMIN_MEAL';

    return (
        <div>
            <h2 style={{ marginBottom: '2rem' }}>Správa Jídelníčku</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {dates.map(date => {
                    const dayName = getDayName(date);
                    const isWeekend = dayName === 'Sobota' || dayName === 'Neděle';
                    const dayMeals = getMealsForDate(date);

                    return (
                        <div key={date.toISOString()} className="card" style={{ opacity: isWeekend ? 0.6 : 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{dayName} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>{date.toLocaleDateString('cs-CZ')}</span></h3>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                        onClick={() => handleExport(date)}
                                        title="Stáhnout denní přehled"
                                    >
                                        ⬇ Export
                                    </button>
                                    {isMealAdmin && (
                                        <button
                                            className="btn btn-primary"
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                            onClick={() => setSelectedDate(date)}
                                        >
                                            + Přidat
                                        </button>
                                    )}
                                </div>
                            </div>

                            {dayMeals.length === 0 ? (
                                <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Žádná jídla</p>
                            ) : (
                                <ul style={{ listStyle: 'none' }}>
                                    {dayMeals.map((meal, index) => (
                                        <li key={meal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '6px' }}>
                                            <div>
                                                <div style={{ fontWeight: '500' }}>
                                                    <span style={{ color: 'var(--primary)', marginRight: '0.5rem', fontWeight: 'bold' }}>{index + 1}.</span>
                                                    {meal.name}
                                                </div>
                                                {meal.price !== null && (
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{meal.price},- Kč</div>
                                                )}
                                            </div>
                                            {isMealAdmin && (
                                                <button
                                                    onClick={() => handleDelete(meal.id)}
                                                    style={{ color: 'var(--danger)', background: 'none', fontSize: '1.2rem', padding: '0 0.5rem' }}
                                                    title="Smazat"
                                                >
                                                    &times;
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedDate && (
                <AddMealModal
                    date={selectedDate}
                    onClose={() => setSelectedDate(null)}
                    onMealAdded={loadMeals}
                />
            )}
        </div>
    );
};

export default MealAdminPage;

