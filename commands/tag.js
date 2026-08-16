const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');
const fs = require('fs');
const path = require('path');

// Path to the separate tags file in the root directory (one level up from commands/)
const tagsFilePath = path.join(__dirname, '../tags.json');

// Helper function to load tags from tags.json
function loadTags() {
    try {
        if (fs.existsSync(tagsFilePath)) {
            const data = fs.readFileSync(tagsFilePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Failed to read tags.json:', error);
    }
    return {};
}

// Helper function to save tags to tags.json
function saveTags(tags) {
    try {
        fs.writeFileSync(tagsFilePath, JSON.stringify(tags, null, 4), 'utf8');
    } catch (error) {
        console.error('Failed to write tags.json:', error);
    }
}

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
                .setDescription('View a custom tag for yourself or another user.')
                .addUserOption(option =>
                    option.setName('target')
                          .setDescription('Optional: The user whose tag you want to view')
                          .setRequired(false)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const isOwner = userId === botConfig.OWNER_ID;

        // Load current tags from root tags.json file
        const userTags = loadTags();

        // 📋 Handle Subcommand: List (View own tag or specified user's tag)
        if (subcommand === 'list') {
            const targetUser = interaction.options.getUser('target') || interaction.user;
            const userTag = userTags[targetUser.id];

            if (!userTag) {
                const message = targetUser.id === userId 
                    ? `📂 **Your Custom Tag:**\n• You don't have a custom tag set right now! Use \`/tag set\` to create one.`
                    : `📂 **Custom Tag:**\n• <@${targetUser.id}> does not have a custom tag set right now!`;

                return await interaction.reply({
                    content: message,
                    ephemeral: true
                });
            }

            return await interaction.reply({
                content: `📂 **Custom Tag:**\n• <@${targetUser.id}>: \`${userTag}\``,
                ephemeral: true
            });
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
            
            // Check slot limit (50 slots max) before adding new tags if it doesn't already exist for this user
            const currentTagCount = Object.keys(userTags).length;
            if (!userTags[recipientId] && currentTagCount >= 50) {
                return await interaction.reply({
                    content: `❌ Maximum tag capacity reached (50/50 slots)! Cannot add new custom tags.`,
                    ephemeral: true
                });
            }

            userTags[recipientId] = customTag;
            saveTags(userTags);

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

            if (!userTags[recipientId]) {
                return await interaction.reply({
                    content: `⚠️ <@${recipientId}> does not have a custom tag assigned!`,
                    ephemeral: true
                });
            }

            delete userTags[recipientId];
            saveTags(userTags);

            return await interaction.reply({
                content: `🗑️ Successfully removed the custom tag from <@${recipientId}>!`,
                ephemeral: true
            });
        }
    }
};
