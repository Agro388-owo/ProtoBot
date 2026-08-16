module.exports = {
    // 👑 Your Owner Discord ID
    OWNER_ID: '1048579285687996466',

    // 🐙 GitHub API Token for Tags Syncing
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,

    // 🔒 Kidnap Access Restrictions & Whitelist
    kidnapRestricted: false,
    allowedUsers: [
        '1048579285687996466'
    ],

    // 🛠️ Debug Features Toggle
    debugMode: false,

    // 🎮 Bot Status configuration
    status: 'online', // Options: 'online', 'idle', 'dnd', 'invisible'
    activityName: 'Changed',
    
    // 🏷️ Activity Type Numbers Reference:
    // 0 = Playing [Game]
    // 1 = Streaming [Link]
    // 2 = Listening to [Spotify/Music]
    // 3 = Watching [Movie/Video]
    // 4 = Custom [Status message]
    // 5 = Competing in [Tournament]
    activityType: 0, 

    customStatus: 'Any feature ideaz? :3', // 💬 Bot's custom status thought
};
