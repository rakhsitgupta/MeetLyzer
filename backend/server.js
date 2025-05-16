require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { CohereClient } = require('cohere-ai');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 5000;

// Initialize Cohere
const cohere = new CohereClient({ apiKey: process.env.COHERE_API_KEY });

// Middleware
app.use(cors());
app.use(bodyParser.json());

const upload = multer({ dest: 'uploads/' });

// Generate summary endpoint
app.post('/generate-summary', async (req, res) => {
  try {
    const { overview, metrics, decisions, actionItems, nextMeeting } = req.body;

    // Compose a formatted prompt from structured fields
    const formattedNotes = `
📋 Meeting Overview:
${overview || 'Not specified'}

📊 Performance Metrics:
${metrics || 'Not specified'}

✅ Decisions Made:
${decisions || 'Not specified'}

📝 Action Items:
${(actionItems && actionItems.length > 0) ? actionItems.map((item, idx) => `
${idx + 1}. Task: ${item.task || 'Not specified'}
   Assignee: ${item.assignee || 'Not specified'}
   Deadline: ${item.deadline || 'Not specified'}
   Priority: ${item.priority || 'Not specified'}
   Dependencies: ${item.dependencies || 'Not specified'}`).join('\n') : 'Not specified'}

📅 Next Meeting:
Date: ${nextMeeting?.date || 'Not specified'}
Time: ${nextMeeting?.time || 'Not specified'}
Location: ${nextMeeting?.location || 'Not specified'}
Agenda: ${nextMeeting?.agenda || 'Not specified'}
Attendees: ${nextMeeting?.attendees || 'Not specified'}
`;

    const prompt = `You are a professional meeting summarizer. Given the following structured meeting data, generate a clear, concise, and well-formatted summary in the same structure. If any field is 'Not specified', keep it as is. Do not invent information.\n\n${formattedNotes}`;

    const response = await cohere.generate({
      model: 'command',
      prompt: prompt,
      max_tokens: 800,
      temperature: 0.5,
    });

    const summary = response.generations[0].text;
    res.send(summary);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('⚠️ Sorry, something went wrong. Please try again later.');
  }
});

// Transcription endpoint for AssemblyAI
app.post('/transcribe', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AssemblyAI API key not set' });

    // 1. Upload file to AssemblyAI
    const uploadRes = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/upload',
      headers: {
        authorization: apiKey,
        'transfer-encoding': 'chunked',
      },
      data: fs.createReadStream(req.file.path),
    });
    const audioUrl = uploadRes.data.upload_url;

    // 2. Request transcription
    const transcriptRes = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/transcript',
      headers: { authorization: apiKey },
      data: { audio_url: audioUrl },
    });
    const transcriptId = transcriptRes.data.id;

    // 3. Poll for completion
    let transcript;
    for (let i = 0; i < 60; i++) { // up to ~60 seconds
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await axios({
        method: 'get',
        url: `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        headers: { authorization: apiKey },
      });
      if (pollRes.data.status === 'completed') {
        transcript = pollRes.data.text;
        break;
      } else if (pollRes.data.status === 'failed') {
        throw new Error('Transcription failed');
      }
    }
    fs.unlinkSync(req.file.path); // Clean up temp file
    if (!transcript) return res.status(500).json({ error: 'Transcription timed out' });
    res.json({ transcript });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Transcription error:', err);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// Suggest action items endpoint
app.post('/suggest-actions', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    // Format the summary data if it's an object
    let formattedText = text;
    if (typeof text === 'object') {
      formattedText = `
Meeting Overview:
${Array.isArray(text.overview) ? text.overview.join('\n') : text.overview || 'Not specified'}

Performance Metrics:
${Array.isArray(text.metrics) ? text.metrics.join('\n') : text.metrics || 'Not specified'}

Decisions Made:
${Array.isArray(text.decisions) ? text.decisions.join('\n') : text.decisions || 'Not specified'}

Action Items:
${text.actionGroups ? text.actionGroups.map(group => `
Assignee: ${group.assignee}
${group.tasks.map(task => `- ${task.task}${task.deadline ? ` (Deadline: ${task.deadline})` : ''}${task.priority ? `, Priority: ${task.priority}` : ''}${task.dependencies ? `, Dependencies: ${task.dependencies}` : ''}`).join('\n')}`).join('\n') : 'Not specified'}

Next Meeting:
${text.nextMeeting ? text.nextMeeting.join('\n') : 'Not specified'}
`;
    }

    const prompt = `Based on the following meeting notes or transcript, suggest 3-5 actionable follow-up items for the team. Focus on specific, measurable actions that will help move the project forward.\n\nMeeting Notes:\n${formattedText}\n\nAction Items:`;
    
    const response = await cohere.generate({
      model: 'command',
      prompt,
      max_tokens: 150,
      temperature: 0.5,
    });
    const suggestions = response.generations[0].text.trim();
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggest actions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 