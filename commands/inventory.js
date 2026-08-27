const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');
const { CREDIT, formatNumber, clampBalance } = require('./credits.js');

const SHORKBOI_ID = '1082525438015983636';
const invFilePath = path.join(__dirname, '../inventories.json');
const creditsFilePath = path.join(__dirname, '../credits.json');

function loadDB(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8') || '{}');
        }
    } catch (e) {
        console.error(`Failed to load ${filePath}:`, e);
    }
    return {};
}

function saveDB(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error(`Failed to save ${filePath}:`, e);
    }
}

function updateBalance(userId, amountBig) {
    const db = loadDB(creditsFilePath);
    if (!db[userId]) db[userId] = { balance: "1000", lastDaily: null };

    const currentBal = BigInt(db[userId].balance || "0");
    db[userId].balance = clampBalance(currentBal + amountBig).toString();
    saveDB(creditsFilePath, db);
    return BigInt(db[userId].balance);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Manage your stored items, trade, and sell loot.')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('list')
               .setDescription('View your inventory or another user\'s inventory.')
               .addUserOption(opt => opt.setName('target').setDescription('User to view').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('store')
               .setDescription('Store a custom item in your inventory.')
               .addStringOption(opt => opt.setName('id').setDescription('Unique ID for item').setRequired(true))
               .addStringOption(opt => opt.setName('name').setDescription('Item display name').setRequired(true))
               .addStringOption(opt => opt.setName('emoji').setDescription('Item emoji').setRequired(false))
               .addStringOption(opt => opt.setName('value').setDescription('Resale credit value').setRequired(false))
               .addBooleanOption(opt => opt.setName('sellable').setDescription('Can this item be sold?').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('give')
               .setDescription('[ADMIN] Spawn and give an item directly to a user\'s inventory.')
               .addUserOption(opt => opt.setName('target').setDescription('Target user').setRequired(true))
               .addStringOption(opt => opt.setName('id').setDescription('Unique item ID').setRequired(true))
               .addStringOption(opt => opt.setName('name').setDescription('Item display name').setRequired(true))
               .addIntegerOption(opt => opt.setName('amount').setDescription('Quantity to give (Default: 1)').setRequired(false))
               .addStringOption(opt => opt.setName('emoji').setDescription('Item emoji').setRequired(false))
               .addStringOption(opt => opt.setName('value').setDescription('Resale credit value').setRequired(false))
               .addBooleanOption(opt => opt.setName('sellable').setDescription('Can this item be sold?').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('sell')
               .setDescription('Sell an item from your inventory for credits.')
               .addStringOption(opt => opt.setName('id').setDescription('Item ID to sell').setRequired(true))
               .addIntegerOption(opt => opt.setName('amount').setDescription('Quantity to sell (Default: 1)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('trade')
               .setDescription('Gift or trade an item to another user.')
               .addUserOption(opt => opt.setName('target').setDescription('Recipient user').setRequired(true))
               .addStringOption(opt => opt.setName('id').setDescription('Item ID to trade').setRequired(true))
               .addIntegerOption(opt => opt.setName('amount').setDescription('Quantity to send (Default: 1)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('clear')
               .setDescription('[ADMIN] Clear a user\'s entire inventory.')
               .addUserOption(opt => opt.setName('target').setDescription('User to clear').setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;
        const userId = user.id;
        const invDB = loadDB(invFilePath);

        if (!invDB[userId]) invDB[userId] = [];

        // 📜 INVENTORY LIST
        if (subcommand === 'list') {
            const target = interaction.options.getUser('target') || user;
            const userInv = invDB[target.id] || [];

            if (userInv.length === 0) {
                return await interaction.reply({
                    content: `📦 **${target.username}** has no items in their inventory storage.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const itemsStr = userInv.map(item => {
                const sellText = item.sellable 
                    ? `Resale: **${formatNumber(BigInt(item.value || "0"))}**${CREDIT}` 
                    : `*Unsellable*`;
                return `• ${item.emoji || '📦'} **${item.name}** (\`${item.id}\`) x**${item.count}**\n  └ ${sellText}`;
            }).join('\n');

            const invEmbed = new EmbedBuilder()
                .setColor(0x00D2FF)
                .setTitle(`📦 ${target.username}'s Storage Module`)
                .setDescription(itemsStr)
                .setFooter({ text: 'ProtoBot Inventory System' });

            return await interaction.reply({ 
                embeds: [invEmbed],
                flags: MessageFlags.Ephemeral
            });
        }

        // 📥 STORE CUSTOM ITEM
        if (subcommand === 'store') {
            const itemId = interaction.options.getString('id').toLowerCase().trim();
            const name = interaction.options.getString('name').trim();
            const emoji = interaction.options.getString('emoji')?.trim() || '📦';
            const valueInput = interaction.options.getString('value')?.trim() || "5";
            const sellable = interaction.options.getBoolean('sellable') ?? true;

            if (itemId.includes('shork')) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> **ERROR 404:** <@${SHORKBOI_ID}> cannot be stored inside a text file! He is too powerful (and aquatic).`,
                    flags: MessageFlags.Ephemeral
                });
            }

            let valueBig = 5n;
            try { valueBig = BigInt(valueInput.replace(/,/g, '')); } catch {}

            const existing = invDB[userId].find(i => i.id === itemId);
            if (existing) {
                existing.count = (existing.count || 1) + 1;
            } else {
                invDB[userId].push({
                    id: itemId,
                    name,
                    emoji,
                    value: valueBig.toString(),
                    sellable,
                    count: 1
                });
            }

            saveDB(invFilePath, invDB);

            return await interaction.reply({
                content: `✅ Stored ${emoji} **${name}** (\`${itemId}\`) in your inventory!`,
                flags: MessageFlags.Ephemeral
            });
        }

        // 🎁 GIVE ITEM (ADMIN / OWNER)
        if (subcommand === 'give') {
            const isOwner = userId === botConfig.OWNER_ID;
            const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

            if (!isOwner && !isAdmin) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Access Denied! Admin permissions required.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const target = interaction.options.getUser('target');
            const itemId = interaction.options.getString('id').toLowerCase().trim();
            const name = interaction.options.getString('name').trim();
            const amount = Math.max(1, interaction.options.getInteger('amount') || 1);
            const emoji = interaction.options.getString('emoji')?.trim() || '📦';
            const valueInput = interaction.options.getString('value')?.trim() || "5";
            const sellable = interaction.options.getBoolean('sellable') ?? true;

            let valueBig = 5n;
            try { valueBig = BigInt(valueInput.replace(/,/g, '')); } catch {}

            if (!invDB[target.id]) invDB[target.id] = [];

            const existingItem = invDB[target.id].find(i => i.id === itemId);
            if (existingItem) {
                existingItem.count = (existingItem.count || 0) + amount;
            } else {
                invDB[target.id].push({
                    id: itemId,
                    name,
                    emoji,
                    value: valueBig.toString(),
                    sellable,
                    count: amount
                });
            }

            saveDB(invFilePath, invDB);

            const targetDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${target.id}>` : `**${target.username}**`;

            return await interaction.reply({
                content: `🎁 Granted x**${amount}** ${emoji} **${name}** (\`${itemId}\`) to ${targetDisplay}'s inventory!`,
                flags: MessageFlags.Ephemeral
            });
        }

        // 💰 SELL ITEM
        if (subcommand === 'sell') {
            const itemId = interaction.options.getString('id').toLowerCase().trim();
            const amount = Math.max(1, interaction.options.getInteger('amount') || 1);

            const itemIndex = invDB[userId].findIndex(i => i.id === itemId);
            if (itemIndex === -1) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Item ID \`${itemId}\` was not found in your inventory!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const item = invDB[userId][itemIndex];

            if (!item.sellable) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> **${item.name}** is non-sellable!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            if (item.count < amount) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> You only have x**${item.count}** of **${item.name}**!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const totalEarnings = BigInt(item.value || "0") * BigInt(amount);
            item.count -= amount;

            if (item.count <= 0) {
                invDB[userId].splice(itemIndex, 1);
            }

            saveDB(invFilePath, invDB);
            const newBal = updateBalance(userId, totalEarnings);

            return await interaction.reply({
                content: `💵 Sold x**${amount}** ${item.emoji} **${item.name}** for **+${formatNumber(totalEarnings)}**${CREDIT}!\n` +
                         `*Current Balance: **${formatNumber(newBal)}**${CREDIT}*`,
                flags: MessageFlags.Ephemeral
            });
        }

        // 🔄 TRADE ITEM
        if (subcommand === 'trade') {
            const target = interaction.options.getUser('target');
            const itemId = interaction.options.getString('id').toLowerCase().trim();
            const amount = Math.max(1, interaction.options.getInteger('amount') || 1);

            if (target.id === userId || target.bot) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> You cannot trade items to yourself or a bot!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const itemIndex = invDB[userId].findIndex(i => i.id === itemId);
            if (itemIndex === -1 || invDB[userId][itemIndex].count < amount) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> You do not have enough of \`${itemId}\` to trade!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const item = invDB[userId][itemIndex];
            item.count -= amount;
            if (item.count <= 0) invDB[userId].splice(itemIndex, 1);

            if (!invDB[target.id]) invDB[target.id] = [];
            const targetItem = invDB[target.id].find(i => i.id === itemId);

            if (targetItem) {
                targetItem.count = (targetItem.count || 0) + amount;
            } else {
                invDB[target.id].push({
                    id: item.id,
                    name: item.name,
                    emoji: item.emoji,
                    value: item.value,
                    sellable: item.sellable,
                    count: amount
                });
            }

            saveDB(invFilePath, invDB);

            const senderDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${userId}>` : `**${user.username}**`;
            const targetDisplay = botConfig.PING_ON_PUBLIC_MESSAGES ? `<@${target.id}>` : `**${target.username}**`;

            let tradeMsg = `📦 ${senderDisplay} transferred x**${amount}** ${item.emoji} **${item.name}** to ${targetDisplay}!`;
            if (target.id === SHORKBOI_ID) {
                tradeMsg += `\n🦈 *Careful, trading with Shorkboi might get you bitten!*`;
            }

            return await interaction.reply({
                content: tradeMsg,
                flags: MessageFlags.Ephemeral
            });
        }

        // 🗑️ CLEAR INVENTORY (Admin/Owner Only)
        if (subcommand === 'clear') {
            const isOwner = userId === botConfig.OWNER_ID;
            const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

            if (!isOwner && !isAdmin) {
                return await interaction.reply({
                    content: `<:puronervous2:1538551211207430234> Access Denied! Admin permissions required.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const target = interaction.options.getUser('target');
            invDB[target.id] = [];
            saveDB(invFilePath, invDB);

            return await interaction.reply({
                content: `🗑️ Cleared all storage items for <@${target.id}>.`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
