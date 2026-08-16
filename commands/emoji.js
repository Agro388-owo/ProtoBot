const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Curated list of your custom emojis with their names and IDs from the screenshot
const customEmojis = [
    { name: 'puronervous2', id: '1538551211207430234' },
    { name: 'thing', id: '1537616433171796149' },
    { name: 'protogenirl', id: '1536430038751121499' },
    { name: 'maidddress', id: '1536430032572911646' },
    { name: 'Puropreocupado', id: '1536430030916288572' },
    { name: 'Puro_Blush6', id: '1536430029104353380' },
    { name: 'Puro_Pathetic6', id: '1536430027468710019' },
    { name: 'puro_sad', id: '1536430025635799061' },
    { name: 'purocute', id: '1536367584369180803' },
    { name: 'puronervous', id: '1536367581995335750' },
    { name: 'puroshock', id: '1536366927230799972' },
    { name: 'puroblush', id: '1536364136613806090' },
    { name: 'puroneutral', id: '1536364135342669824' },
    { name: 'Puroadorable', id: '1536364133392457818' }
];

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
            
            const filtered = customEmojis
                .filter(emoji => emoji.name.toLowerCase().includes(focusedValue))
                .map(emoji => ({
                    name: emoji.name,
                    value: emoji.id
                }))
                .slice(0, 25);

            await interaction.respond(filtered);
        } catch (error) {
            console.error('Error handling emoji autocomplete:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const emojiId = interaction.options.getString('name');
        
        const foundEmoji = customEmojis.find(e => e.id === emojiId);

        if (!foundEmoji) {
            return await interaction.reply({ content: '❌ Emoji not found in the custom list!', ephemeral: true });
        }

        const emojiString = `<:${foundEmoji.name}:${foundEmoji.id}>`;

        const emojiVariants = [
            ` ${emojiString}`
        ];

        return await interaction.reply(getRandomMessage(emojiVariants));
    }
};
