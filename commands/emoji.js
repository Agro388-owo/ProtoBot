const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('Send a custom emoji with a blank space prefix!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addStringOption(option => 
            option.setName('name')
                  .setDescription('Which emoji to send?')
                  .setRequired(true)
                  .setAutocomplete(true) // Enables dynamic autocomplete
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        
        // Automatically grab all emojis the bot has access to
        const emojis = interaction.client.emojis.cache;

        // Map them into choice objects for Discord, filtering by what the user is typing
        const filtered = emojis
            .filter(emoji => emoji.name.toLowerCase().includes(focusedValue))
            .map(emoji => ({
                name: emoji.name,
                value: emoji.id
            }))
            .slice(0, 25); // Discord allows a maximum of 25 choices

        await interaction.respond(filtered);
    },

    async execute(interaction) {
        const emojiId = interaction.options.getString('name');
        
        // Fetch the emoji by its ID from the client cache
        const emoji = interaction.client.emojis.cache.get(emojiId);

        if (!emoji) {
            return await interaction.reply({ content: 'Emoji not found!', ephemeral: true });
        }

        const emojiVariants = [
            ` ${emoji.toString()}`
        ];

        return await interaction.reply(getRandomMessage(emojiVariants));
    }
};
