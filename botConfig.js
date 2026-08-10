const { ActivityType } = require('discord.js');

module.exports = {
    // Options: 'online', 'idle', 'dnd', 'invisible'
    status: 'online', 

    // Choose your activity type:
    // ActivityType.Playing, ActivityType.Streaming, ActivityType.Listening, ActivityType.Watching, ActivityType.Competing
    activityType: ActivityType.Playing, 

    // The text displayed in the status
    activityName: 'goofing around'
};
