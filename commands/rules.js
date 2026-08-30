const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('Displays the official bot usage rules.'),

    async execute(interaction, senderName) {
        const rulesEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🤖 ProtoBot Usage Rules')
            .setDescription(`Hey ${senderName}, make sure to review the bot guidelines below. Violations may result in macro detection flags, currency wipes, or bot blacklists.`)
            .addFields(
                {
                    name: '🚫 1. No Macros or Automation',
                    value: 'Auto-clickers (TinyTask, AutoHotkey), self-bots, and input macros are strictly forbidden on all commands like `/fishing cast`, `/mine`, `/slot-machine`, `/gamble`, and `/lottery`.'
                },
                {
                    name: '🐛 2. No Bug or Exploit Abuse',
                    value: 'Intentionally abusing duplications, economy glitches, or command bugs is banned. Report any security flaws to staff immediately.'
                },
                {
                    name: '⚡ 3. No Command Spamming',
                    value: 'Do not attempt to spam commands faster than their intended cooldowns. Excessive spamming triggers dynamic rate-limiting penalties.'
                },
                {
                    name: '🔄 4. No Multi-Account Farming',
                    value: 'Using alternate accounts (alts) to farm daily rewards, transfer starter cash, or manipulate leaderboards is prohibited.'
                },
                {
                    name: '🤝 5. Fair Play & Economy Integrity',
                    value: 'Trademarks, gambling, and currency trades must follow fair play. Using bots or alt networks to manipulate economy balances will result in a hard balance reset.'
                }
            )
            .setFooter({ text: 'ProtoBot Rules • Click ❌ to close' })
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({ embeds: [rulesEmbed] });
        } else {
            await interaction.reply({ embeds: [rulesEmbed] });
        }

        return '';
    }
};
