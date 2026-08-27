const { SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

const emojiMap = {
    // --- PAGE 1 (Items 1 - 20) ---
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

    // --- PAGE 2 (Items 21 - 39) ---
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
    'Credit_old': '<:Credit_old:1541924089256607785>', 
    'Agro388': '<:Agro388:1542396105738948689>', 
    'ProtoBot': '<:ProtoBot:1542397144315600996>', 
    'Bloxy': '<:Bloxy:1542398280699220040>', 
    'Steven130': '<:Steven130:1542399890783604787>', 
    'Benjamin391': '<:Benjamin391:1542399892381507665>'
};

const allKeys = Object.keys(emojiMap);
const page1Keys = allKeys.slice(0, 20);
const page2Keys = allKeys.slice(20, 40);

function resolveEmoji(interaction, emojiName) {
    let emojiString = null;
    if (interaction.guild) {
        const serverEmoji = interaction.guild.emojis.cache.find(e => e.name === emojiName);
        if (serverEmoji) emojiString = serverEmoji.toString();
    }
    return emojiString || emojiMap[emojiName] || null;
}

// 1. Slash Command with Page Subcommands
const slashCommand = new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('Send a custom emoji or reply to a message!')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2])

    // --- Subcommand Page 1 ---
    .addSubcommand(sub =>
        sub.setName('page1')
           .setDescription('Select an emoji from Page 1')
           .addStringOption(opt =>
               opt.setName('name')
                  .setDescription('Which emoji to send?')
                  .setRequired(true)
                  .addChoices(...page1Keys.map(k => ({ name: k, value: k })))
           )
    )

    // --- Subcommand Page 2 ---
    .addSubcommand(sub =>
        sub.setName('page2')
           .setDescription('Select an emoji from Page 2')
           .addStringOption(opt =>
               opt.setName('name')
                  .setDescription('Which emoji to send?')
                  .setRequired(true)
                  .addChoices(...page2Keys.map(k => ({ name: k, value: k })))
           )
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
            const randomEmojiName = allKeys[Math.floor(Math.random() * allKeys.length)];
            const emojiString = resolveEmoji(interaction, randomEmojiName);

            return await interaction.reply({
                content: ` ${emojiString}`,
                reply: { messageReference: targetMessage.id }
            });
        }

        // Handle Slash Command Trigger
        if (interaction.isChatInputCommand()) {
            const emojiName = interaction.options.getString('name');
            const emojiString = resolveEmoji(interaction, emojiName);

            if (!emojiString) {
                return await interaction.reply({ content: 'Emoji not found!', flags: 64 });
            }

            return await interaction.reply({ content: getRandomMessage([` ${emojiString}`]) });
        }
    }
};
