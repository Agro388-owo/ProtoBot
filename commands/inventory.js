const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const botConfig = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('Manage user inventories')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub
                .setName('view')
                .setDescription('View a user\'s current inventory')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('The user whose inventory to view')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('add')
                .setDescription('Add an item to a user\'s inventory (Owner only)')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('The user to give the item to')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt
                        .setName('item')
                        .setDescription('The name of the item to add')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('remove')
                .setDescription('Remove a single item from a user\'s inventory (Owner only)')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('The user to take the item from')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt
                        .setName('item')
                        .setDescription('The name of the item to remove')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName('clear')
                .setDescription('Clear an inventory or remove a specific item from a user (Owner only)')
                .addUserOption(opt =>
                    opt
                        .setName('user')
                        .setDescription('The user whose inventory to clear')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt
                        .setName('item')
                        .setDescription('Specific item to remove (leave blank to clear full inventory)')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Safe setup for target inventories object in config
        if (!botConfig.inventories) botConfig.inventories = {};

        // === 1. VIEW SUBCOMMAND (Public / Any user) ===
        if (subcommand === 'view') {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const items = botConfig.inventories[targetUser.id] || [];

            const itemList = items.length > 0 
                ? items.map((item, idx) => `**${idx + 1}.** ${item}`).join('\n')
                : '*Inventory is currently empty.*';

            const embed = new EmbedBuilder()
                .setTitle(`🎒 ${targetUser.username}'s Inventory`)
                .setColor(0x5865F2)
                .setDescription(itemList)
                .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
                .setFooter({ text: `Total Items: ${items.length}` });

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return null;
        }

        // === OWNER GUARD FOR ADMINISTRATIVE SUBCOMMANDS ===
        if (interaction.user.id !== botConfig.OWNER_ID) {
            await interaction.reply({
                content: '❌ Only the designated bot owner can manage user inventories!',
                ephemeral: true
            });
            return null;
        }

        // === 2. ADD SUBCOMMAND ===
        if (subcommand === 'add') {
            const targetUser = interaction.options.getUser('user');
            const item = interaction.options.getString('item').trim();

            if (!botConfig.inventories[targetUser.id]) {
                botConfig.inventories[targetUser.id] = [];
            }

            botConfig.inventories[targetUser.id].push(item);

            await interaction.reply({
                content: `✅ Added **"${item}"** to <@${targetUser.id}>'s inventory.`,
                ephemeral: true
            });
            return null;
        }

        // === 3. REMOVE SUBCOMMAND ===
        if (subcommand === 'remove') {
            const targetUser = interaction.options.getUser('user');
            const targetItem = interaction.options.getString('item').trim();
            const userInventory = botConfig.inventories[targetUser.id] || [];

            const itemIndex = userInventory.findIndex(
                item => item.toLowerCase() === targetItem.toLowerCase()
            );

            if (itemIndex === -1) {
                await interaction.reply({
                    content: `⚠️ Item **"${targetItem}"** was not found in <@${targetUser.id}>'s inventory.`,
                    ephemeral: true
                });
                return null;
            }

            const removed = userInventory.splice(itemIndex, 1)[0];

            await interaction.reply({
                content: `🗑️ Removed **"${removed}"** from <@${targetUser.id}>'s inventory.`,
                ephemeral: true
            });
            return null;
        }

        // === 4. CLEAR SUBCOMMAND ===
        if (subcommand === 'clear') {
            const targetUser = interaction.options.getUser('user');
            const targetItem = interaction.options.getString('item');

            if (!botConfig.inventories[targetUser.id]) {
                botConfig.inventories[targetUser.id] = [];
            }

            const userInventory = botConfig.inventories[targetUser.id];

            if (targetItem) {
                const itemIndex = userInventory.findIndex(
                    item => item.toLowerCase() === targetItem.trim().toLowerCase()
                );

                if (itemIndex === -1) {
                    await interaction.reply({
                        content: `⚠️ Item **"${targetItem}"** was not found in <@${targetUser.id}>'s inventory.`,
                        ephemeral: true
                    });
                    return null;
                }

                const removedItem = userInventory.splice(itemIndex, 1)[0];

                await interaction.reply({
                    content: `🗑️ Removed **"${removedItem}"** from <@${targetUser.id}>'s inventory.`,
                    ephemeral: true
                });
            } else {
                botConfig.inventories[targetUser.id] = [];

                await interaction.reply({
                    content: `🧹 Cleared all items from <@${targetUser.id}>'s inventory.`,
                    ephemeral: true
                });
            }
            return null;
        }
    }
};
