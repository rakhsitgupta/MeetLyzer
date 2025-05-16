import React from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, ArcElement, Tooltip, Legend);

function getAssigneeWorkloads(actionGroups) {
  const data = {};
  actionGroups.forEach(group => {
    if (group.assignee) {
      data[group.assignee] = (data[group.assignee] || 0) + group.tasks.length;
    }
  });
  return data;
}

function getMeetingFrequency() {
  // Get meeting frequency from localStorage
  const storedFrequency = localStorage.getItem('meetingFrequency');
  if (storedFrequency) {
    return JSON.parse(storedFrequency);
  }
  
  // If no stored data, initialize with zeros
  const initialFrequency = [0, 0, 0, 0, 0, 0, 0];
  localStorage.setItem('meetingFrequency', JSON.stringify(initialFrequency));
  return initialFrequency;
}

// Update meeting frequency when new summary is generated
export function updateMeetingFrequency() {
  const frequency = getMeetingFrequency();
  const today = new Date().getDay(); // 0-6 for Sunday-Saturday
  frequency[today]++;
  localStorage.setItem('meetingFrequency', JSON.stringify(frequency));
}

// Get completion stats from localStorage
function getCompletionStats(actionGroups) {
  const storedStats = localStorage.getItem('completionStats');
  if (storedStats) {
    return JSON.parse(storedStats);
  }
  
  let completed = 0, total = 0;
  actionGroups.forEach(group => {
    group.tasks.forEach(task => {
      if (task.task) {
        total++;
        if (task.completed) completed++;
      }
    });
  });
  
  const stats = { completed, total };
  localStorage.setItem('completionStats', JSON.stringify(stats));
  return stats;
}

// Update completion stats when task status changes
export function updateCompletionStats(completed, total) {
  const stats = { completed, total };
  localStorage.setItem('completionStats', JSON.stringify(stats));
}

const AnalyticsDashboard = ({ actionGroups }) => {
  const workloads = getAssigneeWorkloads(actionGroups);
  const completion = getCompletionStats(actionGroups);
  const meetingFrequency = getMeetingFrequency();

  return (
    <div style={{ maxWidth: 1200, margin: '2rem auto 0 auto', display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center' }}>
      {/* Assignee Workloads */}
      <div style={{ background: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: '1.5rem', minWidth: 280, maxWidth: 340, flex: 1 }}>
        <h3 style={{ color: '#e2e8f0', marginBottom: '1rem', fontWeight: 600 }}>Assignee Workloads</h3>
        <Bar
          data={{
            labels: Object.keys(workloads),
            datasets: [{
              label: 'Tasks Assigned',
              data: Object.values(workloads),
              backgroundColor: '#60a5fa',
              borderRadius: 8,
              barThickness: 28,
            }],
          }}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { weight: 600 } }, title: { display: true, text: 'Assignees', color: '#a3aed6', font: { weight: 600 } } },
              y: { beginAtZero: true, grid: { color: 'rgba(163, 174, 214, 0.1)' }, ticks: { color: '#a3aed6' }, title: { display: true, text: 'Tasks', color: '#a3aed6', font: { weight: 600 } } },
            },
          }}
          height={180}
        />
      </div>
      {/* Completion Rate */}
      <div style={{ background: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: '1.5rem', minWidth: 280, maxWidth: 340, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h3 style={{ color: '#e2e8f0', marginBottom: '1rem', fontWeight: 600 }}>Action Item Completion</h3>
        <Doughnut
          data={{
            labels: ['Completed', 'Incomplete'],
            datasets: [{
              data: [completion.completed, Math.max(0, completion.total - completion.completed)],
              backgroundColor: ['#34d399', '#f87171'],
              borderWidth: 2,
            }],
          }}
          options={{
            plugins: { legend: { labels: { color: '#e2e8f0', font: { weight: 600 } } } },
            cutout: '70%',
          }}
          height={180}
        />
        <div style={{ color: '#a3aed6', marginTop: '1.2rem', fontWeight: 600, fontSize: '1.1rem' }}>
          {completion.total === 0 ? 'No tasks' : `${completion.completed} / ${completion.total} completed`}
        </div>
      </div>
      {/* Meeting Frequency (simulated) */}
      <div style={{ background: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: '1.5rem', minWidth: 280, maxWidth: 340, flex: 1 }}>
        <h3 style={{ color: '#e2e8f0', marginBottom: '1rem', fontWeight: 600 }}>Meeting Frequency (Demo)</h3>
        <div style={{ color: '#a3aed6', fontSize: '0.98rem', marginBottom: '0.5rem' }}>
          This bar graph shows the number of meetings held each day of the week (simulated data).
        </div>
        <Bar
          data={{
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
              label: 'Meetings',
              data: meetingFrequency,
              backgroundColor: '#a78bfa',
              borderRadius: 8,
              barThickness: 28,
            }],
          }}
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { weight: 600 } }, title: { display: true, text: 'Day of Week', color: '#a3aed6', font: { weight: 600 } } },
              y: { beginAtZero: true, grid: { color: 'rgba(163, 174, 214, 0.1)' }, ticks: { color: '#a3aed6' }, title: { display: true, text: 'Meetings', color: '#a3aed6', font: { weight: 600 } } },
            },
          }}
          height={180}
        />
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 