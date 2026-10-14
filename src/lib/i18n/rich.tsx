import { Fragment, type ReactNode } from "react";

// Fills "{name}" holes in a translated sentence with React nodes (bold numbers, links, ...), so a
// sentence stays ONE translatable text and the translator can move the parts around:
//   rich(t("analysis.payoffBody"), { at: <b>{time}</b> })
export function rich(text: string, nodes: Record<string, ReactNode>): ReactNode {
  const parts = text.split(/(\{\w+\})/g);
  return parts.map((part, index) => {
    const match = /^\{(\w+)\}$/.exec(part);
    if (match && match[1] in nodes) return <Fragment key={index}>{nodes[match[1]]}</Fragment>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

// The usual way to emphasise a number inside a sentence.
export function Num({ children }: { children: ReactNode }) {
  return <span className="ltr-island font-semibold">{children}</span>;
}
