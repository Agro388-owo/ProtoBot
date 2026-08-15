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
                      { name: 'Tiger Shark', value: 'shark' },
                      { name: 'Snow Leopard', value: 'leopard' },
                      { name: 'Dark Latex Wolf', value: 'wolf' },
                      { name: 'ProtoBot', value: 'protobot' },
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

        // 🐾 Form-specific message lists with expanded pool/substance themes
        const formMessages = {
            latex: {
                self: [
                    `${senderName} took a bath in a pool of dark latex and dissolved into a shiny new form! <:protogenirl:1536430038751121499>`,
                    `${senderName} stepped into a bubbling vat of liquid latex and merged with it completely!`,
                    `${senderName} accidentally slipped into a latex puddle and got thoroughly absorbed!`
                ],
                other: [
                    `${senderName} threw ${recipientName} into a pool of dark latex, converting them completely! <:protogenirl:1536430038751121499>`,
                    `${senderName} pushed ${recipientName} into a vat of liquid latex, absorbing them into a shiny new form!`,
                    `${senderName} splashed ${recipientName} with a wave of sticky latex until they transformed!`
                ]
            },
            protogen: {
                self: [
                    `${senderName}put on a facny visor on and became a protogen! <:protogenirl:1536430038751121499>`,
                    `${senderName} somehow became a protogen! <:protogenirl:1536430038751121499>`
                ],
                other: [
                    `${senderName} threw ${recipientName} into a pool with metalic liquid, turning them into a protogen!`,
                    `${senderName} pushed ${recipientName} into a high-tech chamber, converting them into protogen! <:protogenirl:1536430038751121499>`
                ]
            },
            shark: {
                self: [
                    `${senderName} took a long swim in an aquatic latex pool and shifted into a striped tiger shark! 🦈`,
                    `${senderName} plunged headfirst into a tank of shark latex, growing a sleek tail and fin!`,
                    `${senderName} dove into a deep blue fluid reservoir and emerged as an eager tiger shark!`
                ],
                other: [
                    `${senderName} threw ${recipientName} into a pool of aquatic latex, converting them into a striped tiger shark! 🦈`,
                    `${senderName} shoved ${recipientName} into a deep water tank filled with shark latex!`,
                    `${senderName} splashed ${recipientName} with a heavy wave of fluid, turning them into a friendly shark!`
                ]
            },
            leopard: {
                self: [
                    `${senderName} rolled around in a snow leopard latex deposit, taking on a fluffy spotted form!`,
                    `${senderName} waded through a chilled basin of white and grey latex, emerging as a swift feline!`,
                    `${senderName} absorbed a snow leopard sample from a testing pool and grew soft paws!`
                ],
                other: [
                    `${senderName} threw ${recipientName} into a snow leopard latex basin, transforming them into a fluffy feline!`,
                    `${senderName} pushed ${recipientName} right into a cold puddle of spotted latex!`,
                    `${senderName} wrapped ${recipientName} in a thick blanket of snow leopard goo!`
                ]
            },
            wolf: {
                self: [
                    `${senderName} stepped into a den filled with dark latex fluid and shifted into a sleek hound!`,
                    `${senderName} bathed in a pool of pure dark latex, embracing the pack as a wolf!`,
                    `${senderName} sank into a murky shadow pool and rose up as a dark latex wolf!`
                ],
                other: [
                    `${senderName} threw ${recipientName} into a pool of dark latex, turning them into a loyal wolf!`,
                    `${senderName} shoved ${recipientName} into a shadow pit filled with receptive latex hounds!`,
                    `${senderName} dunked ${recipientName} into a dark latex vat until they completely joined the pack!`
                ]
            },
            protobot: {
                self: [
                    `${senderName} got transfurred into <@1536203903022931968> *— now we can finally be one...* <:protogenirl:1536430038751121499>`,
                    `${senderName} merged with a pool of metallic goo, whispering *— at last, we are one* with <@1536203903022931968> <:protogenirl:1536430038751121499>`,
                    `${senderName} stepped into a shimmering pool and got transfurred into <@1536203903022931968> *— together, we are finally whole* <:protogenirl:1536430038751121499>`,
                    `${senderName} was completely absorbed by a puddle of metallic goo, thinking *— now nothing can keep us apart from <@1536203903022931968>* <:protogenirl:1536430038751121499>`
                ],
                other: [
                    `${recipientName} got transfurred into <@1536203903022931968> *— now we can finally be one...* <:protogenirl:1536430038751121499>`,
                    `${recipientName} merged with a pool of metallic goo, whispering *— at last, we are one* with <@1536203903022931968> <:protogenirl:1536430038751121499>`,
                    `${senderName} pulled ${recipientName} into a glowing vat, getting them transfurred into <@1536203903022931968> *— together, we are finally whole* <:protogenirl:1536430038751121499>`,
                    `${senderName} splashed ${recipientName} with a wave of metallic goo, murmuring *— now nothing can keep us apart from <@1536203903022931968>* <:protogenirl:1536430038751121499>`
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
