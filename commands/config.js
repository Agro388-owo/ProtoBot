const { SlashCommandBuilder, ActivityType } = require('discord.js');
const botConfig = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Admin configuration commands (Owner only)')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        // --- 1. KIDNAP RESTRICTION GROUP ---
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
                .addSubcommand(sub =>
                    sub
                        .setName('add-user')
                        .setDescription('Allow a specific user to use restricted commands')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('The user to whitelist').setRequired(true))
                )
                .addSubcommand(sub =>
                    sub
                        .setName('remove-user')
                        .setDescription('Remove a user from the whitelist')
                        .addUserOption(opt => 
                            opt.setName('user').setDescription('The user to remove').setRequired(true))
                )
        )
        // --- 2. BOT STATUS GROUP ---
        .addSubcommandGroup(group =>
            group
                .setName('bot-status')
                .setDescription('Change ProtoBot activity and presence status')
                .addSubcommand(sub =>
                    sub
                        .setName('set')
                        .setDescription('Set a new game or activity')
                        .addStringOption(option =>
                            option.setName('activity')
                                .setDescription('The name of the game/activity (e.g. Changed)')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('status')
                                .setDescription('The online presence indicator')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'Online', value: 'online' },
                                    { name: 'Idle', value: 'idle' },
                                    { name: 'Do Not Disturb', value: 'dnd' },
                                    { name: 'Invisible', value: 'invisible' }
                                ))
                )
        ),

    async execute(interaction) {
        // 🔒 STRICT OWNER CHECK USING YOUR ID
        if (interaction.user.id !== botConfig.OWNER_ID) {
            await interaction.reply({
                content: '❌ Only the designated bot owner can use `/config` commands!',
                ephemeral: true
            });
            return null;
        }

        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        // --- GROUP: KIDNAP RESTRICTION ---
        if (group === 'kidnap-restriction') {
            if (subcommand === 'toggle') {
                botConfig.kidnapRestricted = !botConfig.kidnapRestricted;
                const stateText = botConfig.kidnapRestricted ? '🔒 **ENABLED** (Restricted)' : '🔓 **DISABLED** (Everyone allowed)';

                await interaction.reply({ content: `**/kidnap restriction mode** updated: ${stateText}`, ephemeral: true });
                return null;
            } 
            else if (subcommand === 'status') {
                const stateText = botConfig.kidnapRestricted ? '🔒 **ENABLED**' : '🔓 **DISABLED**';
                const userList = botConfig.allowedUsers.length > 0 ? botConfig.allowedUsers.map(id => `<@${id}>`).join(', ') : 'None';

                await interaction.reply({ content: `**Kidnap Config Status:**\n- **Restrictions:** ${stateText}\n- **Allowed Whitelist:** ${userList}`, ephemeral: true });
                return null;
            }
            else if (subcommand === 'add-user') {
                const targetUser = interaction.options.getUser('user');
                if (!botConfig.allowedUsers.includes(targetUser.id)) {
                    botConfig.allowedUsers.push(targetUser.id);
                }
                await interaction.reply({ content: `✅ Added <@${targetUser.id}> to the allowed access list.`, ephemeral: true });
                return null;
            }
            else if (subcommand === 'remove-user') {
                const targetUser = interaction.options.getUser('user');
                botConfig.allowedUsers = botConfig.allowedUsers.filter(id => id !== targetUser.id);
                await interaction.reply({ content: `❌ Removed <@${targetUser.id}> from the allowed access list.`, ephemeral: true });
                return null;
            }
        }

        // --- GROUP: BOT STATUS ---
        else if (group === 'bot-status') {
            if (subcommand === 'set') {
                const newActivity = interaction.options.getString('activity');
                const newStatus = interaction.options.getString('status') || botConfig.status;

                botConfig.activityName = newActivity;
                botConfig.status = newStatus;

                interaction.client.user.setPresence({
                    activities: [
                        { name: 'customstatus', type: ActivityType.Custom, state: 'Living my best life 🤖' },
                        { name: newActivity, type: ActivityType.Playing }
                    ],
                    status: newStatus,
                });

                await interaction.reply({ content: `✅ Successfully updated bot presence!\n🎮 **Activity:** Playing ${newActivity}\n🟢 **Status:** ${newStatus}`, ephemeral: true });
                return null;
            }
        }
    }
};
