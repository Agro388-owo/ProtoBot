// antiMacro.js
const fs = require('fs');
const path = require('path');
const botConfig = require('./config');

const timingTracker = new Map();
const DATA_FILE = path.join(__dirname, 'macro-warnings.json');

// Ensure macro-warnings.json exists on startup
let detectionCounts = new Map();

function initDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2), 'utf8');
            console.log('[ANTI-MACRO] Created missing macro-warnings.json file.');
        } catch (err) {
            console.error('[ANTI-MACRO ERROR] Could not create macro-warnings.json:', err);
        }
    } else {
        try {
            const rawData = fs.readFileSync(DATA_FILE, 'utf8');
            if (rawData.trim()) {
                const parsed = JSON.parse(rawData);
                detectionCounts = new Map(Object.entries(parsed));
            }
        } catch (err) {
            console.error('[ANTI-MACRO ERROR] Failed parsing macro-warnings.json, resetting local map:', err);
            detectionCounts = new Map();
        }
    }
}

// Run initial check on require
initDataFile();

/**
 * Syncs macro-warnings.json to your GitHub repository.
 */
async function syncWarningsToGitHub(jsonContent) {
    const owner = "Agro388-owo";
    const repo = "ProtoBot";
    const filePath = "macro-warnings.json";
    const branch = "main";
    const token = botConfig.GITHUB_TOKEN || process.env.GITHUB_TOKEN;

    if (!token) return;

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    try {
        let sha = null;
        const getRes = await fetch(apiUrl, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "User-Agent": "ProtoBot-MacroLogger"
            }
        });

        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }

        const contentEncoded = Buffer.from(jsonContent).toString('base64');
        await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "User-Agent": "ProtoBot-MacroLogger"
            },
            body: JSON.stringify({
                message: "update: Sync macro-warnings.json database",
                content: contentEncoded,
                sha: sha,
                branch: branch
            })
        });
    } catch (err) {
        console.error('[GITHUB MACRO SYNC ERROR]:', err);
    }
}

/**
 * Saves current warning counts to disk & GitHub.
 */
async function saveWarningsToDisk() {
    try {
        const obj = Object.fromEntries(detectionCounts);
        const jsonContent = JSON.stringify(obj, null, 2);
        fs.writeFileSync(DATA_FILE, jsonContent, 'utf8');
        await syncWarningsToGitHub(jsonContent);
    } catch (err) {
        console.error('[ANTI-MACRO ERROR] Failed saving macro-warnings.json:', err);
    }
}

/**
 * Appends macro detection events to disk log.
 */
function logMacroDetection(user, fullCommand, variance, totalDetections, reason) {
    try {
        const logPath = path.join(__dirname, 'macro-detections.log');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] 🚨 MACRO DETECTED (${reason}) | User: ${user.username} (${user.id}) | Total Detections: ${totalDetections} | Command: /${fullCommand} | Variance: ${variance.toFixed(2)}ms\n`;

        fs.appendFileSync(logPath, logEntry, 'utf8');
        console.warn(`\x1b[31m[ANTI-MACRO]\x1b[0m Flagged ${user.username} (${user.id}) | Warning #${totalDetections} | Reason: ${reason} | Cmd: /${fullCommand}`);
    } catch (err) {
        console.error('[ANTI-MACRO LOGGER ERROR] Failed writing log:', err);
    }
}

/**
 * Global macro check to intercept automated inputs across all slash commands.
 */
async function handleMacroCheck(interaction) {
    if (!interaction.isChatInputCommand()) return false;

    const rootCommand = interaction.commandName;

    // Safely parse full command string
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
    if (history.length > 4) history.shift(); // Keep last 4 runs
    timingTracker.set(userId, history);

    if (history.length >= 4) {
        const totalDuration = history[history.length - 1] - history[0];
        
        // 1. RAPID FIRE CHECK: 4 executions under 12 seconds total
        const isSpamming = totalDuration < 12000;

        // 2. TIMING CONSISTENCY CHECK: Variance threshold relaxed to 800ms
        const intervals = [];
        for (let i = 1; i < history.length; i++) {
            intervals.push(history[i] - history[i - 1]);
        }
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
        const isConsistent = variance < 800;

        if (isSpamming || isConsistent) {
            const currentCount = (detectionCounts.get(userId) || 0) + 1;
            detectionCounts.set(userId, currentCount);
            await saveWarningsToDisk();

            const reason = isSpamming ? 'Rapid Execution Speed' : `Consistent Pattern (${variance.toFixed(0)}ms variance)`;
            logMacroDetection(interaction.user, fullCommand, variance, currentCount, reason);

            await interaction.reply({
                content: `⚠️ **VIOLATION OF RULE #1:** *No Macros or Automation*\nAutomated execution timing detected across commands. Turn off auto-clickers/macros immediately. *(Warning #${currentCount})*`,
                flags: 64
            });

            return true;
        }
    }

    return false;
}

module.exports = {
    handleMacroCheck
};
