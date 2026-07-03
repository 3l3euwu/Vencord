DigiCord.registerPlugin({
    name: 'GhostMessageLogger',
    description: 'Shows a toast when someone deletes or edits a message, with the original content.',
    authors: [{ name: 'DigiCord', id: 0 }],
    settings: {
        def: {
            logDeletes: {
                type: DigiCord.OptionType.BOOLEAN,
                description: 'Show toast when messages are deleted',
                default: true,
            },
            logEdits: {
                type: DigiCord.OptionType.BOOLEAN,
                description: 'Show toast when messages are edited',
                default: true,
            },
            maxLength: {
                type: DigiCord.OptionType.NUMBER,
                description: 'Maximum characters to show in toast (0 = full)',
                default: 80,
            },
        },
    },
    start() {
        this._cache = new Map();
        this._subs = [];

        const cacheMsg = e => {
            if (e.message?.id && e.message?.content) {
                this._cache.set(e.message.id, {
                    content: e.message.content,
                    author: e.message.author?.username ?? 'Unknown',
                    channelId: e.message.channel_id,
                });
            }
        };

        const onDelete = e => {
            if (!this.settings.logDeletes) return;
            const cached = this._cache.get(e.id);
            if (!cached?.content) return;
            const max = this.settings.maxLength || 80;
            const text = max > 0 && cached.content.length > max
                ? cached.content.substring(0, max) + '...'
                : cached.content;
            DigiCord.UI.showToast(`Deleted — ${cached.author}: "${text}"`);
        };

        const onEdit = e => {
            if (!this.settings.logEdits) return;
            const msg = e.message;
            if (!msg?.id || !msg?.content) return;
            const cached = this._cache.get(msg.id);
            if (!cached || cached.content === msg.content) return;
            const max = this.settings.maxLength || 80;
            const oldT = max > 0 && cached.content.length > max
                ? cached.content.substring(0, max) + '...'
                : cached.content;
            const newT = max > 0 && msg.content.length > max
                ? msg.content.substring(0, max) + '...'
                : msg.content;
            DigiCord.UI.showToast(`Edited — ${cached.author}: "${oldT}" → "${newT}"`);
            this._cache.set(msg.id, { ...cached, content: msg.content });
        };

        const unsub = (ev, fn) => {
            DigiCord.FluxDispatcher.subscribe(ev, fn);
            this._subs.push(() => DigiCord.FluxDispatcher.unsubscribe(ev, fn));
        };
        unsub('MESSAGE_CREATE', cacheMsg);
        unsub('MESSAGE_DELETE', onDelete);
        unsub('MESSAGE_UPDATE', onEdit);
    },
    stop() {
        this._subs.forEach(fn => fn());
        this._cache.clear();
    },
});
