import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function Markdown({ content, className = '', inline = false }: { content?: string | null; className?: string; inline?: boolean }) {
  if (!content) return null;
  const body = (
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {content}
    </ReactMarkdown>
  );
  if (inline) return <span className={`markdown-inline ${className}`}>{body}</span>;
  return (
    <div className={`markdown-body ${className}`}>
      {body}
    </div>
  );
}
