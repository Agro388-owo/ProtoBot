const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getAllBadges, loadCustomBadges, saveCustomBadges } = require('../badgeSystem.js');
const botConfig = require('../config.js');

const creditsFilePath = path.join(__dirname, '../credits.json');

function loadCreditsDB() {
    try {
        if (fs.existsSync(creditsFilePath)) {
            const raw = fs.readFileSync(creditsFilePath, 'utf8') || '{}';
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Failed to load credits.json in badge command:', e);
    }
    return {};
}

function saveCreditsDB(data) {
    try {
        const serialized = JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2);
        fs.writeFileSync(creditsFilePath, serialized, 'utf8');
    } catch (e) {
        console.error('Failed to save credits.json in badge command:', e);
    }
}

// Safely send responses (ephemeral in servers, regular in DMs)
function sendPrivateReply(interaction, content) {
    if (interaction.inGuild()) {
        return interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ content });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('badge')
        .setDescription('View and manage bot badges')
        .setIntegrationTypes([0, 1]) // 0: Guild Install, 1: User Install
        .setContexts([0, 1, 2])      // 0: Guild, 1: Bot DM, 2: Private Channel / Group DM
        .addSubcommand(sub =>
            sub.setName('list')
               .setDescription('View all available system and custom badges'))
        .addSubcommand(sub =>
            sub.setName('view')
               .setDescription('Check badges owned by a specific user')
               .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('create')
               .setDescription('[Owner] Create a custom badge')
               .addStringOption(opt => opt.setName('id').setDescription('Unique ID (e.g. EVENT_2026)').setRequired(true))
               .addStringOption(opt => opt.setName('name').setDescription('Display name').setRequired(true))
               .addStringOption(opt => opt.setName('emoji').setDescription('Badge icon/emoji').setRequired(true))
               .addStringOption(opt => opt.setName('description').setDescription('Badge description').setRequired(true))
               .addStringOption(opt => opt.setName('threshold').setDescription('Balance threshold requirement (optional)').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('grant')
               .setDescription('[Owner] Manually grant a badge to a user')
               .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
               .addStringOption(opt => opt.setName('id').setDescription('Badge ID').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('revoke')
               .setDescription('[Owner] Revoke a badge from a user')
               .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
               .addStringOption(opt => opt.setName('id').setDescription('Badge ID').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('delete')
               .setDescription('[Owner] Permanently delete a custom badge')
               .addStringOption(opt => opt.setName('id').setDescription('Custom Badge ID').setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const creditsDB = loadCreditsDB();
        
        const ownerId = botConfig.OWNER_ID || botConfig.ownerId;
        const isOwner = interaction.user.id === ownerId;
        
        const ownerSubcmds = ['create', 'grant', 'revoke', 'delete'];

        if (ownerSubcmds.includes(subcommand) && !isOwner) {
            return sendPrivateReply(interaction, '❌ Only the bot owner can use this command.');
        }

        const allBadges = getAllBadges();

        // ------------------ PUBLIC SUBCOMMANDS ------------------
        if (subcommand === 'list') {
            const listText = Object.values(allBadges).map(b => {
                const reqText = b.req ? ` *(Req: ${BigInt(b.req.toString()).toLocaleString()} credits)*` : ' *(Manual Award)*';
                return `${b.emoji} **${b.name}** (\`${b.id}\`)\n└ ${b.desc}${reqText}`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setTitle('📜 Available Badges')
                .setDescription(listText || 'No badges registered.')
                .setColor('#5865F2');

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'view') {
            const target = interaction.options.getUser('user') || interaction.user;
            const userData = creditsDB[target.id] || { balance: '0', badges: [] };
            const owned = (userData.badges || []).map(id => allBadges[id]).filter(Boolean);

            const badgeList = owned.length > 0
                ? owned.map(b => `${b.emoji} **${b.name}** - *${b.desc}*`).join('\n')
                : 'No badges unlocked yet.';

            const embed = new EmbedBuilder()
                .setTitle(`${target.username}'s Badges`)
                .setThumbnail(target.displayAvatarURL())
                .setDescription(badgeList)
                .setFooter({ text: `Total Unlocked: ${owned.length}/${Object.keys(allBadges).length}` })
                .setColor('#00FFAA');

            return interaction.reply({ embeds: [embed] });
        }

        // ------------------ OWNER SUBCOMMANDS ------------------
        if (subcommand === 'create') {
            const id = interaction.options.getString('id').toUpperCase();
            const name = interaction.options.getString('name');
            const emoji = interaction.options.getString('emoji');
            const desc = interaction.options.getString('description');
            const thresholdRaw = interaction.options.getString('threshold');

            if (allBadges[id]) {
                return sendPrivateReply(interaction, `❌ A badge with ID \`${id}\` already exists.`);
            }

            const customBadges = loadCustomBadges();
            const newBadge = {
                id,
                name,
                emoji,
                desc,
                type: thresholdRaw ? "balance" : "manual"
            };

            if (thresholdRaw) {
                try {
                    newBadge.req = BigInt(thresholdRaw).toString();
                } catch {
                    return sendPrivateReply(interaction, '❌ Invalid integer format for threshold.');
                }
            }

            customBadges[id] = newBadge;
            saveCustomBadges(customBadges);

            return interaction.reply({ content: `✅ Created custom badge ${emoji} **${name}** (\`${id}\`)` });
        }

        if (subcommand === 'grant') {
            const target = interaction.options.getUser('user');
            const id = interaction.options.getString('id').toUpperCase();

            if (!allBadges[id]) return sendPrivateReply(interaction, `❌ Badge \`${id}\` does not exist.`);
            if (!creditsDB[target.id]) creditsDB[target.id] = { balance: '0', badges: [] };
            if (!creditsDB[target.id].badges) creditsDB[target.id].badges = [];

            if (creditsDB[target.id].badges.includes(id)) {
                return sendPrivateReply(interaction, `⚠️ ${target.username} already has the \`${id}\` badge.`);
            }

            creditsDB[target.id].badges.push(id);
            saveCreditsDB(creditsDB);

            return interaction.reply({ content: `🎉 Granted ${allBadges[id].emoji} **${allBadges[id].name}** to **${target.username}**!` });
        }

        if (subcommand === 'revoke') {
            const target = interaction.options.getUser('user');
            const id = interaction.options.getString('id').toUpperCase();

            if (!creditsDB[target.id] || !creditsDB[target.id].badges?.includes(id)) {
                return sendPrivateReply(interaction, `⚠️ User does not own the badge \`${id}\`.`);
            }

            creditsDB[target.id].badges = creditsDB[target.id].badges.filter(b => b !== id);
            saveCreditsDB(creditsDB);

            return interaction.reply({ content: `🗑️ Revoked \`${id}\` from **${target.username}**.` });
        }

        if (subcommand === 'delete') {
            const id = interaction.options.getString('id').toUpperCase();
            const customBadges = loadCustomBadges();

            if (!customBadges[id]) {
                return sendPrivateReply(interaction, `❌ Cannot delete \`${id}\` (either doesn't exist or is a default system badge).`);
            }

            delete customBadges[id];
            saveCustomBadges(customBadges);

            return interaction.reply({ content: `🗑️ Deleted custom badge \`${id}\` permanently.` });
        }
    }
};
