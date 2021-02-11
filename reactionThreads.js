module.exports = async function ({ bot, config, commands, hooks, threads }) {
  const fs = require("fs");
  const Eris = require("eris");
  const pluginVersion = "1.1";
  const changelogUrl = "=> https://daark.de/RTCL <=";
  let reactions = [];

  // Check if ownerId is specified in the config, warn otherwise
  const ownerId = config["reactionThreads-ownerId"];
  if (typeof ownerId === "undefined") {
    console.info(
      '[ReactionThreads] No ownerId specified in config via "reactionThreads-ownerId", everyone (with inboxServerPermission) will be able to add new reactions!',
    );
  }
  // Load the suffix for the json file, if one exists (used for multiple bot instances running from the same folder)
  const jsonSuffix = config["reactionThreads-suffix"] ? config["reactionThreads-suffix"] : "";

  // Warn the user not to delete the file in case it doesnt exist (basically a first-use check)
  if (!fs.existsSync(`./ReactionThreadsData${jsonSuffix}.json`)) {
    console.info(
      `[ReactionThreads] A ReactionThreadsData${jsonSuffix}.json file will be created when using this plugin. Please do not modify or delete this file or reactions you set up will cease to function.`,
    );
  } else {
    // Load registered reactions if the file exists
    const data = fs.readFileSync(`./ReactionThreadsData${jsonSuffix}.json`);
    reactions = JSON.parse(data);
    console.info(`[ReactionThreads] Successfully loaded ${reactions.length - 1} reaction(s)`);
  }

  /**
   * Stores all registered reactions into the data file for persistence
   */
  const saveReactions = function () {
    fs.writeFileSync(`./ReactionThreadsData${jsonSuffix}.json`, JSON.stringify(reactions));
  };

  /**
   * Updates data file for new category format
   */
  for (const reaction of reactions) {
    if (typeof reaction.categoryId !== "undefined") {
      reaction.categoryIds = [{ categoryId: reaction.categoryId }];
      delete reaction.categoryId;
      console.info(
        `[ReactionThreads] Successfully updated category internal data for ${reaction.emoji} on https://discord.com/channels/${config.mainServerId}/${reaction.channelId}/${reaction.messageId}`,
      );
    }
  }
  saveReactions();

  /**
   * Checks whether or not passed parameters are a valid reaction
   * @param {string} channelId The ID of the channel for which to check
   * @param {string} messageId The ID of the message for which to check
   * @param {string} emoji The stringified emoji for which to check (i.e. <:test:108552944961454080>)
   * @returns full reaction if valid, null if not
   */
  const isValidReaction = function (channelId, messageId, emoji) {
    for (const reaction of reactions) {
      if (reaction.channelId == channelId && reaction.messageId == messageId && reaction.emoji == emoji) {
        return reaction;
      }
    }
    return null;
  };

  /**
   * Checks whether or not passed parameters has response
   * @param {string} channelId The ID of the channel for which to check
   * @param {string} messageId The ID of the message for which to check
   * @param {string} emoji The stringified emoji for which to check (i.e. <:test:108552944961454080>)
   * @returns full reaction if valid, null if not
   */
  const hasResponse = function (channelId, messageId, emoji) {
    for (const reaction of reactions) {
      if (
        reaction.channelId == channelId &&
        reaction.messageId == messageId &&
        reaction.emoji == emoji &&
        reaction.response
      ) {
        return reaction;
      }
    }
    return null;
  };

  /**
   * Checks whether or not passed parameters has description
   * @param {string} channelId The ID of the channel for which to check
   * @param {string} messageId The ID of the message for which to check
   * @param {string} emoji The stringified emoji for which to check (i.e. <:test:108552944961454080>)
   * @returns full reaction if valid, null if not
   */
  const hasDescription = function (channelId, messageId, emoji) {
    for (const reaction of reactions) {
      if (
        reaction.channelId == channelId &&
        reaction.messageId == messageId &&
        reaction.emoji == emoji &&
        reaction.description
      ) {
        return reaction;
      }
    }
    return null;
  };

  /**
   * Checks whether or not passed parameters has the category ID given
   * @param {string} channelId The ID of the channel for which to check
   * @param {string} messageId The ID of the message for which to check
   * @param {string} emoji The stringified emoji for which to check (i.e. <:test:108552944961454080>)
   * @param {string} categoryId The ID of the channel for which to check
   * @returns full reaction if valid, null if not
   */
  const hasCategory = function (channelId, messageId, emoji, categoryId) {
    for (const reaction of reactions) {
      if (reaction.channelId == channelId && reaction.messageId == messageId && reaction.emoji == emoji) {
        for (category of reaction.categoryIds) {
          if (category.categoryId === categoryId) return reaction;
        }
      }
    }
    return null;
  };

  /**
   * Checks whether category is valid
   * @param {string} categoryId The ID of the channel for which to check
   * @returns true if valid category, false if not
   */
  function isValidCategory(categoryId) {
    channel = bot.getChannel(categoryId);
    if (channel instanceof Eris.CategoryChannel) return true;
    return false;
  }

  const isOwner = function (message) {
    if (typeof ownerId === "undefined") return true;
    return message.member.id === ownerId ? true : message.member.roles.includes(ownerId);
  };

  /**
   * Registers a new reaction for use
   * @param {Message} message The message invoking the command
   * @param {*} args The arguments passed (check registering at bottom)
   */
  const addReactionCmd = async (message, args) => {
    if (!isOwner(message)) return;
    // Didnt work without JSON.stringify, but if its stupid but it works...
    if (isValidReaction(args.channelId, args.messageId, args.emoji)) {
      message.channel.createMessage(`⚠️ Unable to add reaction: That reaction already exists on that message!`);
      return;
    }

    try {
      // Replace the trailing > because eris filters out the rest
      await bot.addMessageReaction(args.channelId, args.messageId, args.emoji.replace(">", ""));
    } catch (e) {
      message.channel.createMessage(
        `⚠️ Unable to add reaction: \`${e}\`\nPlease ensure that the IDs are correct and that the emoji is from one of the servers the bot is on!`,
      );
      return;
    }

    reactions.push({
      channelId: args.channelId,
      messageId: args.messageId,
      emoji: args.emoji,
      categoryIds: args.categoryId ? [{ categoryId: args.categoryId }] : null,
      pingRoleId: null || args.pingRoleId,
    });
    saveReactions();
    message.channel.createMessage("Succesfully added reaction to message and registered it internally.");
  };

  /**
   * Unregisters an existing reaction
   * @param {Message} message The message invoking the command
   * @param {*} args The arguments passed (check registering at bottom)
   */
  const removeReactionCmd = async (message, args) => {
    if (!isOwner(message)) return;
    // Didnt work without JSON.stringify, but if its stupid but it works...
    if (isValidReaction(args.channelId, args.messageId, args.emoji) == null) {
      message.channel.createMessage(`⚠️ Unable to remove reaction: That reaction doesnt exist on that message!`);
      return;
    }

    try {
      // Replace the trailing > because eris filters out the rest
      await bot.removeMessageReaction(args.channelId, args.messageId, args.emoji.replace(">", ""), bot.user.id);
    } catch (e) {
      message.channel.createMessage(`⚠️ Unable to remove reaction: \`${e}\``);
    }

    reactions.splice(reactions.indexOf({ ...args }), 1);
    saveReactions();
    message.channel.createMessage("Succesfully removed reaction from message and de-registered it internally.");
  };

  /**
   * Registers a new reaction response
   * @param {Message} message The message invoking the command
   * @param {*} args The arguments passed (check registering at bottom)
   */
  const addReactionRespCmd = async (message, args) => {
    if (!isOwner(message)) return;
    // Didnt work without JSON.stringify, but if its stupid but it works...
    reaction = isValidReaction(args.channelId, args.messageId, args.emoji);
    if (reaction == null) {
      message.channel.createMessage(`⚠️ Unable to add reaction response: That reaction doesnt exist on that message!`);
      return;
    }
    if (hasResponse(args.channelId, args.messageId, args.emoji)) {
      reaction.response = args.response;
      saveReactions();
      message.channel.createMessage("Succesfully updated reaction response and registered it internally.");
    } else {
      reaction.response = args.response;
      saveReactions();
      message.channel.createMessage("Succesfully added reaction response and registered it internally.");
    }
  };

  /**
   * Registers a new reaction description
   * @param {Message} message The message invoking the command
   * @param {*} args The arguments passed (check registering at bottom)
   */
  const addReactionDescCmd = async (message, args) => {
    if (!isOwner(message)) return;
    // Didnt work without JSON.stringify, but if its stupid but it works...
    reaction = isValidReaction(args.channelId, args.messageId, args.emoji);
    if (reaction == null) {
      message.channel.createMessage(
        `⚠️ Unable to add reaction description: That reaction doesnt exist on that message!`,
      );
      return;
    }
    if (hasDescription(args.channelId, args.messageId, args.emoji)) {
      reaction.description = args.description;
      saveReactions();
      message.channel.createMessage("Succesfully updated reaction description and registered it internally.");
    } else {
      reaction.description = args.description;
      saveReactions();
      message.channel.createMessage("Succesfully added reaction description and registered it internally.");
    }
  };

  /**
   * Registers a new reaction category
   * @param {Message} message The message invoking the command
   * @param {*} args The arguments passed (check registering at bottom)
   */
  const addReactionCatCmd = async (message, args) => {
    if (!isOwner(message)) return;
    // Didnt work without JSON.stringify, but if its stupid but it works...
    reaction = isValidReaction(args.channelId, args.messageId, args.emoji);
    if (reaction == null) {
      message.channel.createMessage(`⚠️ Unable to add reaction category: That reaction doesnt exist on that message!`);
      return;
    }
    if (!isValidCategory(args.categoryId)) {
      message.channel.createMessage(`⚠️ Unable to add reaction category: That category doesnt exist!`);
      return;
    }
    if (hasCategory(args.channelId, args.messageId, args.emoji, args.categoryId)) {
      message.channel.createMessage("That reaction category is already registered internally.");
    } else {
      reaction.categoryIds.push({ categoryId: args.categoryId });
      saveReactions();
      message.channel.createMessage("Succesfully added reaction category and registered it internally.");
    }
  };

  /**
   * Unregisters an existing category from existing reaction
   * @param {Message} message The message invoking the command
   * @param {*} args The arguments passed (check registering at bottom)
   */
  const removeReactionCatCmd = async (message, args) => {
    if (!isOwner(message)) return;
    // Didnt work without JSON.stringify, but if its stupid but it works...
    reaction = isValidReaction(args.channelId, args.messageId, args.emoji);
    if (reaction == null) {
      message.channel.createMessage(
        `⚠️ Unable to remove reaction category: That reaction doesnt exist on that message!`,
      );
      return;
    }
    let result = [];
    for (category of reaction.categoryIds) {
      if (category.categoryId !== args.categoryId) {
        result.push({ categoryId: category.categoryId });
      }
    }
    if (reaction.categoryIds.length === result.length) {
      message.channel.createMessage(
        `⚠️ Unable to remove reaction category: That category doesnt exist on that reaction!`,
      );
      return;
    }
    delete reaction.categoryIds;
    reaction.categoryIds = result;
    saveReactions();
    message.channel.createMessage(
      "Succesfully removed reaction category from message and de-registered it internally.",
    );
  };

  /**
   * Handles any reaction added within a guild. If it is a registered reaction, create a thread if none exists
   * @param {Message} message The message that got reacted to
   * @param {Emoji} emoji The emoji used to react
   * @param {Member} reactor The memeber object of the person reacting
   */
  const onReactionAdd = async (message, emoji, reactor) => {
    if (!reactor.user) return;
    if (!reactor.user.bot && reactor.guild) {
      const stringifiedEmoji = emoji.id ? `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>` : emoji.name;
      const reaction = isValidReaction(message.channel.id, message.id, stringifiedEmoji);
      const userHasThread = await threads.findOpenThreadByUserId(reactor.id);
      if (reaction != null && userHasThread == null) {
        let foundCategoryChannel = null;
        let errorReply = null;
        if (reaction.categoryIds) {
          foundCategoryChannel = getCategory(reaction);
          if (foundCategoryChannel === null) {
            errorReply = `⚠️ **ReactionThreads:** Failed to move thread into new category. ${
              reaction.categoryIds.length > 1 ? `Categories` : `Category`
            } for ${reaction.emoji} most likely ${
              reaction.categoryIds.length > 1 ? `have` : `has`
            } max channels (50)\n:gear: **ReactionThreads:** You can add a new category for this reaction by using the \`!rtAddCat ${
              reaction.channelId
            } ${reaction.messageId} ${reaction.emoji} <new category ID>\` command!`;
          }
        }
        foundCategoryChannel =
          foundCategoryChannel === null ? config.newThreadCategoryId || null : foundCategoryChannel;
        const newThread = await threads.createNewThreadForUser(reactor.user, {
          source: "reaction",
          categoryId: foundCategoryChannel,
        });

        const toPing = reaction.pingRoleId != null ? reaction.pingRoleId : null;
        const responseMessage = Array.isArray(config.responseMessage)
          ? config.responseMessage.join("\n")
          : config.responseMessage;
        const postToThreadChannel = config.showResponseMessageInThreadChannel;
        newThread.postSystemMessage(
          `:gear: **ReactionThreads:** Thread opened because of reaction ${stringifiedEmoji} to https://discord.com/channels/${
            message.channel.guild.id
          }/${message.channel.id}/${message.id}${toPing != null ? " <@&" + toPing + ">" : ""}`,
          { allowedMentions: { roles: [toPing] } },
        );
        if (errorReply) {
          newThread.postSystemMessage(errorReply);
        }
        newThread
          .sendSystemMessageToUser(
            `${reaction.response ? reaction.response : responseMessage}${
              config["reactionThreads-menu"] == false
                ? ``
                : ` (You can change your selection by sending \`` + config.prefix + `menu\`)`
            }`,
            { postToThreadChannel },
          )
          .catch((e) => {
            newThread.postSystemMessage(
              "⚠️ Could not open DMs with the user. They may have blocked the bot or set their privacy settings higher.",
            );
          });

        try {
          await bot.removeMessageReaction(
            message.channel.id,
            message.id,
            stringifiedEmoji.replace(">", ""),
            reactor.id,
          );
        } catch (e) {
          newThread.postSystemMessage(`⚠️ **ReactionThreads:** Failed to remove reaction from message: \`${e}\``);
        }
      } else if (reaction != null) {
        // Only remove reaction if the user has an existing thread
        try {
          await bot.removeMessageReaction(
            message.channel.id,
            message.id,
            stringifiedEmoji.replace(">", ""),
            reactor.id,
          );
        } catch (e) {
          console.error(`[ReactionThreads] Error when trying to remove reaction: ${e}`);
        }
      }
    }
  };

  /**
   * Handles any reaction added within a private channel. If it is a registered reaction, move thread to proper category
   * @param {Message} message The message that got reacted to
   * @param {Emoji} emoji The emoji used to react
   * @param {Member} reactor The memeber object of the person reacting
   */
  const onPrivReactionAdd = async (message, emoji, reactor) => {
    if (!reactor.id || reactor.id === bot.user.id) return;
    if (!(message.channel instanceof Eris.PrivateChannel)) return;
    if (!message.author) return; // Prevent issue with user reacting to uncached messages
    if (!message.author.bot) return;

    const stringifiedEmoji = emoji.id ? `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>` : emoji.name;
    let reaction = null;
    for (const _reaction of reactions) {
      if (_reaction.emoji == stringifiedEmoji) {
        reaction = _reaction;
      }
    }
    if (reaction != null) {
      const userThread = await threads.findOpenThreadByUserId(reactor.id);
      if (userThread) {
        bot.deleteMessage(message.channel.id, message.id);
        const oldChannel = bot.getChannel(userThread.channel_id);
        if (oldChannel.parentID) {
          const postToThreadChannel = config.showResponseMessageInThreadChannel;
          const responseMessage = Array.isArray(config.responseMessage)
            ? config.responseMessage.join("\n")
            : config.responseMessage;
          userThread
            .sendSystemMessageToUser(
              `${reaction.response ? reaction.response : responseMessage}${
                config["reactionThreads-menu"] == false
                  ? ``
                  : ` (You can change your selection by sending \`` + config.prefix + `menu\`)`
              }`,
              { postToThreadChannel },
            )
            .catch((e) => {
              userThread.postSystemMessage(
                "⚠️ Could not open DMs with the user. They may have blocked the bot or set their privacy settings higher.",
              );
            });
          if (userThread.channel_id) {
            const categoryId = getCategory(reaction);
            if (categoryId === null) {
              userThread.postSystemMessage(
                `⚠️ **ReactionThreads:** Failed to move thread into new category. ${
                  reaction.categoryIds.length > 1 ? `Categories` : `Category`
                } for ${reaction.emoji} most likely ${
                  reaction.categoryIds.length > 1 ? `have` : `has`
                } max channels (50)\n:gear: **ReactionThreads:** You can add a new category for this reaction by using the \`!rtAddCat ${
                  reaction.channelId
                } ${reaction.messageId} ${reaction.emoji} <new category ID>\` command!`,
              );
              return;
            }
            await bot.editChannel(userThread.channel_id, { parentID: categoryId }).then((newChannel) => {
              console.log(
                `old: ${oldChannel.parentID}    new: ${newChannel.parentID}    ${
                  oldChannel.parentID === newChannel.parentID
                }`,
              );
              if (oldChannel.parentID === newChannel.parentID) {
                userThread.postSystemMessage(
                  `:gear: **ReactionThreads:** User reacted with ${reaction.emoji} thread does not need to move`,
                );
              } else {
                const toPing = reaction.pingRoleId != null ? reaction.pingRoleId : null;
                userThread.postSystemMessage(
                  `:gear: **ReactionThreads:** Thread moved because of reaction ${reaction.emoji}${
                    toPing != null ? " <@&" + toPing + ">" : ""
                  }`,
                  { allowedMentions: { roles: [toPing] } },
                );
              }
            });
          }
        }
      } else if (config["reactionThreads-oldMenus"] != false) {
        bot.deleteMessage(message.channel.id, message.id);
        const reactorUser = await bot.getRESTUser(reactor.id);
        let foundCategoryChannel = null;
        let errorReply = null;
        if (reaction.categoryIds) {
          foundCategoryChannel = getCategory(reaction);
          if (foundCategoryChannel === null) {
            errorReply = `⚠️ **ReactionThreads:** Failed to move thread into new category. ${
              reaction.categoryIds.length > 1 ? `Categories` : `Category`
            } for ${reaction.emoji} most likely ${
              reaction.categoryIds.length > 1 ? `have` : `has`
            } max channels (50)\n:gear: **ReactionThreads:** You can add a new category for this reaction by using the \`!rtAddCat ${
              reaction.channelId
            } ${reaction.messageId} ${reaction.emoji} <new category ID>\` command!`;
          }
        }
        foundCategoryChannel =
          foundCategoryChannel === null ? config.newThreadCategoryId || null : foundCategoryChannel;
        const newThread = await threads.createNewThreadForUser(reactorUser, {
          source: "reaction",
          categoryId: foundCategoryChannel,
        });

        const toPing = reaction.pingRoleId != null ? reaction.pingRoleId : null;
        const responseMessage = Array.isArray(config.responseMessage)
          ? config.responseMessage.join("\n")
          : config.responseMessage;
        const postToThreadChannel = config.showResponseMessageInThreadChannel;
        newThread.postSystemMessage(
          `:gear: **ReactionThreads:** Thread opened because of reaction ${stringifiedEmoji} in dms${
            toPing != null ? " <@&" + toPing + ">" : ""
          }`,
          { allowedMentions: { roles: [toPing] } },
        );
        if (errorReply) {
          newThread.postSystemMessage(errorReply);
        }
        newThread
          .sendSystemMessageToUser(
            `${reaction.response ? reaction.response : responseMessage}${
              config["reactionThreads-menu"] == false
                ? ``
                : ` (You can change your selection by sending \`` + config.prefix + `menu\`)`
            }`,
            { postToThreadChannel },
          )
          .catch((e) => {
            newThread.postSystemMessage(
              "⚠️ Could not open DMs with the user. They may have blocked the bot or set their privacy settings higher.",
            );
          });
      }
    }
  };

  /**
   * Find first available category to move into
   * @param {Reaction} reaction The reaction which holds category information
   * @returns channel id if one exists, null otherwise
   */
  function getCategory(reaction) {
    if (!reaction.categoryIds) return null;
    for (const _categoryId of reaction.categoryIds) {
      const channel = bot.getChannel(_categoryId.categoryId);
      if (channel instanceof Eris.CategoryChannel) {
        if (channel.channels.size < 50) {
          return (foundCategoryChannel = channel.id);
        }
      }
    }
    return null;
  }

  /**
   * Send users that started a thread through dm a reaction menu of reactions
   * @param {Object} beforeNewThreadData The data provided before opening a new thread
   */
  const sendNewMenu = async function (beforeNewThreadData) {
    if (typeof beforeNewThreadData.message === "undefined") return;
    if (beforeNewThreadData.message.content === `${config.prefix}menu` && config["reactionThreads-menu"] != false)
      return;
    try {
      createMenu(beforeNewThreadData.message.channel.id);
    } catch (err) {
      console.error(`[ReactionThreads] Could not send auto-response to user: ${err}`);
    }
  };

  hooks.beforeNewThread(sendNewMenu);

  /**
   * Formats reactions to prevent duplicate options in menu
   * This assumes reactions with same emoji (different messages) link to same category, default first
   * @returns formatted reactions
   */
  function reactionList() {
    let reactionResult = [];
    for (const reaction of reactions) {
      let duplicate = false;
      for (const _reaction of reactionResult) {
        if (_reaction.emoji === reaction.emoji) {
          duplicate = true;
          break;
        }
      }
      if (!duplicate) reactionResult.push(reaction);
    }
    return reactionResult;
  }

  /**
   * Create menu for user in given channel
   * @param {string} channelId
   */
  function createMenu(channelId) {
    let responseMessage = config["reactionThreads-resopnseMessage"]
      ? config["reactionThreads-resopnseMessage"]
      : "If you could select one of the following reactions that best fits your message, that would help us out a lot!";
    const formReactions = reactionList();
    for (const reaction of formReactions) {
      if (reaction.channelId !== "version") {
        responseMessage += `\n${reaction.emoji} - ${
          reaction.description ? reaction.description : "Start a new thread"
        }`;
      }
    }
    bot
      .createMessage(channelId, responseMessage)
      .then((newMessage) => {
        for (const reaction of formReactions) {
          bot.addMessageReaction(newMessage.channel.id, newMessage.id, reaction.emoji).catch((e) => {});
        }
      })
      .catch((e) => {
        console.error(`[ReactionThreads] Could not open DM with user: ${e}`);
      });
  }

  const menuCmd = async (message, args) => {
    if (!(message.channel instanceof Eris.PrivateChannel)) return;
    if (config["reactionThreads-menu"] == false) return;
    createMenu(message.channel.id);
  };

  //#region versioncheck
  // Check the plugin version and notify of any updates that happened
  let foundVersion = null;
  for (const reaction of reactions) {
    if (reaction.channelId == "version") {
      foundVersion = reaction.messageId;
      break;
    }
  }

  if (foundVersion != null && foundVersion != pluginVersion) {
    console.info(
      `[ReactionThreads] Plugin updated to version ${pluginVersion}, please read the changelog at ${changelogUrl} as there may be important or breaking changes!`,
    );
    reactions.splice(reactions.indexOf({ channelId: "version", messageId: foundVersion }), 1);
    reactions.push({ channelId: "version", messageId: pluginVersion });
    saveReactions();
  } else if (foundVersion == null) {
    reactions.push({ channelId: "version", messageId: pluginVersion });
    saveReactions();
  }

  //#region registering
  // Register all commands and listeners
  commands.addInboxServerCommand(
    "rtAdd",
    [
      { name: "channelId", type: "string", required: true },
      { name: "messageId", type: "string", required: true },
      { name: "emoji", type: "string", required: true },
      { name: "categoryId", type: "string", required: false },
    ],
    addReactionCmd,
  );

  commands.addInboxServerCommand(
    "rtAdd",
    [
      { name: "channelId", type: "string", required: true },
      { name: "messageId", type: "string", required: true },
      { name: "emoji", type: "string", required: true },
      { name: "categoryId", type: "string", required: true },
      { name: "pingRoleId", type: "string", required: false },
    ],
    addReactionCmd,
  );

  commands.addInboxServerCommand(
    "rtAddResp",
    [
      { name: "channelId", type: "string", required: true },
      { name: "messageId", type: "string", required: true },
      { name: "emoji", type: "string", required: true },
      { name: "response", type: "string", required: true, catchAll: true },
    ],
    addReactionRespCmd,
  );

  commands.addInboxServerCommand(
    "rtAddDesc",
    [
      { name: "channelId", type: "string", required: true },
      { name: "messageId", type: "string", required: true },
      { name: "emoji", type: "string", required: true },
      { name: "description", type: "string", required: true, catchAll: true },
    ],
    addReactionDescCmd,
  );

  commands.addInboxServerCommand(
    "rtAddCat",
    [
      { name: "channelId", type: "string", required: true },
      { name: "messageId", type: "string", required: true },
      { name: "emoji", type: "string", required: true },
      { name: "categoryId", type: "string", required: true },
    ],
    addReactionCatCmd,
  );

  commands.addInboxServerCommand(
    "rtRemove",
    [
      { name: "channelId", type: "string", required: true },
      { name: "messageId", type: "string", required: true },
      { name: "emoji", type: "string", required: true },
    ],
    removeReactionCmd,
  );

  commands.addInboxServerCommand(
    "rtRemoveCat",
    [
      { name: "channelId", type: "string", required: true },
      { name: "messageId", type: "string", required: true },
      { name: "emoji", type: "string", required: true },
      { name: "categoryId", type: "string", required: true },
    ],
    removeReactionCatCmd,
  );

  commands.addGlobalCommand("menu", [{ name: "anyText", type: "string", required: false, catchAll: true }], menuCmd);

  bot.on("messageReactionAdd", onReactionAdd);
  bot.on("messageReactionAdd", onPrivReactionAdd);
  //#endregion
};
