// file extension has to be .js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

// ---------------------------------------------------------------------------
// 🏷️ REQUIRED TAG SYSTEM HELPERS
// ---------------------------------------------------------------------------
const localTagsPath = path.join(process.cwd(), 'tags.json');

// Safely loads user tags from local file with GitHub API fallback
async function loadTagsData() {
    try {
        if (fs.existsSync(localTagsPath)) {
            const data = fs.readFileSync(localTagsPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('[TAG DEBUG] Error reading local tags.json:', err);
    }

    try {
        const token = botConfig.GITHUB_TOKEN;
        const res = await fetch(`https://api.github.com/repos/Agro388-owo/ProtoBot/contents/tags.json?ref=main`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "User-Agent": "ProtoBot-TagManager",
                "Accept": "application/vnd.github+json"
            }
        });
        if (res.ok) {
            const fileData = await res.json();
            const decoded = Buffer.from(fileData.content, 'base64').toString('utf8');
            return JSON.parse(decoded);
        }
    } catch (err) {
        console.error('[TAG DEBUG] Failed to fetch tags from GitHub:', err);
    }
    return {};
}

// Checks if a user has a specific tag (case-insensitive)
function hasRequiredTag(userTags, requiredTag) {
    if (!Array.isArray(userTags)) return false;
    const searchTag = requiredTag.toLowerCase();
    return userTags.some(tag => String(tag).toLowerCase() === searchTag);
}

// Helper function to pick a random message variant
function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// ---------------------------------------------------------------------------
// 🛠️ COMMAND DEFINITION
// ---------------------------------------------------------------------------
module.exports = {
    // 1. Command Configuration
    data: new SlashCommandBuilder()
        .setName('custom-action') // Must be lowercase, no spaces
        .setDescription('Execute a custom action with optional tag restrictions!')
        .setIntegrationTypes([0, 1]) // 0 = Server Install, 1 = User App Install
        .setContexts([0, 1, 2])       // Works in Servers, Bot DMs, and Group Chats
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who is receiving this action?')
                  .setRequired(true)  // Set to false if target is optional
        ),

    // 2. Command Execution
    async execute(interaction, senderName, recipientName) {
        // -------------------------------------------------------------------
        // 🔒 TAG CHECK CONFIGURATION
        // Set to a tag name (e.g., 'protogen') to restrict execution.
        // Leave as "" or null if NO tag is needed to run this command!
        // -------------------------------------------------------------------
        const REQUIRED_TAG = ""; // E.g., 'protogen', 'synth', or leave empty ""

        // Only enforce tag check if REQUIRED_TAG is actually set
        if (REQUIRED_TAG && REQUIRED_TAG.trim() !== "") {
            const executorId = interaction.user.id;
            const allTags = await loadTagsData(); //[span_0](start_span)[span_0](end_span)
            const executorEntry = allTags[executorId];
            const executorTags = (executorEntry && Array.isArray(executorEntry.tags)) ? executorEntry.tags : [];

            // Reject execution if user lacks the required tag
            if (!hasRequiredTag(executorTags, REQUIRED_TAG)) {
                return `❌ Access denied! You need the **\`${REQUIRED_TAG}\`** tag to use this command!`;
            }
        }

        // 3. Message Variants
        const messageVariants = [
            `${senderName} did something awesome to ${recipientName}!`,
            `${senderName} surprised ${recipientName} with a sudden action!`,
            `${senderName} targeted ${recipientName}!`,
            `${senderName} interacts with ${recipientName}!`,
            `${senderName} executed a combo on ${recipientName}!`
        ];

        // Return a random variant to be sent by index.js
        return getRandomMessage(messageVariants);
    }
};
