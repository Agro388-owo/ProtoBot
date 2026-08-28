const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../config.js');

const inventoryFilePath = path.resolve(process.cwd(), 'inventory.json');
const lootFilePath = path.resolve(process.cwd(), 'fishing_loot.json');

function loadInventoryDB() {
    try {
        if (!fs.existsSync(inventoryFilePath)) {
            fs.writeFileSync(inventoryFilePath, '{}', 'utf8');
            return {};
        }
        const raw = fs.readFileSync(inventoryFilePath, 'utf8').trim();
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.error(`Failed to load ${inventoryFilePath}:`, e);
        return {};
    }
}

function saveInventoryDB(data) {
    try {
        fs.writeFileSync(inventoryFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error(`Failed to save ${inventoryFilePath}:`, e);
    }
}

function loadLootDB() {
    try {
        if (fs.existsSync(lootFilePath)) {
            const raw = fs.readFileSync(lootFilePath, 'utf8').trim();
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed.items || [];
        }
    } catch (e) {
        console.error(`Failed to load ${lootFilePath}:`, e);
    }
    return [];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Manage user inventories')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('view')
               .setDescription('View a user\'s current inventory')
               .addUserOption(opt => opt.setName('user').setDescription('The user whose inventory to view').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('add')
               .setDescription('Add an item to a user\'s inventory (Owner/Admin only)')
               .addUserOption(opt => opt.setName('user').setDescription('The user to give the item to').setRequired(true))
               .addStringOption(opt => opt.setName('item').setDescription('Item ID (e.g. pipe, duck, salmon)').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
               .setDescription('Remove a single item from a user\'s inventory (Owner/Admin only)')
               .addUserOption(opt => opt.setName('user').setDescription('The user to take the item from').setRequired(true))
               .addStringOption(opt => opt.setName('item').setDescription('Item ID to remove').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('clear')
               .setDescription('Clear an inventory completely (Owner/Admin only)')
               .addUserOption(opt => opt.setName('user').setDescription('The user whose inventory to clear').setRequired(true))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const ownerId = botConfig.OWNER_ID || botConfig.ownerId;
        const isOwner = userId === ownerId;
        const isAdmin = interaction.memberPermissions?.has(8n);

        const inventoryDB = loadInventoryDB();
        const lootItems = loadLootDB();

        const formatItemDisplay = (itemId) => {
            const matched = lootItems.find(i => i.id.toLowerCase() === itemId.toLowerCase());
            return matched ? `${matched.emoji} **${matched.name}** (\`${matched.id}\`)` : `📦 **${itemId}**`;
        };

        // === 1. VIEW SUBCOMMAND ===
        if (subcommand === 'view') {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const userItems = inventoryDB[targetUser.id] || [];

            const itemCounts = {};
            for (const item of userItems) {
                const id = item.toLowerCase();
                itemCounts[id] = (itemCounts[id] || 0) + 1;
            }

            const itemKeys = Object.keys(itemCounts);
            const itemList = itemKeys.length > 0
                ? itemKeys.map(id => `${formatItemDisplay(id)} × **${itemCounts[id]}**`).join('\n')
                : '*Inventory is currently empty.*';

            const embed = new EmbedBuilder()
                .setTitle(`🎒 ${targetUser.username}'s Inventory`)
                .setColor(0x5865F2)
                .setDescription(itemList)
                .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
                .setFooter({ text: `Total Items: ${userItems.length}` });

            await interaction.reply({ embeds: [embed] });
            return null;
        }

        // Guard for admin subcommands
        if (!isOwner && !isAdmin) {
            await interaction.reply({
                content: '❌ You do not have permission to modify user inventories!',
                flags: MessageFlags.Ephemeral
            });
            return null;
        }

        // === 2. ADD SUBCOMMAND ===
        if (subcommand === 'add') {
            const targetUser = interaction.options.getUser('user');
            const itemId = interaction.options.getString('item').trim().toLowerCase();

            if (!inventoryDB[targetUser.id]) inventoryDB[targetUser.id] = [];
            inventoryDB[targetUser.id].push(itemId);
            saveInventoryDB(inventoryDB);

            await interaction.reply({ content: `✅ Added ${formatItemDisplay(itemId)} to <@${targetUser.id}>'s inventory.` });
            return null;
        }

        // === 3. REMOVE SUBCOMMAND ===
        if (subcommand === 'remove') {
            const targetUser = interaction.options.getUser('user');
            const targetItem = interaction.options.getString('item').trim().toLowerCase();
            const userInventory = inventoryDB[targetUser.id] || [];

            const itemIndex = userInventory.findIndex(item => item.toLowerCase() === targetItem);
            if (itemIndex === -1) {
                await interaction.reply({
                    content: `⚠️ Item \`${targetItem}\` was not found in <@${targetUser.id}>'s inventory.`,
                    flags: MessageFlags.Ephemeral
                });
                return null;
            }

            const removed = userInventory.splice(itemIndex, 1)[0];
            saveInventoryDB(inventoryDB);

            await interaction.reply({ content: `🗑️ Removed ${formatItemDisplay(removed)} from <@${targetUser.id}>'s inventory.` });
            return null;
        }

        // === 4. CLEAR SUBCOMMAND ===
        if (subcommand === 'clear') {
            const targetUser = interaction.options.getUser('user');
            inventoryDB[targetUser.id] = [];
            saveInventoryDB(inventoryDB);

            await interaction.reply({ content: `🧹 Cleared all items from <@${targetUser.id}>'s inventory.` });
            return null;
        }
    }
};
