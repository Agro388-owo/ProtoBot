const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tag')
        .setDescription('Manage custom tags and form titles!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Assign a custom tag to yourself (or another user if you are the owner).')
                .addStringOption(option =>
                    option.setName('tag')
                          .setDescription('The custom tag text (e.g. Protogen, Dark Latex Wolf, Synth)')
                          .setRequired(true)
                )
                .addUserOption(option =>
                    option.setName('target')
                          .setDescription('[Owner Only] Optional: The user to set the tag for')
                          .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove your own tag (or another user’s tag if you are the owner).')
                .addUserOption(option =>
                    option.setName('target')
                          .setDescription('[Owner Only] Optional: The user to remove the tag from')
                          .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View your own custom tag.')
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
        const userId = interaction.user.id;
        const isOwner = userId === botConfig.OWNER_ID;

        // 📋 Handle Subcommand: List (View own tag)
        if (subcommand === 'list') {
            const tags = botConfig.userTags || {};
            const userTag = tags[userId];

            if (!userTag) {
                return await interaction.reply({
                    content: `📂 **Your Custom Tag:**\n• You don't have a custom tag set right now! Use \`/tag set\` to create one.`,
                    ephemeral: true
                });
            }

            return await interaction.reply({
                content: `📂 **Your Custom Tag:**\n• <@${userId}>: \`${userTag}\``,
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

        // ⚙️ Handle Subcommand: Set Tag
        if (subcommand === 'set') {
            const customTag = interaction.options.getString('tag');
            const targetUser = interaction.options.getUser('target');

            // If a target is specified, enforce owner-only check
            if (targetUser && !isOwner) {
                return await interaction.reply({ 
                    content: `❌ Only the bot owner can assign tags to other users!`, 
                    ephemeral: true 
                });
            }

            // Determine who the tag is being applied to
            const recipientId = targetUser ? targetUser.id : userId;

            if (!botConfig.userTags) botConfig.userTags = {};
            botConfig.userTags[recipientId] = customTag;

            let fileContent = fs.readFileSync(configPath, 'utf8');
            const tagsMappingStr = `userTags: ` + JSON.stringify(botConfig.userTags, null, 4) + `,`;

            if (/userTags:\s*\{[\s\S]*?\}/.test(fileContent)) {
                fileContent = fileContent.replace(/userTags:\s*\{[\s\S]*?\}\s*,?/, tagsMappingStr);
            } else {
                fileContent = fileContent.replace(/module\.exports\s*=\s*\{/, `module.exports = {\n\tuserTags: ${JSON.stringify(botConfig.userTags, null, 4)},`);
            }

            fs.writeFileSync(configPath, fileContent, 'utf8');

            return await interaction.reply({
                content: `🏷️ Successfully set the custom tag for <@${recipientId}> to: **\`${customTag}\`**!`,
                ephemeral: true
            });
        }

        // 🗑️ Handle Subcommand: Remove Tag
        if (subcommand === 'remove') {
            const targetUser = interaction.options.getUser('target');

            // If a target is specified, enforce owner-only check
            if (targetUser && !isOwner) {
                return await interaction.reply({ 
                    content: `❌ Only the bot owner can remove other users' custom tags!`, 
                    ephemeral: true 
                });
            }

            // Determine who is getting their tag removed
            const recipientId = targetUser ? targetUser.id : userId;

            if (!botConfig.userTags || !botConfig.userTags[recipientId]) {
                return await interaction.reply({
                    content: `⚠️ <@${recipientId}> does not have a custom tag assigned!`,
                    ephemeral: true
                });
            }

            delete botConfig.userTags[recipientId];

            let fileContent = fs.readFileSync(configPath, 'utf8');
            const tagsMappingStr = `userTags: ` + JSON.stringify(botConfig.userTags, null, 4) + `,`;

            if (/userTags:\s*\{[\s\S]*?\}/.test(fileContent)) {
                fileContent = fileContent.replace(/userTags:\s*\{[\s\S]*?\}\s*,?/, tagsMappingStr);
            }

            fs.writeFileSync(configPath, fileContent, 'utf8');

            return await interaction.reply({
                content: `🗑️ Successfully removed the custom tag from <@${recipientId}>!`,
                ephemeral: true
            });
        }
    }
};
