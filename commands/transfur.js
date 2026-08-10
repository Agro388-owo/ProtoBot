const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfur')
        .setDescription('Transform a user into a sticky latex creature!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who is getting transformed?')
                  .setRequired(true)
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        if (interaction.user.id === targetUser.id) {
            const selfVariants = [
                `${senderName} exposed themselves to latex and converted completely! <:protogenirl:1536430038751121499>`,
                `${senderName} ran a self-diagnostic and rewrote their own firmware into a protogen! <:protoram:1536430036524204113>`,
                `${senderName} triggered a system override on themselves! <:protogenpop11:1536430034561269780>`
            ];
            return getRandomMessage(selfVariants);
        }

        const transfurVariants = [
            `${senderName} exposed ${recipientName} to latex, converting them completely! <:protogenirl:1536430038751121499>`,
            `${senderName} ran a diagnostic on ${recipientName}, rewriting their firmware into a protogen! <:protoram:1536430036524204113>`,
            `${senderName} triggered a system override on ${recipientName}! <:protogenpop11:1536430034561269780>`
        ];

        return getRandomMessage(transfurVariants);
    }
};
