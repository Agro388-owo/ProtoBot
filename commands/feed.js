const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

// Tags file path matching tags.js
const localTagsPath = path.join(process.cwd(), 'tags.json');

// Default allowed species list for tech food
let validTechSpecies = ['protogen', 'primagen', 'synth'];

// Helper to load tags from local file or GitHub (fallback)
async function loadTagsData() {
    try {
        if (fs.existsSync(localTagsPath)) {
            const data = fs.readFileSync(localTagsPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('[FEED DEBUG] Error reading local tags.json:', err);
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
        console.error('[FEED DEBUG] Failed to fetch tags from GitHub:', err);
    }
    return {};
}

// Check if user has any of the valid species tags
function isCyberneticSpecies(userTags) {
    if (!Array.isArray(userTags)) return false;
    return userTags.some(t => validTechSpecies.includes(String(t).toLowerCase()));
}

// Generates a random DDR generation between DDR1 and DDR100
function getRandomDDR() {
    const gen = Math.floor(Math.random() * 100) + 1;
    return `DDR${gen}`;
}

const RESPONSES = {
    ram: {
        successSelf: [
            "**{executor}** happily munched on a fresh stick of **{ddr}** RAM! <:protogenirl:1536430038751121499>",
            "**{executor}** devoured a high-speed **{ddr}** RAM stick! Task manager is looking great. <:Ram:1541508957216964668>"
        ],
        failSelf: [
            "**{executor}** tried to swallow a **{ddr}** RAM stick, choked on the circuit board, and violently coughed it right back up! <:NoRamForU:1541510983908987031>",
            "**{executor}** bit down on a **{ddr}** RAM stick, chipped a tooth on the memory chips, and nearly choked! <:Sus:1541509245499875439>"
        ],
        successOther: [
            "**{executor}** fed a juicy stick of **{ddr}** RAM to **{target}**! <:Ram:1541508957216964668>",
            "**{executor}** offered top-tier **{ddr}** RAM to **{target}**, who happily gobbled it up! <:Puroadorable:1536364133392457818>"
        ],
        failOther: [
            "**{executor}** tried to force-feed **{ddr}** RAM to **{target}**, but they started choking on it! <:NoRamForU:1541510983908987031>",
            "**{executor}** shoved a **{ddr}** RAM stick down **{target}**'s throat, causing them to choke! <:Sus:1541509245499875439>"
        ]
    },
    battery: {
        successSelf: [
            "**{executor}** recharged by consuming a lithium battery pack! <:puroshock:1536366927230799972>",
            "**{executor}** absorbed a 9V battery. Maximum energy restored! <:Goober:1538666294948270190>"
        ],
        failSelf: [
            "**{executor}** tried to swallow a battery, gagged on the metallic casing, and immediately spit it out! <:puronervous:1536367581995335750>",
            "**{executor}** choked on a lithium cell pack while trying to chew it! <:DrKStare:1538665762162483372>"
        ],
        successOther: [
            "**{executor}** handed a fully charged battery to **{target}**, who powered right up! <:Goober:1538666294948270190>",
            "**{executor}** plugged **{target}** into a high-voltage charger! <:puroshock:1536366927230799972>"
        ],
        failOther: [
            "**{executor}** tried feeding a battery to **{target}**, who immediately choked on the hard battery shell! <:puronervous2:1538551211207430234>",
            "**{executor}** shoved a battery into **{target}**'s mouth, but **{target}** gagged and spit it right back at them! <:FemaleKStare:1538665851191042138>"
        ]
    },
    fish: {
        self: [
            "**{executor}** enjoyed a fresh raw fish! <:Puro_doing_a_swim:1538666516680282233>",
            "**{executor}** snagged a fish and ate it in one bite! <:purocute:1536367584369180803>"
        ],
        other: [
            "**{executor}** offered a fresh fish to **{target}**! <:purocute:1536367584369180803>",
            "**{executor}** tossed a fish directly at **{target}**! <:Puro_doing_a_swim:1538666516680282233>"
        ]
    },
    pastry: {
        self: [
            "**{executor}** ate a freshly baked pastry! <:CuteBlackCub:1538665557325254737>",
            "**{executor}** indulged in a sweet bakery treat! <:Puro_Blush6:1536430029104353380>"
        ],
        other: [
            "**{executor}** shared a sweet pastry with **{target}**! <:Puro_Blush6:1536430029104353380>",
            "**{executor}** gave **{target}** a freshly baked donut! <:CuteBlackCub:1538665557325254737>"
        ]
    },
    junk: {
        self: [
            "**{executor}** ate some questionable trash... <:thing:1537616433171796149>",
            "**{executor}** found a random mysterious object and decided to eat it. <:InsaneCat:1538666024251953152>"
        ],
        other: [
            "**{executor}** tried feeding total nonsense to **{target}**! <:thing:1537616433171796149>",
            "**{executor}** handed a suspicious object to **{target}**... <:Sus:1541509245499875439>"
        ]
    }
};

function getRandomMessage(type, isSelf, executor, target, canEatTech) {
    let pool = [];

    if (type === 'ram' || type === 'battery') {
        if (isSelf) {
            pool = canEatTech ? RESPONSES[type].successSelf : RESPONSES[type].failSelf;
        } else {
            pool = canEatTech ? RESPONSES[type].successOther : RESPONSES[type].failOther;
        }
    } else {
        pool = isSelf ? RESPONSES[type].self : RESPONSES[type].other;
    }

    const template = pool[Math.floor(Math.random() * pool.length)];
    const ddrType = getRandomDDR();

    return template
        .replace(/{executor}/g, `<@${executor.id}>`)
        .replace(/{target}/g, `<@${target.id}>`)
        .replace(/{ddr}/g, ddrType);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feed')
        .setDescription('Feed yourself or another user!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('ram')
                .setDescription('Feed some fresh RAM sticks')
                .addUserOption(opt => opt.setName('target').setDescription('Who to feed').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('battery')
                .setDescription('Feed a high-capacity battery pack')
                .addUserOption(opt => opt.setName('target').setDescription('Who to feed').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('fish')
                .setDescription('Feed a fresh fish')
                .addUserOption(opt => opt.setName('target').setDescription('Who to feed').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('pastry')
                .setDescription('Feed a sweet pastry')
                .addUserOption(opt => opt.setName('target').setDescription('Who to feed').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('junk')
                .setDescription('Feed some questionable items')
                .addUserOption(opt => opt.setName('target').setDescription('Who to feed').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('config')
                .setDescription('[Owner/Admin] Manage allowed tech-eating species tags')
                .addStringOption(opt =>
                    opt.setName('action')
                        .setDescription('Add, remove, or list allowed species tags')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add Tag', value: 'add' },
                            { name: 'Remove Tag', value: 'remove' },
                            { name: 'List Tags', value: 'list' }
                        )
                )
                .addStringOption(opt =>
                    opt.setName('tag')
                        .setDescription('The tag keyword to modify (e.g. protogen, synth)')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'config') {
            await interaction.deferReply({ flags: 64 });

            const ownerId = botConfig.OWNER_ID || botConfig.ownerId;
            const isOwner = interaction.user.id === ownerId;
            const isAdmin = interaction.memberPermissions?.has(8n);

            if (!isOwner && !isAdmin) {
                return await interaction.editReply({ content: '❌ You do not have permission to modify feed species settings.' });
            }

            const action = interaction.options.getString('action');
            const tagInput = interaction.options.getString('tag')?.trim().toLowerCase();

            if (action === 'list') {
                const list = validTechSpecies.map((t, i) => `${i + 1}. \`${t}\``).join('\n');
                return await interaction.editReply({ content: `⚙️ **Tech Food Allowed Species Tags:**\n${list}` });
            }

            if (!tagInput) {
                return await interaction.editReply({ content: '⚠️ Please specify a tag keyword.' });
            }

            if (action === 'add') {
                if (validTechSpecies.includes(tagInput)) {
                    return await interaction.editReply({ content: `⚠️ Tag \`${tagInput}\` is already allowed!` });
                }
                validTechSpecies.push(tagInput);
                return await interaction.editReply({ content: `✅ Added \`${tagInput}\` to the tech-eating species list!` });
            }

            if (action === 'remove') {
                const index = validTechSpecies.indexOf(tagInput);
                if (index === -1) {
                    return await interaction.editReply({ content: `⚠️ Could not find tag \`${tagInput}\` in allowed list.` });
                }
                validTechSpecies.splice(index, 1);
                return await interaction.editReply({ content: `🗑️ Removed \`${tagInput}\` from the tech-eating species list!` });
            }
        }

        await interaction.deferReply();

        const executor = interaction.user;
        const target = interaction.options.getUser('target') || executor;
        const isSelf = target.id === executor.id;

        const recipient = isSelf ? executor : target;
        const allTags = await loadTagsData();
        const recipientEntry = allTags[recipient.id];
        const recipientTags = (recipientEntry && Array.isArray(recipientEntry.tags)) ? recipientEntry.tags : [];

        const canEatTech = isCyberneticSpecies(recipientTags);
        const message = getRandomMessage(subcommand, isSelf, executor, target, canEatTech);

        await interaction.editReply({ content: message });
        return true;
    }
};
