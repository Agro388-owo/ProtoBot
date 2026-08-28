const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

const { CREDIT, formatNumber, clampBalance } = require('./credits.js');
const { checkAndAwardBadges } = require('../badgeSystem.js');

const SHORKBOI_ID = '1082525438015983636';
const SPYTHEPROOT_ID = '1464072486651170931';

const fishingCooldowns = new Map();
const COOLDOWN_DURATION = 30 * 1000;

const lootFilePath = path.resolve(process.cwd(), 'fishing_loot.json');
const creditsFilePath = path.resolve(process.cwd(), 'credits.json');
const inventoryFilePath = path.resolve(process.cwd(), 'inventory.json');

const DEFAULT_LOOT_CONFIG = {
    mode: "relative",
    items: [
        { id: "pipe", name: "a Rusty Metal Pipe", emoji: "<:thing:1537616433171796149>", catchCredits: 5n, sellValue: 5n, chance: 18, sellable: true },
        { id: "soda_can", name: "an Aluminum Soda Can", emoji: "🥤", catchCredits: 8n, sellValue: 2n, chance: 16, sellable: true },
        { id: "duck", name: "a Squeaky Rubber Duck", emoji: "<:Goober:1538666294948270190>", catchCredits: 10n, sellValue: 5n, chance: 14, sellable: true },
        { id: "latex_sample", name: "a Strange Latex Puddle", emoji: "<:puroshock:1536366927230799972>", catchCredits: -150n, sellValue: 0n, chance: 8, sellable: false },
        { id: "salmon", name: "a Fresh Salmon", emoji: "<:Puro_doing_a_swim:1538666516680282233>", catchCredits: 25n, sellValue: 10n, chance: 12, sellable: true },
        { id: "ram", name: "a High-Speed DDR5 RAM Stick", emoji: "<:Ram:1541508957216964668>", catchCredits: 50n, sellValue: 15n, chance: 9, sellable: true },
        { id: "copper_wire", name: "a Bundle of Copper Wire", emoji: "🧵", catchCredits: 120n, sellValue: 80n, chance: 7, sellable: true },
        { id: "battery", name: "a Heavy Lithium Battery", emoji: "<:puroshock:1536366927230799972>", catchCredits: 100n, sellValue: 25n, chance: 5, sellable: true },
        { id: "core", name: "a Glowing Latex Core", emoji: "<:CuteBlackCub:1538665557325254737>", catchCredits: 250n, sellValue: 50n, chance: 4, sellable: true },
        { id: "cult_tracker", name: "a Cult Tracker", emoji: "👁️", catchCredits: -250n, sellValue: 0n, chance: 0.1, sellable: false },
        { id: "pc", name: "an Entire Desktop Tower", emoji: "<:protogenirl:1536430038751121499>", catchCredits: 500n, sellValue: 100n, chance: 2.5, sellable: true },
        { id: "statue", name: "GOLDEN BLOXY STATUE", emoji: "<:BloxyStatue:1542833919651610695>", catchCredits: 1000n, sellValue: 150n, chance: 1.2, sellable: true },
        { id: "robloxinoli", name: "GOLDEN ROBLOXINOLI STATUE", emoji: "<:RobloxiNoliStatue:1542834047494131712>", catchCredits: 1750n, sellValue: 200n, chance: 1, sellable: true },
        { id: "iridium_cube", name: "a Solid Iridium Cube", emoji: "🧊", catchCredits: 3200n, sellValue: 1500n, chance: 0.8, sellable: true },
        { id: "tracer_ammo", name: "a Box of 7.62×39mm Red Tracer Rounds", emoji: "📦", catchCredits: 4500n, sellValue: 2200n, chance: 0.5, sellable: true },
        { id: "uox_fuel", name: "a UOX Fuel Assembly", emoji: "☢️", catchCredits: 6000n, sellValue: 3000n, chance: 0.3, sellable: true, flavor: "*Surprisingly, it's still warm after sitting underwater for 30 years...*" },
        { id: "mox_fuel", name: "a MOX Fuel Assembly", emoji: "☣️", catchCredits: 7500n, sellValue: 4000n, chance: 0.2, sellable: true, flavor: "*Faintly glowing, and still noticeably warm after 30 years underwater...*" },
        { id: "ring", name: "Ancient Stargate Dialing Ring", emoji: "<:InsaneCat:1538666024251953152>", catchCredits: 2500n, sellValue: 250n, chance: 0.5, sellable: false },
        { id: "shorkboi", name: "Shorkboi", emoji: "<:Shorkboi:1542381402526449704>", catchCredits: 5000n, sellValue: 0n, chance: 0.5, sellable: false },
        { id: "spytheproot", name: "SpyTheProot", emoji: "<:SpyTheProot:1542483331734573148>", catchCredits: 5000n, sellValue: 0n, chance: 0.5, sellable: false }
    ]
};

