import fs from 'node:fs';
import path from 'node:path';

export class JsonStore {
  constructor(file) {
    this.file = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { messages: [], notifications: [], orders: [], conversations: [], participants: [] };
  }
  save() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    fs.renameSync(tmp, this.file);
  }
  list(name, predicate = () => true) { return (this.state[name] || []).filter(predicate); }
  insert(name, value) { this.state[name] ||= []; this.state[name].push(value); this.save(); return value; }
  update(name, id, patch) {
    const item = (this.state[name] || []).find((row) => row.id === id);
    if (!item) return null;
    Object.assign(item, patch); this.save(); return item;
  }
}
