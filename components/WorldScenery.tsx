"use client";

import { useId } from "react";
import PoeticScenery from "@/components/PoeticScenery";
import type { PoemId } from "@/lib/poetic-scenery";

// Full-stage original scenery; the functional books and paper slips are separate HTML.
export default function WorldScenery({ magic, poem }: { magic: boolean; poem: PoemId }) {
  const id = useId().replace(/:/g, "");
  if (!magic) return <div className="world-scenery scenery-poetry" aria-hidden="true"><PoeticScenery poem={poem} /></div>;
  const ref = (name: string) => `url(#${id}-${name})`;
  return (
    <div className="world-scenery scenery-archive" aria-hidden="true">
      <svg viewBox="0 0 1600 1050" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#07131c" /><stop offset="1" stopColor="#172622" /></linearGradient>
          <radialGradient id={`${id}-moon`}><stop stopColor="#adc6cb" stopOpacity=".4" /><stop offset="1" stopColor="#adc6cb" stopOpacity="0" /></radialGradient>
          <radialGradient id={`${id}-candle`}><stop stopColor="#ffe4a1" stopOpacity=".6" /><stop offset=".18" stopColor="#e7ac54" stopOpacity=".25" /><stop offset="1" stopColor="#e7ac54" stopOpacity="0" /></radialGradient>
          <linearGradient id={`${id}-wood`} x2="1" y2="0"><stop stopColor="#121a17" /><stop offset=".48" stopColor="#493c2b" /><stop offset=".6" stopColor="#665139" /><stop offset="1" stopColor="#1c221c" /></linearGradient>
          <linearGradient id={`${id}-floor`} x2="0" y2="1"><stop stopColor="#0b1719" /><stop offset="1" stopColor="#493d2b" /></linearGradient>
          <linearGradient id={`${id}-beam`} x2="0" y2="1"><stop stopColor="#b9d3d9" stopOpacity=".22" /><stop offset="1" stopColor="#b9d3d9" stopOpacity="0" /></linearGradient>
          <filter id={`${id}-grain`}><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="linear" slope=".12" /></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply" /></filter>
        </defs>
        <rect width="1600" height="1050" fill={ref("sky")} />
        <>
          <path d="M370 680V-70H1230V680Z" fill="#0a1720" />
          {[590, 800, 1010].map((x, n) => <g key={x}>
            <path d={`M${x-90} 528V188Q${x} ${n === 1 ? -88 : 15} ${x+90} 188V528Z`} fill="#223945" stroke="#706148" strokeWidth="7" />
            <path d={`M${x-77} 518V191Q${x} ${n === 1 ? -55 : 45} ${x+77} 191V518Z`} fill="#162d3e" stroke="#a087543d" strokeWidth="2" />
            <path d={`M${x} 40V528M${x-90} 262H${x+90}M${x-90} 395H${x+90}M${x-71} 133L${x} 262L${x+71} 133`} fill="none" stroke="#7c755b" strokeWidth="3" />
            {Array.from({ length: 14 }, (_, j) => <circle key={j} cx={x - 70 + j * 47 % 135} cy={114 + j * 71 % 370} r={j % 3 ? 1 : 2} fill="#d2e6e4" opacity=".45" />)}
            <path className="archive-moonbeam" d={`M${x-80} 405L${x-280} 1000H${x+215}L${x+70} 405Z`} fill={ref("beam")} />
          </g>)}
          <circle cx="820" cy="173" r="110" fill={ref("moon")} />
          <circle cx="820" cy="173" r="37" fill="#d2d6bb" /><circle cx="835" cy="161" r="35" fill="#162d3e" />
          <path d="M0 689H1600V1050H0Z" fill={ref("floor")} />
          <g stroke="#b8a273" strokeWidth="1" opacity=".12">
            {[0, 200, 400, 600, 800, 1000, 1200, 1400, 1600].map(x => <path key={x} d={`M800 570L${x} 1050`} />)}
            {[704, 737, 795, 877, 990].map(y => <path key={y} d={`M0 ${y}H1600`} />)}
          </g>
          {[false, true].map(right => <g key={String(right)} transform={right ? "translate(1600) scale(-1 1)" : undefined}>
            <path d="M0 0H346L469 114V684L326 853H0Z" fill="#141c18" />
            {Array.from({ length: 6 }, (_, row) => <g key={row}>
              <path d={`M0 ${45+row*115}L348 ${68+row*100}L430 ${125+row*88}V${134+row*88}L344 ${79+row*100}L0 ${58+row*115}Z`} fill="#695237" />
              {Array.from({ length: 19 }, (_, col) => {
                const x = col * 18 + 4;
                const y = 39 + row * 114 + col * .95;
                const height = 62 + (col * 13 + row * 7) % 33;
                return <g key={col} transform={`translate(${x} ${y-height}) rotate(${col%5===0 ? -4 : 0})`}>
                  <rect width="14" height={height} rx="1" fill={["#554d31", "#38483a", "#573a31", "#2c4047", "#69563e"][(col+row)%5]} />
                  <path d={`M2 8H12M2 12H12M2 ${height-9}H12`} stroke="#c0a46a" strokeWidth="1" opacity=".5" />
                  <rect x="4" y="24" width="6" height="17" fill="none" stroke="#aa966154" />
                </g>;
              })}
            </g>)}
            {[18, 340, 430].map((x, n) => <g key={x}><path d={`M${x} 0L${x+n*9} 875L${x+24+n*7} 860L${x+21} 0Z`} fill={ref("wood")} /><path d={`M${x+6} 0L${x+10+n*9} 861`} stroke="#b3995e" opacity=".2" /></g>)}
            <path d="M0 0H340L475 110" stroke="#8b7047" strokeWidth="13" fill="none" />
          </g>)}
          <path d="M378 0Q800 202 1222 0M424 0Q800 122 1176 0" fill="none" stroke="#907b4a" opacity=".27" strokeWidth="3" />
          <g transform="translate(800 306)" fill="none" stroke="#b8a064" className="archive-celestial">
            <circle r="116" opacity=".27" /><circle r="110" opacity=".2" /><ellipse rx="148" ry="36" transform="rotate(-22)" opacity=".45" /><ellipse rx="46" ry="120" transform="rotate(25)" opacity=".4" />
            {Array.from({length:24},(_,n)=><path key={n} d="M0 -110V-116M-3 -123L0 -127L3 -123" transform={`rotate(${n*15})`} opacity=".45" />)}
            <circle r="11" fill="#dbbc75" fillOpacity=".3" />
          </g>
          {[{x:479,y:218},{x:1115,y:176},{x:572,y:360},{x:1048,y:390},{x:706,y:101},{x:918,y:64}].map(({x,y},n) => <g className={`archive-floating-candle candle-${n%3}`} key={x}>
            <circle cx={x} cy={y} r="60" fill={ref("candle")} /><path d={`M${x-3} ${y}H${x+3}V${y+30}H${x-3}Z`} fill="#dbd1ae" />
            <path className="scene-flame" d={`M${x} ${y-19}Q${x+8} ${y-6} ${x} ${y-2}Q${x-7} ${y-8} ${x} ${y-19}Z`} fill="#ffe5a4" />
          </g>)}
          <g fill="#d7b676" className="archive-motes">{Array.from({length:30},(_,n)=><circle key={n} cx={280+n*113%1050} cy={50+n*97%900} r={n%3===0?1.8:1} opacity={.1+n%4*.07} />)}</g>
          <ellipse cx="800" cy="1010" rx="530" ry="110" fill="#9b734121" />
        </>
        <rect width="1600" height="1050" fill="#191a1208" filter={ref("grain")} opacity=".25" />
      </svg>
    </div>
  );
}
