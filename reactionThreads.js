module.exports = function ({ bot, config, commands, knex, threads }) {
  const fs = require("fs");
  const pluginVersion = "1.3";
  const changelogUrl = "=> https://daark.de/RTCL <=";
  let reactions = [];
  const emptyResponse = ["none", "nothing", "empty", "null", "-"];
  let refreshTimeout = null;

  // Check if ownerId is specified in the config, warn otherwise
  const ownerId = config["reactionThreads-ownerId"];
  if (typeof ownerId === "undefined") {
    console.info(
      '[ReactionThreads] No ownerId specified in config via "reactionThreads-ownerId", everyone (with inboxServerPermission) will be able to add new reactions!',
    );
  }
  // Load the suffix for the json file, if one exists (used for multiple bot instances running from the same folder)
  const jsonSuffix = config["reactionThreads-suffix"] ? config["reactionThreads-suffix"] : "";

  // Warn the user not to delete the file in case it doesn't exist (basically a first-use check)
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
   * Checks whether userId is blocked
   * @param {String} userId
   * @returns {Promise<Boolean>}
   */
  async function isBlocked(userId) {
    const row = await knex("blocked_users")
      .where("user_id", userId)
      .first();
    return !!row;
  }
  
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
    const reaction = isValidReaction(channelId, messageId, emoji);
    if (reaction && reaction.response) {
      return reaction;
    }
    return null;
  };

  /**
   * Checks whether or not the user invoking a command is authorized or not
   * @param {*} msg the message to check permissions for
   */
  const isOwner = function (msg) {
    if (typeof ownerId === "undefined") return true;
    return msg.member.id === ownerId ? true : msg.member.roles.includes(ownerId);
  };

  /**
   * Registers a new reaction for use
   * @param {Message} msg The message invoking the command
   * @param {*} args The arguments passed (check registering at bottom)
   */
  const addReactionCmd = async (msg, args) => {
    if (!isOwner(msg)) return;
    if (isValidReaction(args.channelId, args.messageId, args.emoji)) {
      msg.channel.createMessage(`⚠️ Unable to add reaction: That reaction already exists on that message!`);
      return;
    }
    args.categoryId = args.categoryId ? args.categoryId : null;

    try {
      // Replace the trailing > because eris filters out the rest
      await bot.addMessageReaction(args.channelId, args.messageId, args.emoji.replace(">", ""));
    } catch (e) {
      msg.channel.createMessage(
        `⚠️ Unable to add reaction: \`${e}\`\nPlease ensure that the IDs are correct and that the emoji is from one of the servers the bot is on!`,
      );
      return;
    }

    reactions.push({ ...args });
    saveReactions();
    msg.channel.createMessage("Successfully added reaction to message and registered it internally.");
  };

  /**
   * Deregister an existing reaction
   * @param {Message} msg The message invoking the command
   * @param {*} args The arguments passed (check registering at bottom)
   */
  const removeReactionCmd = async (msg, args) => {
    if (!isOwner(msg)) return;
    if (isValidReaction(args.channelId, args.messageId, args.emoji) == null) {
      msg.channel.createMessage(`⚠️ Unable to remove reaction: That reaction doesn't exist on that message!`);
      return;
    }

    try {
      // Replace the trailing > because eris filters out the rest
      await bot.removeMessageReaction(args.channelId, args.messageId, args.emoji.replace(">", ""), bot.user.id);
    } catch (e) {
      msg.channel.createMessage(`⚠️ Unable to remove reaction: \`${e}\``);
    }

    reactions.splice(reactions.indexOf({ ...args }), 1);
    saveReactions();
    msg.channel.createMessage("Successfully removed reaction from message and de-registered it internally.");
  };

  /**
   * Registers or updates a reaction response
   * @param {Message} msg The message invoking the command
   * @param {*} args The arguments passed (check registering at bottom)
   */
  const ReactionRespCmd = async (msg, args) => {
    if (!isOwner(msg)) return;
    reaction = isValidReaction(args.channelId, args.messageId, args.emoji);
    if (reaction == null) {
      msg.channel.createMessage(`⚠️ Unable to add reaction response: That reaction doesn't exist on that message!`);
      return;
    }

    if (args.response) {
      const response = emptyResponse.includes(args.response.trim()) ? null : args.response.trim();
      if (response.length > 1500) {
        msg.channel.createMessage("⚠️ That custom response is too long!");
        return;
      }

      reaction.response = response;
      saveReactions();
      msg.channel.createMessage("Successfully created/updated reaction response and registered it internally.");
    } else {
      msg.channel.createMessage(
        `The current response for that reaction is: \`${reaction.response ? reaction.response : "None"}\``,
      );
    }
  };

  /**
   * Lists all (or specific) reactions
   * @param {*} msg The message which invoked the command
   * @param {*} args The arguments passed to us, i.e. an ID
   */
  const listReactionsCmd = async (msg, args) => {
    if (!isOwner(msg)) return;
    const checkId = args.anyId ? args.anyId.trim() : null;
    let toPost = "Emoji - Channel ID - Message ID - Category ID - First words of response";
    for (const react of reactions) {
      if (react.channelId === "version") continue;
      if (args.anyId && !(react.categoryId === checkId || react.channelId === checkId || react.messageId === checkId))
        continue;

      const reactionText = `\n${react.emoji} - ${react.channelId} - ${react.messageId} - ${
        react.categoryId ? react.categoryId : "None"
      } - ${react.response ? react.response.substring(0, 25) + "..." : "None"}`;

      toPost += reactionText;
    }

    msg.channel.createMessage(toPost);
  };

  /**
   * Handles any reaction added within a guild. If it is a registered reaction, create a thread if none exists
   * @param {Message} message The message that got reacted to
   * @param {Emoji} emoji The emoji used to react
   * @param {Member} reactor The member object of the person reacting
   */
  const onReactionAdd = async (message, emoji, reactor) => {
    if (reactor.user.bot || !reactor.guild) return;
    const stringifiedEmoji = emoji.id ? `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>` : emoji.name;
    const reaction = isValidReaction(message.channel.id, message.id, stringifiedEmoji);
    const userHasThread = await threads.findOpenThreadByUserId(reactor.id);
    if (reaction != null && userHasThread == null && !(await isBlocked(reactor.id))) {
      const newThread = await threads.createNewThreadForUser(reactor.user, {
        source: "reaction",
        categoryId: reaction.categoryId,
      });

      const toPing = reaction.pingRoleId != null ? reaction.pingRoleId : null;
      const responseMessage = Array.isArray(config.responseMessage)
        ? config.responseMessage.join("\n")
        : config.responseMessage;
      const postToThreadChannel = config.showResponseMessageInThreadChannel;

      await newThread.postSystemMessage(
        `:gear: **ReactionThreads:** Thread opened because of reaction ${stringifiedEmoji} to https://discord.com/channels/${
          message.channel.guild.id
        }/${message.channel.id}/${message.id}${toPing != null ? " <@&" + toPing + ">" : ""}`,
        { allowedMentions: { roles: [toPing] } },
      );

      newThread
        .sendSystemMessageToUser(reaction.response ? reaction.response : responseMessage, { postToThreadChannel })
        .catch((e) => {
          // Ideally this will be fixed upstream at some point
          newThread.postSystemMessage(
            "⚠️ **ReactionThreads:** Could not open DMs with the user. They may have blocked the bot or set their privacy settings higher.",
          );
        });

      try {
        await bot.removeMessageReaction(message.channel.id, message.id, stringifiedEmoji.replace(">", ""), reactor.id);
      } catch (e) {
        newThread.postSystemMessage(`⚠️ Failed to remove reaction from message: \`${e}\``);
      }
    } else if (reaction != null) {
      // Only remove reaction if the user has an existing thread or user is blocked
      try {
        await bot.removeMessageReaction(message.channel.id, message.id, stringifiedEmoji.replace(">", ""), reactor.id);
      } catch (e) {
        console.error(`[ReactionThreads] Error when trying to remove reaction: ${e}`);
      }
    }
  };

  //#region reaction refresh loop
  const refreshReactions = async (msg = null) => {
    clearTimeout(refreshTimeout);
    if (msg) {
      if (!isOwner(msg)) return;
      msg = await msg.channel.createMessage(`Refreshing all reactions...`);
    }

    for (const react of reactions) {
      if (react.channelId === "version") continue;
      const emoji = react.emoji.replace(">", "");

      await bot.removeMessageReaction(react.channelId, react.messageId, emoji, bot.user.id).catch(() => {});
      await bot.addMessageReaction(react.channelId, react.messageId, emoji);
    }

    if (msg) {
      await msg.edit(`Done!`);
    }
    refreshTimeout = setTimeout(() => {
      refreshReactions();
    }, 1000 * 60 * 30); //Refresh reactions every 30 minutes 
  }

  refreshReactions();
  //#endregion

  //#region versioncheck
  // Check the plugin version and notify of any updates that happened
  let reactVersion = null;
  for (const reaction of reactions) {
    if (reaction.channelId == "version") {
      reactVersion = reaction;
      break;
    }
  }

  if (reactVersion && reactVersion.messageId != null && reactVersion.messageId != pluginVersion) {
    console.info(
      `[ReactionThreads] Plugin updated to version ${pluginVersion}, please read the changelog at ${changelogUrl} as there may be important or breaking changes!`,
    );
    reactions.splice(reactions.indexOf(reactVersion), 1);
    reactions.push({ channelId: "version", messageId: pluginVersion });
    saveReactions();
  } else if (reactVersion == null) {
    reactions.push({ channelId: "version", messageId: pluginVersion });
    saveReactions();
  }
  //#endregion versioncheck

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
    "rtResponse",
    [
      { name: "channelId", type: "string", required: true },
      { name: "messageId", type: "string", required: true },
      { name: "emoji", type: "string", required: true },
      { name: "response", type: "string", required: false, catchAll: true },
    ],
    ReactionRespCmd,
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

  commands.addInboxServerCommand("rtList", [{ name: "anyId", type: "string", required: false }], listReactionsCmd);

  commands.addInboxServerCommand("rtRefresh", [], refreshReactions);

  bot.on("messageReactionAdd", onReactionAdd);
  //#endregion
};
