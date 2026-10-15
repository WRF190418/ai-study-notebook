"use client";

import { useId } from "react";

// Original full-stage vectors: scene only; real course navigation remains accessible HTML.
export default function HomeScenery({ kind }: { kind: "study" | "forest" | "atlas" }) {
  const id = useId().replace(/:/g, "");
  const ref = (name: string) => `url(#${id}-${name})`;
  return <div className={`world-scenery room-scenery scenery-${kind}`} aria-hidden="true"><svg viewBox="0 0 1600 1050" preserveAspectRatio="xMidYMid slice" focusable="false"><defs>
    <linearGradient id={`${id}-room`} x2="0" y2="1"><stop stopColor={kind === "study" ? "#28231f" : kind === "forest" ? "#c6d6c4" : "#060d21"} /><stop offset="1" stopColor={kind === "study" ? "#4d3828" : kind === "forest" ? "#526f58" : "#101d3c"} /></linearGradient>
    <radialGradient id={`${id}-light`}><stop stopColor={kind === "study" ? "#f8d18a" : kind === "forest" ? "#f7f5ce" : "#6971bd"} stopOpacity=".5" /><stop offset="1" stopColor={kind === "study" ? "#edbd70" : kind === "forest" ? "#e0eed7" : "#5362ad"} stopOpacity="0" /></radialGradient>
    <linearGradient id={`${id}-lamp`} x2="0" y2="1"><stop stopColor="#ffd993" stopOpacity=".3" /><stop offset="1" stopColor="#ffd993" stopOpacity="0" /></linearGradient>
    <linearGradient id={`${id}-path`} x2="0" y2="1"><stop stopColor="#e4dfbb" stopOpacity=".15" /><stop offset="1" stopColor="#dbd4a9" stopOpacity=".5" /></linearGradient>
  </defs><rect width="1600" height="1050" fill={ref("room")} />
  {kind === "study" && <>
    <path d="M0 0H1600V730H0Z" fill="#2a251f" />
    {[70,285,500,715,930,1145,1360,1575].map(x=><path key={x} d={`M${x} 0V730`} stroke="#ae8d5c" opacity=".065" />)}
    <path d="M62 125H588V660H62Z" fill="#101c25" stroke="#6b543a" strokeWidth="14" /><path d="M324 124V660M62 367H588" stroke="#6b543a" strokeWidth="10" />
    <circle cx="540" cy="244" r="32" fill="#d8d7bd" opacity=".7" /><circle cx="550" cy="235" r="29" fill="#101c25" />
    {[0,1,2,3,4,5,6,7,8].map(n=><circle key={n} cx={95+n*83%460} cy={160+n*67%420} r={n%3?1:1.7} fill="#c2c8c7" opacity=".4" />)}
    <path d="M67 564L160 471L235 535L376 430L483 516L580 482V656H67Z" fill="#142127" />
    <path d="M0 737Q800 700 1600 737V1050H0Z" fill="#65462f" /><path d="M0 743Q800 710 1600 743" fill="none" stroke="#a28455" strokeWidth="3" opacity=".5" />
    {[783,840,910,1000].map(y=><path key={y} d={`M0 ${y}Q640 ${y-36} 1600 ${y-12}`} stroke="#b9955b" opacity=".08" fill="none" />)}
    <ellipse cx="475" cy="727" rx="330" ry="310" fill={ref("light")} />
    <path className="study-lamp-light" d="M370 590H570L742 1000H195Z" fill={ref("lamp")} />
    <path d="M361 591L435 480H504L579 591Z" fill="#967445" stroke="#bca170" strokeWidth="2" /><path d="M377 580L437 491H499L562 580Z" fill="#b49355" />
    <path d="M470 594V798M427 804H514" stroke="#be9c5e" strokeWidth="8" /><ellipse cx="470" cy="811" rx="65" ry="10" fill="#8c713f" />
    <rect x="90" y="848" width="128" height="21" rx="2" fill="#344638" /><path d="M104 851H208V863H104Z" fill="#c4b58e" /><rect x="75" y="873" width="157" height="18" rx="2" fill="#854e38" />
    <g className="scene-dust" fill="#f7d694">{Array.from({length:16},(_,n)=><circle key={n} cx={300+n*89%420} cy={440+n*67%380} r={n%4?1:1.8} opacity=".2" />)}</g>
  </>}
  {kind === "forest" && <>
    <circle cx="940" cy="230" r="390" fill={ref("light")} />
    <path d="M0 529L180 270L330 408L543 180L726 407L902 283L1122 435L1336 260L1600 490V1050H0Z" fill="#7f9b80" opacity=".38" />
    <path d="M0 709L197 532L410 624L609 410L853 637L1110 422L1421 591L1600 490V1050H0Z" fill="#547a62" opacity=".4" />
    <g opacity=".22" fill="#3b6350">{[180,290,470,720,1020,1170,1440].map((x,n)=><g key={x}><path d={`M${x} 110L${x+16} 950H${x-9}Z`} /><path d={`M${x} ${360+n*17}L${x-60} ${235+n*17}M${x} ${430+n*17}L${x+65} ${300+n*17}`} fill="none" stroke="#3b6350" strokeWidth="9" /><ellipse cx={x-45} cy={180+n*20} rx={85+n%3*12} ry="105" /><ellipse cx={x+45} cy={235+n*20} rx="68" ry="110" /><ellipse cx={x-28} cy={310+n*17} rx="91" ry="78" /></g>)}</g>
    <path className="forest-mist" d="M-100 520Q350 630 840 515T1700 545V680Q1210 610 720 691T-100 648Z" fill="#e8edda" opacity=".3" />
    <path d="M0 913Q240 754 520 858Q829 772 1065 853Q1365 721 1600 836V1050H0Z" fill="#315b44" opacity=".68" />
    <path d="M867 500Q718 645 927 738Q1100 817 780 1050H533Q961 796 781 727Q605 644 867 500Z" fill={ref("path")} />
    <g fill="#284e39"><path d="M-10 0H45L140 1050H76Z" /><path d="M1535 0H1580L1515 1050H1467Z" /><path d="M35 410Q110 360 160 250M1545 151Q1417 192 1345 18M74 653Q169 641 232 539" fill="none" stroke="#355a40" strokeWidth="17" /></g>
    <g fill="#466a46" opacity=".8">{Array.from({length:20},(_,n)=><ellipse key={n} cx={n%2?1450+n*27%155:20+n*31%290} cy={20+n*43%350} rx={24+n%4*9} ry="13" transform={`rotate(${n%2?30:-30} ${n%2?1450+n*27%155:20+n*31%290} ${20+n*43%350})`} />)}</g>
    <g className="forest-light-rays" fill="#fff4bd" opacity=".1"><path d="M1110 0L350 1050H510L1190 0Z" /><path d="M1230 0L700 1050H770L1280 0Z" /></g>
    <g fill="#c6d4a4" opacity=".5">{[55,110,1440,1490].map((x,n)=><g key={x} transform={`translate(${x} 1035) rotate(${n%2?20:-20})`}><path d="M0 0V-140M0 -35L-42 -78M0 -65L34 -111M0 -100L-25 -137" stroke="#94ac7c" strokeWidth="2" /><ellipse cx="-24" cy="-65" rx="25" ry="6" transform="rotate(42 -24 -65)" /><ellipse cx="20" cy="-93" rx="23" ry="6" transform="rotate(-45 20 -93)" /></g>)}</g>
  </>}
  {kind === "atlas" && <>
    <ellipse cx="1150" cy="590" rx="750" ry="620" fill={ref("light")} opacity=".5" /><ellipse cx="320" cy="770" rx="520" ry="400" fill={ref("light")} opacity=".28" />
    <path d="M1000 -100Q720 400 1280 1150" stroke="#7187b2" strokeWidth="140" opacity=".035" fill="none" />
    <g className="atlas-starlight" fill="#d5def8">{Array.from({length:130},(_,n)=><circle key={n} cx={17+n*137%1570} cy={23+n*83%1010} r={n%19===0?1.9:n%7===0?1.1:.6} opacity={.12+n%5*.09} />)}</g>
    <g transform="translate(325 680)" fill="none" stroke="#b8a36e"><circle r="210" opacity=".24" /><circle r="199" opacity=".12" /><circle r="146" strokeDasharray="1 13" opacity=".4" /><ellipse rx="246" ry="71" transform="rotate(-30)" opacity=".3" /><ellipse rx="72" ry="205" transform="rotate(22)" opacity=".2" /><path d="M-230 0H230M0 -230V230" opacity=".16" />{Array.from({length:48},(_,n)=><path key={n} transform={`rotate(${n*7.5})`} d={n%4?"M0 -202V-209":"M0 -196V-210"} opacity=".4" />)}<g className="home-orbit"><circle cx="0" cy="-210" r="4" fill="#cbb783" stroke="none" /></g><circle r="7" fill="#bca56f" opacity=".6" /></g>
    <path d="M57 880L139 820L221 891L302 849" fill="none" stroke="#8399c9" opacity=".13" />
  </>}
  </svg></div>;
}
