# 🤖 ProtoBot

ProtoBot is a custom Discord interaction bot built with `discord.js` v14 and powered by Node.js. It features dynamic command loading, interactive status messaging, custom emojis, and an Express server setup for continuous 24/7 uptime hosting (such as on Render).

## ✨ Features

* **Dynamic Command Loader:** Automatically reads and registers commands from the `commands/` directory on boot and logs active commands directly to the console.
* **Interactive Slash Commands:** Includes fun utility and roleplay commands with customized self-targeting options.
* **Custom Emoji Integration:** Utilizes custom Discord emojis to add unique expressions to bot responses.
* **Message Management:** Built-in reaction collectors allowing command authors to easily clean up/delete bot responses using a reaction.
* **24/7 Uptime Ready:** Includes an integrated Express HTTP server to handle health checks for web hosting providers.

## ⚙️ Commands

* `/bap` — Baps a target user with custom formatting variants.
* `/blow-up` — Triggers a dramatic explosion event for a target user.
* `/carry` — Carries a target user with custom physics-glitch interaction messages.
* `/config` — Manages bot configuration options and response settings.
* `/dropkick` — Delivers a high-impact dropkick to a target user.
* `/hamburger` — Serves up a special hamburger order to a target user.
* `/hug` — Gives a warm or customized hug to a target user.
* `/kidnap` — Initiates a kidnapping interaction sequence.
* `/kiss` — Delivers a kiss interaction to a target user.
* `/maid-dress` — Forces a targeted user (or yourself) into a frilly maid dress with randomized text variants and custom Puro emojis.
* `/murder` — Triggers a humorous or dramatic elimination sequence for a target user.
* `/pet` — Pets a targeted user with custom interaction messages.
* `/revive` — Revives a targeted user back into action.
* `/strangle` — Initiates a wrestling-style strangle interaction sequence.
* `/transfur` — Transforms a targeted user or yourself with sticky latex transformation mechanics.
* `/trip` — Triggers a random tripping or stumbling event for a target user.
* `/yeet` — Launches a targeted user into the distance with simplified yeet messages.

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v16.9.0 or higher recommended)
* A [Discord Bot Application Token](https://discord.com/developers/applications)

### Installation & Setup

1. Clone the repository:
   ```bash
   git clone [https://github.com/your-username/protobot.git](https://github.com/your-username/protobot.git)
   cd protobot

 * Install dependencies:
   npm install discord.js express

 * Set up your environment variables:
   * Create an environment variable named TOKEN and paste your Discord bot token into it.
 * Run the bot:
   node index.js

📄 License
This project is licensed under the MIT License - see the [LICENSE](https://github.com/Agro388-owo/ProtoBot/blob/main/LICENSE) file for details. 
