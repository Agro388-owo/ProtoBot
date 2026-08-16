const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settag')
        .setDescription('Assign a custom tag or form title to a user or OC!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option =>
            option.setName('target')
                  .setDescription('The user or OC owner to set the tag for')
                  .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('tag')
                  .setDescription('The custom tag text (e.g. Protogen, Dark Latex Wolf, Synth)')
                  .setRequired(true)
        ),

    async execute(interaction) {
        // Restrict tag management to the bot owner for security
        if (interaction.user.id !== botConfig.OWNER_ID) {
            return await interaction.reply({ content: '❌ Only the bot owner can assign custom tags! Use /suggest to request a tag!', ephemeral: true });
        }

        const targetUser = interaction.options.getUser('target');
        const customTag = interaction.options.getString('tag');
        const configPath = path.join(__dirname, '../config.js');

        // Initialize dictionary if it doesn't exist
        if (!botConfig.userTags) botConfig.userTags = {};
        botConfig.userTags[targetUser.id] = customTag;

        // Persist change into config.js
        let fileContent = fs.readFileSync(configPath, 'utf8');
        const tagsMappingStr = `userTags: ` + JSON.stringify(botConfig.userTags, null, 4) + `,`;

        if (/userTags:\s*\{[\s\S]*?\}/.test(fileContent)) {
            fileContent = fileContent.replace(/userTags:\s*\{[\s\S]*?\}\s*,?/, tagsMappingStr);
        } else {
            fileContent = fileContent.replace(/module\.exports\s*=\s*\{/, `module.exports = {\n\tuserTags: ${JSON.stringify(botConfig.userTags, null, 4)},`);
        }

        fs.writeFileSync(configPath, fileContent, 'utf8');

        return await interaction.reply({
            content: `🏷️ Successfully set the custom tag for <@${targetUser.id}> to: **\`${customTag}\`**!`,
            ephemeral: true
        });
    }
};
