const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const botConfig = require('../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('photo')
        .setDescription('Puts a profile picture or image into a Changed polaroid frame!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addUserOption(option =>
            option.setName('user')
                  .setDescription('User whose avatar to use')
                  .setRequired(false)
        )
        .addAttachmentOption(option =>
            option.setName('image')
                  .setDescription('An image file to use')
                  .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('format')
                  .setDescription('Choose output format')
                  .setRequired(false)
                  .addChoices(
                      { name: 'Static (PNG)', value: 'png' },
                      { name: 'Animated (GIF)', value: 'gif' }
                  )
        ),

    async execute(interaction, senderName) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const attachedImage = interaction.options.getAttachment('image');
        const outputFormat = interaction.options.getString('format') || 'png';

        // Resolve target image URL based on whether user wants a gif or png extension override
        let imageUrl;
        if (attachedImage) {
            imageUrl = attachedImage.url;
        } else if (targetUser) {
            imageUrl = targetUser.displayAvatarURL({ 
                extension: outputFormat === 'gif' ? 'gif' : 'png', 
                size: 512 
            });
        } else {
            const user = interaction.user;
            imageUrl = user.displayAvatarURL({ 
                extension: outputFormat === 'gif' ? 'gif' : 'png', 
                size: 512 
            });
        }

        try {
            // Load user image and template from the root assets folder
            const userImg = await loadImage(imageUrl);
            const templatePath = path.join(__dirname, '../assets/polaroid.png');
            const templateImg = await loadImage(templatePath);

            // Create canvas matching the template image resolution
            const canvas = createCanvas(templateImg.width, templateImg.height);
            const ctx = canvas.getContext('2d');

            // --- 1. Draw User Image (Positioned & Rotated to fit the frame window) ---
            ctx.save();
            
            const centerX = templateImg.width * 0.495;
            const centerY = templateImg.height * 0.435;
            const photoSize = templateImg.width * 0.38; 

            ctx.translate(centerX, centerY);
            ctx.rotate(5.5 * (Math.PI / 180));

            ctx.drawImage(
                userImg, 
                -photoSize / 2, 
                -photoSize / 2, 
                photoSize, 
                photoSize
            );
            ctx.restore();

            // --- 2. Draw Polaroid Overlay Frame on Top ---
            ctx.drawImage(templateImg, 0, 0, templateImg.width, templateImg.height);

            // --- 3. Build & Send Attachment ---
            const encodeFormat = outputFormat === 'gif' ? 'gif' : 'png';
            const buffer = await canvas.encode(encodeFormat);
            const attachment = new AttachmentBuilder(buffer, { name: `polaroid-photo.${encodeFormat}` });

            await interaction.editReply({
                content: ``,
                files: [attachment]
            });

        } catch (error) {
            console.error('Failed to generate photo command:', error);
            await interaction.editReply({
                content: `❌ Could not load or process the image file. Ensure \`assets/polaroid.png\` exists and the selected format is supported!`
            });
        }
    }
};
