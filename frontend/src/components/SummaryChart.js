import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const getPriorityCounts = (actionItems) => {
  const counts = {};
  actionItems.forEach(item => {
    const priority = item.priority || 'Unspecified';
    counts[priority] = (counts[priority] || 0) + 1;
  });
  return counts;
};

const SummaryChart = ({ actionItems }) => {
  if (!actionItems || actionItems.length === 0) {
    return <div style={{ color: '#a3aed6', marginTop: '2rem' }}>No action items to visualize.</div>;
  }
  const counts = getPriorityCounts(actionItems);
  const data = {
    labels: Object.keys(counts),
    datasets: [
      {
        label: 'Action Items by Priority',
        data: Object.values(counts),
        backgroundColor: [
          '#60a5fa', '#fbbf24', '#f87171', '#34d399', '#a78bfa', '#f472b6', '#facc15'
        ],
        borderRadius: 8,
        barThickness: 40,
      },
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#e2e8f0', font: { weight: 600 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(163, 174, 214, 0.1)' },
        ticks: { color: '#a3aed6' },
      },
    },
  };
  return (
    <div style={{ maxWidth: 600, margin: '2rem auto 0 auto', background: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: '1.5rem' }}>
      <h3 style={{ color: '#e2e8f0', marginBottom: '1rem', fontWeight: 600 }}>Action Items by Priority</h3>
      <Bar data={data} options={options} />
    </div>
  );
};

export default SummaryChart; 