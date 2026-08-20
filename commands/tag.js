const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

const owner = "Agro388-owo";
const repo = "ProtoBot";
const path = "tags.json";
const branch = "main";

// Helper function to load tags directly via GitHub Contents API
async function loadTags() {
    const token = botConfig.GITHUB_TOKEN;
    try {
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        const res = await fetch(getUrl, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "User-Agent": "ProtoBot-TagManager",
                "Accept": "application/vnd.github+json",
                "Cache-Control": "no-cache"
            }
        });

        if (res.ok) {
            const fileData = await res.json();
            const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf8');
            const parsed = JSON.parse(decodedContent);
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        }
    } catch (error) {
        console.error('Failed to fetch tags.json from GitHub API:', error);
    }
    return {};
}

// Helper function to save tags to GitHub via API
async function saveTagsToGitHub(tagsData) {
    const token = botConfig.GITHUB_TOKEN; 
    const contentEncoded = Buffer.from(JSON.stringify(tagsData, null, 4)).toString('base64');

    try {
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        const getRes = await fetch(getUrl, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "User-Agent": "ProtoBot-TagManager",
                "Accept": "application/vnd.github+json"
            }
        });

        let fileSha = null;
        if (getRes.ok) {
            const fileData = await getRes.json();
            fileSha = fileData.sha;
        }

        const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const putRes = await fetch(putUrl, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "User-Agent": "ProtoBot-TagManager",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Update tags.json and immunity rules via ProtoBot",
                content: contentEncoded,
                sha: fileSha,
                branch: branch
            })
        });

        if (!putRes.ok) {
            const errBody = await putRes.text();
            console.error("Failed to commit tags.json to GitHub:", errBody);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error communicating with GitHub API:", error);
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tag')
        .setDescription('Manage custom user tags and Pale Virus immunity keywords!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new custom tag to your collection (up to 50 total slots across all users).')
                .addStringOption(option =>
                    option.setName('tag')
                          .setDescription('The custom tag text to add (e.g. Protogen, Dark Latex Wolf, Synth)')
                          .setRequired(true)
                )
                .addUserOption(option =>
                    option.setName('target')
                          .setDescription('[Owner Only] Optional: The user to add the tag for')
                          .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a specific custom tag from your collection.')
                .addStringOption(option =>
                    option.setName('tag')
                          .setDescription('The exact custom tag text you want to remove')
                          .setRequired(true)
                )
                .addUserOption(option =>
                    option.setName('target')
                          .setDescription('[Owner Only] Optional: The user to remove the tag from')
                          .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all custom tags for yourself or another user.')
                .addUserOption(option =>
                    option.setName('target')
                          .setDescription('Optional: The user whose tags you want to view')
                          .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('immunity')
                .setDescription('[Owner Only] Manage tag keywords that grant Pale Virus immunity.')
                .addStringOption(option =>
                    option.setName('action')
                          .setDescription('Choose action: add, remove, or list')
                          .setRequired(true)
                          .addChoices(
                              { name: 'Add Keyword', value: 'add' },
                              { name: 'Remove Keyword', value: 'remove' },
                              { name: 'List Keywords', value: 'list' }
                          )
                )
                .addStringOption(option =>
                    option.setName('keyword')
                          .setDescription('The immunity keyword (e.g. pale, latex, tiger shark)')
                          .setRequired(false)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            const isOwner = userId === botConfig.OWNER_ID;

            let allUserTags = await loadTags();

            // Safely initialize _meta object and immuneTags array
            if (!allUserTags._meta || typeof allUserTags._meta !== 'object') {
                allUserTags._meta = { immuneTags: [] };
            }
            if (!Array.isArray(allUserTags._meta.immuneTags)) {
                allUserTags._meta.immuneTags = ['latex', 'transfur', 'dark latex', 'white latex', 'protogen', 'synth', 'tiger shark', 'shark', 'squid dog'];
            }

            // Subcommand: Immunity Keyword Manager
            if (subcommand === 'immunity') {
                const action = interaction.options.getString('action');
                const keyword = interaction.options.getString('keyword')?.trim().toLowerCase();

                if (action === 'list') {
                    const listText = allUserTags._meta.immuneTags.map((k, i) => `${i + 1}. \`${k}\``).join('\n') || 'None';
                    return await interaction.editReply({ content: `🛡️ **Current Pale Virus Immunity Keywords:**\n${listText}` });
                }

                if (!isOwner) {
                    return await interaction.editReply({ content: `❌ Only the bot owner can modify immunity rules!` });
                }

                if (!keyword) {
                    return await interaction.editReply({ content: `⚠️ Please provide a keyword when using add or remove!` });
                }

                if (action === 'add') {
                    if (allUserTags._meta.immuneTags.includes(keyword)) {
                        return await interaction.editReply({ content: `⚠️ **\`${keyword}\`** is already in the immunity list!` });
                    }

                    allUserTags._meta.immuneTags.push(keyword);
                    const success = await saveTagsToGitHub(allUserTags);

                    if (!success) return await interaction.editReply({ content: `❌ Failed to update immunity tags on GitHub!` });
                    return await interaction.editReply({ content: `🛡️ Added **\`${keyword}\`** to the Pale Virus immunity list!` });
                }

                if (action === 'remove') {
                    const index = allUserTags._meta.immuneTags.indexOf(keyword);
                    if (index === -1) {
                        return await interaction.editReply({ content: `⚠️ Could not find **\`${keyword}\`** in the immunity list!` });
                    }

                    allUserTags._meta.immuneTags.splice(index, 1);
                    const success = await saveTagsToGitHub(allUserTags);

                    if (!success) return await interaction.editReply({ content: `❌ Failed to update immunity tags on GitHub!` });
                    return await interaction.editReply({ content: `🗑️ Removed **\`${keyword}\`** from the Pale Virus immunity list!` });
                }
            }

            // Subcommand: List User Tags
            if (subcommand === 'list') {
                const targetUser = interaction.options.getUser('target') || interaction.user;
                const userData = allUserTags[targetUser.id];
                const userTagList = (userData && Array.isArray(userData.tags)) ? userData.tags : [];

                if (userTagList.length === 0) {
                    const message = targetUser.id === userId 
                        ? `📂 **Your Custom Tags:**\n• You don't have any custom tags set right now! Use \`/tag add\` to create one.`
                        : `📂 **Custom Tags:**\n• <@${targetUser.id}> does not have any custom tags set right now!`;

                    return await interaction.editReply({ content: message });
                }

                const formattedTags = userTagList.map((t, index) => `${index + 1}. \`${t}\``).join('\n');
                return await interaction.editReply({ content: `📂 **Custom Tags for <@${targetUser.id}> (${userData.username || 'Unknown'}):**\n${formattedTags}` });
            }

            // Subcommand: Add Tag
            if (subcommand === 'add') {
                const customTag = interaction.options.getString('tag');
                const targetUser = interaction.options.getUser('target') || interaction.user;

                if (targetUser.id !== userId && !isOwner) {
                    return await interaction.editReply({ content: `❌ Only the bot owner can assign tags to other users!` });
                }

                const recipientId = targetUser.id;
                const recipientUsername = targetUser.username;

                if (!allUserTags[recipientId]) {
                    allUserTags[recipientId] = {
                        username: recipientUsername,
                        tags: []
                    };
                } else {
                    allUserTags[recipientId].username = recipientUsername;
                    if (!Array.isArray(allUserTags[recipientId].tags)) {
                        allUserTags[recipientId].tags = [];
                    }
                }

                if (allUserTags[recipientId].tags.includes(customTag)) {
                    return await interaction.editReply({ content: `⚠️ <@${recipientId}> already has the tag **\`${customTag}\`** in their list!` });
                }

                // Safe slot counter ignoring non-user keys like _meta
                let totalSlotsUsed = Object.entries(allUserTags)
                    .filter(([key]) => key !== '_meta')
                    .reduce((acc, [, entry]) => {
                        if (entry && Array.isArray(entry.tags)) {
                            return acc + entry.tags.length;
                        }
                        return acc;
                    }, 0);

                if (totalSlotsUsed >= 50) {
                    return await interaction.editReply({ content: `❌ Maximum global tag capacity reached (50/50 slots across all users)!` });
                }

                allUserTags[recipientId].tags.push(customTag);
                
                const success = await saveTagsToGitHub(allUserTags);
                if (!success) {
                    return await interaction.editReply({ content: `❌ Failed to save the tag update to GitHub!` });
                }

                return await interaction.editReply({ content: `🏷️ Successfully added the custom tag **\`${customTag}\`** for <@${recipientId}>! (Saved as: ${recipientUsername})` });
            }

            // Subcommand: Remove Specific Tag
            if (subcommand === 'remove') {
                const customTag = interaction.options.getString('tag');
                const targetUser = interaction.options.getUser('target') || interaction.user;

                if (targetUser.id !== userId && !isOwner) {
                    return await interaction.editReply({ content: `❌ Only the bot owner can remove other users' custom tags!` });
                }

                const recipientId = targetUser.id;
                const userData = allUserTags[recipientId];
                const userTagList = (userData && Array.isArray(userData.tags)) ? userData.tags : [];

                const tagIndex = userTagList.indexOf(customTag);
                if (tagIndex === -1) {
                    return await interaction.editReply({ content: `⚠️ Could not find the tag **\`${customTag}\`** for <@${recipientId}>!` });
                }

                userTagList.splice(tagIndex, 1);

                if (userTagList.length === 0) {
                    delete allUserTags[recipientId];
                } else {
                    allUserTags[recipientId].tags = userTagList;
                    allUserTags[recipientId].username = targetUser.username;
                }

                const success = await saveTagsToGitHub(allUserTags);
                if (!success) {
                    return await interaction.editReply({ content: `❌ Failed to update the tag removal on GitHub!` });
                }

                return await interaction.editReply({ content: `🗑️ Successfully removed and pushed the update for **\`${customTag}\`** from <@${recipientId}>!` });
            }
        } catch (error) {
            console.error("TAG_COMMAND_ERROR:", error);
            return await interaction.editReply({ content: `❌ An unexpected error occurred: ${error.message}` });
        }
    }
};
