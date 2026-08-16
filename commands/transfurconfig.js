const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfurconfig')
        .setDescription('View or modify Transfur immunity settings!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current Transfur immunity settings.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-immune')
                .setDescription('Add a user/OC to the transfur immunity list.')
                .addUserOption(option =>
                    option.setName('user')
                          .setDescription('The user to make immune to transformations')
                          .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-immune')
                .setDescription('Remove a user from the transfur immunity list.')
                .addUserOption(option =>
                    option.setName('user')
                          .setDescription('The user to remove transfur immunity from')
                          .setRequired(true)
                )
        ),

    async execute(interaction) {
        // Restrict config changes to the bot owner only for security
        if (interaction.user.id !== botConfig.OWNER_ID) {
            return await interaction.reply({ content: '❌ Only the bot owner can modify transfur settings!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const configPath = path.join(__dirname, '../config.js');

        if (subcommand === 'view') {
            const immuneList = botConfig.transfurImmuneUsers || [];
            const formattedList = immuneList.map(id => `<@${id}>`).join(', ') || 'None';

            return await interaction.reply({
                content: `⚙️ **Current Transfur Immunity Settings:**\n` +
                         `• **Immune Users/OCs:** ${formattedList}`,
                ephemeral: true
            });
        }

        if (subcommand === 'add-immune') {
            const user = interaction.options.getUser('user');
            if (!botConfig.transfurImmuneUsers) botConfig.transfurImmuneUsers = [];
            
            if (botConfig.transfurImmuneUsers.includes(user.id)) {
                return await interaction.reply({ content: `⚠️ <@${user.id}> is already immune to transformations!`, ephemeral: true });
            }

            botConfig.transfurImmuneUsers.push(user.id);
            
            let fileContent = fs.readFileSync(configPath, 'utf8');
            const arrayStr = `transfurImmuneUsers: [\n\t\t` + botConfig.transfurImmuneUsers.map(id => `'${id}'`).join(',\n\t\t') + `,\n\t],`;
            
            // If the array already exists in config.js, replace it. Otherwise, append it cleanly.
            if (/transfurImmuneUsers:\s*\[[\s\S]*?\]/.test(fileContent)) {
                fileContent = fileContent.replace(/transfurImmuneUsers:\s*\[[\s\S]*?\]\s*,?/, arrayStr);
            } else {
                fileContent = fileContent.replace(/module\.exports\s*=\s*\{/, `module.exports = {\n\ttransfurImmuneUsers: [\n\t\t'${user.id}'\n\t],`);
            }
            
            fs.writeFileSync(configPath, fileContent, 'utf8');

            return await interaction.reply({ content: `✨ Successfully added <@${user.id}> to the transfur immunity list!`, ephemeral: true });
        }

        if (subcommand === 'remove-immune') {
            const user = interaction.options.getUser('user');
            if (!botConfig.transfurImmuneUsers || !botConfig.transfurImmuneUsers.includes(user.id)) {
                return await interaction.reply({ content: `⚠️ <@${user.id}> is not on the transfur immunity list!`, ephemeral: true });
            }

            botConfig.transfurImmuneUsers = botConfig.transfurImmuneUsers.filter(id => id !== user.id);

            let fileContent = fs.readFileSync(configPath, 'utf8');
            const arrayStr = `transfurImmuneUsers: [\n\t\t` + botConfig.transfurImmuneUsers.map(id => `'${id}'`).join(',\n\t\t') + `,\n\t],`;
            fileContent = fileContent.replace(/transfurImmuneUsers:\s*\[[\s\S]*?\]\s*,?/, arrayStr);
            fs.writeFileSync(configPath, fileContent, 'utf8');

            return await interaction.reply({ content: `🗑️ Successfully removed <@${user.id}> from the transfur immunity list!`, ephemeral: true });
        }
    }
};

