const parseSummary = (summary) => {
  console.log('parseSummary input:', summary);
  console.log('parseSummary type:', typeof summary);
  
  // Handle null/undefined
  if (!summary) {
    console.log('Summary is null/undefined, returning empty object');
    return { overview: '', metrics: '', decisions: '' };
  }

  // Handle object case
  if (typeof summary === 'object') {
    console.log('Summary is an object, processing object format');
    try {
      const result = {
        overview: '',
        metrics: '',
        decisions: ''
      };

      if (summary.overview) {
        result.overview = Array.isArray(summary.overview) 
          ? summary.overview.join('\n') 
          : String(summary.overview);
      }

      if (summary.metrics) {
        result.metrics = Array.isArray(summary.metrics)
          ? summary.metrics.join('\n')
          : String(summary.metrics);
      }

      if (summary.decisions) {
        result.decisions = Array.isArray(summary.decisions)
          ? summary.decisions.join('\n')
          : String(summary.decisions);
      }

      console.log('Processed object result:', result);
      return result;
    } catch (error) {
      console.error('Error processing object summary:', error);
      return { overview: '', metrics: '', decisions: '' };
    }
  }

  // Handle string case
  try {
    console.log('Summary is a string, processing string format');
    const summaryText = String(summary);
    const sections = summaryText.split('\n\n');
    const result = {
      overview: '',
      metrics: '',
      decisions: ''
    };

    sections.forEach(section => {
      const lowerSection = section.toLowerCase();
      if (lowerSection.includes('overview:')) {
        result.overview = section.replace(/overview:/i, '').trim();
      } else if (lowerSection.includes('metrics:')) {
        result.metrics = section.replace(/metrics:/i, '').trim();
      } else if (lowerSection.includes('decisions:')) {
        result.decisions = section.replace(/decisions:/i, '').trim();
      }
    });

    console.log('Processed string result:', result);
    return result;
  } catch (error) {
    console.error('Error processing string summary:', error);
    return { overview: '', metrics: '', decisions: '' };
  }
}; 