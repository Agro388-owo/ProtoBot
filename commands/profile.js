const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { CREDIT, formatNumber } = require('./credits.js');

const profileFilePath = path.resolve(process.cwd(), 'profiles.json');
const creditsFilePath = path.resolve(process.cwd(), 'credits.json');

// Global credits database path (fallback to credits.json if not split)
const globalCreditsFilePath = path.resolve(process.cwd(), 'global_credits.json');

function loadJSON(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8').trim();
            return raw ? JSON.parse(raw) : {};
        }
    } catch (e) {
        console.error(`Failed to read ${filePath}:`, e);
    }
    return {};
}

function saveJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error(`Failed to write ${filePath}:`, e);
    }
}

// Experience required per level formula
function getXpForNextLevel(level) {
    return 100 * Math.pow(level, 2) + 50 * level + 100;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View or customize user profile cards and settings!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('view')
               .setDescription('View your profile card or another user’s profile')
               .addUserOption(opt =>
                   opt.setName('user')
                      .setDescription('The user whose profile you want to view')
                      .setRequired(false)
               )
        )
        .addSubcommand(sub =>
            sub.setName('color')
               .setDescription('Customize the embed accent color of your profile card')
               .addStringOption(opt =>
                   opt.setName('hex')
                      .setDescription('Hex color code (e.g. #00FFC8, #FF0055, or DEFAULT)')
                      .setRequired(true)
               )
        )
        .addSubcommand(sub =>
            sub.setName('bio')
               .setDescription('Set a personal bio or status message on your profile')
               .addStringOption(opt =>
                   opt.setName('text')
                      .setDescription('Your custom bio (max 150 chars)')
                      .setRequired(true)
               )
        )
        .addSubcommand(sub =>
            sub.setName('title')
               .setDescription('Equip a title/tag to display under your name')
               .addStringOption(opt =>
                   opt.setName('tag')
                      .setDescription('Title tag to set (e.g. "Proot Engineer", "Deep Sea Angler")')
                      .setRequired(true)
               )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const profilesDB = loadJSON(profileFilePath);

        // Ensure user profile profile profile structure exists
        if (!profilesDB[userId]) {
            profilesDB[userId] = {
                color: '#00FFC8',
                bio: 'No bio set yet. Use `/profile bio` to set one!',
                title: 'Member',
                level: 1,
                xp: 0
            };
        }

        // === 1. VIEW PROFILE ===
        if (subcommand === 'view') {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const targetId = targetUser.id;

            const targetProfile = profilesDB[targetId] || {
                color: '#00FFC8',
                bio: 'No bio set yet.',
                title: 'Member',
                level: 1,
                xp: 0
            };

            // Load server-specific local credits
            const localCreditsDB = loadJSON(creditsFilePath);
            const userLocalData = localCreditsDB[targetId] || {};
            const localBalance = userLocalData.balance ? BigInt(userLocalData.balance) : 0n;
            const badges = userLocalData.badges || [];

            // Load global credits (۞)
            const globalCreditsDB = loadJSON(globalCreditsFilePath);
            const globalBalanceRaw = globalCreditsDB[targetId]?.balance || "0";
            const globalBalance = BigInt(globalBalanceRaw);

            // Level & XP math
            const level = targetProfile.level || 1;
            const xp = targetProfile.xp || 0;
            const nextLevelXp = getXpForNextLevel(level);

            // Format badges list
            const badgeDisplay = badges.length > 0 
                ? badges.map(b => typeof b === 'string' ? b : b.emoji || b.name).join(' ') 
                : '`None Unlocked`';

            // Resolve embed color
            let embedColor = 0x00FFC8;
            if (targetProfile.color && targetProfile.color.startsWith('#')) {
                embedColor = parseInt(targetProfile.color.replace('#', ''), 16) || 0x00FFC8;
            }

            const embed = new EmbedBuilder()
                .setTitle(`${targetUser.username}'s Profile`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .setColor(embedColor)
                .setDescription(`*${targetProfile.title}*\n\n> ${targetProfile.bio}`)
                .addFields(
                    {
                        name: '📊 Rank & Progression',
                        value: `Level: **${level}**\n` +
                               `XP: **${formatNumber(xp)} / ${formatNumber(nextLevelXp)}**`,
                        inline: true
                    },
                    {
                        name: '💰 Economy & Balances',
                        value: `Global: **${formatNumber(globalBalance)}** ۞\n` +
                               `Local: **${formatNumber(localBalance)}** ${CREDIT}`,
                        inline: true
                    },
                    {
                        name: '🏆 Unlocked Badges',
                        value: badgeDisplay,
                        inline: false
                    }
                )
                .setFooter({ text: 'ProtoBot User Subsystem' });

            return await interaction.reply({ embeds: [embed] });
        }

        // === 2. CUSTOM COLOR ===
        if (subcommand === 'color') {
            let hexInput = interaction.options.getString('hex').trim();

            if (hexInput.toLowerCase() === 'default') {
                hexInput = '#00FFC8';
            } else {
                if (!hexInput.startsWith('#')) hexInput = `#${hexInput}`;
                const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
                if (!hexRegex.test(hexInput)) {
                    return await interaction.reply({
                        content: '❌ Invalid Hex color code! Use formats like `#FF0055`, `#00FFC8`, or `default`.',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            profilesDB[userId].color = hexInput;
            saveJSON(profileFilePath, profilesDB);

            const colorPreview = new EmbedBuilder()
                .setTitle('🎨 PROFILE COLOR UPDATED')
                .setColor(parseInt(hexInput.replace('#', ''), 16))
                .setDescription(`Your profile card accent color has been set to **\`${hexInput}\`**!`);

            return await interaction.reply({ embeds: [colorPreview], flags: MessageFlags.Ephemeral });
        }

        // === 3. CUSTOM BIO ===
        if (subcommand === 'bio') {
            const bioText = interaction.options.getString('text').trim();

            if (bioText.length > 150) {
                return await interaction.reply({
                    content: '⚠️ Profile bios must be 150 characters or fewer!',
                    flags: MessageFlags.Ephemeral
                });
            }

            profilesDB[userId].bio = bioText;
            saveJSON(profileFilePath, profilesDB);

            return await interaction.reply({
                content: `✅ Updated your profile bio to:\n> ${bioText}`,
                flags: MessageFlags.Ephemeral
            });
        }

        // === 4. CUSTOM TITLE ===
        if (subcommand === 'title') {
            const newTitle = interaction.options.getString('tag').trim();

            if (newTitle.length > 32) {
                return await interaction.reply({
                    content: '⚠️ Title tags must be 32 characters or fewer!',
                    flags: MessageFlags.Ephemeral
                });
            }

            profilesDB[userId].title = newTitle;
            saveJSON(profileFilePath, profilesDB);

            return await interaction.reply({
                content: `🏷️ Your equipped title tag is now set to: **[ ${newTitle} ]**`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
