const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const formatMessage = (level, msg, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${msg}${metaStr}`;
};

const logToFile = (filename, content) => {
  try {
    fs.appendFileSync(path.join(logDir, filename), content + '\n', 'utf8');
  } catch (e) {
    // ignore
  }
};

const logger = {
  info: (msg, meta) => {
    const formatted = formatMessage('info', msg, meta);
    console.log(formatted);
    logToFile('app.log', formatted);
  },
  warn: (msg, meta) => {
    const formatted = formatMessage('warn', msg, meta);
    console.warn(formatted);
    logToFile('app.log', formatted);
  },
  error: (msg, meta) => {
    const formatted = formatMessage('error', msg, meta);
    console.error(formatted);
    logToFile('error.log', formatted);
  },
  audit: (action, user, details = {}) => {
    const formatted = formatMessage('audit', `Action: ${action} | User: ${user}`, details);
    console.log('\x1b[36m%s\x1b[0m', formatted);
    logToFile('audit.log', formatted);
  },
  redFlag: (ruleId, patientId, details = {}) => {
    const formatted = formatMessage('emergency_red_flag', `RULE_MATCHED: ${ruleId} for Patient: ${patientId}`, details);
    console.log('\x1b[41m\x1b[37m%s\x1b[0m', formatted);
    logToFile('red_flags.log', formatted);
  }
};

module.exports = logger;
