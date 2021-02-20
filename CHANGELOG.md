## Version 1.2
- New command: `rtList`  
Allows any owner to list all reactions the bot currently has registered
- New command: `rtResponse` by [YetAnotherConnor](https://github.com/YetAnotherConnor)
Allows you to set a custom response for specific reactions which will be sent instead of the regular response message.  
  
Please read the [command documentation](https://github.com/MMPlugins/ReactionThreads#commands) to learn how to use these new commands!

## Version 1.1
- `reactionThreads-ownerId` can now be a role id.  
If you want everyone with a specific role to be able to add reactions, set the value to the given role's ID.
- Plugin now checks if there was an update at startup (npm downloads new plugin version on startup)  
If a new version is installed, tells user to check the changelog here.
