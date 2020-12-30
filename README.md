## A plugin for [Dragory's ModMail](https://github.com/dragory/modmailbot) that allows users to open threads with reactions
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
Make sure you are running at least v3.2.0 of Modmail.
in your config.ini file, create a new line and add  
```ini
plugins[] = npm:MMPlugins/ReactionThreads
reactionThreads-ownerId = <yourUserId>
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

#### Adding/Registering a reaction
Signature: `!rtAdd <ChannelID> <MessageID> <Emoji> [CategoryID]`
This will register a new reaction and immediately activate it, making any reactions to it create a new thread.
- `ChannelID` has to be the ID of the channel the message the reaction should be added to is in.
- `MessageID` is the ID of the message in that channel.
- `Emoji` is just the emoji directly from the emoji picker without any changes.
- `CategoryID` should only be used if you want reactions to that message to be placed in a specific category.

#### Removing/De-Registering a reaction
SIgnature: `!rtRemove <ChannelID> <MessageID> <Emoji>`
This will de-register an already existing reaction. All threads opened via the reaction remain open.  
Takes the same arguments as `!rtAdd` but without the `CategoryID`, as that is not needed for reaction matching (cannot have the same emoji twice).