function addItemToInventory(userId, itemId) {
    try {
        let db = {};
        if (fs.existsSync(inventoryFilePath)) {
            const raw = fs.readFileSync(inventoryFilePath, 'utf8').trim();
            db = raw ? JSON.parse(raw) : {};
        }

        if (!db[userId]) db[userId] = [];
        db[userId].push(itemId.toLowerCase());

        fs.writeFileSync(inventoryFilePath, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save caught item to inventory:', e);
    }
}

function loadLootDB() {
    try {
        if (fs.existsSync(lootFilePath)) {
            const raw = fs.readFileSync(lootFilePath, 'utf8') || '{}';
            const parsed = JSON.parse(raw);
            return {
                mode: parsed.mode || "relative",
                items: (parsed.items || []).map(item => ({
                    ...item,
                    catchCredits: BigInt(item.catchCredits || item.credits || "5"),
                    sellValue: BigInt(item.sellValue || "5"),
                    chance: parseFloat(item.chance),
                    sellable: item.sellable ?? true
                }))
            };
        }
    } catch (e) {
        console.error('Failed to load fishing_loot.json:', e);
    }
    return DEFAULT_LOOT_CONFIG;
}

function saveLootDB(config) {
    try {
        const serialized = {
            mode: config.mode || "relative",
            items: config.items.map(item => ({
                ...item,
                catchCredits: item.catchCredits.toString(),
                sellValue: item.sellValue.toString()
            }))
        };
        fs.writeFileSync(lootFilePath, JSON.stringify(serialized, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save fishing_loot.json:', e);
    }
}

function loadCreditsDB() {
    try {
        if (fs.existsSync(creditsFilePath)) {
            const raw = fs.readFileSync(creditsFilePath, 'utf8') || '{}';
            const parsed = JSON.parse(raw);
            for (const id in parsed) {
                if (parsed[id].balance !== undefined) {
                    parsed[id].balance = clampBalance(BigInt(parsed[id].balance));
                }
            }
            return parsed;
        }
    } catch (e) {
        console.error('Failed to load credits.json:', e);
    }
    return {};
}

function saveCreditsDB(data) {
    try {
        const serialized = JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2);
        fs.writeFileSync(creditsFilePath, serialized, 'utf8');
    } catch (e) {
        console.error('Failed to save credits.json:', e);
    }
}

function addFishingReward(userId, rewardAmount) {
    const db = loadCreditsDB();
    if (!db[userId]) {
        db[userId] = { balance: 1000n, lastDaily: null, badges: [], luckLevel: 0 };
    }
    const rewardBig = BigInt(rewardAmount);
    db[userId].balance = clampBalance(db[userId].balance + rewardBig);
    
    checkAndAwardBadges(db[userId]);

    saveCreditsDB(db);
    return db[userId].balance;
}

function getRandomCatch(lootConfig, mode = 'coastal', userLuckLevel = 0) {
    const { items } = lootConfig;
    if (!items || items.length === 0) return null;

    let modifiedItems = items.map(item => ({ ...item }));

    if (mode === 'deepsea') {
        modifiedItems = modifiedItems.map(item => {
            if (item.id === 'latex_sample') return { ...item, chance: item.chance * 2.5 };
            if (item.catchCredits > 500n) return { ...item, chance: item.chance * 2.0 };
            return item;
        });
    }

    if (userLuckLevel > 0) {
        const luckMultiplier = 1 + (userLuckLevel * 0.15);
        modifiedItems = modifiedItems.map(item => {
            if (item.catchCredits > 200n) {
                return { ...item, chance: item.chance * luckMultiplier };
            }
            return item;
        });
    }

    const totalWeight = modifiedItems.reduce((sum, item) => sum + item.chance, 0);
    let random = Math.random() * totalWeight;
    for (const item of modifiedItems) {
        if (random < item.chance) return item;
        random -= item.chance;
    }
    return modifiedItems[0];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fishing')
        .setDescription('Cast your line to catch items and earn credits!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('cast')
               .setDescription('Cast your fishing line!')
               .addStringOption(opt =>
                   opt.setName('mode')
                      .setDescription('Fishing location mode')
                      .setRequired(false)
                      .addChoices(
                          { name: '🏖️ Coastal (Standard Risk)', value: 'coastal' },
                          { name: '🌊 Deep Sea (High Risk / High Rewards)', value: 'deepsea' }
                      )
               )
        )
        .addSubcommand(sub =>
            sub.setName('catch')
               .setDescription('[Admin] Force a specific catch for a target user')
               .addUserOption(opt => opt.setName('target').setDescription('The target user').setRequired(true))
               .addStringOption(opt => opt.setName('item_id').setDescription('ID of the item to give').setRequired(true))
        )
        .addSubcommandGroup(group =>
            group.setName('loot')
                .setDescription('View or manage fishing loot table')
                .addSubcommand(sub =>
                    sub.setName('list')
                       .setDescription('List all catchable items in the fishing loot table')
                )
                .addSubcommand(sub =>
                    sub.setName('add')
                       .setDescription('[Admin] Add a new item to the fishing loot table')
                       .addStringOption(opt => opt.setName('id').setDescription('Unique ID (e.g. gold_fish)').setRequired(true))
                       .addStringOption(opt => opt.setName('name').setDescription('Display Name (e.g. Golden Fish)').setRequired(true))
                       .addStringOption(opt => opt.setName('emoji').setDescription('Emoji string (e.g. 🐠 or custom emoji code)').setRequired(true))
                       .addNumberOption(opt => opt.setName('chance').setDescription('Drop chance percentage/weight').setRequired(true))
                       .addStringOption(opt => opt.setName('catch_credits').setDescription('Credits rewarded upon catch').setRequired(true))
                       .addStringOption(opt => opt.setName('sell_value').setDescription('Resale value').setRequired(true))
                       .addBooleanOption(opt => opt.setName('sellable').setDescription('Can this item be sold?').setRequired(false))
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                       .setDescription('[Admin] Remove an item from the fishing loot table by ID')
                       .addStringOption(opt => opt.setName('id').setDescription('The ID of the item to remove').setRequired(true))
                )
        ),

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;
        const userId = user.id;
        const lootConfig = loadLootDB();

        const ownerId = botConfig.OWNER_ID || botConfig.ownerId;
        const isOwner = userId === ownerId;
        const isAdmin = interaction.memberPermissions?.has(8n);
        const isPublic = botConfig.CAST_MESSAGE_PUBLIC ?? true;

        // === 1. CAST SUBCOMMAND ===
        if (subcommand === 'cast' && !group) {
            await interaction.deferReply({ flags: isPublic ? 0 : MessageFlags.Ephemeral });
            const now = Date.now();

            if (fishingCooldowns.has(userId)) {
                const expirationTime = fishingCooldowns.get(userId) + COOLDOWN_DURATION;
                if (now < expirationTime) {
                    const timeLeft = Math.ceil((expirationTime - now) / 1000);
                    return await interaction.followUp({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0xFFA500)
                                .setTitle('<:puronervous2:1538551211207430234> Fishing Line Tangled!')
                                .setDescription(`Please wait **${timeLeft} seconds** before casting again.`)
                        ],
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            fishingCooldowns.set(userId, now);

            const mode = interaction.options.getString('mode') || 'coastal';
            const creditsDB = loadCreditsDB();
            const userLuckLevel = creditsDB[userId]?.luckLevel || 0;

            const itemCaught = getRandomCatch(lootConfig, mode, userLuckLevel);

            if (itemCaught.id === 'latex_sample') {
                const loss = mode === 'deepsea' ? -300n : -150n;
                const newBalance = addFishingReward(userId, loss);
                const nameDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${userId}>` : `**${user.username}**`;

                const transfurEmbed = new EmbedBuilder()
                    .setColor(0x1F1F1F)
                    .setTitle('<:CuteBlackCub:1538665557325254737> AMBUSHED BY LATEX!')
                    .setDescription(
                        `${nameDisplay} reeled in a suspicious dark puddle... but it suddenly leaped out of the water!\n\n` +
                        `*You got transfurred during the struggle and dropped your pouch into the deep water!*`
                    )
                    .addFields(
                        { name: 'Stolen / Lost Credits', value: `**-${formatNumber(loss < 0n ? -loss : loss)}**${CREDIT}`, inline: true },
                        { name: 'Remaining Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: true }
                    )
                    .setFooter({ text: mode === 'deepsea' ? 'ProtoBot Deep Sea Hazard Warning' : 'ProtoBot Biohazard Containment' });

                return await interaction.editReply({ embeds: [transfurEmbed] });
            }

            if (itemCaught.id === 'cult_tracker') {
                const coreItem = lootConfig.items.find(i => i.id === 'core');
                const coreValue = coreItem ? coreItem.catchCredits : 250n;
                
                const extraStolen = BigInt(Math.floor(Math.random() * 150) + 50);
                const totalDeducted = coreValue + extraStolen;

                const newBalance = addFishingReward(userId, -totalDeducted);
                const nameDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${userId}>` : `**${user.username}**`;

                const robberyEmbed = new EmbedBuilder()
                    .setColor(0x8B0000)
                    .setTitle('👁️ CULT TRACKER AMBUSH!')
                    .setDescription(
                        `${nameDisplay} reeled in a glowing Cult Tracker!\n\n` +
                        `*"They demand their Latex Core back!"* A gang of cultists jumps out from the bushes, beats the absolute piss out of you, and snatches your wallet!`
                    )
                    .addFields(
                        { name: 'Crystal Reclamation', value: `**-${formatNumber(coreValue)}**${CREDIT}`, inline: true },
                        { name: 'Stolen Wallet Cash', value: `**-${formatNumber(extraStolen)}**${CREDIT}`, inline: true },
                        { name: 'Remaining Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: false }
                    )
                    .setFooter({ text: 'ProtoBot Security Alert' });

                return await interaction.editReply({ embeds: [robberyEmbed] });
            }

            let finalReward = itemCaught.catchCredits;
            if (mode === 'deepsea' && finalReward > 0n) {
                finalReward = (finalReward * 15n) / 10n;
            }

            // Save standard catch directly to user inventory on disk
            addItemToInventory(userId, itemCaught.id);

            const newBalance = addFishingReward(userId, finalReward);
            const nameDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${userId}>` : `**${user.username}**`;

            if (itemCaught.id === 'shorkboi') {
                return await interaction.editReply({
                    content: `🚨 **SHORK ENCOUNTER!** ${nameDisplay} cast their line and reeled in <@${SHORKBOI_ID}>! 🦈\n` +
                             `**+${formatNumber(finalReward)}**${CREDIT} *(Current Balance: **${formatNumber(newBalance)}**${CREDIT})*`
                });
            }

            if (itemCaught.id === 'spytheproot') {
                return await interaction.editReply({
                    content: `🔍 **PROOT ENCOUNTER!** ${nameDisplay} cast their line and fished out <@${SPYTHEPROOT_ID}> ${itemCaught.emoji}!\n` +
                             `**+${formatNumber(finalReward)}**${CREDIT} *(Current Balance: **${formatNumber(newBalance)}**${CREDIT})*`
                });
            }

            if (finalReward >= 1000n) {
                let rareDesc = `${nameDisplay} cast their line into the ${mode === 'deepsea' ? 'abyssal depths' : 'pool'} and reeled in a legendary artifact!`;
                if (itemCaught.flavor) {
                    rareDesc += `\n\n${itemCaught.flavor}`;
                }

                const rareEmbed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setTitle('🌟 ULTRA RARE CATCH! 🌟')
                    .setDescription(rareDesc)
                    .addFields(
                        { name: 'Item Caught', value: `${itemCaught.emoji} **${itemCaught.name}**`, inline: true },
                        { name: 'Reward', value: `**+${formatNumber(finalReward)}**${CREDIT}`, inline: true },
                        { name: 'Total Balance', value: `**${formatNumber(newBalance)}**${CREDIT}`, inline: false }
                    )
                    .setFooter({ text: `ProtoBot Fishing Log | Mode: ${mode.toUpperCase()}` });

                return await interaction.editReply({ embeds: [rareEmbed] });
            }

            let responseMessage = `${nameDisplay} cast their line into the ${mode === 'deepsea' ? 'deep sea' : 'pool'} and reeled in **${itemCaught.name}** ${itemCaught.emoji}!\n` +
                `**+${formatNumber(finalReward)}**${CREDIT} *(Current Balance: **${formatNumber(newBalance)}**${CREDIT})*`;

            if (itemCaught.flavor) {
                responseMessage += `\n${itemCaught.flavor}`;
            }

            await interaction.editReply({ content: responseMessage });
            return true;
        }

        // === 2. CATCH SUBCOMMAND (ADMIN ONLY) ===
        if (subcommand === 'catch' && !group) {
            if (!isOwner && !isAdmin) {
                await interaction.reply({
                    content: '❌ You do not have permission to force a catch!',
                    flags: MessageFlags.Ephemeral
                });
                return null;
            }

            const targetUser = interaction.options.getUser('target');
            const itemId = interaction.options.getString('item_id').trim().toLowerCase();

            const itemCaught = lootConfig.items.find(i => i.id === itemId);
            if (!itemCaught) {
                await interaction.reply({
                    content: `⚠️ Could not find an item with ID \`${itemId}\` in the fishing loot table!`,
                    flags: MessageFlags.Ephemeral
                });
                return null;
            }

            addItemToInventory(targetUser.id, itemCaught.id);
            const newBalance = addFishingReward(targetUser.id, itemCaught.catchCredits);
            const targetDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${targetUser.id}>` : `**${targetUser.username}**`;

            let catchMsg = `🛠️ **[Admin Force Catch]** ${targetDisplay} was given **${itemCaught.name}** ${itemCaught.emoji}!\n` +
                           `**+${formatNumber(itemCaught.catchCredits)}**${CREDIT} *(Current Balance: **${formatNumber(newBalance)}**${CREDIT})*`;

            if (itemCaught.flavor) {
                catchMsg += `\n${itemCaught.flavor}`;
            }

            await interaction.reply({ content: catchMsg });
            return true;
        }

        // === 3. LOOT GROUP SUBCOMMANDS ===
        if (group === 'loot') {
            if (subcommand === 'list') {
                const itemsList = lootConfig.items.map(item => {
                    const sign = item.catchCredits < 0n ? "" : "+";
                    return `• ${item.emoji} **${item.name}** (\`${item.id}\`)\n` +
                           `  └ Chance: \`${item.chance}%\` | Catch: **${sign}${formatNumber(item.catchCredits)}**${CREDIT} | Value: **${formatNumber(item.sellValue)}**${CREDIT}`;
                }).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('🎣 Fishing Loot Table')
                    .setColor(0x3498DB)
                    .setDescription(itemsList || '*No items configured.*')
                    .setFooter({ text: `Total Items: ${lootConfig.items.length}` });

                await interaction.reply({ embeds: [embed] });
                return true;
            }

            if (!isOwner && !isAdmin) {
                await interaction.reply({
                    content: '❌ You do not have permission to modify the fishing loot table!',
                    flags: MessageFlags.Ephemeral
                });
                return null;
            }

            if (subcommand === 'add') {
                const id = interaction.options.getString('id').trim().toLowerCase();
                const name = interaction.options.getString('name').trim();
                const emoji = interaction.options.getString('emoji').trim();
                const chance = interaction.options.getNumber('chance');
                const catchCreditsStr = interaction.options.getString('catch_credits').trim();
                const sellValueStr = interaction.options.getString('sell_value').trim();
                const sellable = interaction.options.getBoolean('sellable') ?? true;

                if (lootConfig.items.some(i => i.id === id)) {
                    await interaction.reply({
                        content: `⚠️ An item with ID \`${id}\` already exists!`,
                        flags: MessageFlags.Ephemeral
                    });
                    return null;
                }

                const newItem = {
                    id,
                    name,
                    emoji,
                    chance,
                    catchCredits: BigInt(catchCreditsStr),
                    sellValue: BigInt(sellValueStr),
                    sellable
                };

                lootConfig.items.push(newItem);
                saveLootDB(lootConfig);

                await interaction.reply({
                    content: `✅ Successfully added ${emoji} **${name}** (\`${id}\`) to the fishing loot table!`
                });
                return true;
            }

            if (subcommand === 'remove') {
                const id = interaction.options.getString('id').trim().toLowerCase();
                const index = lootConfig.items.findIndex(i => i.id === id);

                if (index === -1) {
                    await interaction.reply({
                        content: `⚠️ Could not find an item with ID \`${id}\` in the loot table!`,
                        flags: MessageFlags.Ephemeral
                    });
                    return null;
                }

                const [removed] = lootConfig.items.splice(index, 1);
                saveLootDB(lootConfig);

                await interaction.reply({
                    content: `🗑️ Removed ${removed.emoji} **${removed.name}** (\`${id}\`) from the fishing loot table!`
                });
                return true;
            }
        }
    }
};
