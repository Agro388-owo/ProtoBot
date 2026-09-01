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

    // --- PAGE 2 (Items 21 - 40) ---
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
    'Credit': '<:Credit:1541934198791737475>', 
    'Credit_old': '<:Credit_old:1541924089256607785>', 
    'Shorkboi': '<:Shorkboi:1542381402526449704>',
    'SpyTheProot': '<:SpyTheProot:1542483331734573148>',
    'Agro388': '<:Agro388:1542396105738948689>', 
    'ProtoBot': '<:ProtoBot:1542397144315600996>', 
    'Bloxy': '<:Bloxy:1542398280699220040>', 
    'Steven130': '<:Steven130:1542399890783604787>', 
    'Benjamin391': '<:Benjamin391:1542399892381507665>',

    // --- PAGE 3 (Items 41 - 60) ---
    'BalkanBitcoin': '<:BalkanBitcoin:1542843185041117224>',
    'RobloxiNoliStatue': '<:RobloxiNoliStatue:1542834047494131712>',
    'BloxyStatue': '<:BloxyStatue:1542833919651610695>',
    'Blobfish': '<:blobfish:1543061627216072714>', 
    'Strange Symbols': '<:strangesymbols:1543071450909638837>', 
    'Strange City': '<:strangecity:1543071452390101022>', 
    'Earth Symbol': '<:earthsymbol:1543071647106343073>', 
    'Strange Ring': '<:strangering:1543071454055112875>',
    'Chester': '<:chester:1543115393462173796>', 
    'Yobii': '<:yobii:1543113618294440056>', 
    'Dalekino': '<:dalekino:1543379986545905664>', 
    'Void': '<:void:1543489597646835732>', 

    // --- PAGE 4 (Items 61 - 80) ---
    'snapper': '<:snapper:1542959982012534784>',
    'flippinguoff': '<:flippinguoff:1542959978682253413>',
    'prettyimg': '<:prettyimg:1542959976622985226>',
    'axehit': '<:axehit:1542959974617976974>',
    'strangcreature': '<:strangcreature:1542959970658685040>',
    'statue': '<:statue:1544043471088918558>',
    'lithiumbattery': '<:lithiumbattery:1544043469801001104>',
    'latexcore': '<:latexcore:1544043468329058364>',
    'desktoppc': '<:desktoppc:1544043466726711487>',
    'salmon': '<:salmon:1544043465195913287>',
    'newram': '<:newram:1544043463790825555>',
    'copperwire': '<:copperwire:1544043462259773622>',
    'rubberduck': '<:rubberduck:1544043460678651944>',
    'oldrustypipe': '<:oldrustypipe:1544043459219038308>',
    'alluminiumcan': '<:alluminiumcan:1544043457746575401>',
    'fishingrodabyss': '<:fishingrodabyss:1544043456257720341>',
    'newglobalcredit': '<:newglobalcredit:1544043454668218570>',
    'newcredit': '<:newcredit:1544043453258924053>',
    'fishingluck': '<:fishingluck:1544043451534934076>',
    'electricrod': '<:electricrod:1544043450075316285>',

    // --- PAGE 5 (Items 81+) ---
    'magnetrod': '<:magnetrod:1544043448544530433>',
    'voidmatter': '<:voidmatter:1544043446472540272>',
    'abyssalpearl': '<:abyssalpearl:1544043445004279938>',
    'leviatanscale': '<:leviatanscale:1544043443511107695>',
    'culttracker': '<:culttracker:1544043441334263896>',
    'iriscrystal': '<:iriscrystal:1544043439610531900>',
    'dialring': '<:dialring:1544043437978816512>',
    'mox': '<:mox:1544043436599017652>',
    '762x39ammo': '<:762x39ammo:1544043435235872948>',
    'uox': '<:uox:1544043433453289473>', 
    'iridium': '<:iridiumcube:1544043430886375425>'
};

const allKeys = Object.keys(emojiMap);
const PAGE_SIZE = 20;
const pages = [];

for (let i = 0; i < allKeys.length; i += PAGE_SIZE) {
    pages.push(allKeys.slice(i, i + PAGE_SIZE));
}

function resolveEmoji(interaction, emojiName) {
    let emojiString = null;
    if (interaction.guild) {
        const serverEmoji = interaction.guild.emojis.cache.find(e => e.name === emojiName);
        if (serverEmoji) emojiString = serverEmoji.toString();
    }
    return emojiString || emojiMap[emojiName] || null;
}

// 1. Slash Command Builder
const slashCommand = new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('Send a custom emoji or reply to a message!')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]);

// Dynamically generate subcommands for all pages
pages.forEach((pageKeys, index) => {
    const pageNumber = index + 1;
    if (pageKeys.length > 0) {
        slashCommand.addSubcommand(sub =>
            sub.setName(`page${pageNumber}`)
               .setDescription(`Select an emoji from Page ${pageNumber}`)
               .addStringOption(opt =>
                   opt.setName('name')
                      .setDescription('Which emoji to send?')
                      .setRequired(true)
                      .addChoices(...pageKeys.map(k => ({ name: k, value: k })))
               )
        );
    }
});

// 2. Context Menu Command
const contextMenuCommand = new ContextMenuCommandBuilder()
    .setName('Emoji Reply')
    .setType(ApplicationCommandType.Message)
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]);

module.exports = {
    data: slashCommand,
    contextMenu: contextMenuCommand,

    async execute(interaction) {
        // Context Menu Handler
        if (interaction.isMessageContextMenuCommand()) {
            const targetMessage = interaction.targetMessage;
            const randomEmojiName = allKeys[Math.floor(Math.random() * allKeys.length)];
            const emojiString = resolveEmoji(interaction, randomEmojiName);

            return await interaction.reply({
                content: ` ${emojiString}`,
                reply: { messageReference: targetMessage.id }
            });
        }

        // Slash Command Handler
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
