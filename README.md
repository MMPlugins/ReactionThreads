## A plugin for [Dragory's ModMail](https://github.com/dragory/modmailbot) that allows users to open threads with reactions  
**Currently on Version 1.2**  
A full [changelog can be found here](https://github.com/MMPlugins/ReactionThreads/blob/main/CHANGELOG.md).  
Plugin written and maintained by [DarkView](https://github.com/DarkView) (Dark#1010 on Discord)  
  
Table of Contents:
- [Setup](#setup)
- [Usage](#usage)
  - [General](#general)
  - [Restrictions](#restrictions)
  - [Bugs](#bugs)
  - [Feature Requests](#feature-requests)
- [Commands](#commands)
    - [Adding/Registering a reaction](#addingregistering-a-reaction)
    - [Removing/De-Registering a reaction](#removingde-registering-a-reaction)  
    
## Setup
Make sure you are running at least v3.3.0 of Modmail.
in your config.ini file, create a new line and add  
```
plugins[] = npm:MMPlugins/ReactionThreads
reactionThreads-ownerId = <yourUserId or adminRoleId>
extraIntents[] = guildMessageReactions
```
to your config and replace `<yourUserId>` with your user ID. Only the person with this ID is allowed to add/remove reactions.  
Grant the ModMail bot "Manage Message" permissions in any channel you want it to use reactions for, as it removes the reaction the user adds automatically.  
You need to restart the bot in order for the plugin to be loaded!

## Usage
### General
In order for the bot to create threads through user reactions, you need to set up reactions first. See the Commands section below for information on how to do so.  
Registered reactions are persistent between restarts, as long as you do not delete or move the `ReactionThreadsData.json` file created by the plugin.
### Restrictions
The plugin is rather lenient regarding allowed reactions. As long as the bot is able to use the emoji, you are able to register it as a reaction.
  
It is not possible to create more than one thread per user, regardless of how it is created. If the user already has an active thread, the reaction will simply be removed again without anything happening.  
  
In the case you run mutliple bot instances from the same folder, you can set the `reactionThreads-suffix` config option in your config.ini. This will append the given text to the `ReactionThreadsData.json` file so the different instances can use different reaction lists.
### Bugs
There are currently no known bugs.  
If you have found a bug, please report it at the [issues page for the plugin](https://github.com/MMPlugins/ReactionThreads/issues)!  
You can also find the plugin author (Dark#1010) on the [official support discord](https://discord.gg/vRuhG9R) in case you have any specific questions.
### Feature Requests
If you want to request or suggest a feature, open an issue on the [plugins issue page](https://github.com/MMPlugins/ReactionThreads/issues)!
In case the feature you want to request is outside of the scope of this plugin (anything not to do with reactions creating threads) please use the `#plugin-requests` channel on the [official support discord](https://discord.gg/vRuhG9R).
## Commands

Parameters in <> are required, parameters in [] are optional.  
These commands only work on the inbox server, just like regular ModMail commands.  
### Adding/Registering a reaction
Signature 1: `!rtAdd <ChannelID> <MessageID> <Emoji> [CategoryID]`  
Signature 2: `!rtAdd <ChannelID> <MessageID> <Emoji> <CategoryID> [PingRoleID]`  
This will register a new reaction and immediately activate it, making any reactions to it create a new thread.
- `ChannelID` has to be the ID of the channel the message the reaction should be added to is in.
- `MessageID` is the ID of the message in that channel.
- `Emoji` is just the emoji directly from the emoji picker without any changes.
- `CategoryID` should only be used if you want reactions to that message to be placed in a specific category.
- `PingRoleID` can only be used in conjunction with `CategoryID`. It allows you to set a role to be pinged when a thread is created with that specific reaction.

### Removing/De-Registering a reaction
Signature: `!rtRemove <ChannelID> <MessageID> <Emoji>`  
This will de-register an already existing reaction. All threads opened via the reaction remain open.  
Takes the same arguments as `!rtAdd` but without the optional parameters, as that is not needed for reaction matching (cannot have the same emoji twice).  

### Adding/Removing/Displaying custom responses
Signature: `!rtResponse <ChannelID> <MessageID> <Emoji> [Response]`  
Takes the same parameters as `!rtRemove` and also an optional `Response` parameter.  
If the optional parameter is *not* passed, the bot will display the currently set custom response.  
If the optional parameter *is* passed, the bot will set the reaction to use this new response.
- `Response` can by any string, including emojis. To use emoji, the bot must be on the server the emoji is from. Besides this, the only thing that limits a response length is a maximum of 1500 characters.  
If you want to completely remove a response, pass one of the following without anything else: `none`, `nothing`, `empty`, `null`, `-`.  

This command and its functionality was made by [YetAnotherConnor](https://github.com/YetAnotherConnor).
  
### Listing all reactions
Signature: Signature: `!rtList [Any ID]`  
This will return a list of all current reactions that match the ID filter if one is given.  
- `Any ID` can be any of the IDs available for reactions: `Channel ID`, `Message ID` and `Category ID`. If this parameter is passed, only reactions that are on that message or in that channel etc. get listed. 


Table of Contents: 
- [Setup](#setup)
- [Usage](#usage)
  - [General](#general)
  - [Restrictions](#restrictions)
  - [Bugs](#bugs)
  - [Feature Requests](#feature-requests)
- [Commands](#commands)
    - [Adding/Registering a reaction](#addingregistering-a-reaction)
    - [Removing/De-Registering a reaction](#removingde-registering-a-reaction)  
    - [Adding/Removing/Displaying custom responses](#addingremovingdisplaying-custom-responses)  
    - [Listing all reactions](#listing-all-reactions)
  
Plugin written and maintained by [DarkView](https://github.com/DarkView) (Dark#1010 on Discord)  
