const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

// 🛠️ DYNAMIC CONFIGURATION STATE
const arrestConfig = {
    tagUsers: false,
    tagOwner: false,
    ownerFallbackName: 'Agro388'
};

// Custom Discord Emoji Registry
const emojis = {
    Puro_doing_a_swim: '<:Puro_doing_a_swim:1538666516680282233>',
    AtariSquirrel: '<:AtariSquirrel:1538666298920140890>',
    Goober: '<:Goober:1538666294948270190>',
    InsaneCat: '<:InsaneCat:1538666024251953152>',
    MingCat: '<:MingCat:1538665942945366016>',
    FemaleKStare: '<:FemaleKStare:1538665851191042138>',
    DrKStare: '<:DrKStare:1538665762162483372>',
    FemDrK: '<:FemDrK:1538665667954344026>',
    DrK: '<:DrK:1538665609041149972>',
    CuteBlackCub: '<:CuteBlackCub:1538665557325254737>',
    ShiziSleeping: '<:ShiziSleeping:1538665475167486035>',
    puropolice: '<:puropolice:1538665393986605188>',
    puronervous2: '<:puronervous2:1538551211207430234>',
    thing: '<:thing:1537616433171796149>',
    protogenirl: '<:protogenirl:1536430038751121499>',
    maiddress: '<:maiddress:1536430032572911646>',
    Puropreocupado: '<:Puropreocupado:1536430030916288572>',
    Puro_Blush: '<:Puro_Blush6:1536430029104353380>',
    Puro_Pathetic: '<:Puro_Pathetic6:1536430027468710019>',
    puro_sad: '<:puro_sad:1536430025635799061>',
    purocute: '<:purocute:1536367584369180803>',
    puronervous: '<:puronervous:1536367581995335750>',
    puroshock: '<:puroshock:1536366927230799972>',
    puroblush: '<:puroblush:1536364136613806090>',
    puroneutral: '<:puroneutral:1536364135342669824>',
    Puroadorable: '<:Puroadorable:1536364133392457818>',
    UniTheCat: '<:UniTheCat:1539189751649935430>'
};

// Helper function to pick randomly between DrKStare and FemaleKStare
function getRandomStareEmoji() {
    const stareEmojis = [emojis.DrKStare, emojis.FemaleKStare];
    return stareEmojis[Math.floor(Math.random() * stareEmojis.length)];
}

// Index-mapped pool of targets using exclusively custom bot emojis
const TARGET_REGISTRY = [
    { index: 1, name: `humanity ${emojis.thing}` },
    { index: 2, name: `cats ${emojis.UniTheCat}` },
    { index: 3, name: `the universe ${emojis.puronervous}` },
    { index: 4, name: `the multiverse ${emojis.puronervous2}` },
    { index: 5, name: `the omniverse ${emojis.puroshock}` },
    { index: 6, name: `various species ${emojis.AtariSquirrel}` },
    { index: 7, name: `latex creatures ${emojis.Puro_doing_a_swim}` },
    { index: 8, name: `dark latex ${emojis.DrK}` },
    { index: 9, name: `white latex ${emojis.FemaleKStare}` },
    { index: 10, name: `the local bakery ${emojis.CuteBlackCub}` },
    { index: 11, name: `the server rules ${emojis.DrKStare}` },
    { index: 12, name: `an innocent rubber duck ${emojis.Goober}` },
    { index: 13, name: `the laws of physics ${emojis.Puropreocupado}` },
    { index: 14, name: `the Wi-Fi router ${emojis.puro_sad}` },
    { index: 15, name: `the temporal continuum ${emojis.puronervous}` },
    { index: 16, name: `a perfectly good Minecraft house ${emojis.Puro_Pathetic}` },
    { index: 17, name: `ProtoBot ${emojis.protogenirl}` },
    { index: 18, name: `Puro ${emojis.Puroadorable}` }
];

// Helper function to format target user display vs tag
function formatUserReference(user, interaction) {
    if (arrestConfig.tagUsers) {
        return `${user}`;
    }
    const member = interaction.guild?.members.cache.get(user.id);
    return member ? member.displayName : user.username;
}

