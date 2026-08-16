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
                  .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            // Fetch application emojis directly from the client application manager
            let emojis = await interaction.client.application.emojis.fetch();

            // Fallback to client cache if application fetch is empty
            if (!emojis || emojis.size === 0) {
                emojis = interaction.client.emojis.cache;
            }

            const filtered = emojis
                .filter(emoji => emoji.name.toLowerCase().includes(focusedValue))
                .map(emoji => ({
                    name: emoji.name,
                    value: emoji.id
                }))
                .slice(0, 25);

            await interaction.respond(filtered);
        } catch (error) {
            console.error('Error fetching application emojis for autocomplete:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const emojiId = interaction.options.getString('name');
        
        try {
            // Try fetching from application emojis first, then client cache
            let emoji = await interaction.client.application.emojis.fetch(emojiId).catch(() => null);
            if (!emoji) {
                emoji = interaction.client.emojis.cache.get(emojiId);
            }

            if (!emoji) {
                return await interaction.reply({ content: 'Emoji not found!', ephemeral: true });
            }

            const emojiVariants = [
                ` ${emoji.toString()}`
            ];

            return await interaction.reply(getRandomMessage(emojiVariants));
        } catch (error) {
            console.error('Error executing emoji command:', error);
            return await interaction.reply({ content: '❌ Failed to send emoji!', ephemeral: true });
        }
    }
};
