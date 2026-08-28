const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');
const fs = require('fs');
const path = require('path');

const owner = "Agro388-owo";
const repo = "ProtoBot";
const filePath = "tags.json";
const branch = "main";

// Use process.cwd() to target root folder in /home/container/
const localTagsPath = path.join(process.cwd(), 'tags.json');

// Helper function to read local root file safely
function readLocalTags() {
    try {
        if (fs.existsSync(localTagsPath)) {
            const data = fs.readFileSync(localTagsPath, 'utf8');
            const parsed = JSON.parse(data);
            console.log(`[TAG DEBUG] Loaded ${Object.keys(parsed).length} keys from local file (${localTagsPath})`);
            return parsed;
        } else {
            console.warn(`[TAG DEBUG] Local file does not exist at ${localTagsPath}`);
        }
    } catch (err) {
        console.error('[TAG DEBUG] Error reading local tags.json:', err);
    }
    return {};
}

// Helper function to write local root file
function writeLocalTags(data) {
    try {
        fs.writeFileSync(localTagsPath, JSON.stringify(data, null, 4), 'utf8');
        console.log(`[TAG DEBUG] Wrote tags data to ${localTagsPath}`);
    } catch (err) {
        console.error('[TAG DEBUG] Error writing local tags.json:', err);
    }
}

// Helper function to load tags (GitHub -> fallback Local)
async function loadTags() {
    const token = botConfig.GITHUB_TOKEN;
    try {
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
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
            if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
                writeLocalTags(parsed);
                return parsed;
            }
        } else {
            console.warn(`[TAG DEBUG] GitHub fetch returned status ${res.status}`);
        }
    } catch (error) {
        console.error('[TAG DEBUG] Failed to fetch tags.json from GitHub API:', error);
    }
    
    return readLocalTags();
}

// Helper function to save tags to both Local Root and GitHub
async function saveTagsToGitHub(tagsData) {
    writeLocalTags(tagsData);

    const token = botConfig.GITHUB_TOKEN; 
    const contentEncoded = Buffer.from(JSON.stringify(tagsData, null, 4)).toString('base64');

    try {
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
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

        const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
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

        return putRes.ok;
    } catch (error) {
        console.error("[TAG DEBUG] Error communicating with GitHub API:", error);
        return false;
    }
}

// Helper to normalize user object structure across old and new schemas
function normalizeUserData(entry) {
    if (!entry) return { userTags: [], transfurTags: [] };
    
    // Legacy array fallback
    if (Array.isArray(entry.tags)) {
        return { userTags: entry.tags, transfurTags: [] };
    }

    return {
        userTags: Array.isArray(entry.userTags) ? entry.userTags : [],
        transfurTags: Array.isArray(entry.transfurTags) ? entry.transfurTags : []
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tag')
        .setDescription('Manage Pale Virus immunity keywords!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
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
        await interaction.deferReply({ flags: 64 });

        try {
            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;
            const isOwner = userId === botConfig.OWNER_ID;

            let allUserTags = await loadTags();

            if (!allUserTags._meta || typeof allUserTags._meta !== 'object') {
                allUserTags._meta = { immuneTags: [] };
            }
            if (!Array.isArray(allUserTags._meta.immuneTags)) {
                allUserTags._meta.immuneTags = ['latex', 'transfur', 'dark latex', 'white latex', 'protogen', 'synth', 'tiger shark', 'shark', 'squid dog'];
            }

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
                    await saveTagsToGitHub(allUserTags);

                    return await interaction.editReply({ content: `🛡️ Added **\`${keyword}\`** to the Pale Virus immunity list!` });
                }

                if (action === 'remove') {
                    const index = allUserTags._meta.immuneTags.indexOf(keyword);
                    if (index === -1) {
                        return await interaction.editReply({ content: `⚠️ Could not find **\`${keyword}\`** in the immunity list!` });
                    }

                    allUserTags._meta.immuneTags.splice(index, 1);
                    await saveTagsToGitHub(allUserTags);

                    return await interaction.editReply({ content: `🗑️ Removed **\`${keyword}\`** from the Pale Virus immunity list!` });
                }
            }

            if (subcommand === 'list') {
                const targetUser = interaction.options.getUser('target') || interaction.user;
                const rawData = allUserTags[targetUser.id];
                const { userTags, transfurTags } = normalizeUserData(rawData);

                if (userTags.length === 0 && transfurTags.length === 0) {
                    const message = targetUser.id === userId 
                        ? `📂 **Your Custom Tags:**\n• You don't have any custom tags set right now!`
                        : `📂 **Custom Tags:**\n• <@${targetUser.id}> does not have any custom tags set right now!`;

                    return await interaction.editReply({ content: message });
                }

                let response = `📂 **Tags for <@${targetUser.id}> (${rawData?.username || 'Unknown'}):**\n`;
                if (userTags.length > 0) {
                    response += `**User Tags:**\n${userTags.map((t, i) => `${i + 1}. \`${t}\``).join('\n')}\n`;
                }
                if (transfurTags.length > 0) {
                    response += `**Transfur Tags:**\n${transfurTags.map((t, i) => `${i + 1}. \`${t}\``).join('\n')}`;
                }

                return await interaction.editReply({ content: response });
            }
        } catch (error) {
            console.error("TAG_COMMAND_ERROR:", error);
            return await interaction.editReply({ content: `❌ An unexpected error occurred: ${error.message}` });
        }
    }
};
