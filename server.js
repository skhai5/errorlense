require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Data storage ──
const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, '[]');
if (!fs.existsSync(PROJECTS_FILE)) fs.writeFileSync(PROJECTS_FILE, '[]');

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ── System prompt ──
const SYSTEM = `You are ErrorLens, an expert system for analyzing all types of errors, threats, and codes. Give developers and security engineers clear, actionable explanations.

Handle ALL error types: HTTP status codes, CVE/security vulnerabilities, MITRE ATT&CK techniques, OS/kernel errors, runtime exceptions, database errors, network errors, cloud provider errors, application logs, and any other error code or threat indicator.

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "error_title": "Short descriptive title",
  "error_type": "Category (Database, HTTP, Security, OS, Runtime, Network, Cloud, MITRE, etc.)",
  "severity": "Critical | High | Medium | Low | Info",
  "explanation": "2-3 sentence plain-English explanation",
  "likely_cause": "Most common reason this occurs, 1-2 sentences",
  "remediation_steps": ["Step 1", "Step 2", "Step 3"],
  "references": ["CVE-XXXX", "RFC XXXX", "OWASP: ...", "etc."]
}

Be specific and practical. Steps should be concrete commands or actions.`;

app.use(express.json());

// ── Pages ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'errorlens.html'));
});

app.get('/analyzer', (_req, res) => {
  res.sendFile(path.join(__dirname, 'analyzer.html'));
});

// ── Analyze ──
app.post('/api/analyze', async (req, res) => {
  const { input, category } = req.body;

  if (!input || !input.trim()) {
    return res.status(400).json({ error: 'Input is required' });
  }

  const hint = category && category !== 'auto' ? `\n\nCategory hint: ${category}` : '';

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Analyze this error:\n\n${input.trim()}${hint}` }]
    });

    const text = message.content[0].text;
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    res.json(parsed);
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// ── History ──
app.get('/api/history', (_req, res) => {
  res.json(readJSON(HISTORY_FILE));
});

app.post('/api/history', (req, res) => {
  const entry = req.body;
  if (!entry.id || !entry.input || !entry.result) {
    return res.status(400).json({ error: 'Invalid entry' });
  }
  const history = readJSON(HISTORY_FILE);
  history.unshift(entry);
  writeJSON(HISTORY_FILE, history);
  res.json(entry);
});

app.patch('/api/history/:id', (req, res) => {
  const { projectId } = req.body;
  const history = readJSON(HISTORY_FILE);
  const entry = history.find(h => h.id === req.params.id);
  if (!entry) return res.status(404).json({ error: 'Not found' });
  entry.projectId = projectId;
  writeJSON(HISTORY_FILE, history);
  res.json(entry);
});

// ── Projects ──
app.get('/api/projects', (_req, res) => {
  res.json(readJSON(PROJECTS_FILE));
});

app.post('/api/projects', (req, res) => {
  const project = req.body;
  if (!project.id || !project.name) {
    return res.status(400).json({ error: 'Invalid project' });
  }
  const projects = readJSON(PROJECTS_FILE);
  projects.push(project);
  writeJSON(PROJECTS_FILE, projects);
  res.json(project);
});

app.listen(port, () => {
  console.log(`ErrorLens running at http://localhost:${port}`);
});
