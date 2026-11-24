import type { Paragraph, Root, RootContent } from 'mdast';

// Separate bold section labels from adjacent prose while leaving code, lists,
// quotes, and ordinary emphasized text alone.
export function remarkSectionLabels() {
  return (tree: Root) => {
    tree.children = tree.children.flatMap((block): RootContent[] => {
      if (block.type !== 'paragraph') return [block];

      const lines: Paragraph['children'][] = [[]];
      for (const child of block.children) {
        if (child.type === 'break') lines.push([]);
        else lines[lines.length - 1]!.push(child);
      }
      if (lines.length < 2) return [block];

      const sections: RootContent[] = [];
      const paragraph: Paragraph['children'] = [];
      const flushParagraph = () => {
        if (paragraph.length) {
          sections.push({ type: 'paragraph', children: paragraph.splice(0) });
        }
      };

      for (const line of lines) {
        const [label, suffix] = line;
        const isSectionLabel = label?.type === 'strong'
          && label.children.length === 1
          && label.children[0]?.type === 'text'
          && (
            (line.length === 1 && /^[^\n:]{1,80}:$/.test(label.children[0].value))
            || (line.length === 2 && suffix?.type === 'text' && suffix.value.trim() === ':'
              && /^[^\n:]{1,80}$/.test(label.children[0].value))
          );

        if (isSectionLabel) {
          flushParagraph();
          sections.push({ type: 'heading', depth: 3, children: line });
        } else {
          if (paragraph.length) paragraph.push({ type: 'break' });
          paragraph.push(...line);
        }
      }
      if (!sections.length) return [block];
      flushParagraph();
      return sections;
    });
  };
}
