module.exports = function ({ bot, config, commands, threads }) {
  const fs = require("fs");

  // Run basic config and data checks
  const ownerId = config["reactionThreads-ownerId"];
  if (typeof ownerId === "undefined") {
    console.info(
      '[ReactionThreads] No ownerId specified in config via "reactionThreads-ownerId", everyone will be able to add new reactions!',
    );
  }

  let reactions = [];

  if (!fs.existsSync("./ReactionThreadsData.json")) {
    console.info(
      "[ReactionThreads] A ReactionThreadsData.json file will be created when using this plugin. Please do not modify or delete this file or reactions you set up will cease to function.",
    );
  } else {
    // Load reactions if the file exists
    const data = fs.readFileSync("./ReactionThreadsData.json");
    reactions = JSON.parse(data);
    console.info(`[ReactionThreads] Successfully loaded ${reactions.length} reaction(s)`);
  }

  const saveReactions = function () {
    fs.writeFileSync("./ReactionThreadsData.json", JSON.stringify(reactions));
  };

  const isValidReaction = function (channelId, messageId, emoji) {
    for (const reaction of reactions) {
      if (reaction.channelId == channelId && reaction.messageId == messageId && reaction.emoji == emoji) {
        return reaction;
      }
    }
    return null;
  }

  const addReactionCmd = async (msg, args) => {
    if (msg.author.id !== ownerId) return;
    // Didnt work without JSON.stringify, but if its stupid but it works...
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
    msg.channel.createMessage("Succesfully added reaction to message and registered it internally.");
  };

  const removeReactionCmd = async (msg, args) => {
    if (msg.author.id !== ownerId) return;
    // Didnt work without JSON.stringify, but if its stupid but it works...
    if (isValidReaction(args.channelId, args.messageId, args.emoji) == null) {
      msg.channel.createMessage(`⚠️ Unable to remove reaction: That reaction doesnt exist on that message!`);
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
    msg.channel.createMessage("Succesfully removed reaction from message and de-registered it internally.");
  };

  const onReactionAdd = async (message, emoji, reactor) => {
    if (reactor.user.bot) return;
    const stringifiedEmoji = emoji.id ? `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>` : emoji.name;
    const reaction = isValidReaction(message.channel.id, message.id, stringifiedEmoji);
    const userHasThread = await threads.findOpenThreadByUserId(reactor.id);
    if (reaction != null && userHasThread == null) {
      const newThread = await threads.createNewThreadForUser(reactor.user, {
        source: "reaction",
        categoryId: reaction.categoryId,
      });

      const responseMessage = Array.isArray(config.responseMessage) ? config.responseMessage.join("\n") : config.responseMessage;
      const postToThreadChannel = config.showResponseMessageInThreadChannel;
      await newThread.postSystemMessage(`:gear: **ReactionThreads:** Thread opened because of reaction ${stringifiedEmoji} to https://discord.com/channels/${message.channel.guild.id}/${message.channel.id}/${message.id}`);
      newThread.sendSystemMessageToUser(responseMessage, { postToThreadChannel });

      try {
        await bot.removeMessageReaction(message.channel.id, message.id, stringifiedEmoji.replace(">", ""), reactor.id);
      } catch (e) {
        newThread.postSystemMessage(`⚠️ Failed to remove reaction from message: \`${e}\``);
      }
    } else {
      try {
        await bot.removeMessageReaction(message.channel.id, message.id, stringifiedEmoji.replace(">", ""), reactor.id);
      } catch (e) {
        console.error(`[ReactionThreads] Error when trying to remove reaction: ${e}`);
      }
    }
  };

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
    "rtRemove",
    [
      { name: "channelId", type: "string", required: true },
      { name: "messageId", type: "string", required: true },
      { name: "emoji", type: "string", required: true },
    ],
    removeReactionCmd,
  );

  bot.on("messageReactionAdd", onReactionAdd);
  //#endregion
};
