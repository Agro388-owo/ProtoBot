const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

const tagsFilePath = path.join(__dirname, '../tags.json');

function getTagsDB() {
    if (fs.existsSync(tagsFilePath)) {
        try {
            const raw = fs.readFileSync(tagsFilePath, 'utf8') || '{}';
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to load tags.json:', e);
        }
    }
    return {};
}

function saveTagsDB(db) {
    fs.writeFileSync(tagsFilePath, JSON.stringify(db, null, 2), 'utf8');
}

function addTransfurTagsToUser(userId, newTags) {
    const db = getTagsDB();
    if (!db[userId]) {
        db[userId] = { userTags: [], transfurTags: [] };
    } else if (Array.isArray(db[userId])) {
        db[userId] = { userTags: db[userId], transfurTags: [] };
    }

    const currentTransfurTags = new Set(db[userId].transfurTags || []);
    newTags.forEach(tag => currentTransfurTags.add(tag));
    db[userId].transfurTags = Array.from(currentTransfurTags);

    saveTagsDB(db);
}

function getRandomMessage(array) {
    return array[Math.floor(Math.random() * array.length)];
}

const formTagsMap = {
    latex: ['latex', 'transfur'],
    protogen: ['protogen', 'transfur', 'synth'],
    shark: ['shark', 'tiger shark', 'latex', 'transfur'],
    leopard: ['white latex', 'latex', 'transfur'],
    wolf: ['dark latex', 'latex', 'transfur'],
    protobot: ['protogen', 'synth', 'latex', 'transfur'],
    blank: ['transfur', 'latex'], 
    red_fox: ['red_fox', 'fox', 'latex', 'transfur']
};

// --- Custom Message Pools ---

