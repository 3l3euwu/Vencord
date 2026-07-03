DigiCord.registerPlugin({
    name: 'QuickReact',
    description: 'Adds one-click reaction buttons below each message.',
    authors: [{ name: 'DigiCord', id: 0 }],
    settings: {
        def: {
            emojis: {
                type: DigiCord.OptionType.STRING,
                description: 'Reaction emojis, comma-separated',
                default: '👍,❤️,😂,😮,😢,🔥',
                placeholder: 'e.g. 👍,❤️,😂',
            },
            placement: {
                type: DigiCord.OptionType.SELECT,
                description: 'Button placement',
                default: 'below',
                options: [
                    { label: 'Below message', value: 'below' },
                    { label: 'Above message', value: 'above' },
                ],
            },
        },
    },
    start() {
        DigiCord.Webpack.waitFor(m => m.addReaction && !m._isDigiCord).then(mod => {
            this._addReaction = mod.addReaction;
        });
    },
    renderMessageAccessory(props) {
        const msg = props.message;
        const h = DigiCord.React.createElement;
        if (!msg?.channel_id || !msg?.id) return null;
        if (!this._addReaction) return null;
        const emojis = this.settings.emojis.split(',').map(e => e.trim()).filter(Boolean);
        if (!emojis.length) return null;
        return h('div', {
            style: {
                display: 'flex',
                gap: '3px',
                marginTop: '2px',
                marginBottom: '2px',
            },
        }, ...emojis.map(e =>
            h('button', {
                style: {
                    cursor: 'pointer',
                    background: 'none',
                    border: '1px solid var(--background-modifier-accent)',
                    borderRadius: '4px',
                    padding: '0 5px',
                    fontSize: '15px',
                    lineHeight: '24px',
                    opacity: 0.6,
                    transition: 'opacity 0.15s',
                },
                onMouseEnter: ev => { ev.currentTarget.style.opacity = '1'; },
                onMouseLeave: ev => { ev.currentTarget.style.opacity = '0.6'; },
                onClick: () => {
                    try { this._addReaction(msg.channel_id, msg.id, e); }
                    catch (err) { console.error('[QuickReact]', err); }
                },
            }, e)
        ));
    },
});
