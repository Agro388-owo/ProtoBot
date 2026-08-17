const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

async function saveTagsToGitHub(tagsData) {
    const owner = "Agro388-owo";
    const repo = "ProtoBot";
    const path = "tags.json";
    const branch = "main";
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
                message: "Update tags.json via ProtoBot",
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

async function loadTags() {
    try {
        const rawUrl = `https://raw.githubusercontent.com/Agro388-owo/ProtoBot/main/tags.json`;
        const res = await fetch(rawUrl);
        if (res.ok) {
            return await res.json();
        }
    } catch (error) {
        console.error('Failed to fetch tags.json from GitHub raw URL:', error);
    }
    return {};
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tag')
        .setDescription('Manage multiple custom tags and form titles!')
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
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const isOwner = userId === botConfig.OWNER_ID;

        let allUserTags = await loadTags();

        if (subcommand === 'list') {
            const targetUser = interaction.options.getUser('target') || interaction.user;
            const userTagList = allUserTags[targetUser.id] || [];

            if (userTagList.length === 0) {
                const message = targetUser.id === userId 
                    ? `📂 **Your Custom Tags:**\n• You don't have any custom tags set right now! Use \`/tag add\` to create one.`
                    : `📂 **Custom Tags:**\n• <@${targetUser.id}> does not have any custom tags set right now!`;

                return await interaction.editReply({ content: message });
            }

            const formattedTags = userTagList.map((t, index) => `${index + 1}. \`${t}\``).join('\n');
            return await interaction.editReply({ content: `📂 **Custom Tags for <@${targetUser.id}>:**\n${formattedTags}` });
        }

        if (subcommand === 'add') {
            const customTag = interaction.options.getString('tag');
            const targetUser = interaction.options.getUser('target');

            if (targetUser && !isOwner) {
                return await interaction.editReply({ content: `❌ Only the bot owner can assign tags to other users!` });
            }

            const recipientId = targetUser ? targetUser.id : userId;

            if (!allUserTags[recipientId]) {
                allUserTags[recipientId] = [];
            }

            if (allUserTags[recipientId].includes(customTag)) {
                return await interaction.editReply({ content: `⚠️ <@${recipientId}> already has the tag **\`${customTag}\`** in their list!` });
            }

            let totalSlotsUsed = Object.values(allUserTags).reduce((acc, tags) => acc + (Array.isArray(tags) ? tags.length : 0), 0);
            if (totalSlotsUsed >= 50) {
                return await interaction.editReply({ content: `❌ Maximum global tag capacity reached (50/50 slots across all users)!` });
            }

            allUserTags[recipientId].push(customTag);
            
            const success = await saveTagsToGitHub(allUserTags);
            if (!success) {
                return await interaction.editReply({ content: `❌ Failed to save the tag update to GitHub!` });
            }

            return await interaction.editReply({ content: `🏷️ Successfully added and pushed the custom tag **\`${customTag}\`** for <@${recipientId}> to GitHub!` });
        }

        if (subcommand === 'remove') {
            const customTag = interaction.options.getString('tag');
            const targetUser = interaction.options.getUser('target');

            if (targetUser && !isOwner) {
                return await interaction.editReply({ content: `❌ Only the bot owner can remove other users' custom tags!` });
            }

            const recipientId = targetUser ? targetUser.id : userId;
            const userTagList = allUserTags[recipientId] || [];

            const tagIndex = userTagList.indexOf(customTag);
            if (tagIndex === -1) {
                return await interaction.editReply({ content: `⚠️ Could not find the tag **\`${customTag}\`** for <@${recipientId}>!` });
            }

            userTagList.splice(tagIndex, 1);

            if (userTagList.length === 0) {
                delete allUserTags[recipientId];
            } else {
                allUserTags[recipientId] = userTagList;
            }

            const success = await saveTagsToGitHub(allUserTags);
            if (!success) {
                return await interaction.editReply({ content: `❌ Failed to update the tag removal on GitHub!` });
            }

            return await interaction.editReply({ content: `🗑️ Successfully removed and pushed the update for **\`${customTag}\`** from <@${recipientId}>!` });
        }
    }
};
