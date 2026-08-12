const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infect')
        .setDescription('Simulate exposure to the Pale Virus from Changed.')
        .addUserOption(option =>
            option.setName('target')
                  .setDescription('Who to infect (leave blank for yourself)')
                  .setRequired(false))
        .addIntegerOption(option =>
            option.setName('number')
                  .setDescription('Optional message variant')
                  .setRequired(false)),

    async execute(interaction, senderName, recipientName) {
        const targetText = recipientName === 'themselves' ? senderName : recipientName;

        const paleMessages = [
            `${targetText} has contracted the Pale virus. <:puro_sad:1536430025635799061>`,
            `${targetText} has been exposed to airborne Pale virus particles. <:puronervous:1536367581995335750>`,
            `${targetText} was exposed to Pale virus. <:Puropreocupado:1536430030916288572>`
        ];

        const numberInput = interaction.options.getInteger('number');
        if (numberInput !== null) {
            const index = numberInput - 1;
            return (index >= 0 && index < paleMessages.length) 
                ? paleMessages[index] 
                : `Invalid index! Pick a number between 1 and ${paleMessages.length}.`;
        }

        return paleMessages[Math.floor(Math.random() * paleMessages.length)];
    }
};
