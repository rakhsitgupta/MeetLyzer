<<<<<<< HEAD
# Meetlyzer

*AI-powered Meeting Summary & Action Manager*

A modern, full-stack application that uses Cohere's AI model to generate structured meeting summaries, action items, analytics, and personalized email templates from your meeting notes. Features a professional, responsive, and user-friendly React interface.

## Project Structure

```
meetlyzer/
├── backend/           # Node.js Express backend
│   ├── server.js
│   ├── package.json
│   └── .env
└── frontend/          # React frontend
    ├── src/
    │   ├── App.js
    │   └── App.css
    └── package.json
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with your Cohere API key:
   ```
   PORT=5000
   COHERE_API_KEY=your_cohere_api_key_here
   ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm start
   ```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Enter your meeting notes and fill out the action items section
3. Assign tasks to assignees using the grouped, card-based UI
4. Click "Generate Summary" to view a structured, formatted summary in a modern modal
5. Click "Generate Email Templates" to create personalized emails for each assignee, shown in a tabbed modal
6. Use the "Copy to Clipboard" button to copy summaries or emails
7. Export meeting summaries as a well-formatted PDF
8. View analytics for assignee workloads, completion rates, and meeting frequency in the Analytics section
9. Transcribe audio files and generate summaries from them

## Features

### UI/UX

- Modern, compact hero section with custom image and gradient backgrounds
- Unified card-like appearance for all sections
- Responsive and mobile-friendly design
- Consistent, accessible, and visually appealing delete buttons for tasks and assignees
- Scrollable, centered modals with blur and gradient backgrounds
- Dark/light theme toggle

### Action Items

- Grouped action items by assignee, each in a card with a table of tasks
- Add, edit, and delete tasks for each assignee
- Add or remove assignees with a single click
- Live summary of task counts per assignee
- Validation to prevent duplicate tasks for the same assignee and ensure all fields are filled
- Attach files to tasks

### Summary, Email, and PDF Generation

- Structured summary generation using Cohere AI
- Summary displayed in a scrollable, modern modal with copy and PDF export functionality
- Personalized, professional email template generation for each assignee, with tabbed navigation and copy support
- Improved email template formatting and presentation

### Analytics

- View assignee workloads (bar chart)
- View action item completion rates (doughnut chart)
- View meeting frequency (bar chart with clear labels and description)
- All charts are compact and clearly labeled

### Transcription

- Upload audio files for transcription and summary generation using AssemblyAI

### Error Handling & Validation

- Real-time validation for required fields and duplicate tasks
- Clear, visually distinct error messages and input highlights

## Technologies Used

- **Backend:**
  - Node.js
  - Express
  - Cohere API
  - AssemblyAI API
  - CORS
  - dotenv
  - Multer

- **Frontend:**
  - React
  - Axios
  - Chart.js (react-chartjs-2)
  - jsPDF & jspdf-autotable (for PDF export)
  - Framer Motion
  - CSS3

## Screenshots

*(Add screenshots of the main UI, summary modal, email modal, and analytics for best results!)* 
=======
