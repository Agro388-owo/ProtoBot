const { SlashCommandBuilder } = require('discord.js');

// Random object pool using only custom bot emojis
const RANDOM_OBJECTS = [
    { name: "a rusty metal pipe", emoji: "<:thing:1537616433171796149>" },
    { name: "a stick of high-speed DDR5 RAM", emoji: "<:Ram:1541508957216964668>" },
    { name: "a squeaky rubber duck", emoji: "<:Goober:1538666294948270190>" },
    { name: "a whole fresh salmon", emoji: "<:Puro_doing_a_swim:1538666516680282233>" },
    { name: "a heavy lithium battery pack", emoji: "<:puroshock:1536366927230799972>" },
    { name: "a giant rolled-up newspaper", emoji: "<:puropolice:1538665393986605188>" },
    { name: "a stale bakery baguette", emoji: "<:CuteBlackCub:1538665557325254737>" },
    { name: "an entire desktop tower", emoji: "<:protogenirl:1536430038751121499>" }
];

// Impact reaction emojis to pick from randomly
const IMPACT_EMOJIS = [
    "<:puroshock:1536366927230799972>",
    "<:puro_sad:1536430025635799061>",
    "<:puronervous2:1538551211207430234>",
    "<:DrKStare:1538665762162483372>",
    "<:Puro_Pathetic:1536430027468710019>",
    "<:InsaneCat:1538666024251953152>"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hit')
        .setDescription('Hit someone with a random item or a custom object!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(opt => 
            opt.setName('target')
                .setDescription('The user you want to hit')
                .setRequired(true)
        )
        .addStringOption(opt => 
            opt.setName('object')
                .setDescription('Optional custom item to hit them with (e.g. a metal pole)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const executor = interaction.user;
        const target = interaction.options.getUser('target');
        const customObject = interaction.options.getString('object')?.trim();

        const isSelf = target.id === executor.id;
        const reactionEmoji = IMPACT_EMOJIS[Math.floor(Math.random() * IMPACT_EMOJIS.length)];

        let message = '';

        if (customObject) {
            // Using custom item input
            if (isSelf) {
                message = `**${executor.username}** somehow managed to hit themselves with **${customObject}**! ${reactionEmoji}`;
            } else {
                message = `**${executor.username}** whacked **${target.username}** over the head with **${customObject}**! ${reactionEmoji}`;
            }
        } else {
            // Picking a random item from the pool
            const randomItem = RANDOM_OBJECTS[Math.floor(Math.random() * RANDOM_OBJECTS.length)];
            
            if (isSelf) {
                message = `**${executor.username}** swung wildly and hit themselves with **${randomItem.name}**! ${randomItem.emoji}`;
            } else {
                message = `**${executor.username}** hit **${target.username}** with **${randomItem.name}**! ${randomItem.emoji}`;
            }
        }

        await interaction.editReply({ content: message });
        return true;
    }
};
