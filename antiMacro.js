// antiMacro.js
const timingTracker = new Map();

// List of commands and subcommands protected from macro loops
const PROTECTED_COMMANDS = [
    'fishing cast',
    'slot-machine',
    'gamble',
    'lottery',
    'mine'
];

/**
 * Global macro check to intercept automated commands.
 * @param {import('discord.js').Interaction} interaction 
 * @param {Object} [userData] Optional user object to apply jail time directly
 * @returns {Promise<boolean>} Returns true if command execution should be BLOCKED.
 */
async function handleMacroCheck(interaction, userData = null) {
    if (!interaction.isChatInputCommand()) return false;

    // Build command path string (handles both single commands and subcommands)
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
            if (userData) {
                userData.jailUntil = Date.now() + (15 * 60 * 1000); // 15-minute jail penalty
            }

            await interaction.reply({
                content: `🚨 **AUTOMATION DETECTED!** Unnatural input timing detected across your commands. You have been placed in prison for **15 minutes**.`,
                flags: 64 // Ephemeral response
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
