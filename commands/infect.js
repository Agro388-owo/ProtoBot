const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infect')
        .setDescription('Simulate an infection from a fictional virus!')
        .addStringOption(option =>
            option.setName('virus')
                  .setDescription('Choose the type of virus')
                  .setRequired(true)
                  .addChoices(
                      { name: 'Pale Virus (Changed)', value: 'pale' },
                      { name: 'T-Virus (Resident Evil)', value: 'tvirus' },
                      { name: 'Cybernetic Nanites', value: 'nanites' },
                      { name: 'Unknown Anomaly', value: 'unknown' }
                  ))
        .addUserOption(option =>
            option.setName('target')
                  .setDescription('Who do you want to infect? (Leave blank to infect yourself)')
                  .setRequired(false))
        .addIntegerOption(option =>
            option.setName('number')
                  .setDescription('Optional sequence message variant')
                  .setRequired(false)),

    async execute(interaction, senderName, recipientName) {
        const virusType = interaction.options.getString('virus');
        const isTargetSelf = recipientName === 'themselves';
        const targetText = isTargetSelf ? `${senderName}` : recipientName;

        const infections = {
            pale: [
                `${targetText} has been exposed to the Pale virus! Transformation progress is starting... <:puro_sad:1536430025635799061>`,
                `Bio-hazard alert! ${targetText} contracted the Pale virus. Antivexin levels dropping rapidly! <:puronervous:1536367581995335750>`,
                `${targetText} breathed in pale spores. Their form begins to shift and change... <:Puropreocupado:1536430030916288572>`
            ],
            tvirus: [
                `Umbrella Corporation breach! ${targetText} is infected with the T-Virus. Mutation imminent.`,
                `${targetText} walks the halls with a limp... T-Virus symptoms detected in the bloodstream.`,
                `Warning: ${targetText}'s cellular structure is collapsing under the T-Virus strain.`
            ],
            nanites: [
                `Autonomous nanites have flooded ${targetText}'s system! Neural network takeover in progress...`,
                `${targetText} is experiencing severe technical glitching as alien nanites rewrite their code.`,
                `System notice: ${targetText} is being converted into a cybernetic unit.`
            ],
            unknown: [
                `An unknown spatial anomaly has attached itself to ${targetText}. Reality warping detected.`,
                `${targetText}'s aura turns unstable. What kind of virus even is this?!`,
                `Severe corruption signature found on ${targetText}. Quarantine recommended immediately.`
            ]
        };

        const messages = infections[virusType] || infections.pale;

        const numberInput = interaction.options.getInteger('number');
        if (numberInput !== null) {
            const index = numberInput - 1;
            if (index >= 0 && index < messages.length) {
                return messages[index];
            } else {
                return `Invalid message index! Please pick a number between 1 and ${messages.length}.`;
            }
        }

        return messages[Math.floor(Math.random() * messages.length)];
    }
};
