const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

const emojiMap = {
    'maiddress': '<:maiddress:1536430032572911646>',
    'protogenirl': '<:protogenirl:1536430038751121499>',
    'protoram': '<:protoram:1536430036524204113>',
    'protogenpop11': '<:protogenpop11:1536430034561269780>',
    'Purodance': '<:Purodance:1536429613641760768>',
    'puro_spin': '<:puro_spin:1536429933562175648>',
    'Puropreocupado': '<:Puropreocupado:1536430030916288572>',
    'Puro_Blush6': '<:Puro_Blush6:1536430029104353380>',
    'Puro_Pathetic6': '<:Puro_Pathetic6:1536430027468710019>',
    'puro_sad': '<:puro_sad:1536430025635799061>',
    'purocute': '<:purocute:1536367584369180803>',
    'puronervous': '<:puronervous:1536367581995335750>',
    'puroshock': '<:puroshock:1536366927230799972>',
    'puroblush': '<:puroblush:1536364136613806090>',
    'puroneutral': '<:puroneutral:1536364135342669824>',
    'Puroadorable': '<:Puroadorable:1536364133392457818>'
};

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
                  .addChoices(
                      ...Object.keys(emojiMap).slice(0, 25).map(name => ({ name, value: name }))
                  )
        ),

    async execute(interaction) {
        const emojiName = interaction.options.getString('name');
        const emojiString = emojiMap[emojiName];

        if (!emojiString) {
            return 'Emoji not found!';
        }

        const emojiVariants = [
            ` ${emojiString}`
        ];

        return getRandomMessage(emojiVariants);
    }
};
