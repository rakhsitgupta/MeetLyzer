import React, { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export const getCompletionStats = (actionGroups) => {
  const stats = JSON.parse(localStorage.getItem('completionStats') || '{"completed": 0, "total": 0}');
  const completed = actionGroups.reduce((acc, group) => 
    acc + group.tasks.filter(task => task.completed).length, 0);
  const total = actionGroups.reduce((acc, group) => 
    acc + group.tasks.length, 0);
  
  stats.completed = completed;
  stats.total = total;
  localStorage.setItem('completionStats', JSON.stringify(stats));
  return stats;
};

export const getAssigneeWorkload = (actionGroups) => {
  const workloads = {};
  actionGroups.forEach(group => {
    if (!workloads[group.assignee]) {
      workloads[group.assignee] = {
        total: 0,
        completed: 0,
        pending: 0
      };
    }
    workloads[group.assignee].total += group.tasks.length;
    workloads[group.assignee].completed += group.tasks.filter(task => task.completed).length;
    workloads[group.assignee].pending = workloads[group.assignee].total - workloads[group.assignee].completed;
  });
  return workloads;
};

export const getMeetingFrequency = () => {
  return JSON.parse(localStorage.getItem('meetingFrequency') || '[]');
};

export const updateMeetingFrequency = (date) => {
  const frequency = getMeetingFrequency();
  frequency.push(date);
  localStorage.setItem('meetingFrequency', JSON.stringify(frequency));
};

export const updateCompletionStats = (actionGroups) => {
  const stats = getCompletionStats(actionGroups);
  localStorage.setItem('completionStats', JSON.stringify(stats));
};

const AnalyticsDashboard = ({ actionGroups }) => {
  const [workloadData, setWorkloadData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Completed Tasks',
        data: [],
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'Pending Tasks',
        data: [],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      }
    ],
  });

  const [completionData, setCompletionData] = useState({
    labels: ['Completed', 'Pending'],
    datasets: [{
      data: [0, 0],
      backgroundColor: [
        'rgba(75, 192, 192, 0.5)',
        'rgba(255, 99, 132, 0.5)',
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 99, 132, 1)',
      ],
      borderWidth: 1,
    }],
  });

  const [meetingFrequencyData, setMeetingFrequencyData] = useState({
    labels: [],
    datasets: [{
      label: 'Meetings per Day',
      data: [],
      fill: false,
      borderColor: 'rgba(54, 162, 235, 1)',
      tension: 0.1
    }]
  });

  useEffect(() => {
    if (actionGroups && actionGroups.length > 0) {
      const workloads = getAssigneeWorkload(actionGroups);
      setWorkloadData({
        labels: Object.keys(workloads),
        datasets: [
          {
            label: 'Completed Tasks',
            data: Object.values(workloads).map(w => w.completed),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
          {
            label: 'Pending Tasks',
            data: Object.values(workloads).map(w => w.pending),
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          }
        ],
      });

      const stats = getCompletionStats(actionGroups);
      setCompletionData({
        labels: ['Completed', 'Pending'],
        datasets: [{
          data: [stats.completed, stats.total - stats.completed],
          backgroundColor: [
            'rgba(75, 192, 192, 0.5)',
            'rgba(255, 99, 132, 0.5)',
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderWidth: 1,
        }],
      });

      // Process meeting frequency data
      const frequency = getMeetingFrequency();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const meetingsPerDay = last7Days.map(date => 
        frequency.filter(d => String(d).startsWith(date)).length
      );

      setMeetingFrequencyData({
        labels: last7Days.map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })),
        datasets: [{
          label: 'Meetings per Day',
          data: meetingsPerDay,
          fill: false,
          borderColor: 'rgba(54, 162, 235, 1)',
          tension: 0.1
        }]
      });
    }
  }, [actionGroups]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e2e8f0',
          font: {
            size: 14,
            weight: 'bold'
          },
          padding: 20
        }
      },
      title: {
        display: true,
        color: '#e2e8f0',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#e2e8f0',
          font: {
            size: 12
          },
          padding: 10
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#e2e8f0',
          font: {
            size: 12
          },
          padding: 10
        }
      }
    }
  };

  return (
    <div className="analytics-dashboard" style={{
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto',
      color: '#e2e8f0',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%)'
    }}>
      <h2 style={{
        fontSize: '2.5rem',
        marginBottom: '2.5rem',
        color: '#a3aed6',
        textAlign: 'center',
        fontWeight: 'bold',
        textShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>Analytics Dashboard</h2>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: 'rgba(30,41,59,0.7)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)',
          height: '400px'
        }}>
          <h3 style={{ 
            color: '#a3aed6', 
            marginBottom: '1.5rem',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>Assignee Workload</h3>
          <div style={{ height: '300px' }}>
            <Bar data={workloadData} options={chartOptions} />
          </div>
        </div>
        
        <div style={{
          background: 'rgba(30,41,59,0.7)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)',
          height: '400px'
        }}>
          <h3 style={{ 
            color: '#a3aed6', 
            marginBottom: '1.5rem',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>Action Item Completion</h3>
          <div style={{ height: '300px' }}>
            <Doughnut data={completionData} options={chartOptions} />
          </div>
        </div>
        
        <div style={{
          background: 'rgba(30,41,59,0.7)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)',
          height: '400px'
        }}>
          <h3 style={{ 
            color: '#a3aed6', 
            marginBottom: '1.5rem',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>Meeting Frequency (Last 7 Days)</h3>
          <div style={{ height: '300px' }}>
            <Line data={meetingFrequencyData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(30,41,59,0.7)',
        borderRadius: '16px',
        padding: '2rem',
        marginTop: '2rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(8px)'
      }}>
        <h3 style={{ 
          color: '#a3aed6', 
          marginBottom: '1.5rem',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>Key Metrics</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{
            background: 'rgba(45,55,72,0.7)',
            padding: '1.5rem',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s',
            cursor: 'pointer',
            ':hover': {
              transform: 'translateY(-5px)'
            }
          }}>
            <h4 style={{ 
              color: '#a3aed6', 
              marginBottom: '1rem',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}>Total Tasks</h4>
            <p style={{ 
              fontSize: '2rem', 
              color: '#e2e8f0',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>{completionData.datasets[0].data.reduce((a, b) => a + b, 0)}</p>
          </div>
          <div style={{
            background: 'rgba(45,55,72,0.7)',
            padding: '1.5rem',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s',
            cursor: 'pointer'
          }}>
            <h4 style={{ 
              color: '#a3aed6', 
              marginBottom: '1rem',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}>Completed Tasks</h4>
            <p style={{ 
              fontSize: '2rem', 
              color: '#e2e8f0',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>{completionData.datasets[0].data[0]}</p>
          </div>
          <div style={{
            background: 'rgba(45,55,72,0.7)',
            padding: '1.5rem',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.2s',
            cursor: 'pointer'
          }}>
            <h4 style={{ 
              color: '#a3aed6', 
              marginBottom: '1rem',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}>Completion Rate</h4>
            <p style={{ 
              fontSize: '2rem', 
              color: '#e2e8f0',
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              {completionData.datasets[0].data.reduce((a, b) => a + b, 0) > 0
                ? `${Math.round((completionData.datasets[0].data[0] / completionData.datasets[0].data.reduce((a, b) => a + b, 0)) * 100)}%`
                : '0%'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 