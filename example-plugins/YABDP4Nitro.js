/**
 * YABDP4Nitro — DigiCord Port
 * Adapted from BetterDiscord to DigiCord API
 * Original author: Riolubruh
 * Port by: DigiCord
 *
 * Unlock all screensharing modes, use cross-server & GIF emotes, and more!
 */

DigiCord.registerPlugin({
    name: "YABDP4Nitro",
    description: "Unlock all screensharing modes, use cross-server & GIF emotes, and more!",
    authors: [{ name: "Riolubruh", id: 359063827091816448n }],

    settings: {
        def: {
            // ── Screen Share ──
            screenSharing: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "1080p/Source @ 60fps screensharing. Enable to use any Screen Share related options.",
                default: true,
            },
            ResolutionEnabled: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Choose your own screen share resolution!",
                default: false,
            },
            CustomResolution: {
                type: DigiCord.OptionType.NUMBER,
                description: "The custom resolution you want (in pixels)",
                default: 1440,
            },
            CustomFPSEnabled: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Choose your own screen share FPS!",
                default: false,
            },
            CustomFPS: {
                type: DigiCord.OptionType.NUMBER,
                description: "The custom FPS you want to stream at.",
                default: 60,
            },
            ResolutionSwapper: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Change resolution and FPS quickly in the stream settings modal.",
                default: true,
            },
            CustomBitrateEnabled: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Choose the bitrate for your streams!",
                default: false,
            },
            minBitrate: {
                type: DigiCord.OptionType.NUMBER,
                description: "Minimum bitrate (kbps). Negative = use default.",
                default: -1,
            },
            targetBitrate: {
                type: DigiCord.OptionType.NUMBER,
                description: "Target bitrate (kbps). Negative = use default.",
                default: -1,
            },
            maxBitrate: {
                type: DigiCord.OptionType.NUMBER,
                description: "Maximum bitrate (kbps). Negative = use default. Free max: 3500, Nitro max: 9000.",
                default: -1,
            },
            voiceBitrate: {
                type: DigiCord.OptionType.NUMBER,
                description: "Voice audio bitrate (kbps). -1 to disable. Does not go over channel's set bitrate.",
                default: -1,
            },
            sharpenStreams: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Adds sharpness slider to stream context menu. Enable Hardware Acceleration in Discord's Advanced Settings!",
                default: false,
            },
            videoCodec2: {
                type: DigiCord.OptionType.SELECT,
                description: "Force a specific video codec. Mobile/Web can only view H.264/VP8!",
                default: -1,
                options: [
                    { label: "Default (automatic)", value: -1, default: true },
                    { label: "AV1", value: 0 },
                    { label: "H265", value: 1 },
                    { label: "H264", value: 2 },
                    { label: "VP8", value: 3 },
                    { label: "VP9", value: 4 },
                ],
            },

            // ── Emojis ──
            emojiBypass: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Enable using the emoji bypass.",
                default: true,
            },
            emojiSize: {
                type: DigiCord.OptionType.SELECT,
                description: "The size of the emoji in pixels.",
                default: 64,
                options: [
                    { label: "16px", value: 16 },
                    { label: "24px", value: 24 },
                    { label: "32px (Default small/inline)", value: 32 },
                    { label: "40px", value: 40 },
                    { label: "48px (Recommended)", value: 48 },
                    { label: "56px", value: 56 },
                    { label: "64px", value: 64, default: true },
                    { label: "80px", value: 80 },
                    { label: "96px", value: 96 },
                    { label: "128px (Max)", value: 128 },
                    { label: "256px (Max GIF)", value: 256 },
                ],
            },
            emojiBypassType: {
                type: DigiCord.OptionType.SELECT,
                description: "The method of bypass to use.",
                default: 0,
                options: [
                    { label: "Upload Emojis", value: 0, default: true },
                    { label: "Hyperlink/Vencord-Like Mode", value: 3 },
                    { label: "Classic Mode", value: 2 },
                ],
            },
            editMessageWithEmoji: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Replace text-based fakemoji with their emoji when editing a message.",
                default: true,
            },
            emojiBypassForValidEmoji: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Disable to use emoji bypass even if bypass is not required.",
                default: true,
            },
            PNGemote: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Use the PNG version of static emoji for higher quality.",
                default: true,
            },
            stickerBypass: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Enable sticker bypass. Animated APNG/WEBP/Lottie stickers will NOT animate.",
                default: false,
            },
            uploadStickers: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Upload stickers in the same way as emotes.",
                default: false,
            },
            forceStickersUnlocked: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Force stickers to be unlocked.",
                default: false,
            },
            fakeInlineVencordEmotes: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Makes hyperlinked emojis appear as real emojis, inlined in the message.",
                default: true,
            },
            soundmojiEnabled: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Unlocks soundmojis. Replaces them with MP3 upload. Enables Experiments.",
                default: false,
            },

            // ── Profile ──
            profileV2: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Show all users with the new Nitro-exclusive profile look.",
                default: false,
            },
            fakeProfileThemes: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Uses invisible 3y3 encoding for profile theming via your bio.",
                default: true,
            },
            fakeProfileBanners: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Uses invisible 3y3 encoding for profile banners via your bio. Imgur URLs only.",
                default: true,
            },
            userBgIntegration: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Downloads and parses the UsrBG JSON database for banners.",
                default: true,
            },
            voiceTileBannerBackground: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Uses fake banners as the background for call tiles.",
                default: false,
            },
            fakeAvatarDecorations: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Uses invisible 3y3 encoding for avatar decorations via your bio/status.",
                default: true,
            },
            profileEffects: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Uses invisible 3y3 encoding for profile effects via your bio.",
                default: true,
            },
            killProfileEffects: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Removes ALL profile effects. Overrides all profile effects.",
                default: false,
            },
            customPFPs: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Uses invisible 3y3 encoding for custom profile pictures via your custom status. Imgur URLs only.",
                default: true,
            },
            userPfpIntegration: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Imports the UserPFP database for profile pictures.",
                default: true,
            },
            disableUserBadge: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Disables the YABDP4Nitro User Badge on users with Profile Customization.",
                default: false,
            },
            nameplatesEnabled: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Uses invisible 3y3 encoding for fake nameplates via your status/bio.",
                default: true,
            },
            displayNameStyles: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Uses invisible 3y3 encoding for fake display name styles via your bio.",
                default: true,
            },

            // ── Clips ──
            useClipBypass: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Sets file upload limit for video files to 100MB.",
                default: true,
            },
            clipTimestamp: {
                type: DigiCord.OptionType.SELECT,
                description: "How the plugin determines the timestamp for generated clips.",
                default: 2,
                options: [
                    { label: "Zero (January 1st, 2015)", value: 0 },
                    { label: "Current Date/Time", value: 1 },
                    { label: "Last Modified Date/Time of File", value: 2, default: true },
                ],
            },
            forceClip: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Always send video files as a clip, even below 10MB.",
                default: false,
            },
            useAudioClipBypass: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Same as Clips Bypass but for audio files.",
                default: true,
            },
            forceAudioClip: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Always send audio files as a clip, even below 10MB.",
                default: false,
            },
            zipClip: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Upload any file with 100MB limit by making polyglot video+zip files.",
                default: true,
            },
            enableClipsExperiment: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Enable Clips-related experiments. Requires client reload to remove.",
                default: false,
            },

            // ── Miscellaneous ──
            changePremiumType2: {
                type: DigiCord.OptionType.SELECT,
                description: "Set your user to different Premium Types client-side. Leave disabled if unsure.",
                default: -1,
                options: [
                    { label: "Disabled (Actual Nitro Status)", value: -1, default: true },
                    { label: "Free User", value: 0 },
                    { label: "Nitro Basic", value: 3 },
                    { label: "Nitro Classic", value: 1 },
                    { label: "Nitro", value: 2 },
                ],
            },
            clientThemes: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Allows you to use Nitro-exclusive Client Themes.",
                default: true,
            },
            removeProfileUpsell: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Removes the 'Try It Out' upsell in the profile customization screen.",
                default: false,
            },
            removeScreenshareUpsell: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Removes the Nitro upsell in the Screen Share quality option menu.",
                default: true,
            },
            unlockAppIcons: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Unlocks app icons.",
                default: true,
            },
            removeNotStaffWarning: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Removes the 'NOT STAFF' warning on DMs when Experiments are enabled.",
                default: true,
            },
            extraContextMenus: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Adds Copy URL, Open URL, and other extra context menu options.",
                default: true,
            },
            experiments: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Unlocks experiments. Use at your own risk.",
                default: false,
            },
            checkForUpdates: {
                type: DigiCord.OptionType.BOOLEAN,
                description: "Check for updates on startup?",
                default: true,
            },
        }
    },

    start() {
        const logger = new DigiCord.Logger("YABDP4Nitro", "#ff6b6b");

        logger.info("YABDP4Nitro (DigiCord Port) started!");
        logger.info("Settings:", this.store);

        // Example: log which features are enabled
        if (this.store.screenSharing) {
            logger.info("Screen sharing enhancements enabled");
        }
        if (this.store.emojiBypass) {
            logger.info(`Emoji bypass enabled (method: ${this.store.emojiBypassType}, size: ${this.store.emojiSize}px)`);
        }
        if (this.store.profileV2) {
            logger.info("Profile V2 enabled");
        }

        // Register slash commands
        this.commands = [{
            name: "yabdptest",
            description: "Test YABDP4Nitro settings",
            inputType: 0,
            execute: () => ({
                content: `YABDP4Nitro is active! Settings: screenSharing=${this.store.screenSharing}, emojiBypass=${this.store.emojiBypass}`
            })
        }];

        for (const cmd of this.commands) {
            DigiCord.Commands.register(cmd, this.name);
        }
    },

    stop() {
        const logger = new DigiCord.Logger("YABDP4Nitro", "#ff6b6b");
        logger.info("YABDP4Nitro stopped!");

        if (this.commands) {
            for (const cmd of this.commands) {
                DigiCord.Commands.unregister(cmd.name);
            }
        }
    }
});
