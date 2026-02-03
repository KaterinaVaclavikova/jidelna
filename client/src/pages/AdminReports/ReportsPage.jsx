import { useState } from 'react';
import api from '../../utils/api';

const ReportsPage = () => {
    // Default to PREVIOUS month YYYY-MM
    const getPreviousMonth = () => {
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const [selectedMonth, setSelectedMonth] = useState(getPreviousMonth());

    // Explicit error state for download failures
    const [error, setError] = useState('');

    const handleExport = async () => {
        setError('');
        try {
            const response = await api.get(`/orders/stats/monthly/export?date=${selectedMonth}`, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `prehled_obedu_${selectedMonth}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            // Helper to read blob error response
            if (err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
                try {
                    const json = JSON.parse(text);
                    setError(json.error);
                } catch (e) {
                    setError('Chyba při stahování exportu.');
                }
            } else {
                setError(err.response?.data?.error || 'Chyba při stahování exportu.');
            }
        }
    };

    return (
        <div className="container">
            <h2 className="mb-2">Měsíční přehledy (Podklady pro mzdy)</h2>

            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
                <p style={{ color: 'var(--text-dim)' }}>
                    Zde si můžete stáhnout CSV soubor s přehledem obědů pro mzdovou účtárnu.
                    Přehledy jsou dostupné pouze pro ukončené měsíce.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontWeight: 'bold' }}>Vyberte měsíc:</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            max={getPreviousMonth()}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="input"
                            style={{ maxWidth: '200px' }}
                        />
                    </div>

                    <button
                        onClick={handleExport}
                        className="btn btn-primary"
                        style={{ alignSelf: 'flex-end' }}
                    >
                        ⬇ Stáhnout CSV
                    </button>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}
            </div>
        </div>
    );
};

export default ReportsPage;
