// antiMacro.js
const fs = require('fs');
const path = require('path');

const timingTracker = new Map();
const detectionCounts = new Map(); // Tracks total macro detections per user ID

// List of commands and subcommands protected from macro loops
const PROTECTED_COMMANDS = [
    'fishing cast',
    'slot-machine',
    'gamble',
    'lottery',
    'mine'
];

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
 * Global macro check to intercept automated commands.
 * @param {import('discord.js').Interaction} interaction 
 * @returns {Promise<boolean>} Returns true if command execution should be BLOCKED.
 */
async function handleMacroCheck(interaction) {
    if (!interaction.isChatInputCommand()) return false;

    // Build command path string (handles single commands and subcommands)
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand(false);
    const fullCommand = [interaction.commandName, group, sub].filter(Boolean).join(' ');

    // Match full command path (e.g. "fishing cast") or root command name (e.g. "gamble")
    const isProtected = PROTECTED_COMMANDS.some(cmd => 
        cmd === fullCommand || cmd === interaction.commandName
    );

    if (!isProtected) return false;

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

        // Variance under 60ms indicates unnatural, millisecond-precise macro playback
        if (variance < 60) {
            // Increment total detection counter for this user
            const currentCount = (detectionCounts.get(userId) || 0) + 1;
            detectionCounts.set(userId, currentCount);

            // Log detection with user details and total count
            logMacroDetection(interaction.user, fullCommand, variance, currentCount);

            await interaction.reply({
                content: `⚠️ **VIOLATION OF RULE #1:** *No Macros or Automation*\nUnnatural command execution timing detected. Auto-clickers, self-bots, and macros are strictly forbidden. Please turn off your automated macro and play manually. *(Warning #${currentCount})*`,
                flags: 64 // Ephemeral response (visible only to the user)
            });

            return true; // Stop command execution
        }
    }

    return false; // Timing looks natural, allow command execution
}

module.exports = {
    handleMacroCheck,
    PROTECTED_COMMANDS
};
