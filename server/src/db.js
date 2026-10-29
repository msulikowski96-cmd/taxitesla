// Minimal JSON-file database. Good enough to launch with a handful of rides a day;
// move to PostgreSQL when traffic grows (the API stays the same).
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'db.json');

let state = { users: [], rides: [] };

function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(FILE)) state = JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

// Write to a temp file then rename, so a crash never leaves a half-written file.
function save() {
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, FILE);
}

load();

module.exports = {
  get users() {
    return state.users;
  },
  get rides() {
    return state.rides;
  },
  set users(v) {
    state.users = v;
  },
  set rides(v) {
    state.rides = v;
  },
  save,
};
