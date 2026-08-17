const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const botConfig = require('../config.js');

const owner = "Agro388-owo";
const repo = "ProtoBot";
const path = "assets/polaroid.png";
const branch = "main";

// Fetch template directly from GitHub repository
async function loadTemplateBuffer() {
    const token = botConfig.GITHUB_TOKEN;
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
    
    const res = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "User-Agent": "ProtoBot-PhotoCommand"
        }
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch polaroid template from GitHub: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

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
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user');
        const attachedImage = interaction.options.getAttachment('image');

        const isAttachedGif = attachedImage?.contentType?.includes('gif') || attachedImage?.url?.toLowerCase().endsWith('.gif');
        const target = targetUser || interaction.user;
        const isAvatarGif = target.avatar && target.avatar.startsWith('a_');

        let imageUrl;
        let isGif = false;

        if (attachedImage) {
            imageUrl = attachedImage.url;
            isGif = isAttachedGif;
        } else {
            isGif = isAvatarGif;
            imageUrl = target.displayAvatarURL({ extension: isGif ? 'gif' : 'png', size: 512, forceStatic: false });
        }

        try {
            const [userImg, templateBuffer] = await Promise.all([
                loadImage(imageUrl),
                loadTemplateBuffer()
            ]);

            const templateImg = await loadImage(templateBuffer);

            const canvas = createCanvas(templateImg.width, templateImg.height);
            const ctx = canvas.getContext('2d');

            const centerX = templateImg.width * 0.495;
            const centerY = templateImg.height * 0.435;
            const photoSize = templateImg.width * 0.38;

            // 1. Draw User Image (Positioned & Rotated)
            ctx.save();
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

            // 2. Draw Polaroid Overlay Frame on Top
            ctx.drawImage(templateImg, 0, 0, templateImg.width, templateImg.height);

            // 3. Encode & Output
            const buffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(buffer, { name: isGif ? 'polaroid-photo.gif' : 'polaroid-photo.png' });

            return await interaction.editReply({ files: [attachment] });

        } catch (error) {
            console.error('Failed to generate photo command:', error);
            await interaction.editReply({
                content: `❌ Could not process this image or GIF! <:Puropreocupado:1536430030916288572>`
            });
        }
    }
};
