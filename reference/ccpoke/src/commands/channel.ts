import * as p from "@clack/prompts";

import { ConfigManager, type Config } from "../config-manager.js";
import { t } from "../i18n/index.js";
import { ChannelName } from "../utils/constants.js";
import {
  promptDiscordCredentials,
  promptSlackCredentials,
  promptToken,
  verifyToken,
  waitForUserStart,
} from "./setup.js";

const CHANNEL_LABELS: Record<string, string> = {
  [ChannelName.Telegram]: "Telegram",
  [ChannelName.Discord]: "Discord",
  [ChannelName.Slack]: "Slack",
};

function isChannelConfigured(cfg: Config, channel: string): boolean {
  switch (channel) {
    case ChannelName.Telegram:
      return Boolean(cfg.telegram_bot_token && cfg.user_id);
    case ChannelName.Discord:
      return Boolean(cfg.discord_bot_token && cfg.discord_user_id);
    case ChannelName.Slack:
      return Boolean(cfg.slack_bot_token && cfg.slack_channel_id);
    default:
      return false;
  }
}

async function configureChannel(cfg: Config, channel: string): Promise<boolean> {
  switch (channel) {
    case ChannelName.Telegram: {
      const token = await promptToken(cfg);
      const tokenUnchanged = token === cfg.telegram_bot_token && cfg.user_id > 0;
      if (tokenUnchanged) {
        p.log.success(t("setup.tokenUnchanged"));
      } else {
        cfg.telegram_bot_token = token;
        const botUsername = await verifyToken(token);
        cfg.user_id = await waitForUserStart(token, botUsername);
      }
      return true;
    }
    case ChannelName.Discord: {
      await promptDiscordCredentials(cfg, cfg);
      return true;
    }
    case ChannelName.Slack: {
      await promptSlackCredentials(cfg, cfg);
      return true;
    }
    default:
      return false;
  }
}

export async function runChannel(): Promise<void> {
  const cfg = ConfigManager.load();

  p.intro(t("channelCmd.intro"));
  p.log.info(
    t("channelCmd.currentChannel", { channel: CHANNEL_LABELS[cfg.channel] ?? cfg.channel })
  );

  const result = await p.select({
    message: t("channelCmd.selectChannel"),
    initialValue: cfg.channel,
    options: Object.values(ChannelName).map((ch) => {
      const configured = isChannelConfigured(cfg, ch);
      return {
        value: ch,
        label: configured ? CHANNEL_LABELS[ch]! : `${CHANNEL_LABELS[ch]} ⚠️`,
        hint: configured ? undefined : "not configured",
      };
    }),
  });

  if (p.isCancel(result)) {
    p.cancel(t("channelCmd.cancelled"));
    return;
  }

  if (result === cfg.channel) {
    p.outro(t("channelCmd.unchanged"));
    return;
  }

  if (!isChannelConfigured(cfg, result)) {
    const label = CHANNEL_LABELS[result] ?? result;
    p.log.warn(t("channelCmd.notConfigured", { channel: label }));

    const shouldConfigure = await p.confirm({
      message: t("channelCmd.configureNow", { channel: label }),
      initialValue: true,
    });

    if (p.isCancel(shouldConfigure) || !shouldConfigure) {
      p.outro(t("channelCmd.cancelled"));
      return;
    }

    const success = await configureChannel(cfg, result);
    if (!success) {
      p.outro(t("channelCmd.cancelled"));
      return;
    }
  }

  cfg.channel = result;
  ConfigManager.save(cfg);
  p.outro(t("channelCmd.switched", { channel: CHANNEL_LABELS[result] ?? result }));
}
