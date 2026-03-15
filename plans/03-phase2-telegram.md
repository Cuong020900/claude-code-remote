# Phase 2: Telegram Bot

## Goal

Add full Telegram bot integration for remote control — push notifications, 2-way chat, and permission approval from your phone.

## Prerequisites

- Phase 0 + Phase 1 complete
- Telegram Bot Token from @BotFather

---

## Features

### 1. Push Notifications

**Trigger:** Stop hook fires → format message → send to Telegram

**Message format:**

```
🤖 Claude Code Response
📂 project-name | ⏱ 45s

Summary of what was done...
```

### 2. 2-Way Chat

**Flow:**
1. User sends message in Telegram
2. Bot looks up active session (or asks to select)
3. `tmuxBridge.sendKeys(target, message, ['Enter'])`
4. Claude responds → Stop hook fires → reply to Telegram

### 3. Permission Approval

**Trigger:** PermissionRequest hook fires

**Inline keyboard:**
```
[✅ Approve] [❌ Reject]
```

**Flow:**
1. Permission hook fires
2. Bot sends message with inline keyboard
3. User clicks button
4. Bot sends 'y' or 'n' via tmux send-keys

### 4. Session Management Commands

| Command | Description |
|---------|-------------|
| `/start` | Register chat, show help |
| `/sessions` | List active sessions |
| `/new [project]` | Create new session in project |
| `/kill [session]` | Kill a session |
| `/history` | Browse past conversations |

---

## Backend Components

### 1. Telegram Bot (`src/telegram/bot.ts`)

```typescript
import TelegramBot from 'node-telegram-bot-api';

class TelegramBot {
  private bot: TelegramBot;

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.setupCommands();
    this.setupCallbacks();
  }

  private setupCommands() {
    this.bot.onText(/\/start/, this.handleStart);
    this.bot.onText(/\/sessions/, this.handleSessions);
    this.bot.onText(/\/new/, this.handleNewSession);
    // ...
  }

  sendNotification(chatId: number, message: string) { ... }
  sendPermissionRequest(chatId: number, session: Session) { ... }
}
```

### 2. Message Formatter (`src/telegram/formatter.ts`)

Format Claude Code responses for Telegram:
- Convert Markdown to Telegram HTML
- Truncate long outputs
- Add emoji indicators
- Handle code blocks with backticks

### 3. Session Router (`src/telegram/session-router.ts`)

Map Telegram chats to Claude sessions:
- Default to most recent session
- Ask user to select if multiple sessions
- Store mapping in memory (or file for persistence)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/telegram/bot.ts` | Bot initialization, command handlers |
| `src/telegram/formatter.ts` | Format AI responses for Telegram |
| `src/telegram/session-router.ts` | Map Telegram chat → Claude session |
| `src/telegram/inline-keyboard.ts` | Permission approve/reject buttons |

---

## Verification

- [ ] Claude finishes → Telegram receives notification
- [ ] Send message in Telegram → Claude receives in tmux → responds → reply to Telegram
- [ ] Permission request → inline keyboard → approve → Claude continues
- [ ] `/sessions` shows active sessions
- [ ] `/new project` creates new session

---

## Reference

- [ccpoke telegram-channel.ts](file:///Users/trancuong/workspace/TEST/claude-code-remote/reference/ccpoke/src/channel/telegram/telegram-channel.ts)
- [ccpoke permission-handler](file:///Users/trancuong/workspace/TEST/claude-code-remote/reference/ccpoke/src/channel/telegram/permission-request-handler.ts)