// Target selection logic
function getTargetVictim(executor, targetUser, ownerId, interaction, manualIndex) {
    // 1. Manual Index Override
    if (manualIndex !== null) {
        if (manualIndex === 99) {
            if (targetUser && targetUser.id === ownerId) return `himself? ${emojis.puroshock}`;
            if (arrestConfig.tagOwner) return `<@${ownerId}>`;
            const ownerUser = interaction.client.users.cache.get(ownerId);
            return ownerUser ? ownerUser.username : arrestConfig.ownerFallbackName;
        }

        const matched = TARGET_REGISTRY.find(item => item.index === manualIndex);
        if (matched) return matched.name;
    }

    // 2. Weighted Random Selection
    const rand = Math.random();

    // Owner special chance (~15% chance, skipped if owner runs the command)
    if (ownerId && executor.id !== ownerId && rand < 0.15) {
        if (targetUser && targetUser.id === ownerId) {
            return `himself? ${emojis.puroshock}`;
        }
        if (arrestConfig.tagOwner) {
            return `<@${ownerId}>`;
        } else {
            const ownerUser = interaction.client.users.cache.get(ownerId);
            return ownerUser ? ownerUser.username : arrestConfig.ownerFallbackName;
        }
    }

    // Fallback to random item from TARGET_REGISTRY
    const randomEntry = TARGET_REGISTRY[Math.floor(Math.random() * TARGET_REGISTRY.length)];
    return randomEntry.name;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('arrest')
        .setDescription('Arrest system and settings')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        
        // --- SUBCOMMAND: RUN ---
        .addSubcommand(sub =>
            sub.setName('run')
                .setDescription('Arrest a user or yourself for heinous crimes')
                .addUserOption(opt =>
                    opt.setName('target')
                        .setDescription('The suspect to place under arrest (leave empty to turn yourself in)')
                        .setRequired(false)
                )
                .addIntegerOption(opt =>
                    opt.setName('target_index')
                        .setDescription('Specify a target index number (1-18, or 99 for bot owner)')
                        .setRequired(false)
                )
        )
        
        // --- SUBCOMMAND: CONFIG ---
        .addSubcommand(sub =>
            sub.setName('config')
                .setDescription('Configure arrest command tagging options (Admin/Owner only)')
                .addBooleanOption(opt =>
                    opt.setName('tag_users')
                        .setDescription('Enable or disable @mentions for standard users')
                        .setRequired(false)
                )
                .addBooleanOption(opt =>
                    opt.setName('tag_owner')
                        .setDescription('Enable or disable @mentions for the bot owner')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const ownerId = botConfig.OWNER_ID || botConfig.ownerId;

        // 🛠️ EXECUTE CONFIG SUBCOMMAND
        if (subcommand === 'config') {
            await interaction.deferReply({ flags: 64 });

            const isOwner = interaction.user.id === ownerId;
            const isAdmin = interaction.memberPermissions?.has(8n);

            if (!isOwner && !isAdmin) {
                await interaction.editReply({ content: '❌ You do not have permission to modify command settings.' });
                return true;
            }

            const newTagUsers = interaction.options.getBoolean('tag_users');
            const newTagOwner = interaction.options.getBoolean('tag_owner');

            if (newTagUsers !== null) arrestConfig.tagUsers = newTagUsers;
            if (newTagOwner !== null) arrestConfig.tagOwner = newTagOwner;

            await interaction.editReply({
                content: `⚙️ **Arrest Command Config Updated:**\n` +
                         `🔹 **Tag Users:** \`${arrestConfig.tagUsers}\`\n` +
                         `🔹 **Tag Owner:** \`${arrestConfig.tagOwner}\``
            });
            return true;
        }

        // 🚨 EXECUTE RUN SUBCOMMAND
        if (subcommand === 'run') {
            await interaction.deferReply();

            const targetUser = interaction.options.getUser('target');
            const manualIndex = interaction.options.getInteger('target_index');
            const executor = interaction.user;

            const stareEmoji = getRandomStareEmoji();
            let arrestMessage = '';

            if (!targetUser || targetUser.id === executor.id) {
                // Self-arrest scenario
                const selfRef = formatUserReference(executor, interaction);
                arrestMessage = `${emojis.puropolice} **${selfRef}** turned themselves in and was **placed under arrest** for their own evil crimes! ${stareEmoji}`;
            } else {
                // Target user arrest scenario
                const suspectRef = formatUserReference(targetUser, interaction);
                const executorRef = formatUserReference(executor, interaction);
                const victim = getTargetVictim(executor, targetUser, ownerId, interaction, manualIndex);

                arrestMessage = `${emojis.puropolice} **${suspectRef}** was **arrested** by **${executorRef}** for their evil crimes against **${victim}**! ${stareEmoji}`;
            }

            const allowedMentions = { parse: [] };
            if (arrestConfig.tagUsers || arrestConfig.tagOwner) {
                allowedMentions.parse.push('users');
            }

            await interaction.editReply({ 
                content: arrestMessage,
                allowedMentions: allowedMentions
            });
            return true;
        }
    }
};
