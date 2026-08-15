const { SlashCommandBuilder } = require('discord.js');
const botConfig = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('springlock')
        .setDescription('Forces a recipient into a springlocked fursuit!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option =>
            option.setName('target')
                  .setDescription('The unfortunate soul to springlock')
                  .setRequired(true)
        ),

    async execute(interaction, senderName) {
        const targetUser = interaction.options.getUser('target');

        // Prevent targeting the bot itself or the sender if desired, though standard handles it fine
        if (targetUser.id === interaction.client.user.id) {
            return `Nice try, but you can't springlock me! I'm made of pure code and steel. <:puroshock:1536366927230799972>`;
        }

        const outcomes = [
            `${senderName} forces <@${targetUrl?.id || targetUser.id}> into a rigid springlocked suit... *CRUNCH*. Yikes! <:puro_sad:1536430025635799061>`,
            `${senderName} seals <@${targetUser.id}> inside a mechanical suit. The springlocks painfully give way amid a horrific mechanical crunch! <:Puro_Pathetic6:1536430027468710019>`,
            `${senderName} successfully locks <@${targetUser.id}> into the suit. Miraculously, the springlocks hold steady without snapping... for now. <:purocute:1536367584369180803>`
        ];

        // Pick a random outcome flavor
        const randomOutcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        
        // Re-mapping properly using targetUser.id
        return `${senderName} forces <@${targetUser.id}> into a springlocked fursuit! ` + (Math.random() < 0.5 
            ? `The locks suddenly snap under the pressure! Ouch... <:puroshock:1536366927230799972>` 
            : `They somehow manage to survive the mechanical nightmare intact! <:protogenirl:1536430038751121499>`);
    }
};
