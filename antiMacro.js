// antiMacro.js
const historyCache = new Map();
const HISTORY_LIMIT = 4;
const VARIANCE_THRESHOLD_MS = 15.0; // Tolerance threshold (perfect millisecond intervals indicate an automated macro)

/**
 * Validates interaction timing behavior to intercept macro scripts.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction 
 * @returns {Promise<boolean>} true if macro loop is found (blocks command), false if clear.
 */
async function handleMacroCheck(interaction) {
    const userId = interaction.user.id;
    const now = Date.now();

    // Initialize history trace cache array if empty
    if (!historyCache.has(userId)) {
        historyCache.set(userId, []);
    }

    const history = historyCache.get(userId);
    history.push(now);

    // Keep memory cache limited to standard analytics baseline size
    if (history.length > HISTORY_LIMIT) {
        history.shift();
    }

    // Begin variance calculations once historical baseline data array is fully built
    if (history.length === HISTORY_LIMIT) {
        const deltas = [];
        for (let i = 1; i < history.length; i++) {
            deltas.push(history[i] - history[i - 1]);
        }

        // Calculate Standard Deviation over millisecond timing intervals
        const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const varianceSum = deltas.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0);
        const stdDev = Math.sqrt(varianceSum / deltas.length);

        // Macro Detected: Standard Deviation under 15ms means mechanical precision
        if (stdDev < VARIANCE_THRESHOLD_MS) {
            try {
                // Return an ephemeral reply to let the human know why it stopped
                await interaction.reply({
                    content: "⚠️ **Automation Detected.** Please pause and try again naturally.",
                    flags: 64 // Clean Discord.js v14/v16 ephemeral message flag structure
                });
            } catch (err) {
                console.error("[ANTI-MACRO REPLY ERROR]", err.message);
            }
            return true; // ⚠️ Signal true to match the execution block: if (isMacroDetected) return;
        }
    }

    return false; // ✅ Behaviour looks human, permit execution trace down the stack
}

module.exports = { handleMacroCheck };
