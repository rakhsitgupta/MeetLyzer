import React, { useEffect, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
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
      workloads[group.assignee] = 0;
    }
    workloads[group.assignee] += group.tasks.length;
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
    datasets: [{
      label: 'Tasks per Assignee',
      data: [],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    }],
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

  useEffect(() => {
    if (actionGroups && actionGroups.length > 0) {
      const workloads = getAssigneeWorkload(actionGroups);
      setWorkloadData({
            labels: Object.keys(workloads),
            datasets: [{
          label: 'Tasks per Assignee',
              data: Object.values(workloads),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        }],
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
    }
  }, [actionGroups]);

  return (
    <div className="analytics-dashboard">
      <h2>Analytics Dashboard</h2>
      <div className="charts-container">
        <div className="chart">
          <h3>Assignee Workload</h3>
          <Bar data={workloadData} />
        </div>
        <div className="chart">
          <h3>Action Item Completion</h3>
          <Doughnut data={completionData} />
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 