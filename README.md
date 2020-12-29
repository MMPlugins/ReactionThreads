# Reaction thread creation plugin for [Dragory's ModMail](https://github.com/dragory/modmailbot)

### Setup:
Make sure your running at least v3.2.0 of Modmail.
in your config.ini file, make a new line and add:  
```ini
plugins[] = npm:MMPlugins/ReactionThreads
```
Restart your bot!

## Usage

Add
```ini
reactionThreads-ownerId = <yourUserId>
extraIntents[] = guildMessageReactions
```
to your config and replace <yourUserId> with your user ID. Grant the MM bot "Manage Message" permissions in any channel you want it to use reactions for.

You can now use `!rtAdd <ChannelID> <MessageID> <Emoji> [CategoryID]` to register the new reaction and `!rtAdd <ChannelID> <MessageID> <Emoji>` to remove it again.
ChannelID has to be the ID of the channel the message the reaction should be added to is in.
MessageID is the ID of the message in that channel.
Emoji is just the emoji directly from the emoji picker without any changes.
CategoryID should only be used if you want reactions to that message to be placed in a specific category.