import { useState } from 'react';
import api from '../utils/api';
import { formatDate } from '../utils/dateUtils';

const AddMealModal = ({ date, onClose, onMealAdded }) => {
    const [text, setText] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Parse logic: "Název jídla; Cena" per line
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const mealsToAdd = [];

        for (const line of lines) {
            const parts = line.split(';');
            const name = parts[0].trim();
            let price = null;

            if (parts.length > 1 && parts[1].trim() !== '') {
                const priceVal = parseFloat(parts[1].trim());
                if (isNaN(priceVal)) {
                    setError(`Chybná cena na řádku: "${line}"`);
                    return;
                }
                price = priceVal;
            }

            mealsToAdd.push({
                date: formatDate(date),
                name,
                price
            });
        }

        try {
            await api.post('/meals/bulk', { meals: mealsToAdd });
            onMealAdded();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add meals');
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="card" style={{ width: '500px', maxWidth: '90%' }}>
                <h3 style={{ marginBottom: '1rem' }}>Přidat jídla na {date.toLocaleDateString('cs-CZ')}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                    Zadejte jedno jídlo na řádek.<br />
                    Formát: <code>Název jídla; Cena</code><br />
                    Příklad: <code>Svíčková na smetaně; 150</code>
                </p>

                {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={10}
                        style={{ fontFamily: 'monospace', marginBottom: '1rem' }}
                        placeholder="Svíčková; 150&#10;Guláš; 140"
                        autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text)' }}>
                            Zrušit
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Uložit jídla
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMealModal;
