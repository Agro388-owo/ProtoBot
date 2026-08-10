const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Admin configuration commands (Owner only)')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommandGroup(group =>
            group
                .setName('kidnap-restriction')
                .setDescription('Manage /kidnap command restrictions')
                .addSubcommand(sub =>
                    sub
                        .setName('toggle')
                        .setDescription('Toggle user restrictions for /kidnap on or off')
                )
                .addSubcommand(sub =>
                    sub
                        .setName('status')
                        .setDescription('Check current restriction settings for /kidnap')
                )
        ),

    async execute(interaction) {
        // 🔒 OWNER-ONLY CHECK
        if (interaction.user.id !== botConfig.OWNER_ID) {
            await interaction.reply({
                content: 'Only the bot owner can use `/config` commands!',
                ephemeral: true
            });
            return null; // Don't send public message
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'toggle') {
            // Flip the boolean setting
            botConfig.kidnapRestricted = !botConfig.kidnapRestricted;
            const stateText = botConfig.kidnapRestricted ? '🔒 **ENABLED** (Restricted to allowed IDs)' : '🔓 **DISABLED** (Everyone can use /kidnap)';

            await interaction.reply({
                content: `**/kidnap restriction mode** updated: ${stateText}`,
                ephemeral: true
            });
            return null;
        } 
        
        else if (subcommand === 'status') {
            const stateText = botConfig.kidnapRestricted ? '🔒 **ENABLED**' : '🔓 **DISABLED**';
            const userList = botConfig.allowedUsers.length > 0 ? botConfig.allowedUsers.map(id => `<@${id}>`).join(', ') : 'None (Everyone allowed if toggle is off)';

            await interaction.reply({
                content: `**Kidnap Config Status:**\n- **Restriction Toggle:** ${stateText}\n- **Allowed Users:** ${userList}`,
                ephemeral: true
            });
            return null;
        }
    }
};
