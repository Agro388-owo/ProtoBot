const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snapconfig')
        .setDescription('View or modify Thanos snap settings!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current Thanos snap settings.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle-mass-ping')
                .setDescription('Toggle whether mass ping is enabled on snaps.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-immune')
                .setDescription('Add a user to the snap immunity list.')
                .addUserOption(option =>
                    option.setName('user')
                          .setDescription('The user to make immune')
                          .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-immune')
                .setDescription('Remove a user from the snap immunity list.')
                .addUserOption(option =>
                    option.setName('user')
                          .setDescription('The user to remove immunity from')
                          .setRequired(true)
                )
        ),

    async execute(interaction) {
        // Restrict config changes to the bot owner only for security
        if (interaction.user.id !== botConfig.OWNER_ID) {
            return await interaction.reply({ content: '❌ Only the bot owner can modify snap settings!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const configPath = path.join(__dirname, '../config.js');

        // Helper to update config.js dynamically
        function updateConfigKey(key, value) {
            botConfig[key] = value;
            let fileContent = fs.readFileSync(configPath, 'utf8');
            const regex = new RegExp(`(${key}:\\s*)([^,\\n]+)`);
            if (regex.test(fileContent)) {
                fileContent = fileContent.replace(regex, `$1${value}`);
            } else {
                console.warn(`Config key ${key} not explicitly found via regex in config.js`);
            }
            fs.writeFileSync(configPath, fileContent, 'utf8');
        }

        if (subcommand === 'view') {
            const massPing = botConfig.snapAllowMassPing ?? false;
            const immuneList = botConfig.snapImmuneUsers || [];
            const formattedList = immuneList.map(id => `<@${id}>`).join(', ') || 'None';

            return await interaction.reply({
                content: `⚙️ **Current Thanos Snap Settings:**\n` +
                         `• **Allow Mass Ping:** \`${massPing}\`\n` +
                         `• **Immune Users:** ${formattedList}`,
                ephemeral: true
            });
        }

        if (subcommand === 'toggle-mass-ping') {
            const newState = !(botConfig.snapAllowMassPing ?? false);
            updateConfigKey('snapAllowMassPing', newState);
            return await interaction.reply({ content: `✅ Mass ping for snaps is now set to: **\`${newState}\`**`, ephemeral: true });
        }

        if (subcommand === 'add-immune') {
            const user = interaction.options.getUser('user');
            if (!botConfig.snapImmuneUsers) botConfig.snapImmuneUsers = [];
            
            if (botConfig.snapImmuneUsers.includes(user.id)) {
                return await interaction.reply({ content: `⚠️ <@${user.id}> is already on the immunity list!`, ephemeral: true });
            }

            botConfig.snapImmuneUsers.push(user.id);
            
            let fileContent = fs.readFileSync(configPath, 'utf8');
            const arrayStr = `snapImmuneUsers: [\n\t\t` + botConfig.snapImmuneUsers.map(id => `'${id}'`).join(',\n\t\t') + `,\n\t],`;
            fileContent = fileContent.replace(/snapImmuneUsers:\s*\[[\s\S]*?\]\s*,/, arrayStr);
            fs.writeFileSync(configPath, fileContent, 'utf8');

            return await interaction.reply({ content: `✨ Successfully added <@${user.id}> to the snap immunity list!`, ephemeral: true });
        }

        if (subcommand === 'remove-immune') {
            const user = interaction.options.getUser('user');
            if (!botConfig.snapImmuneUsers || !botConfig.snapImmuneUsers.includes(user.id)) {
                return await interaction.reply({ content: `⚠️ <@${user.id}> is not on the immunity list!`, ephemeral: true });
            }

            botConfig.snapImmuneUsers = botConfig.snapImmuneUsers.filter(id => id !== user.id);

            let fileContent = fs.readFileSync(configPath, 'utf8');
            const arrayStr = `snapImmuneUsers: [\n\t\t` + botConfig.snapImmuneUsers.map(id => `'${id}'`).join(',\n\t\t') + `,\n\t],`;
            fileContent = fileContent.replace(/snapImmuneUsers:\s*\[[\s\S]*?\]\s*,/, arrayStr);
            fs.writeFileSync(configPath, fileContent, 'utf8');

            return await interaction.reply({ content: `🗑️ Successfully removed <@${user.id}> from the snap immunity list!`, ephemeral: true });
        }
    }
};
