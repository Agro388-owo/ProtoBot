// antiMacro.js
const fs = require('fs');
const path = require('path');

const timingTracker = new Map();
const DATA_FILE = path.join(__dirname, 'macro-warnings.json');

// Load stored detection counts from disk into memory
let detectionCounts = new Map();
if (fs.existsSync(DATA_FILE)) {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        if (rawData.trim()) {
            const parsed = JSON.parse(rawData);
            detectionCounts = new Map(Object.entries(parsed));
        }
    } catch (err) {
        console.error('[ANTI-MACRO ERROR] Failed loading macro-warnings.json:', err);
    }
}

/**
 * Saves current warning counts to disk.
 */
function saveWarningsToDisk() {
    try {
        const obj = Object.fromEntries(detectionCounts);
        fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
        console.error('[ANTI-MACRO ERROR] Failed saving macro-warnings.json:', err);
    }
}

/**
 * Appends macro detection events to a log file on disk.
 */
function logMacroDetection(user, fullCommand, variance, totalDetections) {
    try {
        const logPath = path.join(__dirname, 'macro-detections.log');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] 🚨 MACRO DETECTED | User: ${user.username} (${user.id}) | Total Detections: ${totalDetections} | Command: /${fullCommand} | Variance: ${variance.toFixed(2)}ms\n`;

        fs.appendFileSync(logPath, logEntry, 'utf8');
        console.warn(`\x1b[33m[ANTI-MACRO]\x1b[0m Flagged ${user.username} (${user.id}) | Total Warnings: ${totalDetections} | Cmd: /${fullCommand} (Variance: ${variance.toFixed(2)}ms)`);
    } catch (err) {
        console.error('[ANTI-MACRO LOGGER ERROR] Failed to write log:', err);
    }
}

/**
 * Global macro check to intercept automated commands across ALL command inputs.
 * @param {import('discord.js').Interaction} interaction 
 * @returns {Promise<boolean>} Returns true if command execution should be BLOCKED.
 */
async function handleMacroCheck(interaction) {
    if (!interaction.isChatInputCommand()) return false;

    const rootCommand = interaction.commandName;

    // Safely build full command string for logging
    let fullCommand = rootCommand;
    try {
        const group = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand(false);
        fullCommand = [rootCommand, group, sub].filter(Boolean).join(' ');
    } catch (e) {
        fullCommand = rootCommand;
    }

    const userId = interaction.user.id;
    const now = Date.now();
    const history = timingTracker.get(userId) || [];

    history.push(now);
    if (history.length > 5) history.shift();
    timingTracker.set(userId, history);

    // Analyze timing consistency once we have at least 5 executions
    if (history.length >= 5) {
        const intervals = [];
        for (let i = 1; i < history.length; i++) {
            intervals.push(history[i] - history[i - 1]);
        }

        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;

        // Variance under 60ms indicates unnatural timing consistency
        if (variance < 60) {
            // Increment total detection counter and persist to JSON file
            const currentCount = (detectionCounts.get(userId) || 0) + 1;
            detectionCounts.set(userId, currentCount);
            saveWarningsToDisk();

            // Log detection with user details and updated total count
            logMacroDetection(interaction.user, fullCommand, variance, currentCount);

            await interaction.reply({
                content: `⚠️ **VIOLATION OF RULE #1:** *No Macros or Automation*\nUnnatural command execution timing detected. Auto-clickers, self-bots, and macros are strictly forbidden. Please turn off your automated macro and play manually. *(Warning #${currentCount})*`,
                flags: 64 // Ephemeral response
            });

            return true; // Stop command execution
        }
    }

    return false; // Timing looks natural, allow command execution
}

module.exports = {
    handleMacroCheck
};
