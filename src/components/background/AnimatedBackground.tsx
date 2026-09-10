import type { CSSProperties } from "react";

type Variant = "hero" | "subtle";

const nodes = [
  [7, 18], [17, 11], [27, 25], [38, 14], [48, 30], [61, 17], [74, 28], [87, 13],
  [94, 36], [12, 43], [24, 56], [36, 44], [49, 57], [63, 46], [77, 59], [89, 49],
  [5, 72], [18, 82], [31, 70], [44, 86], [57, 73], [69, 88], [82, 76], [96, 84],
  [10, 94], [25, 94], [52, 96], [73, 96], [91, 94],
] as const;

const edges = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15],
  [9, 16], [10, 17], [11, 18], [12, 19], [13, 20], [14, 21], [15, 22],
  [16, 17], [17, 18], [18, 19], [19, 20], [20, 21], [21, 22], [22, 23],
  [17, 24], [19, 25], [21, 26], [22, 27], [23, 28],
] as const;

const travelers = [
  { edge: [0, 1], duration: 11, delay: -2 },
  { edge: [4, 5], duration: 14, delay: -8 },
  { edge: [9, 10], duration: 12, delay: -5 },
  { edge: [13, 14], duration: 15, delay: -11 },
  { edge: [17, 18], duration: 13, delay: -4 },
  { edge: [21, 22], duration: 16, delay: -9 },
] as const;

function point(index: number) {
  const [x, y] = nodes[index];
  return { x, y };
}

export default function AnimatedBackground({ variant = "hero" }: { variant?: Variant }) {
  return (
    <div aria-hidden="true" className={`animated-background animated-background--${variant}`}>
      <div className="animated-background__wash" />
      <div className="animated-background__blobs">
        <span className="animated-background__blob animated-background__blob--blue" />
        <span className="animated-background__blob animated-background__blob--cyan" />
        <span className="animated-background__blob animated-background__blob--indigo" />
        <span className="animated-background__blob animated-background__blob--violet" />
      </div>
      <div className="animated-background__grid bg-grid" />
      <svg className="animated-background__network" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g className="animated-background__lines">
          {edges.map(([from, to], index) => {
            const start = point(from);
            const end = point(to);
            return <line key={`${from}-${to}-${index}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
          })}
        </g>
        <g className="animated-background__nodes">
          {nodes.map(([x, y], index) => <circle key={index} cx={x} cy={y} r="0.38" />)}
        </g>
        <g className="animated-background__travelers">
          {travelers.map(({ edge, duration, delay }, index) => {
            const start = point(edge[0]);
            const end = point(edge[1]);
            const style = {
              "--travel-x": `${end.x - start.x}vw`,
              "--travel-y": `${end.y - start.y}vh`,
              "--travel-duration": `${duration}s`,
              "--travel-delay": `${delay}s`,
            } as CSSProperties;
            return <circle key={index} className="animated-background__traveler" cx={start.x} cy={start.y} r="0.65" style={style} />;
          })}
        </g>
      </svg>
      <div className="animated-background__watermark">
        <span className="animated-background__watermark-ring" />
        <span className="animated-background__watermark-tip" />
      </div>
      <span className="animated-background__red-spark animated-background__red-spark--one" />
      <span className="animated-background__red-spark animated-background__red-spark--two" />
    </div>
  );
}
