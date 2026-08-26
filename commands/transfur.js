const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

const owner = "Agro388-owo";
const repo = "ProtoBot";
const path = "tags.json";
const branch = "main";

// Default fallbacks in case tags.json doesn't have _meta set up yet
const DEFAULT_IMMUNE_KEYWORDS = [
    'latex', 'transfur', 'dark latex', 'white latex', 'protogen', 'synth', 'tiger shark', 'shark', 'squid dog'
];

async function loadTags() {
    const token = botConfig.GITHUB_TOKEN;
    try {
        const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        const res = await fetch(getUrl, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "User-Agent": "ProtoBot-InfectCommand",
                "Accept": "application/vnd.github+json",
                "Cache-Control": "no-cache"
            }
        });

        if (res.ok) {
            const fileData = await res.json();
            const decodedContent = Buffer.from(fileData.content, 'base64').toString('utf8');
            return JSON.parse(decodedContent);
        }
    } catch (error) {
        console.error('Failed to fetch tags.json from GitHub API:', error);
    }
    return {};
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infect')
        .setDescription('Simulate exposure to the Pale Virus from Changed.')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option =>
            option.setName('target')
                  .setDescription('Who to infect (leave blank for yourself)')
                  .setRequired(false))
        .addIntegerOption(option =>
            option.setName('number')
                  .setDescription('Optional message variant')
                  .setRequired(false)),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const targetId = targetUser.id;

        const allUserTags = await loadTags();
        
        // Grab dynamic immunity keywords or fallback to defaults
        const immuneKeywords = allUserTags._meta?.immuneTags || DEFAULT_IMMUNE_KEYWORDS;

        const userData = allUserTags[targetId];
        
        // Extract tags directly from transfurTags (supporting legacy array/userTags fallbacks)
        let transfurTagList = [];
        if (userData) {
            if (Array.isArray(userData.transfurTags)) {
                transfurTagList = userData.transfurTags;
            } else if (Array.isArray(userData)) {
                transfurTagList = userData;
            } else if (Array.isArray(userData.userTags)) {
                transfurTagList = userData.userTags;
            }
        }

        // Check target user's transfurTags against immunity keywords
        const hasImmunityTag = transfurTagList.some(tag => 
            immuneKeywords.some(keyword => tag.toLowerCase().includes(keyword.toLowerCase()))
        );

        const targetText = recipientName === 'themselves' ? senderName : recipientName;

        if (hasImmunityTag) {
            return `${targetText} is somehow immune to the Pale Virus! <:puronervous:1536367581995335750>`;
        }

        const paleMessages = [
            `${targetText} has contracted the Pale virus. <:puro_sad:1536430025635799061>`,
            `${targetText} has been exposed to airborne Pale virus particles. <:puronervous:1536367581995335750>`,
            `${targetText} was exposed to Pale virus. <:Puropreocupado:1536430030916288572>`
        ];

        const numberInput = interaction.options.getInteger('number');
        if (numberInput !== null) {
            const index = numberInput - 1;
            return (index >= 0 && index < paleMessages.length) 
                ? paleMessages[index] 
                : `Invalid index! Pick a number between 1 and ${paleMessages.length}.`;
        }

        return paleMessages[Math.floor(Math.random() * paleMessages.length)];
    }
};
