// antiMacro.js
const fs = require('fs');
const path = require('path');
const botConfig = require('./config');

const TIMINGS_FILE = path.join(__dirname, 'macro-timings.json');
const WARNINGS_FILE = path.join(__dirname, 'macro-warnings.json');
const CREDITS_FILE = path.join(__dirname, 'credits.json');

let timingTracker = new Map();
let detectionData = new Map(); // Stores { warnings: Number, totalFlaggedCredits: Number }

// Initialize local JSON storage and auto-heal missing files
function initStorage() {
    try {
        if (fs.existsSync(WARNINGS_FILE)) {
            const raw = fs.readFileSync(WARNINGS_FILE, 'utf8');
            if (raw.trim()) {
                const parsed = JSON.parse(raw);
                for (const [userId, data] of Object.entries(parsed)) {
                    if (typeof data === 'number') {
                        // Migrate legacy single-number warning format
                        detectionData.set(userId, { warnings: data, totalFlaggedCredits: 0 });
                    } else {
                        detectionData.set(userId, data);
                    }
                }
            }
        } else {
            fs.writeFileSync(WARNINGS_FILE, JSON.stringify({}, null, 2), 'utf8');
        }

        if (fs.existsSync(TIMINGS_FILE)) {
            const raw = fs.readFileSync(TIMINGS_FILE, 'utf8');
            if (raw.trim()) timingTracker = new Map(Object.entries(raw));
        } else {
            fs.writeFileSync(TIMINGS_FILE, JSON.stringify({}, null, 2), 'utf8');
        }
    } catch (err) {
        console.error('[ANTI-MACRO INIT ERROR]:', err);
    }
}
initStorage();

/**
 * Reads user's current balance directly from credits.json.
 * Supports both array format [{ id, credits }] and key-value format { "userId": 5000 }.
 */
function getUserCredits(userId) {
    try {
        if (fs.existsSync(CREDITS_FILE)) {
            const raw = fs.readFileSync(CREDITS_FILE, 'utf8');
            if (raw.trim()) {
                const data = JSON.parse(raw);

                // Check if credits.json is an array of user objects
                if (Array.isArray(data)) {
                    const found = data.find(u => u.id === userId || u.userId === userId);
                    if (found) {
                        return found.credits ?? found.balance ?? found.amount ?? 0;
                    }
                } 
                // Check if credits.json is a key-value object { "userId": 10000 }
                else if (typeof data === 'object') {
                    if (typeof data[userId] === 'number') return data[userId];
                    if (typeof data[userId] === 'object') {
                        return data[userId].credits ?? data[userId].balance ?? 0;
                    }
                }
            }
        }
    } catch (err) {
        console.error('[ANTI-MACRO ERROR] Could not read credits.json:', err);
    }
    return 0;
}

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
        const warningsObj = Object.fromEntries(detectionData);
        const warningsJson = JSON.stringify(warningsObj, null, 2);
        fs.writeFileSync(WARNINGS_FILE, warningsJson, 'utf8');
        await syncToGitHub('macro-warnings.json', warningsJson);

        const timingsObj = Object.fromEntries(timingTracker);
        fs.writeFileSync(TIMINGS_FILE, JSON.stringify(timingsObj, null, 2), 'utf8');
    } catch (err) {
        console.error('[ANTI-MACRO SAVE ERROR]:', err);
    }
}

function logDetection(user, fullCommand, variance, totalDetections, currentCredits, reason) {
    try {
        const logPath = path.join(__dirname, 'macro-detections.log');
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] 🚨 MACRO BLOCKED (${reason}) | User: ${user.username} (${user.id}) | Warnings: ${totalDetections} | Credits in JSON: ${currentCredits} | Cmd: /${fullCommand} | Variance: ${variance.toFixed(2)}ms\n`;
        fs.appendFileSync(logPath, entry, 'utf8');
        console.warn(`\x1b[31m[ANTI-MACRO]\x1b[0m Blocked ${user.username} (${user.id}) | Warning #${totalDetections} | Flagged Credits: ${currentCredits} | Reason: ${reason}`);
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
    if (history.length > 4) history.shift();
    timingTracker.set(userId, history);

    if (history.length >= 4) {
        const totalDuration = history[history.length - 1] - history[0];
        
        // 1. RAPID SPAM CHECK: 4 executions in under 14 seconds
        const isSpamming = totalDuration < 14000;

        // 2. TIMING CONSISTENCY CHECK: Variance under 1200ms
        const intervals = [];
        for (let i = 1; i < history.length; i++) {
            intervals.push(history[i] - history[i - 1]);
        }
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
        const isConsistent = variance < 1200;

        if (isSpamming || isConsistent) {
            // Read credit balance directly from credits.json
            const currentCredits = getUserCredits(userId);
            const userRecord = detectionData.get(userId) || { warnings: 0, totalFlaggedCredits: 0 };
            
            userRecord.warnings += 1;
            userRecord.totalFlaggedCredits = Math.max(userRecord.totalFlaggedCredits, currentCredits);

            detectionData.set(userId, userRecord);
            await saveState();

            const reason = isSpamming ? 'Rapid Execution Speed' : `Consistent Pattern (${variance.toFixed(0)}ms variance)`;
            logDetection(interaction.user, fullCommand, variance, userRecord.warnings, userRecord.totalFlaggedCredits, reason);

            const warningMsg = `⚠️ **VIOLATION OF RULE #1:** *No Macros or Automation*\nAutomated execution timing detected across commands. Turn off auto-clickers/macros immediately. *(Warning #${userRecord.warnings})*`;

            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: warningMsg, flags: 64 });
                } else {
                    await interaction.reply({ content: warningMsg, flags: 64 });
                }
            } catch (err) {}

            return true; // 🛑 STRICT BLOCK
        }
    }

    return false;
}

module.exports = {
    handleMacroCheck
};