const formMessages = {
    latex: {
        self: [
            "{user} steps into a puddle of living goo, watching as dark latex slowly climbs up their body and claims them! 🖤",
            "{user} lets the smooth latex envelop them completely, turning into a sleek latex creature!",
            "{user} feels the cool latex spread over their skin, assimilating into a new gooey form!"
        ],
        target: [
            "{sender} splashes a vial of latex onto {target}, turning them into a shiny latex creature! 🖤",
            "{sender} pulls {target} into a goo puddle, watching them get fully transfurred!",
            "{sender} ambushes {target} with latex fluid, completely assimilating them!"
        ]
    },
    protogen: {
        self: [
            "{user} feels mechanical plating snap over their body as a glowing visor initializes! 🤖",
            "{user} undergoes a cybernetic transfur, turning into a high-tech Protogen!",
            "{user} lets the nanites assimilate their form, booting up as an upgraded Protogen!"
        ],
        target: [
            "{sender} attaches cybernetic armor and a visor onto {target}, forcefully turning them into a Protogen! 🤖",
            "{sender} fires a nanite beam at {target}, turning them into a sleek Protogen synth!",
            "{sender} overrides {target}'s form with high-tech armor plating!"
        ]
    },
    shark: {
        self: [
            "{user} sprouts a dorsal fin and striped tail as aquatic latex turns them into a Tiger Shark! 🦈",
            "{user} dives into the goo, emerging as a slick Tiger Shark creature!",
            "{user} lets the blue striped latex reshape them into a aquatic predator!"
        ],
        target: [
            "{sender} pushes {target} into deep latex waters, transforming them into a Tiger Shark! 🦈",
            "{sender} douses {target} in aquatic latex, giving them a sleek fin and shark tail!",
            "{sender} ambushes {target} with tiger-striped goo, turning them into a shark!"
        ]
    },
    leopard: {
        self: [
            "{user} is coated in soft white latex, growing spotted ears and a fluffy tail! 🐆",
            "{user} succumbs to the pale latex liquid, reshaping into a Snow Leopard!",
            "{user} lets the snowy white goo cover them, becoming an agile Snow Leopard creature!"
        ],
        target: [
            "{sender} covers {target} in spotted white latex, turning them into a Snow Leopard! 🐆",
            "{sender} pounces on {target} with white latex, leaving behind a spotted feline!",
            "{sender} transform {target} into a fluffy Snow Leopard latex creature!"
        ]
    },
    wolf: {
        self: [
            "{user} slips on a dark latex mask, feeling black goo claim their body as a Dark Latex Wolf! 🐺",
            "{user} gives in to the dark wolf goo, growing sharp claws and a bushy tail!",
            "{user} lets the obsidian latex take over, fully becoming a Dark Latex Wolf!"
        ],
        target: [
            "{sender} forces a wolf mask onto {target}, watching the dark latex spread and claim them! 🐺",
            "{sender} splashes dark latex at {target}, transforming them into a Dark Latex Wolf!",
            "{sender} surrounds {target} with obsidian goo, converting them into a wolf!"
        ]
    },
    protobot: {
        self: [
            "{user} connects to the mainframe, armor plates closing in as ProtoBot code overwrites their system! ⚙️",
            "{user} initializes ProtoBot protocols, upgrading their body into an administrative unit!",
            "{user} lets system nanites transform them into a fully operational ProtoBot!"
        ],
        target: [
            "{sender} uploads the ProtoBot protocol into {target}, converting them into a unit! ⚙️",
            "{sender} locks cybernetics onto {target}, forcing a ProtoBot system conversion!",
            "{sender} overrides {target}'s physical form with ProtoBot hardware!"
        ]
    },
    red_fox: {
        self: [
            "{user} gets enveloped in slick, orange-and-white latex, sprouting a massive bushy fox tail and oversized vulpine ears! 🦊",
            "{user} feels a warm latex liquid coat their body, reshaping them into an agile Red Fox latex creature!",
            "{user} gives in to the orange goo, fully transforming into a sly, glossy Red Fox latex beast!"
        ],
        target: [
            "{sender} splashes bright orange latex onto {target}! They watch in surprise as a sleek Red Fox takes their place! 🦊",
            "{sender} corners {target} with a puddle of orange and white latex, completely converting them into a Red Fox!",
            "{sender} pounces with latex fluid, turning {target} into a sly Red Fox latex creature!"
        ]
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('transfur')
        .setDescription('Transform a user into a custom latex or creature form!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option => 
            option.setName('target')
                  .setDescription('Who is getting transformed? (Leave empty to transfur yourself)')
                  .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('form')
                  .setDescription('Choose the transformation form')
                  .setRequired(false)
                  .addChoices(
                      { name: 'Latex Creature', value: 'latex' },
                      { name: 'Protogen', value: 'protogen' },
                      { name: 'Tiger Shark', value: 'shark' },
                      { name: 'Snow Leopard', value: 'leopard' },
                      { name: 'Dark Latex Wolf', value: 'wolf' },
                      { name: 'ProtoBot', value: 'protobot' },
                      { name: 'Red Fox', value: 'red_fox' },
                      { name: 'Blank / Custom', value: 'blank' }
                  )
        ),

    async execute(interaction, senderName, recipientName) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const formChoice = interaction.options.getString('form') || 'latex';

        const targetDisplayName = targetUser.id === interaction.user.id ? senderName : (recipientName || `<@${targetUser.id}>`);

        // Immunity check
        const transfurImmuneList = botConfig.transfurImmuneUsers || [];
        if (transfurImmuneList.includes(targetUser.id)) {
            return `<@${targetUser.id}>'s body composition completely resists the transformation! <:protogenirl:1536430038751121499>`;
        }

        // Apply transfur-specific tags
        const tagsToApply = formTagsMap[formChoice] || ['transfur', 'latex'];
        addTransfurTagsToUser(targetUser.id, tagsToApply);

        // Blank / Custom option
        if (formChoice === 'blank') {
            if (interaction.user.id === targetUser.id) {
                return `${targetDisplayName} steps into the latex pool, letting the mysterious liquid completely take over...`;
            } else {
                return `${senderName} forces ${targetDisplayName} into the latex pool, triggering a complete transformation!`;
            }
        }

        // Form Message Lookup
        const isSelf = interaction.user.id === targetUser.id;
        const formPool = formMessages[formChoice];

        if (formPool) {
            if (isSelf) {
                return getRandomMessage(formPool.self).replace('{user}', targetDisplayName);
            } else {
                return getRandomMessage(formPool.target)
                    .replace('{sender}', senderName)
                    .replace('{target}', targetDisplayName);
            }
        }

        // Dynamic fallback for unmapped forms
        if (isSelf) {
            return `${targetDisplayName} succumbs to the mysterious goo and transforms into a **${formChoice.replace('_', ' ')}**!`;
        } else {
            return `${senderName} ambushes ${targetDisplayName}, transforming them into a **${formChoice.replace('_', ' ')}**!`;
        }
    }
};
