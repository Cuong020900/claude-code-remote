'use client';

import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: unknown;
  timestamp?: string;
}

/** Render message content as string */
function contentToString(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block && typeof block === 'object' && 'text' in block) {
          return String((block as { text: string }).text);
        }
        return JSON.stringify(block);
      })
      .join('\n');
  }
  return JSON.stringify(content, null, 2);
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const text = contentToString(content);
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-muted text-foreground'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {text}
            </ReactMarkdown>
          </div>
        )}
        {timestamp && (
          <div className={`mt-1 text-xs ${isUser ? 'text-indigo-200' : 'text-muted-foreground'}`}>
            {new Date(timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
