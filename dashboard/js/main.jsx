/**
 * React entry point for the Git Analytics Dashboard
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './AppContext.jsx';
import App from './App.jsx';

// Chart.js registration
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

// Dark mode (prevent flash)
document.documentElement.classList.add('dark');

const root = createRoot(document.getElementById('root'));
root.render(
    <AppProvider>
        <App />
    </AppProvider>
);
