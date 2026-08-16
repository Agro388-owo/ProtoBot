const { SlashCommandBuilder } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

const emojiMap = {
    'Puro_doing_a_swim': '<:Puro_doing_a_swim:1538666516680282233>',
    'AtariSquirrel': '<:AtariSquirrel:1538666298920140890>',
    'Goober': '<:Goober:1538666294948270190>',
    'InsaneCat': '<:InsaneCat:1538666024251953152>',
    'MingCat': '<:MingCat:1538665942945366016>',
    'FemaleKStare': '<:FemaleKStare:1538665851191042138>',
    'DrKStare': '<:DrKStare:1538665762162483372>',
    'FemDrK': '<:FemDrK:1538665667954344026>',
    'DrK': '<:DrK:1538665609041149972>',
    'CuteBlackCub': '<:CuteBlackCub:1538665557325254737>',
    'ShiziSleeping': '<:ShiziSleeping:1538665475167486035>',
    'puropolice': '<:puropolice:1538665393986605188>',
    'puronervous2': '<:puronervous2:1538551211207430234>',
    'thing': '<:thing:1537616433171796149>',
    'protogenirl': '<:protogenirl:1536430038751121499>',
    'maiddress': '<:maiddress:1536430032572911646>',
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
            return await interaction.reply({ content: 'Emoji not found!', ephemeral: true });
        }

        const emojiVariants = [
            ` ${emojiString}`
        ];

        return await interaction.reply(getRandomMessage(emojiVariants));
    }
};
