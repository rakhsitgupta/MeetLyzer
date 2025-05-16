import React, { useEffect, useRef } from 'react';

const AutoResizeTextarea = ({ value, onChange, rows = 2, placeholder, className }) => {
  const textareaRef = useRef(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      className={className}
      style={{
        minHeight: `${rows * 1.5}em`,
        resize: 'none',
        overflow: 'hidden',
        transition: 'height 0.2s ease-out'
      }}
    />
  );
};

export default AutoResizeTextarea; 