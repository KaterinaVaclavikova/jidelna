export const getTwoWeeks = (startDate = new Date()) => {
    const dates = [];
    // Ensure we start from Monday of current week
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(startDate);
    monday.setDate(diff);

    for (let i = 0; i < 14; i++) { // 2 weeks * 7 days
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        dates.push(date);
    }
    return dates;
};

export const getAdminViewDates = (startDate = new Date()) => {
    const dates = [];
    // Start from Tomorrow
    const current = new Date(startDate);
    current.setDate(current.getDate() + 1);

    // Generate 14 days
    for (let i = 0; i < 14; i++) {
        const date = new Date(current);
        date.setDate(current.getDate() + i);
        dates.push(date);
    }
    return dates;
};

export const getEmployeeViewDates = (startDate = new Date()) => {
    const dates = [];
    // Start from Today
    const current = new Date(startDate);

    // Today + 14 days = 15 days total.
    // "Aktuální den a následujících 14 dní"
    for (let i = 0; i < 15; i++) {
        const date = new Date(current);
        date.setDate(current.getDate() + i);
        dates.push(date);
    }
    return dates;
};

export const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

export const getDayName = (date) => {
    const days = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
    return days[date.getDay()];
};
