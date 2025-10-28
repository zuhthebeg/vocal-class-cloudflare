const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
// simple CSV stringify helper (avoid package export issues)
function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function csvLine(arr) {
  return arr.map(csvEscape).join(',') + '\n';
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json({limit: '10mb'})); // signature images may be large

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const CSV_PATH = path.join(DATA_DIR, 'attendance.csv');

// Ensure CSV header
if (!fs.existsSync(CSV_PATH)) {
  const header = ['sessionId','studentName','timestamp','signatureDataUrl'];
  fs.writeFileSync(CSV_PATH, csvLine(header));
}

app.post('/api/attendance', (req, res) => {
  try {
    const { sessionId, studentName, timestamp, signature } = req.body;
    if (!sessionId || !studentName || !timestamp) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Append row to CSV. Store signature as-is (data URL) but could be large.
    const row = [sessionId, studentName, timestamp, signature || ''];
    fs.appendFileSync(CSV_PATH, csvLine(row));

    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to write attendance:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/data/attendance.csv', (req, res) => {
  res.sendFile(CSV_PATH);
});

app.listen(PORT, () => {
  console.log(`Local attendance server listening on http://localhost:${PORT}`);
});
