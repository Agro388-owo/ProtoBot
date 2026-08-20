const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('command')
        .setDescription('Download command templates or suggest new commands')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('template')
                .setDescription('Download the official ProtoBot command template JS file')
        )
        .addSubcommand(sub =>
            sub.setName('suggest')
                .setDescription('Suggest a new command idea or submit a .js script')
                .addStringOption(opt =>
                    opt.setName('description')
                        .setDescription('Describe your idea or paste command code')
                        .setRequired(false)
                )
                .addAttachmentOption(opt =>
                    opt.setName('file')
                        .setDescription('Upload your custom command .js file')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'template') {
            const templatePath = path.join(process.cwd(), 'assets', 'template-command.js');

            if (!fs.existsSync(templatePath)) {
                await interaction.editReply({ content: '❌ Could not find `template-command.js` inside `assets/`!' });
                return true;
            }

            const attachment = new AttachmentBuilder(templatePath, { name: 'template-command.js' });
            await interaction.editReply({
                content: '📦 **ProtoBot Command Template**\nDownload the file below to create new action or utility commands:',
                files: [attachment]
            });
            return true;
        }

        if (subcommand === 'suggest') {
            const textSuggestion = interaction.options.getString('description');
            const fileAttachment = interaction.options.getAttachment('file');

            if (!textSuggestion && !fileAttachment) {
                await interaction.editReply({
                    content: '⚠️ You must provide either a text description or upload a `.js` file attachment!'
                });
                return true;
            }

            if (fileAttachment && !fileAttachment.name.endsWith('.js')) {
                await interaction.editReply({
                    content: '❌ Invalid file type! Please submit a valid JavaScript file ending in `.js`.'
                });
                return true;
            }

            const suggestionEmbed = new EmbedBuilder()
                .setTitle('💡 New Command Suggestion')
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

            await interaction.editReply({
                content: '✅ Thank you! Your command suggestion has been submitted successfully.',
                embeds: [suggestionEmbed]
            });
            return true;
        }
    }
};
