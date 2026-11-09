import { cx } from '../../lib/format.js';

// Renders simple article text: "## " headings, "- " bullet lists and paragraphs.
export function parseProse(source = '') {
  const blocks = [];
  let list = null;
  source.split(/\r?\n/).forEach((raw) => {
    const line = raw.trim();
    if (line.startsWith('- ')) {
      if (!list) {
        list = { type: 'ul', items: [] };
        blocks.push(list);
      }
      list.items.push(line.slice(2));
      return;
    }
    list = null;
    if (!line) return;
    if (line.startsWith('### ')) blocks.push({ type: 'h3', text: line.slice(4) });
    else if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3) });
    else blocks.push({ type: 'p', text: line });
  });
  return blocks;
}

export function Prose({ children, className }) {
  return (
    <div className={cx('space-y-4 text-[16px] leading-[1.8] text-slate-700', className)}>
      {parseProse(children).map((block, i) => {
        if (block.type === 'h2') return <h2 key={i} className="pt-4 text-2xl font-extrabold tracking-tight text-ink">{block.text}</h2>;
        if (block.type === 'h3') return <h3 key={i} className="pt-2 text-xl font-bold text-ink">{block.text}</h3>;
        if (block.type === 'ul') return <ul key={i} className="list-disc space-y-1.5 pl-6 marker:text-brand-500">{block.items.map((item, j) => <li key={j}>{item}</li>)}</ul>;
        return <p key={i}>{block.text}</p>;
      })}
    </div>
  );
}
