export function AmbientBackground() {
  return (
    <div className="ajn-ambient-root" aria-hidden="true">
      <div className="ajn-ambient-canvas" />
      <div className="ajn-ambient-glow ajn-ambient-g1" />
      <div className="ajn-ambient-glow ajn-ambient-g2" />
      <div className="ajn-ambient-glow ajn-ambient-g3" />
      <div className="ajn-ambient-glow ajn-ambient-g4" />
      <div className="ajn-crystal-orb ajn-crystal-o1" />
      <div className="ajn-crystal-orb ajn-crystal-o2" />
      <div className="ajn-crystal-orb ajn-crystal-o3" />
      <svg className="ajn-ambient-ribbons" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id="buzzRibbonOne" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E9D5FF" stopOpacity=".30" />
            <stop offset="50%" stopColor="#C4B5FD" stopOpacity=".22" />
            <stop offset="100%" stopColor="#D1FAE5" stopOpacity=".16" />
          </linearGradient>
          <linearGradient id="buzzRibbonTwo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F5F3FF" stopOpacity=".46" />
            <stop offset="60%" stopColor="#DDD6FE" stopOpacity=".18" />
            <stop offset="100%" stopColor="#DBEAFE" stopOpacity=".32" />
          </linearGradient>
        </defs>
        <path className="ajn-ribbon-path ajn-ribbon-path-1" fill="url(#buzzRibbonOne)" d="M-100,280 C320,150 640,400 960,260 C1200,150 1380,300 1600,200 L1600,-100 L-100,-100 Z" />
        <path className="ajn-ribbon-path ajn-ribbon-path-2" fill="url(#buzzRibbonTwo)" d="M-100,650 C300,500 680,780 980,610 C1220,480 1400,640 1600,560 L1600,1000 L-100,1000 Z" />
        <path fill="none" stroke="rgba(255,255,255,.58)" strokeWidth="1.5" strokeDasharray="4 4" d="M-100,590 C300,440 680,720 980,550 C1220,420 1400,580 1600,500" />
      </svg>
      <div className="ajn-ambient-sheen" />
    </div>
  );
}
