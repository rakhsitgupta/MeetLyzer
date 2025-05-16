import React, { forwardRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const QuillEditor = forwardRef(({ value, onChange, placeholder }, ref) => {
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'clean'],
      [{ 'color': [] }, { 'background': [] }],
    ],
    clipboard: {
      matchVisual: false, // Prevents extra whitespace
    },
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link',
    'color', 'background'
  ];

  const handleChange = (content) => {
    // Clean up extra whitespace and empty lines
    const cleanedContent = content
      .replace(/<p><br><\/p>/g, '') // Remove empty paragraphs
      .replace(/<p>\s*<\/p>/g, '') // Remove paragraphs with only whitespace
      .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
      .trim();
    
    onChange(cleanedContent);
  };

  return (
    <ReactQuill
      ref={ref}
      value={value}
      onChange={handleChange}
      modules={modules}
      formats={formats}
      placeholder={placeholder}
      theme="snow"
      style={{ 
        backgroundColor: 'rgba(30,41,59,0.7)',
        borderRadius: '8px',
        color: '#e2e8f0'
      }}
    />
  );
});

QuillEditor.displayName = 'QuillEditor';

export default QuillEditor; 