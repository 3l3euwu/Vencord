DigiCord.registerPlugin({
    name: 'BetterTimestamps',
    description: 'Shows exact timestamps next to message author names.',
    authors: [{ name: 'DigiCord', id: 0 }],
    settings: {
        def: {
            format: {
                type: DigiCord.OptionType.SELECT,
                description: 'Timestamp display format',
                default: 'full',
                options: [
                    { label: 'HH:mm:ss', value: 'time' },
                    { label: 'HH:mm', value: 'short' },
                    { label: 'Full (HH:mm:ss DD/MM)', value: 'full' },
                    { label: 'Relative', value: 'relative' },
                ],
            },
        },
    },
    renderMessageDecoration(props) {
        const msg = props.message;
        if (!msg?.timestamp) return null;
        const d = new Date(msg.timestamp);
        let text;
        switch (this.settings.format) {
            case 'time': text = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); break;
            case 'short': text = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); break;
            case 'relative': {
                const diff = Date.now() - d.getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) text = 'just now';
                else if (mins < 60) text = mins + 'm ago';
                else if (mins < 1440) text = Math.floor(mins / 60) + 'h ago';
                else text = Math.floor(mins / 1440) + 'd ago';
                break;
            }
            default: text = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                + ' ' + d.toLocaleDateString();
        }
        return DigiCord.React.createElement('span', {
            style: {
                color: 'var(--text-muted)',
                fontSize: '11px',
                marginLeft: '6px',
                userSelect: 'text',
                cursor: 'default',
            },
            title: d.toLocaleString(),
        }, text);
    },
});
