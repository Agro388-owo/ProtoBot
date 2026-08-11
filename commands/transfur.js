const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfur')
        .setDescription('Transform a user into a custom latex or creature form!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who is getting transformed?')
                  .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('form')
                  .setDescription('Choose the transformation form')
                  .setRequired(false)
                  .addChoices(
                      { name: 'Latex Creature', value: 'latex' },
                      { name: 'Protogen', value: 'protogen' },
                      { name: 'Snow Leopard', value: 'leopard' },
                      { name: 'Dark Latex Wolf', value: 'wolf' },
                      { name: 'Blank / Custom', value: 'blank' }
                  )
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');
        const formChoice = interaction.options.getString('form') || 'latex';

        // 📭 Blank / Custom option handling
        if (formChoice === 'blank') {
            if (interaction.user.id === targetUser.id) {
                return `${senderName} underwent a mysterious change...`;
            }
            return `${senderName} transformed ${recipientName}...`;
        }

        // 🐾 Form-specific message lists
        const formMessages = {
            latex: {
                self: [
                    `${senderName} exposed themselves to sticky latex and converted completely! <:protogenirl:1536430038751121499>`,
                    `${senderName} stepped into a pool of dark latex and merged with it!`
                ],
                other: [
                    `${senderName} exposed ${recipientName} to sticky latex, converting them completely! <:protogenirl:1536430038751121499>`,
                    `${senderName} splashed ${recipientName} with liquid latex, absorbing them into a new form!`
                ]
            },
            protogen: {
                self: [
                    `${senderName} ran a self-diagnostic and rewrote their own firmware into a protogen! <:protoram:1536430036524204113>`,
                    `${senderName} triggered a system override and rebooted as a protogen! <:protogenpop11:1536430034561269780>`
                ],
                other: [
                    `${senderName} ran a system diagnostic on ${recipientName}, rewriting their firmware into a protogen! <:protoram:1536430036524204113>`,
                    `${senderName} upgraded ${recipientName}'s OS into a sleek new protogen chassis!`
                ]
            },
            leopard: {
                self: [
                    `${senderName} absorbed a snow leopard latex sample and took on a fluffy spotted form!`,
                    `${senderName} transformed into a swift snow leopard creature!`
                ],
                other: [
                    `${senderName} pounced on ${recipientName} with a snow leopard latex sample, transforming them into a fluffy feline!`,
                    `${senderName} converted ${recipientName} into a cozy snow leopard form!`
                ]
            },
            wolf: {
                self: [
                    `${senderName} merged with a dark latex wolf, shifting into a sleek hound form!`,
                    `${senderName} embraced the dark latex pack and became a wolf!`
                ],
                other: [
                    `${senderName} wrapped ${recipientName} in dark latex, turning them into a loyal dark latex wolf!`,
                    `${senderName} converted ${recipientName} into a stealthy dark latex hound!`
                ]
            }
        };

        const selectedPool = formMessages[formChoice] || formMessages.latex;

        if (interaction.user.id === targetUser.id) {
            return getRandomMessage(selectedPool.self);
        }

        return getRandomMessage(selectedPool.other);
    }
};
