const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('springlock')
        .setDescription('Forces a recipient (or yourself!) into a springlocked fursuit!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option =>
            option.setName('target')
                  .setDescription('The unfortunate soul to springlock (leave blank to springlock yourself!)')
                  .setRequired(false)
        ),

    async execute(interaction, senderName) {
        const targetUser = interaction.options.getUser('target');

        // If no target is provided, springlock the sender themselves!
        if (!targetUser || targetUser.id === interaction.user.id) {
            const selfOutcomes = [
                `${senderName} bravely (or foolishly) steps into a springlocked suit themselves... *CRUNCH*. Well, that was a mistake. <:puro_sad:1536430025635799061>`,
                `${senderName} seals themselves inside the mechanical suit. The springlocks violently fail all at once! <:Puro_Pathetic6:1536430027468710019>`,
                `${senderName} climbs into the springlocked suit and somehow manages to adjust everything safely. Miraculously, zero springlocks went off! <:purocute:1536367584369180803>`
            ];
            return selfOutcomes[Math.floor(Math.random() * selfOutcomes.length)];
        }

        // Prevent targeting the bot itself
        if (targetUser.id === interaction.client.user.id) {
            return `Nice try, but you can't springlock me! I'm made of pure code and steel. <:puroshock:1536366927230799972>`;
        }

        const outcomes = [
            `${senderName} forces <@${targetUser.id}> into a rigid springlocked suit... *CRUNCH*. Yikes! <:puro_sad:1536430025635799061>`,
            `${senderName} seals <@${targetUser.id}> inside a mechanical suit. The springlocks painfully give way amid a horrific mechanical crunch! <:Puro_Pathetic6:1536430027468710019>`,
            `${senderName} successfully locks <@${targetUser.id}> into the suit. Miraculously, the springlocks hold steady without snapping... for now. <:purocute:1536367584369180803>`
        ];

        // Pick and return a random outcome flavor for targeting someone else
        return outcomes[Math.floor(Math.random() * outcomes.length)];
    }
};
