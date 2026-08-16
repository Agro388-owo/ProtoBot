const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tag')
        .setDescription('Manage or request custom tags and form titles!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('[Owner Only] Assign a custom tag or form title to a user or OC.')
                .addUserOption(option =>
                    option.setName('target')
                          .setDescription('The user or OC owner to set the tag for')
                          .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('tag')
                          .setDescription('The custom tag text (e.g. Protogen, Dark Latex Wolf, Synth)')
                          .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('[Owner Only] Remove a custom tag from a user.')
                .addUserOption(option =>
                    option.setName('target')
                          .setDescription('The user to remove the tag from')
                          .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all assigned custom tags.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('request')
                .setDescription('Request a custom tag or form title by sending a DM to the bot owner.')
                .addStringOption(option =>
                    option.setName('tag')
                          .setDescription('The custom tag you are requesting')
                          .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const configPath = path.join(__dirname, '../config.js');

        // 📋 Handle Subcommand: List Tags
        if (subcommand === 'list') {
            const tags = botConfig.userTags || {};
            const tagEntries = Object.entries(tags);

            if (tagEntries.length === 0) {
                return await interaction.reply({
                    content: `📂 **Custom Tags List:**\n• No custom tags have been assigned yet!`,
                    ephemeral: true
                });
            }

            const formattedList = tagEntries.map(([userId, tagName]) => `• <@${userId}>: \`${tagName}\``).join('\n');

            return await interaction.reply({
                content: `📂 **Current Custom Tags List:**\n${formattedList}`,
                ephemeral: true
            });
        }

        // 📥 Handle Subcommand: Request Tag via DMs
        if (subcommand === 'request') {
            const requestedTag = interaction.options.getString('tag');
            const user = interaction.user;

            try {
                const owner = await interaction.client.users.fetch(botConfig.OWNER_ID);
                
                if (owner) {
                    await owner.send(
                        `📬 **New Tag Request!**\n` +
                        `• **From:** <@${user.id}> (${user.tag} / ID: \`${user.id}\`)\n` +
                        `• **Requested Tag:** \`${requestedTag}\`\n` +
                        `• **Server:** ${interaction.guild ? interaction.guild.name : 'Direct Message'}`
                    );
                }

                return await interaction.reply({
                    content: `✨ Your request for the tag **\`${requestedTag}\`** has been successfully sent to the bot owner via DM!`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Failed to send tag request DM to owner:', error);
                return await interaction.reply({
                    content: `❌ Failed to send your tag request to the owner. They might have DMs closed!`,
                    ephemeral: true
                });
            }
        }

        // ⚙️ Handle Subcommand: Set Tag (Owner Only)
        if (subcommand === 'set') {
            if (interaction.user.id !== botConfig.OWNER_ID) {
                return await interaction.reply({ 
                    content: `❌ Only the bot owner can assign custom tags! Use \`/tag request\` to request one instead.`, 
                    ephemeral: true 
                });
            }

            const targetUser = interaction.options.getUser('target');
            const customTag = interaction.options.getString('tag');

            if (!botConfig.userTags) botConfig.userTags = {};
            botConfig.userTags[targetUser.id] = customTag;

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

        // 🗑️ Handle Subcommand: Remove Tag (Owner Only)
        if (subcommand === 'remove') {
            if (interaction.user.id !== botConfig.OWNER_ID) {
                return await interaction.reply({ 
                    content: `❌ Only the bot owner can remove custom tags!`, 
                    ephemeral: true 
                });
            }

            const targetUser = interaction.options.getUser('target');

            if (!botConfig.userTags || !botConfig.userTags[targetUser.id]) {
                return await interaction.reply({
                    content: `⚠️ <@${targetUser.id}> does not have a custom tag assigned!`,
                    ephemeral: true
                });
            }

            delete botConfig.userTags[targetUser.id];

            let fileContent = fs.readFileSync(configPath, 'utf8');
            const tagsMappingStr = `userTags: ` + JSON.stringify(botConfig.userTags, null, 4) + `,`;

            if (/userTags:\s*\{[\s\S]*?\}/.test(fileContent)) {
                fileContent = fileContent.replace(/userTags:\s*\{[\s\S]*?\}\s*,?/, tagsMappingStr);
            }

            fs.writeFileSync(configPath, fileContent, 'utf8');

            return await interaction.reply({
                content: `🗑️ Successfully removed the custom tag from <@${targetUser.id}>!`,
                ephemeral: true
            });
        }
    }
};
