const { SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

const emojiMap = {
    'NoEatRam': '<:NoRamForU:1541510983908987031>', 
    'Bullshit': '<:Bullshit:1541509055154094081>', 
    'Ram': '<:Ram:1541508957216964668>', 
    'SusStare': '<:Sus:1541509245499875439>', 
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
    'Puro_Blush': '<:Puro_Blush6:1536430029104353380>',
    'Puro_Pathetic': '<:Puro_Pathetic6:1536430027468710019>',
    'puro_sad': '<:puro_sad:1536430025635799061>',
    'purocute': '<:purocute:1536367584369180803>',
    'puronervous': '<:puronervous:1536367581995335750>',
    'puroshock': '<:puroshock:1536366927230799972>',
    'puroblush': '<:puroblush:1536364136613806090>',
    'puroneutral': '<:puroneutral:1536364135342669824>',
    'Puroadorable': '<:Puroadorable:1536364133392457818>', 
    'UniTheCat': '<:UniTheCat:1539189751649935430>', 
    'Shorkboi': '<:Shorkboi:1542381402526449704>', 
    'Credit': '<:Credit:1541934198791737475>', 
    'Credit_old': '<:Credit_old:1541924089256607785>'
};

function resolveEmoji(interaction, emojiName) {
    let emojiString = null;
    if (interaction.guild) {
        const serverEmoji = interaction.guild.emojis.cache.find(e => e.name === emojiName);
        if (serverEmoji) emojiString = serverEmoji.toString();
    }
    return emojiString || emojiMap[emojiName] || null;
}

// 1. Slash Command
const slashCommand = new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('Send a custom emoji or reply to a message!')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])
    .addStringOption(option => 
        option.setName('name')
              .setDescription('Which emoji to send?')
              .setRequired(true)
              .addChoices(
                  ...Object.keys(emojiMap).slice(0, 25).map(name => ({ name, value: name }))
              )
    )
    .addStringOption(option =>
        option.setName('message_id')
              .setDescription('Optional: ID of the message to reply to')
              .setRequired(false)
    );

// 2. Context Menu (Hold Message > Apps > Emoji Reaction)
const contextMenuCommand = new ContextMenuCommandBuilder()
    .setName('Emoji Reply')
    .setType(ApplicationCommandType.Message)
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]);

module.exports = {
    data: slashCommand,
    contextMenu: contextMenuCommand,

    async execute(interaction) {
        // Handle Apps Context Menu Trigger (Message context)
        if (interaction.isMessageContextMenuCommand()) {
            const targetMessage = interaction.targetMessage;
            const randomEmojiName = Object.keys(emojiMap)[Math.floor(Math.random() * Object.keys(emojiMap).length)];
            const emojiString = resolveEmoji(interaction, randomEmojiName);

            return await interaction.reply({
                content: ` ${emojiString}`,
                reply: { messageReference: targetMessage.id }
            });
        }

        // Handle Slash Command Trigger
        if (interaction.isChatInputCommand()) {
            const emojiName = interaction.options.getString('name');
            const messageId = interaction.options.getString('message_id');
            const emojiString = resolveEmoji(interaction, emojiName);

            if (!emojiString) {
                return await interaction.reply({ content: 'Emoji not found!', flags: 64 });
            }

            const payload = { content: getRandomMessage([` ${emojiString}`]) };

            if (messageId) {
                payload.reply = { messageReference: messageId, failIfNotExists: false };
            }

            return await interaction.reply(payload);
        }
    }
};
