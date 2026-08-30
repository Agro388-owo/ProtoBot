// antiMacro.js
const fs = require('fs');
const path = require('path');
const botConfig = require('./config');

const TIMINGS_FILE = path.join(__dirname, 'macro-timings.json');
const WARNINGS_FILE = path.join(__dirname, 'macro-warnings.json');

let timingTracker = new Map();
let detectionCounts = new Map();

// Initialize local JSON storage and auto-heal missing files
function initStorage() {
    try {
        if (fs.existsSync(WARNINGS_FILE)) {
            const raw = fs.readFileSync(WARNINGS_FILE, 'utf8');
            if (raw.trim()) detectionCounts = new Map(Object.entries(JSON.parse(raw)));
        } else {
            fs.writeFileSync(WARNINGS_FILE, JSON.stringify({}, null, 2), 'utf8');
        }

        if (fs.existsSync(TIMINGS_FILE)) {
            const raw = fs.readFileSync(TIMINGS_FILE, 'utf8');
            if (raw.trim()) timingTracker = new Map(Object.entries(JSON.parse(raw)));
        } else {
            fs.writeFileSync(TIMINGS_FILE, JSON.stringify({}, null, 2), 'utf8');
        }
    } catch (err) {
        console.error('[ANTI-MACRO INIT ERROR]:', err);
    }
}
initStorage();

async function syncToGitHub(fileName, content) {
    const owner = "Agro388-owo";
    const repo = "ProtoBot";
    const branch = "main";
    const token = botConfig.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) return;

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${fileName}`;

    try {
        let sha = null;
        const getRes = await fetch(apiUrl, {
            headers: { "Authorization": `Bearer ${token}`, "User-Agent": "ProtoBot-Macro" }
        });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }

        await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "User-Agent": "ProtoBot-Macro"
            },
            body: JSON.stringify({
                message: `update: Sync ${fileName}`,
                content: Buffer.from(content).toString('base64'),
                sha,
                branch
            })
        });
    } catch (err) {
        console.error(`[GITHUB SYNC ERROR] ${fileName}:`, err);
    }
}

async function saveState() {
    try {
        const warningsObj = Object.fromEntries(detectionCounts);
        const warningsJson = JSON.stringify(warningsObj, null, 2);
        fs.writeFileSync(WARNINGS_FILE, warningsJson, 'utf8');
        await syncToGitHub('macro-warnings.json', warningsJson);

        const timingsObj = Object.fromEntries(timingTracker);
        fs.writeFileSync(TIMINGS_FILE, JSON.stringify(timingsObj, null, 2), 'utf8');
    } catch (err) {
        console.error('[ANTI-MACRO SAVE ERROR]:', err);
    }
}

function logDetection(user, fullCommand, variance, totalDetections, reason) {
    try {
        const logPath = path.join(__dirname, 'macro-detections.log');
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] 🚨 MACRO BLOCKED (${reason}) | User: ${user.username} (${user.id}) | Total: ${totalDetections} | Cmd: /${fullCommand} | Variance: ${variance.toFixed(2)}ms\n`;
        fs.appendFileSync(logPath, entry, 'utf8');
        console.warn(`\x1b[31m[ANTI-MACRO]\x1b[0m Blocked ${user.username} (${user.id}) | Warning #${totalDetections} | Reason: ${reason}`);
    } catch (err) {
        console.error('[ANTI-MACRO LOG ERROR]:', err);
    }
}

/**
 * Checks interaction for macro execution. Returns TRUE if execution MUST be blocked.
 */
async function handleMacroCheck(interaction) {
    if (!interaction.isChatInputCommand()) return false;

    const rootCommand = interaction.commandName;
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
    // Keep last 4 execution timestamps
    if (history.length > 4) history.shift();
    timingTracker.set(userId, history);

    if (history.length >= 4) {
        const totalDuration = history[history.length - 1] - history[0];
        
        // 1. RAPID SPAM CHECK: 4 executions in under 14 seconds
        const isSpamming = totalDuration < 14000;

        // 2. TIMING CONSISTENCY CHECK: Variance under 1200ms (Catches auto-clickers & loops)
        const intervals = [];
        for (let i = 1; i < history.length; i++) {
            intervals.push(history[i] - history[i - 1]);
        }
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
        const isConsistent = variance < 1200;

        if (isSpamming || isConsistent) {
            const currentCount = (detectionCounts.get(userId) || 0) + 1;
            detectionCounts.set(userId, currentCount);
            await saveState();

            const reason = isSpamming ? 'Rapid Execution Speed' : `Consistent Pattern (${variance.toFixed(0)}ms variance)`;
            logDetection(interaction.user, fullCommand, variance, currentCount, reason);

            const warningMsg = `⚠️ **VIOLATION OF RULE #1:** *No Macros or Automation*\nAutomated execution timing detected across commands. Turn off auto-clickers/macros immediately. *(Warning #${currentCount})*`;

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: warningMsg, flags: 64 });
                } else {
                    await interaction.reply({ content: warningMsg, flags: 64 });
                }
            } catch (err) {
                // Prevent unhandled promise rejection if connection timed out
            }

            return true; // 🛑 STRICT BLOCK
        }
    }

    return false; // Allow command execution
}

module.exports = {
    handleMacroCheck
};
