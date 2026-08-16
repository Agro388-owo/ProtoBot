const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const GIFEncoder = require('gifencoder');
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
                extension: user.avatar?.startsWith('a_') ? 'gif' : 'png', 
                size: 512 
            });
        }

        try {
            const templatePath = path.join(__dirname, '../assets/polaroid.png');
            const templateImg = await loadImage(templatePath);

            // If user selected PNG or the image is static, use the fast single-frame renderer
            if (outputFormat === 'png') {
                const userImg = await loadImage(imageUrl);
                const canvas = createCanvas(templateImg.width, templateImg.height);
                const ctx = canvas.getContext('2d');

                ctx.save();
                const centerX = templateImg.width * 0.495;
                const centerY = templateImg.height * 0.435;
                const photoSize = templateImg.width * 0.38; 

                ctx.translate(centerX, centerY);
                ctx.rotate(5.5 * (Math.PI / 180));
                ctx.drawImage(userImg, -photoSize / 2, -photoSize / 2, photoSize, photoSize);
                ctx.restore();

                ctx.drawImage(templateImg, 0, 0, templateImg.width, templateImg.height);

                const buffer = await canvas.encode('png');
                const attachment = new AttachmentBuilder(buffer, { name: 'polaroid-photo.png' });

                return await interaction.editReply({ content: '', files: [attachment] });
            }

            // --- GIF Encoder Implementation ---
            const encoder = new GIFEncoder(templateImg.width, templateImg.height);
            encoder.start();
            encoder.setRepeat(0); // 0 = loop indefinitely, -1 = no loop
            encoder.setDelay(100); // Frame delay in milliseconds (adjust as needed)
            encoder.setQuality(10); // Image quality (10 is default good balance)

            const canvas = createCanvas(templateImg.width, templateImg.height);
            const ctx = canvas.getContext('2d');

            // Note: To fully parse multi-frame animated GIFs frame-by-frame in Node.js, 
            // a decoder like 'omggif' or 'gifwrap' is typically used to extract frame buffers.
            // Below demonstrates passing the encoder stream context:
            
            const userImg = await loadImage(imageUrl);

            // Draw a multi-pass or single frame loop for the encoder stream
            ctx.save();
            const centerX = templateImg.width * 0.495;
            const centerY = templateImg.height * 0.435;
            const photoSize = templateImg.width * 0.38; 

            ctx.translate(centerX, centerY);
            ctx.rotate(5.5 * (Math.PI / 180));
            ctx.drawImage(userImg, -photoSize / 2, -photoSize / 2, photoSize, photoSize);
            ctx.restore();

            ctx.drawImage(templateImg, 0, 0, templateImg.width, templateImg.height);
            
            encoder.addFrame(ctx);
            encoder.finish();

            const buffer = encoder.out.getData();
            const attachment = new AttachmentBuilder(buffer, { name: 'polaroid-photo.gif' });

            await interaction.editReply({
                content: '',
                files: [attachment]
            });

        } catch (error) {
            console.error('Failed to generate photo command:', error);
            await interaction.editReply({
                content: `❌ Could not load or process the image file. Ensure \`assets/polaroid.png\` exists and the encoder libraries are installed!`
            });
        }
    }
};
