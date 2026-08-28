const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const botConfig = require('../config'); // Imports OWNER_ID from config.js

// 🛠️ CONFIGURATION
const VALID_KEYWORDS = ['command', 'template'];
const ALLOWED_EXTENSIONS = ['.js'];
const rolesFilePath = path.resolve(process.cwd(), 'command_roles.json');

// Helper functions for persistent permission storage
function loadRolesDB() {
    try {
        if (fs.existsSync(rolesFilePath)) {
            const raw = fs.readFileSync(rolesFilePath, 'utf8').trim();
            return raw ? JSON.parse(raw) : {};
        }
    } catch (e) {
        console.error('Failed to load command_roles.json:', e);
    }
    return {};
}

function saveRolesDB(data) {
    try {
        fs.writeFileSync(rolesFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save command_roles.json:', e);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('command')
        .setDescription('Download command templates, suggest features, or manage permissions')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('template')
                .setDescription('Download the official ProtoBot command template file')
        )
        .addSubcommand(sub =>
            sub.setName('suggest')
                .setDescription('Suggest a new command idea or submit a script')
                .addStringOption(opt =>
                    opt.setName('description')
                        .setDescription('Describe your idea or paste command code')
                        .setRequired(false)
                )
                .addAttachmentOption(opt =>
                    opt.setName('file')
                        .setDescription('Upload your custom command file')
                        .setRequired(false)
                )
        )
        .addSubcommandGroup(group =>
            group.setName('permission')
                .setDescription('Manage command access permissions')
                .addSubcommand(sub =>
                    sub.setName('grant')
                        .setDescription('Grant specific command access to a target user [Owner Only]')
                        .addUserOption(opt =>
                            opt.setName('target')
                                .setDescription('The user to grant access to')
                                .setRequired(true)
                        )
                        .addStringOption(opt =>
                            opt.setName('cmd')
                                .setDescription('The command name to grant (e.g. config, arrest)')
                                .setRequired(true)
                        )
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();
        const ownerId = botConfig.OWNER_ID || botConfig.ownerId;

        // === 1. PERMISSION SUBCOMMAND GROUP ===
        if (subcommandGroup === 'permission') {
            if (subcommand === 'grant') {
                // Owner Security Check
                if (!ownerId || interaction.user.id !== ownerId) {
                    await interaction.editReply({
                        content: '⛔ **Access Denied**: Only the designated Bot Owner (`OWNER_ID`) can grant command permissions.'
                    });
                    return true;
                }

                const targetUser = interaction.options.getUser('target');
                const commandName = interaction.options.getString('cmd').trim().toLowerCase().replace(/^\//, '');

                const rolesDB = loadRolesDB();
                if (!rolesDB[targetUser.id]) {
                    rolesDB[targetUser.id] = [];
                }

                if (rolesDB[targetUser.id].includes(commandName)) {
                    await interaction.editReply({
                        content: `⚠️ <@${targetUser.id}> already has granted access to \`/${commandName}\`.`
                    });
                    return true;
                }

                rolesDB[targetUser.id].push(commandName);
                saveRolesDB(rolesDB);

                const grantEmbed = new EmbedBuilder()
                    .setTitle('✅ COMMAND PERMISSION GRANTED')
                    .setColor(0x2ECC71)
                    .setDescription(`Successfully granted command access to <@${targetUser.id}>!`)
                    .addFields(
                        { name: 'Target User', value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                        { name: 'Command Unlocked', value: `\`/${commandName}\``, inline: true }
                    )
                    .setFooter({ text: 'ProtoBot Security Core' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [grantEmbed] });
                return true;
            }
        }

        // === 2. TEMPLATE SUBCOMMAND ===
        if (subcommand === 'template') {
            const assetsDir = path.join(process.cwd(), 'assets');

            if (!fs.existsSync(assetsDir)) {
                await interaction.editReply({ content: '❌ Could not find the `assets/` directory!' });
                return true;
            }

            const files = fs.readdirSync(assetsDir);
            const matchedFile = files.find(file => {
                const lower = file.toLowerCase();
                const hasValidExt = ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext.toLowerCase()));
                const hasKeywords = VALID_KEYWORDS.every(keyword => lower.includes(keyword.toLowerCase()));
                return hasValidExt && hasKeywords;
            });

            if (!matchedFile) {
                await interaction.editReply({ 
                    content: `❌ Could not find a template file in \`assets/\`!` 
                });
                return true;
            }

            const templatePath = path.join(assetsDir, matchedFile);
            const attachment = new AttachmentBuilder(templatePath, { name: matchedFile });
            await interaction.editReply({
                content: `📦 **ProtoBot Command Template**\nFound \`${matchedFile}\`. Download below:`,
                files: [attachment]
            });
            return true;
        }

        // === 3. SUGGEST SUBCOMMAND ===
        if (subcommand === 'suggest') {
            const textSuggestion = interaction.options.getString('description');
            const fileAttachment = interaction.options.getAttachment('file');

            if (!textSuggestion && !fileAttachment) {
                await interaction.editReply({
                    content: '⚠️ You must provide either a text description or upload a file attachment!'
                });
                return true;
            }

            if (fileAttachment) {
                const lowerFileName = fileAttachment.name.toLowerCase();
                const hasValidExt = ALLOWED_EXTENSIONS.some(ext => lowerFileName.endsWith(ext.toLowerCase()));

                if (!hasValidExt) {
                    await interaction.editReply({
                        content: `❌ Invalid file extension! Please submit a file ending in one of the following: ${ALLOWED_EXTENSIONS.join(', ')}`
                    });
                    return true;
                }
            }

            const suggestionEmbed = new EmbedBuilder()
                .setTitle('💡 New Command Suggestion Received')
                .setColor(0x5865F2)
                .setAuthor({ 
                    name: `${interaction.user.tag} (${interaction.user.id})`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();

            if (textSuggestion) {
                const formattedDetails = textSuggestion.length > 1024 
                    ? textSuggestion.slice(0, 1020) + '...' 
                    : textSuggestion;
                suggestionEmbed.addFields({ name: 'Details / Code', value: `\`\`\`js\n${formattedDetails}\n\`\`\`` });
            }

            if (fileAttachment) {
                suggestionEmbed.addFields({ 
                    name: 'Attached File', 
                    value: `📄 [${fileAttachment.name}](${fileAttachment.url}) (${fileAttachment.size} bytes)` 
                });
            }

            if (!ownerId) {
                await interaction.editReply({
                    content: '❌ Could not find `OWNER_ID` in `config.js`!'
                });
                return true;
            }

            try {
                const owner = await interaction.client.users.fetch(ownerId);
                const dmOptions = { embeds: [suggestionEmbed] };

                if (fileAttachment) {
                    dmOptions.files = [{ attachment: fileAttachment.url, name: fileAttachment.name }];
                }

                await owner.send(dmOptions);

                await interaction.editReply({
                    content: '✅ Thank you! Your command suggestion has been sent directly to the bot developer.'
                });
            } catch (err) {
                console.error('Failed to send suggestion DM to owner:', err);
                await interaction.editReply({
                    content: '⚠️ Suggestion received, but failed to deliver DM to the bot developer. Make sure DMs are open!'
                });
            }

            return true;
        }
    }
};
