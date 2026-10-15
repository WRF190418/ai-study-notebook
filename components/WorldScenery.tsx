"use client";

import { useId } from "react";

// Full-stage original scenery; the functional books and paper slips are separate HTML.
export default function WorldScenery({ magic, poem }: { magic: boolean; poem: string }) {
  const id = useId().replace(/:/g, "");
  const ref = (name: string) => `url(#${id}-${name})`;
  const palette = ({ devotion: ["#d2d5d4", "#a7b4b3"], journey: ["#f2ecdc", "#b7c9a9"], courage: ["#f3ddba", "#9cafa7"], freedom: ["#d7e0dc", "#9db6ac"], repose: ["#eeeae2", "#c5cfc4"] } as Record<string, string[]>)[poem] ?? ["#eae7dc", "#c9cdbb"];
  return (
    <div className={`world-scenery ${magic ? "scenery-archive" : "scenery-poetry"}`} aria-hidden="true">
      <svg viewBox="0 0 1600 1050" preserveAspectRatio="xMidYMid slice" focusable="false">
        <defs>
          <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor={magic ? "#07131c" : palette[0]} /><stop offset="1" stopColor={magic ? "#172622" : palette[1]} /></linearGradient>
          <linearGradient id={`${id}-water`} x2="0" y2="1"><stop stopColor="#aebbb1" stopOpacity=".15" /><stop offset="1" stopColor="#ece9d9" /></linearGradient>
          <linearGradient id={`${id}-fog`} x2="0" y2="1"><stop stopColor="#eeecdf" stopOpacity="0" /><stop offset=".5" stopColor="#eeecdf" stopOpacity=".85" /><stop offset="1" stopColor="#eeecdf" stopOpacity="0" /></linearGradient>
          <radialGradient id={`${id}-moon`}><stop stopColor={magic ? "#adc6cb" : "#fff9e4"} stopOpacity=".4" /><stop offset="1" stopColor={magic ? "#adc6cb" : "#fff9e4"} stopOpacity="0" /></radialGradient>
          <radialGradient id={`${id}-candle`}><stop stopColor="#ffe4a1" stopOpacity=".6" /><stop offset=".18" stopColor="#e7ac54" stopOpacity=".25" /><stop offset="1" stopColor="#e7ac54" stopOpacity="0" /></radialGradient>
          <linearGradient id={`${id}-wood`} x2="1" y2="0"><stop stopColor="#121a17" /><stop offset=".48" stopColor="#493c2b" /><stop offset=".6" stopColor="#665139" /><stop offset="1" stopColor="#1c221c" /></linearGradient>
          <linearGradient id={`${id}-floor`} x2="0" y2="1"><stop stopColor="#0b1719" /><stop offset="1" stopColor="#493d2b" /></linearGradient>
          <linearGradient id={`${id}-beam`} x2="0" y2="1"><stop stopColor="#b9d3d9" stopOpacity=".22" /><stop offset="1" stopColor="#b9d3d9" stopOpacity="0" /></linearGradient>
          <filter id={`${id}-grain`}><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /><feComponentTransfer><feFuncA type="linear" slope=".12" /></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply" /></filter>
          <filter id={`${id}-soft`}><feGaussianBlur stdDeviation="14" /></filter>
        </defs>
        <rect width="1600" height="1050" fill={ref("sky")} />
        {magic ? <>
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
        </> : <>
          <circle cx="1105" cy="208" r="167" fill={ref("moon")} /><circle cx="1105" cy="208" r="45" fill="#fff9e4" opacity=".85" />
          <g className="poem-far-mountains" fill="#9aa89f" opacity=".4">
            <path d="M500 580Q600 470 659 441Q706 420 770 313Q811 246 858 383Q889 423 937 353Q967 310 1012 420Q1054 427 1097 345Q1154 266 1216 389Q1281 350 1334 436Q1412 371 1512 489L1600 470V760H500Z" />
            <path d="M-80 586Q32 413 110 485Q157 358 201 403Q239 455 290 409Q335 364 391 501Q445 447 532 558V770H0Z" opacity=".65" />
          </g>
          <path d="M0 694Q141 629 236 644Q372 502 445 552Q498 489 542 580Q631 547 671 630Q772 601 853 562Q914 492 989 589Q1046 536 1091 573Q1171 491 1240 554Q1292 506 1361 615Q1486 535 1600 623V920H0Z" fill="#768e80" opacity=".45" />
          <g className="poem-drifting-mist" filter={ref("soft")}><path d="M0 545Q417 681 851 580T1600 588V700Q1193 635 801 687T0 680Z" fill={ref("fog")} /><ellipse cx="1170" cy="550" rx="370" ry="33" fill="#eeecdf" opacity=".5" /></g>
          <path d="M0 757Q232 685 409 736Q561 682 714 758Q948 700 1100 746Q1334 655 1600 734V1050H0Z" fill={ref("water")} />
          <g fill="none" stroke="#6e8b7e" opacity=".2"><path d="M20 815Q263 778 465 814M977 782Q1217 748 1595 795M430 875Q675 830 949 864M1104 925Q1360 891 1600 917M0 974Q305 929 599 973" /><path d="M931 816Q1093 798 1235 817M70 867Q146 854 231 867" /></g>
          <path d="M-70 892Q71 795 212 849Q282 818 358 848Q419 882 486 872L361 915L230 950H-70Z" fill="#546d60" opacity=".78" />
          <path d="M-40 884Q125 824 257 871Q359 858 415 881" fill="none" stroke="#b8bda3" strokeWidth="5" opacity=".7" />
          <g stroke="#465d4d" fill="none">
            <path d="M74 868Q116 701 91 599Q75 551 36 523M93 665Q129 602 154 577M94 739Q47 681 14 674" strokeWidth="7" />
            <path d="M37 523Q48 682 3 724M57 542Q92 668 49 785M154 577Q178 680 139 753M139 605Q153 729 109 797M11 673Q17 775 -8 807" strokeWidth="1.4" opacity=".6" />
          </g>
          <g fill="#668268" opacity=".55">{Array.from({length:32},(_,n)=><ellipse key={n} cx={2+n*29%165} cy={560+n*47%228} rx="3" ry="10" transform={`rotate(${n%2?25:-25} ${2+n*29%165} ${560+n*47%228})`} />)}</g>
          <g className={`world-poem-layer ${poem === "longing" ? "present" : ""}`}>
            <path d="M1370 -20Q1401 47 1518 85Q1560 111 1600 194M1495 75Q1428 89 1398 132M1469 64Q1522 35 1577 38" stroke="#5c6350" fill="none" strokeWidth="4" />
            {[[1447,93],[1410,121],[1515,90],[1568,41],[1540,60]].map(([x,y])=><g key={x}><path d={`M${x} ${y-9}V${y+9}`} stroke="#77715b" /><ellipse cx={x} cy={y+12} rx="5" ry="7" fill="#a34d3e" /></g>)}
            <g transform="translate(265 836) rotate(-7)"><path d="M0 0H86V50H0Z" fill="#f3ead2" stroke="#ac9b79" /><path d="M0 0L43 25L86 0" fill="none" stroke="#ac9b79" /><circle cx="43" cy="25" r="5" fill="#a34d3e" /></g>
          </g>
          <g className={`world-poem-layer ${poem === "devotion" ? "present" : ""}`}>
            <path d="M1263 697V621H1350V697M1248 623L1307 583L1366 623Z" fill="#526155" /><rect x="1293" y="638" width="24" height="36" fill="#e8c184" /><circle cx="1305" cy="653" r="65" fill={ref("candle")} />
          </g>
          <g className={`world-poem-layer ${poem === "courage" ? "present" : ""}`} transform="translate(1170 735)"><path d="M-38 58Q5 76 55 56L35 79H-17Z" fill="#435f5d" /><path d="M8 61V-67L-43 46H4M14 -48L54 43H14" fill="#ede9d9" stroke="#789186" strokeWidth="1.5" /></g>
          <g className={`world-poem-layer ${poem === "journey" || poem === "freedom" || poem === "repose" ? "present" : ""}`} transform="translate(251 846)"><path d="M0 0L-6 -32L9 -40L19 -9M1 -31L-16 -18M12 -30L24 -20M17 -6L28 4M0 0L-10 8" fill="#55634e" stroke="#45533e" strokeWidth="2" /><path d="M-8 -37L4 -52L22 -36Z" fill="#8a8a65" /><path d="M31 7L37 -33" stroke="#6f7252" strokeWidth="2" /></g>
          <path d="M0 1010Q388 988 681 1027T1600 1005V1050H0Z" fill="#b7bda21a" />
        </>}
        <rect width="1600" height="1050" fill={magic ? "#191a1208" : "#c0b79306"} filter={ref("grain")} opacity={magic ? ".25" : ".45"} />
      </svg>
    </div>
  );
}
