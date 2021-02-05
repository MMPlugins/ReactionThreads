## Version 1.1
- `reactionThreads-ownerId` can now be a role id.  
If you want everyone with a specific role to be able to add reactions, set the value to the given role's ID.
- Plugin now checks if there was an update at startup (npm downloads new plugin version on startup)  
If a new version is installed, tells user to check the changelog here.
