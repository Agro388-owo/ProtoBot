const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cheese')
        .setDescription('Throw a slice of cheese at someone!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option =>
            option.setName('target')
                  .setDescription('Who are you throwing cheese at?')
                  .setRequired(true)
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target');

        const cheeseMessages = [
            `${senderName} chucks a single slice of American cheese directly at ${recipientName}'s face! **SLAP.** 🧀`,
            `${senderName} stealthily sneaks up and flings a piece of cheese right onto ${recipientName}! It sticks instantly! 🧀✨`,
            `${senderName} tosses a slice of cheese through the air... Direct hit on ${recipientName}'s head! 🧀`,
            `${senderName} aerodynamic-throws a slice of cheese, landing it flat against ${recipientName} with a loud *squelch*. 🧀`
        ];

        if (interaction.user.id === targetUser.id) {
            return `${senderName} tries to throw a slice of cheese at themselves... but it just hits their own face. Classic. 🧀`;
        }

        return getRandomMessage(cheeseMessages);
    }
};
