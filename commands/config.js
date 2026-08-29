const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');
const { CREDIT, formatNumber, clampBalance, loadCredits, saveCredits, ensureUser, isInPrison } = require('./credits.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Admin configuration commands (Owner only)')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommandGroup(group =>
            group
                .setName('server-luck')
                .setDescription('Configure lucky drop multipliers for a specific Discord server')
                .addSubcommand(sub =>
                    sub.setName('set')
                       .setDescription('Set the server ID link and luck multiplier')
                       .addStringOption(opt => opt.setName('server_id').setDescription('The Discord Guild ID').setRequired(true))
                       .addNumberOption(opt => opt.setName('multiplier').setDescription('Luck multiplier (e.g., 1.5, 2.0)').setRequired(true))
                )
                .addSubcommand(sub => sub.setName('status').setDescription('Check current server luck configuration'))
                .addSubcommand(sub => sub.setName('clear').setDescription('Remove target server luck configuration'))
        )
        .addSubcommandGroup(group =>
            group
                .setName('kidnap-restriction')
                .setDescription('Manage /kidnap command restrictions')
                .addSubcommand(sub => sub.setName('toggle').setDescription('Toggle user restrictions for /kidnap on or off'))
                .addSubcommand(sub => sub.setName('status').setDescription('Check current restriction settings for /kidnap'))
                .addSubcommand(sub => sub.setName('add-user').setDescription('Allow a specific user to use restricted commands').addUserOption(opt => opt.setName('user').setDescription('The user to whitelist').setRequired(true)))
                .addSubcommand(sub => sub.setName('remove-user').setDescription('Remove a user from the whitelist').addUserOption(opt => opt.setName('user').setDescription('The user to remove').setRequired(true)))
        )
        .addSubcommandGroup(group =>
            group
                .setName('bot-status')
                .setDescription('Change ProtoBot activity and presence status')
                .addSubcommand(sub =>
                    sub
                        .setName('set')
                        .setDescription('Set a new game or activity')
                        .addStringOption(option => option.setName('activity').setDescription('The name of the game/activity').setRequired(true))
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
        )
        .addSubcommandGroup(group =>
            group
                .setName('debug-mode')
                .setDescription('Manage bot debug and diagnostics features')
                .addSubcommand(sub => sub.setName('toggle').setDescription('Turn advanced debug logging on or off'))
                .addSubcommand(sub => sub.setName('status').setDescription('Check current debug mode state'))
        )
        .addSubcommandGroup(group =>
            group
                .setName('snap-config')
                .setDescription('Manage /snap mass ping settings')
                .addSubcommand(sub => sub.setName('toggle').setDescription('Toggle @everyone ping on a channel-wide snap'))
                .addSubcommand(sub => sub.setName('status').setDescription('Check current snap mass ping setting'))
        )
        .addSubcommandGroup(group =>
            group
                .setName('public-pings')
                .setDescription('Manage public user tagging in commands')
                .addSubcommand(sub => sub.setName('toggle').setDescription('Toggle whether commands mention users directly in public messages'))
                .addSubcommand(sub => sub.setName('status').setDescription('Check current public ping setting'))
        )
        .addSubcommandGroup(group =>
            group
                .setName('fishing-visibility')
                .setDescription('Manage /fishing cast response privacy')
                .addSubcommand(sub => sub.setName('toggle').setDescription('Toggle whether /fishing cast replies are public or ephemeral'))
                .addSubcommand(sub => sub.setName('status').setDescription('Check current fishing response visibility setting'))
        ),

    async execute(interaction) {
        if (interaction.user.id !== botConfig.OWNER_ID) {
            await interaction.reply({ content: '❌ Only the designated bot owner can use `/config` commands!', ephemeral: true });
            return null;
        }

        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (group === 'server-luck') {
            if (subcommand === 'set') {
                const serverId = interaction.options.getString('server_id');
                const multiplier = interaction.options.getNumber('multiplier');
                
                botConfig.TARGET_SERVER_ID = serverId;
                botConfig.TARGET_SERVER_LUCK = multiplier;

                await interaction.reply({ 
                    content: `✅ Updated target server configuration:\n- **Guild ID:** \`${serverId}\`\n- **Luck Multiplier:** \`${multiplier}x\``, 
                    ephemeral: true 
                });
                return null;
            }
            else if (subcommand === 'status') {
                const sId = botConfig.TARGET_SERVER_ID || 'None configured';
                const sLuck = botConfig.TARGET_SERVER_LUCK || '1.0x';
                await interaction.reply({ 
                    content: `🌐 **Server Luck Configuration:**\n- **Linked Server ID:** \`${sId}\`\n- **Luck Multiplier:** \`${sLuck}\``, 
                    ephemeral: true 
                });
                return null;
            }
            else if (subcommand === 'clear') {
                botConfig.TARGET_SERVER_ID = null;
                botConfig.TARGET_SERVER_LUCK = 1.0;
                await interaction.reply({ content: `🗑️ Cleared target server luck configuration.`, ephemeral: true });
                return null;
            }
        }
        else if (group === 'kidnap-restriction') {
            if (subcommand === 'toggle') {
                botConfig.kidnapRestricted = !botConfig.kidnapRestricted;
                const stateText = botConfig.kidnapRestricted ? '🔒 **ENABLED**' : '🔓 **DISABLED**';
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
                if (!botConfig.allowedUsers.includes(targetUser.id)) botConfig.allowedUsers.push(targetUser.id);
                await interaction.reply({ content: `✅ Added <@${targetUser.id}> to the whitelist.`, ephemeral: true });
                return null;
            }
            else if (subcommand === 'remove-user') {
                const targetUser = interaction.options.getUser('user');
                botConfig.allowedUsers = botConfig.allowedUsers.filter(id => id !== targetUser.id);
                await interaction.reply({ content: `❌ Removed <@${targetUser.id}> from the whitelist.`, ephemeral: true });
                return null;
            }
        }
        else if (group === 'bot-status') {
            if (subcommand === 'set') {
                const newActivity = interaction.options.getString('activity');
                const newStatus = interaction.options.getString('status') || botConfig.status;

                botConfig.activityName = newActivity;
                botConfig.status = newStatus;

                interaction.client.user.setPresence({
                    activities: [{ name: newActivity, type: ActivityType.Playing }],
                    status: newStatus,
                });

                await interaction.reply({ content: `✅ Successfully updated bot presence!\n🎮 **Activity:** Playing ${newActivity}\n🟢 **Status:** ${newStatus}`, ephemeral: true });
                return null;
            }
        }
        else if (group === 'debug-mode') {
            if (subcommand === 'toggle') {
                botConfig.debugMode = !botConfig.debugMode;
                const stateText = botConfig.debugMode ? '🛠️ **ENABLED**' : '💤 **DISABLED**';
                await interaction.reply({ content: `**Debug Mode** updated: ${stateText}`, ephemeral: true });
                return null;
            }
            else if (subcommand === 'status') {
                const stateText = botConfig.debugMode ? '🛠️ **ENABLED**' : '💤 **DISABLED**';
                await interaction.reply({ content: `**Debug Diagnostics Status:** ${stateText}`, ephemeral: true });
                return null;
            }
        }
        else if (group === 'snap-config') {
            if (subcommand === 'toggle') {
                botConfig.snapAllowMassPing = !botConfig.snapAllowMassPing;
                const stateText = botConfig.snapAllowMassPing ? '🚨 **ENABLED (Mass Ping Active)**' : '🛡️ **DISABLED (Safe Mode)**';
                await interaction.reply({ content: `**/snap mass-ping mode** updated: ${stateText}`, ephemeral: true });
                return null;
            }
            else if (subcommand === 'status') {
                const stateText = botConfig.snapAllowMassPing ? '🚨 **ENABLED**' : '🛡️ **DISABLED**';
                await interaction.reply({ content: `**Snap Mass Ping Status:** ${stateText}`, ephemeral: true });
                return null;
            }
        }
        else if (group === 'public-pings') {
            if (subcommand === 'toggle') {
                botConfig.PING_ON_PUBLIC_MESSAGES = !botConfig.PING_ON_PUBLIC_MESSAGES;
                const stateText = botConfig.PING_ON_PUBLIC_MESSAGES ? '🔔 **ENABLED (User Mentions On)**' : '🔕 **DISABLED (Plain Text Names)**';
                await interaction.reply({ content: `**Public Ping Mode** updated: ${stateText}`, ephemeral: true });
                return null;
            }
            else if (subcommand === 'status') {
                const stateText = botConfig.PING_ON_PUBLIC_MESSAGES ? '🔔 **ENABLED**' : '🔕 **DISABLED**';
                await interaction.reply({ content: `**Public Ping Mode Status:** ${stateText}`, ephemeral: true });
                return null;
            }
        }
        else if (group === 'fishing-visibility') {
            if (subcommand === 'toggle') {
                botConfig.CAST_MESSAGE_PUBLIC = !botConfig.CAST_MESSAGE_PUBLIC;
                const stateText = botConfig.CAST_MESSAGE_PUBLIC ? '📢 **PUBLIC**' : '🔒 **EPHEMERAL**';
                await interaction.reply({ content: `**/fishing cast response visibility** updated: ${stateText}`, ephemeral: true });
                return null;
            }
            else if (subcommand === 'status') {
                const stateText = botConfig.CAST_MESSAGE_PUBLIC ? '📢 **PUBLIC**' : '🔒 **EPHEMERAL**';
                await interaction.reply({ content: `**Fishing Response Visibility:** ${stateText}`, ephemeral: true });
                return null;
            }
        }
    }
};
