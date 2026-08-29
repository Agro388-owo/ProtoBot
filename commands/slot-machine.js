const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { CREDIT, formatNumber, clampBalance, isInPrison } = require('./credits.js');

const creditsFilePath = path.resolve(process.cwd(), 'credits.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slot-machine')
        .setDescription('Play the high-stakes slot machine or view how it works!')
        .setIntegrationTypes([0, 1])
        .setContexts([0, 1, 2])
        .addSubcommand(sub =>
            sub.setName('play')
               .setDescription('Bet your local credits on the slot machine')
               .addIntegerOption(option =>
                   option.setName('amount')
                         .setDescription('Amount of credits to bet')
                         .setRequired(true)
                         .setMinValue(1)
               )
        )
        .addSubcommand(sub =>
            sub.setName('info')
               .setDescription('View payout tables, rules, and how the slot machine works')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        let creditsDB = {};
        try {
            if (fs.existsSync(creditsFilePath)) {
                creditsDB = JSON.parse(fs.readFileSync(creditsFilePath, 'utf8') || '{}');
            }
        } catch (e) {
            console.error('Error loading credits DB in slots:', e);
        }

        if (subcommand === 'info') {
            const infoEmbed = new EmbedBuilder()
                .setTitle('🎰 Slot Machine — Rules & Payouts')
                .setColor('#00FFC8')
                .setDescription('The Slot Machine spins 3 reels randomly from 5 available symbols: 🍒, 🍋, 🍇, 💎, and 7️⃣.')
                .addFields(
                    {
                        name: '🏆 Payout Multipliers',
                        value: [
                            '💎 💎 💎 — **10x Bet** (Diamond Jackpot)',
                            '7️⃣ 7️⃣ 7️⃣ — **7x Bet** (Lucky Seven Jackpot)',
                            '🍒/🍋/🍇 (3 Matching) — **5x Bet** (Standard Jackpot)',
                            'Any 2 Matching Symbols — **2x Bet** (Double Match)'
                        ].join('\n')
                    },
                    {
                        name: '⚙️ How it Works',
                        value: [
                            '• **Bet Deduction:** Your bet is verified against your local balance in `credits.json`.',
                            '• **RNG Generation:** Each reel selects a symbol with equal probability (1 in 5).',
                            '• **Balance Clamping:** All payouts use `BigInt` math with automatic overflow protection.',
                            '• **Losses:** If no 2 symbols match, your bet is lost.'
                        ].join('\n')
                    }
                )
                .setFooter({ text: 'Use /slot-machine play <amount> to give it a spin!' });

            return await interaction.reply({ embeds: [infoEmbed] });
        }

        if (subcommand === 'play') {
            const userEntry = creditsDB[userId];

            // Prison Check
            if (isInPrison(userEntry)) {
                const remainingMs = userEntry.jailUntil - Date.now();
                const minutes = Math.floor(remainingMs / (1000 * 60));
                const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
                return await interaction.reply({
                    content: `🚨 **PRISON LOCKDOWN!** You are currently in prison! You cannot play slots for another **${minutes}m ${seconds}s**.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const betInput = interaction.options.getInteger('amount');
            const bet = BigInt(betInput);

            const userBalance = userEntry?.balance ? BigInt(userEntry.balance) : 0n;

            if (userBalance < bet) {
                return await interaction.reply({
                    content: `❌ You don't have enough credits! Current Balance: **${formatNumber(userBalance)}** ${CREDIT}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            const slots = ['🍒', '🍋', '🍇', '💎', '7️⃣'];
            const reel1 = slots[Math.floor(Math.random() * slots.length)];
            const reel2 = slots[Math.floor(Math.random() * slots.length)];
            const reel3 = slots[Math.floor(Math.random() * slots.length)];

            let multiplier = 0n;
            let outcomeText = '';

            if (reel1 === reel2 && reel2 === reel3) {
                if (reel1 === '💎') multiplier = 10n;
                else if (reel1 === '7️⃣') multiplier = 7n;
                else multiplier = 5n;
                outcomeText = `🎉 **JACKPOT!** You matched 3x ${reel1} and won **${multiplier}x** your bet!`;
            } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
                multiplier = 2n;
                outcomeText = `✨ **NICE!** You matched 2 items and won **2x** your bet!`;
            } else {
                outcomeText = `💀 **OOF!** No matches. Better luck next time!`;
            }

            const payout = bet * multiplier;
            const newBalance = clampBalance(userBalance - bet + payout);

            if (!creditsDB[userId]) creditsDB[userId] = {};
            creditsDB[userId].balance = newBalance.toString();

            try {
                fs.writeFileSync(creditsFilePath, JSON.stringify(creditsDB, null, 2));
            } catch (e) {
                console.error('Failed to save slot earnings:', e);
            }

            const embed = new EmbedBuilder()
                .setTitle('🎰 High-Tech Slot Machine 🎰')
                .setColor(multiplier > 0n ? '#00FFC8' : '#FF0055')
                .setDescription(`**[ ${reel1} | ${reel2} | ${reel3} ]**\n\n${outcomeText}`)
                .addFields(
                    { name: 'Bet', value: `${formatNumber(bet)} ${CREDIT}`, inline: true },
                    { name: 'Payout', value: `${formatNumber(payout)} ${CREDIT}`, inline: true },
                    { name: 'New Balance', value: `${formatNumber(newBalance)} ${CREDIT}`, inline: true }
                )
                .setFooter({ text: `Requested by ${interaction.user.username} | Run /slot-machine info for payouts` });

            return await interaction.reply({ embeds: [embed] });
        }
    }
};
