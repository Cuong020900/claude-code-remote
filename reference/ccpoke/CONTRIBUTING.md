# Đóng góp cho ccpoke

[English](./CONTRIBUTING.en.md)

Cảm ơn bạn quan tâm đến ccpoke! Dự án hoan nghênh mọi đóng góp — sửa bug, thêm tính năng, cải thiện tài liệu, hay hỗ trợ thêm agent/channel mới.

## Yêu cầu

- **Node.js** ≥ 20
- **pnpm** (project dùng `pnpm@10.28.2`)
- **tmux** — cần cho tính năng tương tác 2 chiều

## Bắt đầu

### 1. Fork & Clone

```bash
# Fork repo trên GitHub
# https://github.com/kaida-palooza/ccpoke

git clone https://github.com/<your-username>/ccpoke.git
cd ccpoke
pnpm install
```

### 2. Tạo branch

```bash
git checkout -b feat/ten-tinh-nang
```

Quy tắc đặt tên branch:

| Prefix | Khi nào |
|--------|---------|
| `feat/` | Tính năng mới |
| `fix/` | Sửa bug |
| `refactor/` | Cải thiện code |
| `docs/` | Tài liệu |

### 3. Phát triển

```bash
# Chạy dev mode (có debug log)
pnpm dev

# Lint
pnpm lint

# Format
pnpm format

# Build kiểm tra
pnpm build
```

### 4. Commit

Project dùng **Conventional Commits**. Husky + lint-staged tự chạy ESLint và Prettier khi commit.

```
type(scope): mô tả ngắn
```

| Type | Khi nào |
|------|---------|
| `feat` | Tính năng mới |
| `fix` | Sửa bug |
| `refactor` | Thay đổi code không đổi behavior |
| `docs` | Chỉ thay đổi documentation |
| `chore` | Config, deps, CI, tooling |
| `style` | Format, whitespace (không đổi logic) |
| `perf` | Cải thiện performance |
| `test` | Thêm/sửa test |

**Quy tắc:**

- Present tense, imperative: `add` không phải `added`
- Không có dấu chấm cuối
- Header only — không body, không bullet list
- Giữ dưới 72 ký tự

```bash
# Ví dụ
git commit -m "feat(telegram): add inline keyboard support"
git commit -m "fix(hook): handle missing session id"
git commit -m "refactor(i18n): extract locale constants"
```

### 5. Tạo Pull Request

```bash
git push origin feat/ten-tinh-nang
```

Vào GitHub tạo PR vào branch `main`. Trong PR mô tả:

- **Vấn đề**: PR này giải quyết gì?
- **Giải pháp**: Đã làm gì?
- **Ảnh hưởng**: Các phần nào bị tác động?

## Coding Standards

### Nguyên tắc

- **Không over-engineering.** Chỉ implement những gì cần thiết ngay bây giờ
- **Tái sử dụng trước khi tạo mới.** Tìm module, utility có sẵn trước khi viết mới
- **Không comment.** Code phải tự giải thích qua tên biến, hàm rõ ràng. Nếu cần comment, viết lại code cho rõ hơn

### Code Style

- TypeScript strict mode
- ESM modules (`import`/`export`)
- Double quotes, semicolons, 2-space indent
- Trailing comma `es5`
- Print width 100
- Import tự sắp xếp: builtin → third-party → relative

### i18n

Khi thêm string hiển thị cho người dùng, phải thêm vào **cả 3 file locale** và type definition:

- `src/i18n/en.ts`
- `src/i18n/vi.ts`
- `src/i18n/zh.ts`
- `src/i18n/types.ts` (type definition)

### Error Handling

- Luôn `.catch()` cho fire-and-forget promises
- Wrap `setInterval` callbacks trong try/catch
- Escape shell metacharacters khi dùng `execSync` với user input

## Cấu trúc dự án

```
src/
├── agent/       → Plugin agents (Claude Code, Codex CLI, Cursor CLI)
├── channel/     → Kênh giao tiếp (Telegram, Discord, Slack)
├── commands/    → CLI commands (setup, project, uninstall)
├── i18n/        → Đa ngôn ngữ (en, vi, zh)
├── server/      → HTTP server cho webhook
├── tmux/        → Quản lý phiên tmux
├── utils/       → Tiện ích dùng chung
└── index.ts     → Entry point
web/             → Landing page (Astro)
docs/            → Tài liệu kỹ thuật
```

## Thêm Agent mới

Dự án dùng kiến trúc plugin. Để thêm agent mới:

1. Tạo thư mục trong `src/agent/`
2. Implement interface agent (hook install/uninstall, event parsing)
3. Đăng ký agent trong danh sách agents
4. Thêm locale strings cho cả 3 ngôn ngữ

## Thêm Channel mới

Tương tự agent, channel cũng dùng kiến trúc plugin:

1. Tạo thư mục trong `src/channel/`
2. Implement interface channel (send message, handle callback)
3. Đăng ký channel
4. Thêm locale strings

## Giấy phép

Đóng góp của bạn sẽ được phát hành theo [MIT License](./LICENSE).
