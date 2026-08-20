const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const botConfig = require('../config'); // Imports OWNER_ID from config.js

// 🛠️ CONFIGURATION
const VALID_KEYWORDS = ['command', 'template'];
const ALLOWED_EXTENSIONS = ['.js'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('command')
        .setDescription('Download command templates or suggest new commands')
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
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const subcommand = interaction.options.getSubcommand();

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

            // Build DM notification embed
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

            // Fetch owner ID from config and deliver DM
            const ownerId = botConfig.OWNER_ID || botConfig.ownerId;

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
