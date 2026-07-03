DigiCord.registerPlugin({
    name: "NitroFeatures",
    description: "Unlock Nitro-like features: emoji bypass, message logging, and more",
    authors: [{ name: "DigiCord", id: 0 }],

    settings: {
        def: {
            emojiBypass: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Replace :shortcode: with custom emoji URLs so they work in any channel",
                default: true,
            },
            emojiSize: {
                type: DigiCord.OptionType.SELECT,
                description: "Size of bypassed emojis in pixels",
                default: 48,
                options: [
                    { label: "32px", value: 32 },
                    { label: "48px (Recommended)", value: 48 },
                    { label: "64px", value: 64 },
                    { label: "128px", value: 128 },
                ],
            },
            showDeletedMessages: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Log deleted and edited messages to console",
                default: true,
            },
            customStatus: {
                type: DigiCord.OptionType.STRING,
                description: "Custom status text to broadcast on start",
                placeholder: "Playing with DigiCord...",
                default: "",
            },
        }
    },

    _listeners: [],
    _deletedMessages: [],
    _editedMessages: [],

    start() {
        this.logger = new DigiCord.Logger("NitroFeatures", "#57f287");

        // Register slash command
        DigiCord.Commands.register({
            name: "nitro",
            description: "NitroFeatures commands",
            inputType: 0,
            options: [{
                name: "action",
                description: "What to do",
                type: 3,
                required: true,
                choices: [
                    { name: "status", value: "status" },
                    { name: "clear-log", value: "clear-log" },
                    { name: "help", value: "help" },
                ]
            }],
            execute: (args, ctx) => {
                const action = args[0]?.value;

                if (action === "status") {
                    const s = this.store;
                    return {
                        content: [
                            "**NitroFeatures Status**",
                            `Emoji Bypass: ${s.emojiBypass ? "ON" : "OFF"} (${s.emojiSize}px)`,
                            `Message Logging: ${s.showDeletedMessages ? "ON" : "OFF"}`,
                            `Deleted tracked: ${this._deletedMessages.length}`,
                            `Edited tracked: ${this._editedMessages.length}`,
                        ].join("\n")
                    };
                }

                if (action === "clear-log") {
                    this._deletedMessages = [];
                    this._editedMessages = [];
                    return { content: "Message log cleared!" };
                }

                if (action === "help") {
                    return {
                        content: [
                            "**NitroFeatures Commands**",
                            "`/nitro status` - Show plugin status",
                            "`/nitro clear-log` - Clear message log",
                            "`/nitro help` - Show this help",
                        ].join("\n")
                    };
                }

                return { content: "Unknown action." };
            }
        }, this.name);

        this.logger.info("Slash command registered");

        // Message tracking via FluxDispatcher
        if (this.store.showDeletedMessages) {
            this.startMessageTracking();
        }

        // Emoji bypass via MessageEvents
        if (this.store.emojiBypass) {
            this.startEmojiBypass();
        }

        // Show toast on start
        DigiCord.UI?.showToast?.("NitroFeatures started!", 1);
        this.logger.info("NitroFeatures started!");
    },

    stop() {
        this.logger.info("NitroFeatures stopping...");

        // Unregister command
        DigiCord.Commands.unregister("nitro");

        // Cleanup flux listeners
        for (const unsub of this._listeners) {
            try { unsub(); } catch (e) {}
        }
        this._listeners = [];

        DigiCord.UI?.showToast?.("NitroFeatures stopped!", 1);
        this.logger.info("NitroFeatures stopped");
    },

    startMessageTracking() {
        const flux = DigiCord.FluxDispatcher;
        if (!flux) {
            this.logger.warn("FluxDispatcher not available");
            return;
        }

        const onDelete = (event) => {
            try {
                const { id, channelId } = event;
                if (!id) return;

                // Try to get message content from MessageStore
                const MessageStore = DigiCord.Stores?.MessageStore;
                let content = "";
                let author = "Unknown";

                if (MessageStore) {
                    const msg = MessageStore.getMessage(channelId, id);
                    if (msg) {
                        content = msg.content || "";
                        author = msg.author?.username || "Unknown";
                    }
                }

                this._deletedMessages.push({
                    id,
                    channelId,
                    content: content.substring(0, 200),
                    author,
                    timestamp: Date.now(),
                });

                this.logger.info(`[DELETED] ${author}: ${content.substring(0, 100)}`);
            } catch (e) {
                this.logger.error("Error tracking deleted message", e);
            }
        };

        const onEdit = (event) => {
            try {
                const { id, channelId, content } = event;
                if (!id) return;

                this._editedMessages.push({
                    id,
                    channelId,
                    content: (content || "").substring(0, 200),
                    timestamp: Date.now(),
                });

                this.logger.info(`[EDITED] Message ${id}: ${(content || "").substring(0, 100)}`);
            } catch (e) {
                this.logger.error("Error tracking edited message", e);
            }
        };

        flux.subscribe("MESSAGE_DELETE", onDelete);
        flux.subscribe("MESSAGE_UPDATE", onEdit);

        this._listeners.push(() => flux.unsubscribe("MESSAGE_DELETE", onDelete));
        this._listeners.push(() => flux.unsubscribe("MESSAGE_UPDATE", onEdit));

        this.logger.info("Message tracking active");
    },

    startEmojiBypass() {
        const EmojiStore = DigiCord.Stores?.EmojiStore;
        if (!EmojiStore) {
            this.logger.warn("EmojiStore not available, emoji bypass disabled");
            return;
        }

        // Match both <:name:id> and :shortcode: patterns
        const emojiPattern = /<a?:(\w+):(\d+)>|:([a-zA-Z0-9_]+):/g;

        const listener = (channelId, messageObj, options) => {
            if (!this.store.emojiBypass) return;

            const content = messageObj.content;
            if (!content) return;

            let newContent = content;
            let match;

            // Reset regex
            emojiPattern.lastIndex = 0;

            while ((match = emojiPattern.exec(content)) !== null) {
                try {
                    const fullMatch = match[0];
                    const isTag = fullMatch.startsWith("<");
                    let emoji, emojiId, emojiName, isAnimated;

                    if (isTag) {
                        // <:name:id> or <a:name:id> format
                        emojiName = match[1];
                        emojiId = match[2];
                        isAnimated = fullMatch.startsWith("<a:");

                        // Look up by ID
                        emoji = EmojiStore.getCustomEmojiById?.(emojiId);
                        if (!emoji) continue;
                    } else {
                        // :shortcode: format
                        const shortcode = match[3];

                        // Search all custom emojis for a match by name
                        emoji = this.findEmojiByName(shortcode);
                        if (!emoji || !emoji.id) continue;

                        emojiId = emoji.id;
                        emojiName = emoji.name;
                        isAnimated = emoji.animated;
                    }

                    // Check if user can use this emoji
                    if (this.canUseEmoji(emoji, channelId)) continue;

                    const size = this.store.emojiSize || 48;
                    const ext = isAnimated ? "gif" : "png";
                    const url = `https://cdn.discordapp.com/emojis/${emojiId}.${ext}?size=${size}`;

                    // Replace with hyperlink
                    newContent = newContent.replace(fullMatch, `[${emojiName}](${url})`);

                } catch (e) {
                    // Skip this emoji if processing fails
                }
            }

            if (newContent !== content) {
                messageObj.content = newContent;
            }
        };

        DigiCord.MessageEvents.addPreSendListener(listener);
        this._listeners.push(() => DigiCord.MessageEvents.removePreSendListener(listener));

        this.logger.info("Emoji bypass active");
    },

    findEmojiByName(name) {
        try {
            const EmojiStore = DigiCord.Stores?.EmojiStore;
            if (!EmojiStore) return null;

            // Try getEmoji if available (returns all custom emojis)
            if (typeof EmojiStore.getEmoji === "function") {
                const emojis = EmojiStore.getEmoji();
                if (Array.isArray(emojis)) {
                    const found = emojis.find(e =>
                        e.name?.toLowerCase() === name.toLowerCase() ||
                        e.name?.replace(/\s/g, "_").toLowerCase() === name.toLowerCase()
                    );
                    if (found) return found;
                }
            }

            // Try forEachEmoji or similar iteration
            if (typeof EmojiStore.forEach === "function") {
                let found = null;
                EmojiStore.forEach((e) => {
                    if (found) return;
                    if (e.name?.toLowerCase() === name.toLowerCase()) {
                        found = e;
                    }
                });
                if (found) return found;
            }

            // Try getEmojiCategories and search through them
            if (typeof EmojiStore.getEmojiCategories === "function") {
                const categories = EmojiStore.getEmojiCategories();
                for (const cat of categories) {
                    const emojis = cat.emojis ?? [];
                    const found = emojis.find(e =>
                        e.name?.toLowerCase() === name.toLowerCase()
                    );
                    if (found) return found;
                }
            }

            // Brute force: check all known emoji IDs (unreliable but fallback)
            return null;
        } catch (e) {
            return null;
        }
    },

    canUseEmoji(emoji, channelId) {
        if (!emoji) return true;

        // Get the guild ID from various possible properties
        const emojiGuildId = emoji.guildId ?? emoji.guild_id ?? null;

        // If no guild, it's a standard unicode emoji - always usable
        if (!emojiGuildId) return true;

        // If from the current server, always usable
        const currentGuildId = DigiCord.getCurrentGuildId?.();
        if (emojiGuildId === currentGuildId) return true;

        // DMs and group DMs - check USE_EXTERNAL_EMOJIS or allow
        const ChannelStore = DigiCord.Stores?.ChannelStore;
        const PermissionStore = DigiCord.Stores?.PermissionStore;

        try {
            const channel = ChannelStore?.getChannel?.(channelId);
            if (!channel) return false;

            // Private channels (DM = 1, GROUP_DM = 3) - always allowed
            if (channel.type === 1 || channel.type === 3) return true;

            // USE_EXTERNAL_EMOJIS = 1n << 18n = 262144n
            if (PermissionStore?.can) {
                return PermissionStore.can(262144n, channel);
            }
        } catch (e) {
            this.logger.error("Permission check failed", e);
        }

        return false;
    },
});
