const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('maid-dress')
        .setDescription('FORCE a user into a stylish maid dress!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who is wearing the dress?')
                  .setRequired(true)
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        // Self-Target Variants
        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} equipped a frilly black-and-white maid dress! <:maiddress:1536430032572911646>`,
                `${senderName} tossed a magical maid outfit directly at themselves. <:puronervous:1536367581995335750>`,
                `${senderName} shipped a high-priority delivery straight to themselves... It's a maid uniform! No turning back now. <:puroshock:1536366927230799972>`,
                `${senderName} forced themselves into a maid dress. Look at that pristine apron! <:Puro_Blush6:1536430029104353380>`
            ];
            return getRandomMessage(selfVariants);
        }

        // Standard Maid Dress Variants
        const dressVariants = [
            `${senderName} ambushed ${recipientName} and forcefully equipped them with a frilly black-and-white maid dress! <:maiddress:1536430032572911646>`,
            `${senderName} tossed a magical maid outfit at ${recipientName}. <:puroblush:1536364136613806090>`,
            `${senderName} shipped a high-priority delivery straight to ${recipientName}... It's a maid uniform! They have no choice now. <:purocute:1536367584369180803>`,
            `${senderName} forced ${recipientName} into a maid dress. Look at that pristine apron! <:puroblush:1536364136613806090>`
        ];

        return getRandomMessage(dressVariants);
    }
};
