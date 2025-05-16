import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import AutoResizeTextarea from './components/AutoResizeTextarea';
import SummaryChart from './components/SummaryChart';
import QuillEditor from './components/QuillEditor';
import './App.css';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import AnalyticsDashboard from './components/AnalyticsDashboard';

const emptyActionItem = { task: '', assignee: '', deadline: '', priority: '', dependencies: '' };

function parseSummary(summary) {
  // Handle null/undefined
  if (!summary) {
    return {
      meetingSummary: '',
      keyDecisions: '',
      actionItems: [],
      tags: []
    };
  }

  // If summary is an object, convert it to a string format
  if (typeof summary === 'object') {
    const sections = [];
    
    if (summary.overview) {
      sections.push('Meeting Summary:');
      const overviewItems = Array.isArray(summary.overview) ? summary.overview : [summary.overview];
      overviewItems.forEach(item => {
        // Remove HTML tags and clean up whitespace
        const cleanItem = item.replace(/<[^>]*>/g, '').trim();
        if (cleanItem) sections.push(`- ${cleanItem}`);
      });
    }
    
    if (summary.decisions) {
      sections.push('\nKey Decisions:');
      const decisionItems = Array.isArray(summary.decisions) ? summary.decisions : [summary.decisions];
      decisionItems.forEach(item => {
        // Remove HTML tags and clean up whitespace
        const cleanItem = item.replace(/<[^>]*>/g, '').trim();
        if (cleanItem) sections.push(`- ${cleanItem}`);
      });
    }
    
    if (summary.metrics) {
      sections.push('\nMetrics:');
      const metricItems = Array.isArray(summary.metrics) ? summary.metrics : [summary.metrics];
      metricItems.forEach(item => {
        // Remove HTML tags and clean up whitespace
        const cleanItem = item.replace(/<[^>]*>/g, '').trim();
        if (cleanItem) sections.push(`- ${cleanItem}`);
      });
    }

    summary = sections.join('\n');
  }

  // Ensure summary is a string and remove HTML tags
  const summaryText = String(summary).replace(/<[^>]*>/g, '');
  
  // Remove leading/trailing spaces and extra newlines
  const cleanedSummary = summaryText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line) // Remove empty lines
    .join('\n');
  
  // Parse summary into sections
  const sections = {
    meetingSummary: '',
    keyDecisions: '',
    actionItems: [],
    tags: []
  };

  // Regexes for sections
  const meetingSummaryMatch = cleanedSummary.match(/Meeting Summary[\s\S]*?([\-•].*?)(?=\n\s*Key Decisions|\n\s*Action Items|\n\s*Tags|$)/i);
  const keyDecisionsMatch = cleanedSummary.match(/Key Decisions[\s\S]*?([\-•].*?)(?=\n\s*Action Items|\n\s*Tags|$)/i);
  const actionItemsMatch = cleanedSummary.match(/Action Items[\s\S]*?(\|.*?\|)(?=\n\s*Tags|$)/is);
  const tagsMatch = cleanedSummary.match(/Tags[\s\S]*?([#\w,\s]+)/i);

  if (meetingSummaryMatch) {
    sections.meetingSummary = meetingSummaryMatch[1]
      .trim()
      .split(/\n[\-•]/)
      .map(s => s.replace(/^\s*[\-•]\s*/, '').trim())
      .filter(Boolean);
  }
  if (keyDecisionsMatch) {
    sections.keyDecisions = keyDecisionsMatch[1]
      .trim()
      .split(/\n[\-•]/)
      .map(s => s.replace(/^\s*[\-•]\s*/, '').trim())
      .filter(Boolean);
  }
  if (actionItemsMatch) {
    // Parse markdown table
    const lines = actionItemsMatch[1].split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 2) {
      const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
      const rows = lines.slice(2).map(row => row.split('|').map(cell => cell.trim()).filter(Boolean));
      sections.actionItems = rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] || ''])));
      sections.actionHeaders = headers;
    }
  }
  if (tagsMatch) {
    // Split by # or comma
    const tags = tagsMatch[1].split(/[#\s,]+/).map(t => t.trim()).filter(Boolean);
    sections.tags = tags;
  }

  return sections;
}

const heroImg = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSOq9rY9Z1OkEvl8BreTbfrauf4NyG5bYOvuQ&s";
const heroSvg = "https://assets-global.website-files.com/5e9aa66fd3886c1ecf5b4b8d/63e3e2e2e2e2e2e2e2e2e2e2_undraw_online_meeting_re_4qia.svg";

// Helper to format date for Google Calendar link
function formatGoogleCalendarDate(dateStr) {
  if (!dateStr) return '';
  // Try to parse as YYYY-MM-DD or similar
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  // Format as YYYYMMDD (all-day event)
  return date.toISOString().replace(/[-:]/g, '').split('T')[0];
}

function getGoogleCalendarUrl(task, assignee) {
  const title = encodeURIComponent(task.task || 'Meeting Task');
  const details = encodeURIComponent(`Assigned to: ${assignee}\nPriority: ${task.priority || ''}\nDependencies: ${task.dependencies || ''}`);
  const start = formatGoogleCalendarDate(task.deadline);
  // If no deadline, leave date blank
  let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}`;
  if (start) url += `&dates=${start}/${start}`;
  url += `&details=${details}`;
  return url;
}

function DashboardPage() {
  const [overview, setOverview] = useState('');
  const [metrics, setMetrics] = useState('');
  const [decisions, setDecisions] = useState('');
  const [actionGroups, setActionGroups] = useState([
    { assignee: '', tasks: [{ id: Date.now(), task: '', deadline: '', priority: '', dependencies: '', completed: false }] }
  ]);
  const [nextMeeting, setNextMeeting] = useState({ date: '', time: '', location: '', agenda: '', attendees: '' });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [collapse, setCollapse] = useState({
    meetingSummary: false,
    keyDecisions: false,
    actionItems: false,
    tags: false
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState(0);
  const [validationError, setValidationError] = useState('');
  const [taskErrors, setTaskErrors] = useState({});
  const summaryRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [summarySuggestions, setSummarySuggestions] = useState('');
  const [summarySuggestLoading, setSummarySuggestLoading] = useState(false);
  const [summarySuggestError, setSummarySuggestError] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Check for duplicate tasks in a group
  const hasDuplicateTaskInGroup = (group, currentTaskId, taskName) => {
    if (!taskName.trim()) return false;
    return group.tasks.some(task => 
      task.id !== currentTaskId && 
      task.task.trim().toLowerCase() === taskName.trim().toLowerCase()
    );
  };

  // Add/remove assignee
  const addAssignee = () => setActionGroups([...actionGroups, { 
    assignee: '', 
    tasks: [{ id: Date.now(), task: '', deadline: '', priority: '', dependencies: '', completed: false }] 
  }]);
  
  const removeAssignee = idx => setActionGroups(actionGroups.length > 1 ? actionGroups.filter((_, i) => i !== idx) : actionGroups);

  // Change assignee name
  const handleAssigneeChange = (idx, value) => {
    const updated = [...actionGroups];
    updated[idx].assignee = value;
    setActionGroups(updated);
  };

  // Add/remove task for an assignee
  const addTask = (groupIdx) => {
    const updated = [...actionGroups];
    updated[groupIdx].tasks.push({
      id: Date.now() + Math.random(),
      task: '',
      deadline: '',
      priority: '',
      dependencies: '',
      completed: false
    });
    setActionGroups(updated);
  };

  const removeTask = (groupIdx, taskIdx) => {
    const updated = [...actionGroups];
    updated[groupIdx].tasks = updated[groupIdx].tasks.filter((_, i) => i !== taskIdx);
    setActionGroups(updated);
    // Clear any errors for this task
    const taskId = updated[groupIdx].tasks[taskIdx]?.id;
    if (taskId) {
      setTaskErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[taskId];
        return newErrors;
      });
    }
  };

  // Change task field
  const handleTaskChange = (groupIdx, taskIdx, field, value) => {
    const updated = [...actionGroups];
    const task = updated[groupIdx].tasks[taskIdx];
    if (field === 'completed') {
      task.completed = value;
    } else {
      task[field] = value;
    }

    // Check for duplicates when task name changes
    if (field === 'task') {
      const isDuplicate = hasDuplicateTaskInGroup(updated[groupIdx], task.id, value);
      setTaskErrors(prev => ({
        ...prev,
        [task.id]: isDuplicate ? 'This task is already assigned to this person' : null
      }));
    }

    setActionGroups(updated);
  };

  // Add file to each task
  const handleTaskFileChange = (groupIdx, taskIdx, file) => {
    const updated = [...actionGroups];
    updated[groupIdx].tasks[taskIdx].attachment = file;
    setActionGroups(updated);
  };

  // Validation
  const validateActionGroups = () => {
    // Check for empty assignee names and task names
    for (let group of actionGroups) {
      if (!group.assignee) return false;
      for (let task of group.tasks) {
        if (!task.task) return false;
      }
    }
    // Check for any task-level errors
    return Object.values(taskErrors).every(error => !error);
  };

  // Returns true if any assignee has duplicate task names (case-insensitive, ignoring empty)
  const hasDuplicateTasks = (groups) => {
    for (let group of groups) {
      const seen = new Set();
      for (let task of group.tasks) {
        const name = task.task.trim().toLowerCase();
        if (!name) continue;
        if (seen.has(name)) return true;
        seen.add(name);
      }
    }
    return false;
  };

  // Generate summary
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSummary(null);
    
    if (!validateActionGroups()) {
      setValidationError('Each assignee must have a name and each task must have a task name.');
      setLoading(false);
      return;
    }

    // Check for any task-level errors
    if (Object.values(taskErrors).some(error => error)) {
      setValidationError('Please fix all duplicate tasks before generating the summary.');
      setLoading(false);
      return;
    }

    setValidationError('');
    // Generate summary
    let summaryObj = {};
    if (overview) summaryObj.overview = overview.split('\n').map(line => line.trim()).filter(Boolean);
    if (metrics) summaryObj.metrics = metrics.split('\n').map(line => line.trim()).filter(Boolean);
    if (decisions) summaryObj.decisions = decisions.split('\n').map(line => line.trim()).filter(Boolean);
    summaryObj.actionGroups = actionGroups.filter(g => g.assignee && g.tasks.some(t => t.task));
    if (nextMeeting && (nextMeeting.date || nextMeeting.time || nextMeeting.location || nextMeeting.agenda || nextMeeting.attendees)) {
      summaryObj.nextMeeting = [];
      if (nextMeeting.date) summaryObj.nextMeeting.push(`Date: ${nextMeeting.date}`);
      if (nextMeeting.time) summaryObj.nextMeeting.push(`Time: ${nextMeeting.time}`);
      if (nextMeeting.location) summaryObj.nextMeeting.push(`Location: ${nextMeeting.location}`);
      if (nextMeeting.agenda) summaryObj.nextMeeting.push(`Agenda: ${nextMeeting.agenda}`);
      if (nextMeeting.attendees) summaryObj.nextMeeting.push(`Attendees: ${nextMeeting.attendees}`);
    }
    setSummary(summaryObj);
    setShowModal(true);
    setLoading(false);
  };

  // Generate email templates
  const handleGenerateEmails = () => {
    if (!validateActionGroups()) {
      setValidationError('Each assignee must have a name and each task must have a task name.');
      return;
    }
    if (hasDuplicateTasks(actionGroups)) {
      setValidationError('No assignee can have the same task assigned twice.');
      return;
    }
    setValidationError('');
    const templates = actionGroups.filter(g => g.assignee).map(group => {
      let email = `Dear ${group.assignee},

I hope this email finds you well. Following our recent meeting, I wanted to share your assigned action items and their details.

📋 Your Action Items:
${group.tasks.map((task, idx) => {
  let taskDetails = [];
  if (task.deadline) taskDetails.push(`📅 Deadline: ${task.deadline}`);
  if (task.priority) taskDetails.push(`⭐ Priority: ${task.priority}`);
  if (task.dependencies) taskDetails.push(`🔗 Dependencies: ${task.dependencies}`);
  
  return `${idx + 1}. ${task.task}
${taskDetails.length > 0 ? '   ' + taskDetails.join('\n   ') : ''}`;
}).join('\n\n')}

${group.tasks.some(t => t.attachment) ? '\n📎 Attachments:\n' + group.tasks
  .filter(t => t.attachment)
  .map(t => `- ${t.attachment.name}`)
  .join('\n') : ''}

Please review these items and let me know if you have any questions or need clarification on any of the tasks.

Best regards,
[Your Name]`;
      return { assignee: group.assignee, email };
    });
    setEmailTemplates(templates);
    setSelectedAssignee(0);
    setShowEmailModal(true);
  };

  // Live assignee task count summary
  const assigneeTaskCounts = actionGroups.reduce((acc, group) => {
    if (group.assignee) {
      acc[group.assignee] = group.tasks.filter(t => t.task).length;
    }
    return acc;
  }, {});

  // Animation variants for form fields
  const fieldVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.12 * i, type: 'spring', stiffness: 60 } })
  };

  const closeModal = () => setShowModal(false);

  // Parse summary into sections for modal
  const parsed = summary ? parseSummary(summary) : {};
  console.log('summary:', summary);
  console.log('parsed:', parsed);

  const toggleCollapse = (section) => setCollapse(c => ({ ...c, [section]: !c[section] }));

  // Export summary modal as PDF
  const exportSummaryAsPDF = async () => {
    if (!summary) return;
    
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 40;
    let y = margin;
    
    // Add title
    pdf.setFontSize(24);
    pdf.setTextColor(44, 62, 80);
    pdf.text('Meeting Summary', margin, y);
    y += 40;

    // Add overview section
    if (summary.overview && summary.overview.length > 0) {
      pdf.setFontSize(16);
      pdf.setTextColor(52, 152, 219);
      pdf.text('📝 Overview', margin, y);
      y += 25;

      pdf.setFontSize(12);
      pdf.setTextColor(44, 62, 80);
      summary.overview.forEach(item => {
        const lines = pdf.splitTextToSize(`• ${item}`, pageWidth - (2 * margin));
        pdf.text(lines, margin, y);
        y += 20 * lines.length;
      });
      y += 20;
    }

    // Add metrics section
    if (summary.metrics && summary.metrics.length > 0) {
      pdf.setFontSize(16);
      pdf.setTextColor(52, 152, 219);
      pdf.text('📊 Metrics', margin, y);
      y += 25;

      pdf.setFontSize(12);
      pdf.setTextColor(44, 62, 80);
      summary.metrics.forEach(item => {
        const lines = pdf.splitTextToSize(`• ${item}`, pageWidth - (2 * margin));
        pdf.text(lines, margin, y);
        y += 20 * lines.length;
      });
      y += 20;
    }

    // Add decisions section
    if (summary.decisions && summary.decisions.length > 0) {
      pdf.setFontSize(16);
      pdf.setTextColor(52, 152, 219);
      pdf.text('✅ Decisions', margin, y);
      y += 25;

      pdf.setFontSize(12);
      pdf.setTextColor(44, 62, 80);
      summary.decisions.forEach(item => {
        const lines = pdf.splitTextToSize(`• ${item}`, pageWidth - (2 * margin));
        pdf.text(lines, margin, y);
        y += 20 * lines.length;
      });
      y += 20;
    }

    // Add action items section
    if (summary.actionGroups && summary.actionGroups.length > 0) {
      pdf.setFontSize(16);
      pdf.setTextColor(52, 152, 219);
      pdf.text('🗂️ Action Items', margin, y);
      y += 25;

      summary.actionGroups.forEach(group => {
        if (group.assignee) {
          pdf.setFontSize(14);
          pdf.setTextColor(230, 126, 34);
          pdf.text(`Assignee: ${group.assignee}`, margin, y);
          y += 25;

          // Create table for tasks
          const tableData = group.tasks.map(task => [
            task.task || '',
            task.deadline || '',
            task.priority || '',
            task.dependencies || '',
            task.completed ? 'Yes' : 'No'
          ]);

          pdf.autoTable({
            startY: y,
            head: [['Task', 'Deadline', 'Priority', 'Dependencies', 'Completed']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [52, 152, 219] },
            styles: { fontSize: 10 },
            margin: { left: margin }
          });

          y = pdf.lastAutoTable.finalY + 20;
        }
      });
    }

    // Add next meeting section
    if (summary.nextMeeting && summary.nextMeeting.length > 0) {
      pdf.setFontSize(16);
      pdf.setTextColor(52, 152, 219);
      pdf.text('📅 Next Meeting', margin, y);
      y += 25;

      pdf.setFontSize(12);
      pdf.setTextColor(44, 62, 80);
      summary.nextMeeting.forEach(item => {
        const lines = pdf.splitTextToSize(`• ${item}`, pageWidth - (2 * margin));
        pdf.text(lines, margin, y);
        y += 20 * lines.length;
      });
    }

    // Add suggestions if available
    if (summarySuggestions) {
      if (y > pdf.internal.pageSize.getHeight() - 100) {
        pdf.addPage();
        y = margin;
      }

      pdf.setFontSize(16);
      pdf.setTextColor(52, 152, 219);
      pdf.text('💡 AI Suggestions', margin, y);
      y += 25;

      pdf.setFontSize(12);
      pdf.setTextColor(44, 62, 80);
      const lines = pdf.splitTextToSize(summarySuggestions, pageWidth - (2 * margin));
      pdf.text(lines, margin, y);
    }

    pdf.save('meeting-summary.pdf');
  };

  const handleGetSummarySuggestions = async () => {
    setSummarySuggestLoading(true);
    setSummarySuggestError('');
    setSummarySuggestions('');
    try {
      const res = await axios.post('/suggest-actions', { text: summary });
      setSummarySuggestions(res.data.suggestions);
    } catch (err) {
      setSummarySuggestError('Failed to get suggestions.');
    }
    setSummarySuggestLoading(false);
  };

  return (
    <>
      <div className="card">
      <section className="hero-section">
        <div className="hero-text">
          <motion.h1
            className="hero-heading"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, type: 'spring', stiffness: 60 }}
          >
            <span className="gradient-text">AI-powered Meeting Summary & Action Manager</span>
          </motion.h1>
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Generate professional, structured summaries from your meeting notes with AI.
          </motion.p>
        </div>
        <motion.div
          className="hero-img-wrapper"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.3 }}
        >
            <img src={heroImg} alt="Online Meeting" className="hero-img" />
        </motion.div>
      </section>
      </div>
      <div className="card">
      <main>
        <motion.form
          onSubmit={handleSubmit}
          className="structured-form"
          initial="hidden"
          animate="visible"
        >
            <div className="input-container">
              <label>Meeting Overview</label>
              <QuillEditor
                value={overview}
                onChange={setOverview}
                placeholder="Enter meeting overview..."
              />
            </div>
            <div className="input-container">
              <label>Performance Metrics</label>
              <QuillEditor
                value={metrics}
                onChange={setMetrics}
                placeholder="Enter performance metrics..."
              />
            </div>
            <div className="input-container">
              <label>Decisions Made</label>
              <QuillEditor
                value={decisions}
                onChange={setDecisions}
                placeholder="Enter decisions made..."
              />
            </div>
            <div className="action-items-section">
              <label>Action Items</label>
              {actionGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="action-group-card">
                  <div className="action-group-header">
                    <input
                      className="assignee-input"
                      placeholder="Assignee Name"
                      value={group.assignee}
                      onChange={e => handleAssigneeChange(groupIdx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="remove-btn assignee-remove-btn"
                      onClick={() => removeAssignee(groupIdx)}
                      aria-label="Delete assignee"
                    ></button>
                  </div>
                  <div className="action-items-table-wrapper" style={{overflowX: 'auto'}}>
                    <table className="action-items-table" style={{width: '100%', borderCollapse: 'collapse', background: 'rgba(30,41,59,0.7)', borderRadius: 10}}>
                      <thead>
                        <tr style={{background: 'rgba(45,55,72,0.7)'}}>
                          <th>Task</th>
                          <th>Deadline</th>
                          <th>Priority</th>
                          <th>Dependencies</th>
                          <th>Attachment</th>
                          <th>Completed</th>
                          <th>Add to Calendar</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.tasks.map((task, taskIdx) => (
                          <tr key={task.id}>
                            <td>
                              <input
                                placeholder="Task"
                                value={task.task}
                                onChange={e => handleTaskChange(groupIdx, taskIdx, 'task', e.target.value)}
                                className={taskErrors[task.id] ? 'error-input' : ''}
                                title={taskErrors[task.id] || ''}
                              />
                            </td>
                            <td>
                              <input
                                placeholder="Deadline"
                                value={task.deadline}
                                onChange={e => handleTaskChange(groupIdx, taskIdx, 'deadline', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                placeholder="Priority"
                                value={task.priority}
                                onChange={e => handleTaskChange(groupIdx, taskIdx, 'priority', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                placeholder="Dependencies"
                                value={task.dependencies}
                                onChange={e => handleTaskChange(groupIdx, taskIdx, 'dependencies', e.target.value)}
                              />
                            </td>
                            <td style={{textAlign:'center'}}>
                              <input
                                type="file"
                                onChange={e => handleTaskFileChange(groupIdx, taskIdx, e.target.files[0])}
                                aria-label="Attach file"
                              />
                              {task.attachment && (
                                <div style={{ fontSize: '0.85rem', color: '#a3aed6', marginTop: 4 }}>
                                  {task.attachment.name}
                                </div>
                              )}
                            </td>
                            <td style={{textAlign:'center'}}>
                              <input
                                type="checkbox"
                                checked={!!task.completed}
                                onChange={e => handleTaskChange(groupIdx, taskIdx, 'completed', e.target.checked)}
                                aria-label="Mark task as completed"
                              />
                            </td>
                            <td style={{textAlign:'center'}}>
                              <a
                                href={getGoogleCalendarUrl(task, group.assignee)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="calendar-link"
                                title="Add to Google Calendar"
                              >
                                <span role="img" aria-label="calendar">📅</span>
                              </a>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeTask(groupIdx, taskIdx)}
                                aria-label="Delete task"
                              ></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button type="button" className="add-btn action-add-btn" onClick={() => addTask(groupIdx)} style={{marginTop:'0.7rem', width:'100%'}}>+ Add Task</button>
                  </div>
              </div>
            ))}
              <button type="button" className="add-btn action-add-btn" onClick={addAssignee}>+ Add Assignee</button>
              {/* Live assignee task count summary */}
              {Object.keys(assigneeTaskCounts).length > 0 && (
                <div className="assignee-task-summary">
                  {Object.entries(assigneeTaskCounts).map(([assignee, count]) => (
                    <span key={assignee} className="assignee-task-chip">{assignee}: {count} task{count > 1 ? 's' : ''}</span>
                  ))}
                </div>
              )}
              {validationError && <div className="validation-error">{validationError}</div>}
            </div>
          <motion.div className="input-container" custom={4} variants={fieldVariants}>
            <label>Next Meeting</label>
            <div className="next-meeting-fields">
              <input placeholder="Date" value={nextMeeting.date} onChange={e => setNextMeeting({ ...nextMeeting, date: e.target.value })} />
              <input placeholder="Time" value={nextMeeting.time} onChange={e => setNextMeeting({ ...nextMeeting, time: e.target.value })} />
              <input placeholder="Location" value={nextMeeting.location} onChange={e => setNextMeeting({ ...nextMeeting, location: e.target.value })} />
              <input placeholder="Agenda" value={nextMeeting.agenda} onChange={e => setNextMeeting({ ...nextMeeting, agenda: e.target.value })} />
              <input placeholder="Attendees" value={nextMeeting.attendees} onChange={e => setNextMeeting({ ...nextMeeting, attendees: e.target.value })} />
            </div>
          </motion.div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <motion.button
            type="submit"
            disabled={loading}
            className="submit-btn"
            custom={5}
            variants={fieldVariants}
          >
            {loading ? (
              <span className="spinner"></span>
            ) : 'Generate Summary'}
          </motion.button>
            <button
              type="button"
              className="submit-btn email-btn"
              style={{ background: 'linear-gradient(45deg, #8b5cf6, #3b82f6)' }}
              onClick={handleGenerateEmails}
            >
              Generate Email Templates
            </button>
          </div>
        </motion.form>

        {error && (
          <div className="error">{error}</div>
        )}

        <AnimatePresence>
          {showModal && (
          <motion.div
            className="modal-backdrop"
              style={{backdropFilter: 'blur(6px)', background: 'rgba(10,16,38,0.45)'}}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="modal-content summary-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              ref={summaryRef}
            >
              <button
                className="modal-close"
                onClick={closeModal}
                aria-label="Close modal"
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 22,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '2.1rem',
                  fontWeight: 400,
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'color 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.color = '#fbbf24'}
                onMouseOut={e => e.currentTarget.style.color = '#fff'}
              >
                &times;
              </button>
              <div className="summary-header-modal">
                <h2>Meeting Summary</h2>
                </div>
                <div className="summary-section-modal" style={{whiteSpace: 'normal', fontSize: '1.08rem', color: '#e2e8f0', marginTop: '1.5rem', lineHeight: 1.7}}>
                  {summary ? (
                    <>
                      {summary.overview && (
                        <div style={{marginBottom: '1.1rem'}}>
                          <h3 style={{color: '#a3aed6', marginBottom: '0.2rem', display: 'flex', alignItems: 'center'}}>
                            <span role="img" aria-label="Overview" style={{marginRight: 8}}>📝</span>Overview
                          </h3>
                          <div style={{marginLeft: 24}}>
                            <div dangerouslySetInnerHTML={{ __html: Array.isArray(summary.overview) ? summary.overview.join('<br>') : summary.overview }} />
                          </div>
                        </div>
                      )}
                      {summary.metrics && (
                        <div style={{marginBottom: '1.1rem'}}>
                          <h3 style={{color: '#a3aed6', marginBottom: '0.2rem', display: 'flex', alignItems: 'center'}}>
                            <span role="img" aria-label="Metrics" style={{marginRight: 8}}>📊</span>Metrics
                          </h3>
                          <div style={{marginLeft: 24}}>
                            <div dangerouslySetInnerHTML={{ __html: Array.isArray(summary.metrics) ? summary.metrics.join('<br>') : summary.metrics }} />
                          </div>
                        </div>
                      )}
                      {summary.decisions && (
                        <div style={{marginBottom: '1.1rem'}}>
                          <h3 style={{color: '#a3aed6', marginBottom: '0.2rem', display: 'flex', alignItems: 'center'}}>
                            <span role="img" aria-label="Decisions" style={{marginRight: 8}}>✅</span>Decisions
                          </h3>
                          <div style={{marginLeft: 24}}>
                            <div dangerouslySetInnerHTML={{ __html: Array.isArray(summary.decisions) ? summary.decisions.join('<br>') : summary.decisions }} />
                          </div>
                        </div>
                      )}
                      {summary.actionGroups && summary.actionGroups.length > 0 && (
                        <div style={{marginBottom: '1.5rem'}}>
                          <h3 style={{color: '#a3aed6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center'}}>
                            <span role="img" aria-label="Action Items" style={{marginRight: 8}}>🗂️</span>Action Items
                          </h3>
                          {summary.actionGroups.map((group, groupIdx) => (
                            <div key={groupIdx} style={{marginBottom: '1.2rem'}}>
                              <div style={{fontWeight: 600, color: '#fbbf24', marginBottom: 4}}>{group.assignee}</div>
                              <table style={{width: '100%', background: 'rgba(30,41,59,0.7)', borderRadius: 8, marginBottom: 8, color: '#e2e8f0', fontSize: '1rem'}}>
                                <thead>
                                  <tr style={{background: 'rgba(45,55,72,0.7)'}}>
                                    <th style={{padding: '4px 8px'}}>Task</th>
                                    <th style={{padding: '4px 8px'}}>Deadline</th>
                                    <th style={{padding: '4px 8px'}}>Priority</th>
                                    <th style={{padding: '4px 8px'}}>Dependencies</th>
                                    <th style={{padding: '4px 8px'}}>Completed</th>
                                    <th style={{padding: '4px 8px'}}>Attachment</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.tasks.map((task, taskIdx) => (
                                    <tr key={taskIdx}>
                                      <td style={{padding: '4px 8px'}}>{task.task}</td>
                                      <td style={{padding: '4px 8px'}}>{task.deadline}</td>
                                      <td style={{padding: '4px 8px'}}>{task.priority}</td>
                                      <td style={{padding: '4px 8px'}}>{task.dependencies}</td>
                                      <td style={{padding: '4px 8px', textAlign: 'center'}}>{task.completed ? '✔️' : ''}</td>
                                      <td style={{padding: '4px 8px'}}>{task.attachment ? task.attachment.name : ''}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      )}
                      {summary.nextMeeting && summary.nextMeeting.length > 0 && (
                        <div style={{marginBottom: '1.5rem'}}>
                          <h3 style={{color: '#a3aed6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center'}}>
                            <span role="img" aria-label="Next Meeting" style={{marginRight: 8}}>📅</span>Next Meeting
                          </h3>
                          <ul style={{marginLeft: 24, paddingLeft: 0}}>
                            {summary.nextMeeting.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{color:'#a3aed6'}}>No summary available.</span>
                  )}
                </div>
                <button
                  className="submit-btn"
                  style={{ marginTop: 24, fontSize: '1rem' }}
                  onClick={handleGetSummarySuggestions}
                  disabled={summarySuggestLoading || !summary}
                >
                  {summarySuggestLoading ? 'Getting Suggestions...' : 'Get Suggestions'}
                </button>
                {summarySuggestError && <div style={{ color: '#ef4444', marginTop: 12 }}>{summarySuggestError}</div>}
                {summarySuggestions && (
                  <div style={{ marginTop: 24 }}>
                    <h3 style={{ color: '#e2e8f0' }}>AI Suggestions</h3>
                    <div style={{ background: 'rgba(30,41,59,0.7)', borderRadius: 8, padding: '0.7rem', marginTop: 4, whiteSpace: 'pre-line' }}>{summarySuggestions}</div>
                  </div>
                )}
                <button
                  className="export-pdf-btn"
                  onClick={exportSummaryAsPDF}
                  aria-label="Export summary as PDF"
                  title="Export summary as PDF"
                  style={{
                    marginTop: 24,
                    fontSize: '1.08rem',
                    fontWeight: 600,
                    background: 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(60,60,120,0.12)',
                    padding: '0.7rem 1.6rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s, background 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(60,60,120,0.18)'}
                  onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(60,60,120,0.12)'}
                >
                  <span role="img" aria-label="PDF" style={{fontSize: '1.3em', marginRight: 4}}>🗎</span>
                  Export as PDF
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {showEmailModal && (
            <motion.div
              className="modal-backdrop"
              style={{backdropFilter: 'blur(6px)', background: 'rgba(10,16,38,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="modal-content summary-modal"
                style={{
                  margin: 'auto',
                  maxWidth: 600,
                  width: '100%',
                  borderRadius: 18,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  position: 'relative',
                  minHeight: '400px',
                  maxHeight: '80vh',
                  paddingBottom: '4.5rem',
                  overflow: 'hidden'
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <button className="modal-close" onClick={() => setShowEmailModal(false)}>&times;</button>
                <div className="summary-header-modal">
                  <h2>Email Templates</h2>
                </div>
                {emailTemplates.length === 0 ? (
                  <div style={{color:'#a3aed6', marginTop:'2rem'}}>No assignees with action items found.</div>
                ) : (
                  <>
                    <div style={{display:'flex', gap:'0.5rem', marginBottom:'1.5rem', flexWrap:'wrap'}}>
                      {emailTemplates.map((tpl, idx) => (
                        <button
                          key={tpl.assignee}
                          className={`email-tab-btn${selectedAssignee === idx ? ' active' : ''}`}
                          onClick={() => setSelectedAssignee(idx)}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: selectedAssignee === idx ? 'rgba(59,130,246,0.2)' : 'transparent',
                            color: '#e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.95rem'
                          }}
                        >
                          {tpl.assignee}
                        </button>
                      ))}
                    </div>
                    <div style={{
                      whiteSpace: 'pre-line',
                      background: 'rgba(30,41,59,0.7)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      color: '#e2e8f0',
                      fontSize: '1.05rem',
                      minHeight: '200px',
                      maxHeight: '45vh',
                      overflowY: 'auto',
                      lineHeight: '1.6',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      marginBottom: '1.5rem'
                    }}>
                      {emailTemplates[selectedAssignee]?.email}
                    </div>
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: '1.5rem',
                      display: 'flex',
                      justifyContent: 'center'
                    }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(emailTemplates[selectedAssignee]?.email);
                          alert('Email template copied to clipboard!');
                        }}
                        style={{
                          padding: '0.7rem 1.5rem',
                          borderRadius: '8px',
                          background: 'linear-gradient(45deg, #8b5cf6, #3b82f6)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '1rem',
                          fontWeight: '500',
                          boxShadow: '0 2px 8px rgba(60,60,120,0.12)',
                          transition: 'box-shadow 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(60,60,120,0.18)'}
                        onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(60,60,120,0.12)'}
                      >
                        <span role="img" aria-label="copy">📋</span> Copy to Clipboard
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
</>
);
}

function SettingsPage() {
  return (
    <div className="card" style={{ maxWidth: 600, margin: '2rem auto', padding: '2rem', textAlign: 'center' }}>
      <h2 style={{ color: '#a3aed6' }}>Settings</h2>
      <p style={{ color: '#e2e8f0' }}>Settings page coming soon!</p>
    </div>
  );
}

function TranscriptionPage() {
  const [audioFile, setAudioFile] = useState(null);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [audioSummary, setAudioSummary] = useState('');
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [suggestions, setSuggestions] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  const handleTranscribeAndSummarize = async () => {
    if (!audioFile) return;
    setAudioLoading(true);
    setAudioTranscript('');
    setAudioSummary('');
    setAudioError('');
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      const res = await axios.post('/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAudioTranscript(res.data.transcript);
      setShowModal(true);
      // Optionally, send transcript to Cohere for summary here
      // setAudioSummary(...)
    } catch (err) {
      setAudioError('Transcription failed. Please try again.');
    }
    setAudioLoading(false);
  };

  const handleGetSuggestions = async () => {
    setSuggestLoading(true);
    setSuggestError('');
    setSuggestions('');
    try {
      const res = await axios.post('/suggest-actions', { text: audioTranscript });
      setSuggestions(res.data.suggestions);
    } catch (err) {
      setSuggestError('Failed to get suggestions.');
    }
    setSuggestLoading(false);
  };

  return (
    <div className="card" style={{ maxWidth: 700, margin: '2rem auto', padding: '2rem' }}>
      <h3 style={{ color: '#a3aed6', marginBottom: '1rem' }}>Upload Audio/Video for Summarization</h3>
      <input
        type="file"
        accept="audio/*,video/*"
        onChange={e => setAudioFile(e.target.files[0])}
        aria-label="Upload audio or video file"
      />
      {audioFile && (
        <div style={{ marginTop: 8, color: '#e2e8f0', fontSize: '0.98rem' }}>
          <span>Selected: {audioFile.name}</span>
          <button
            type="button"
            className="submit-btn"
            style={{ marginLeft: 16, padding: '0.4rem 1.2rem', fontSize: '1rem' }}
            onClick={handleTranscribeAndSummarize}
            disabled={audioLoading}
          >
            {audioLoading ? 'Processing...' : 'Transcribe & Summarize'}
          </button>
        </div>
      )}
      {audioError && (
        <div style={{ color: '#ef4444', marginTop: 12 }}>{audioError}</div>
      )}
      {/* Modal for transcript/summary */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content summary-modal" style={{ maxWidth: 600, width: '100%', borderRadius: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', background: 'linear-gradient(135deg, #23294a 0%, #20263a 100%)', padding: '2.5rem 2rem 2rem 2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            <div className="summary-header-modal">
              <h2>Transcript</h2>
            </div>
            <div style={{ color: '#a3aed6', fontSize: '1rem', marginTop: '1.5rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {audioTranscript}
            </div>
            {audioSummary && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ color: '#e2e8f0' }}>Summary</h3>
                <div style={{ background: 'rgba(30,41,59,0.7)', borderRadius: 8, padding: '0.7rem', marginTop: 4 }}>{audioSummary}</div>
              </div>
            )}
            <button
              className="submit-btn"
              style={{ marginTop: 24, fontSize: '1rem' }}
              onClick={handleGetSuggestions}
              disabled={suggestLoading || !audioTranscript}
            >
              {suggestLoading ? 'Getting Suggestions...' : 'Get Suggestions'}
            </button>
            {suggestError && <div style={{ color: '#ef4444', marginTop: 12 }}>{suggestError}</div>}
            {suggestions && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ color: '#e2e8f0' }}>AI Suggestions</h3>
                <div style={{ background: 'rgba(30,41,59,0.7)', borderRadius: 8, padding: '0.7rem', marginTop: 4, whiteSpace: 'pre-line' }}>{suggestions}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <Router>
      <div className={`App${theme === 'dark' ? ' dark-theme' : ' light-theme'}`}>
        <header className="main-header">
          <span className="app-title">Meetlyzer</span>
          <nav className="main-nav">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/analytics" className="nav-link">Analytics</Link>
            <Link to="/transcription" className="nav-link">Transcription</Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsDashboard actionGroups={[]} />} />
          <Route path="/transcription" element={<TranscriptionPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 