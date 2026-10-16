"use client";

import { useId } from "react";

// Original vector scenery, not a film still or a reproduction of a book jacket.
export default function GalacticScenery({ preview = false, event = 0, scene = 0 }: { preview?: boolean; event?: number; scene?: number }) {
  const id = useId().replace(/:/g, "");
  return <svg className={`guide-scenery${preview ? " guide-scenery-preview" : ""}`} viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-event={event} data-scene={scene}>
    <defs>
      <radialGradient id={`${id}-space`} cx="77%" cy="26%" r="75%"><stop stopColor="#3a3630" /><stop offset=".5" stopColor="#172226" /><stop offset="1" stopColor="#0b1419" /></radialGradient>
      <radialGradient id={`${id}-planet`} cx="22%" cy="30%"><stop stopColor="#c0b38b" /><stop offset=".28" stopColor="#8c896b" /><stop offset=".6" stopColor="#444c40" /><stop offset=".82" stopColor="#252f2c" /><stop offset="1" stopColor="#0c171c" /></radialGradient>
      <clipPath id={`${id}-planet-clip`}><circle cx="1150" cy="100" r="385" /></clipPath>
      <linearGradient id={`${id}-rim`} x2="0" y2="1"><stop stopColor="#6b7773" /><stop offset=".25" stopColor="#252f33" /><stop offset="1" stopColor="#0c171c" /></linearGradient>
    </defs>
    <rect width="1200" height="720" fill={`url(#${id}-space)`} />
    <g className="guide-distant-stars" fill="#e1e2cf">{Array.from({ length: 64 }, (_, n) => <circle key={n} cx={35 + n * 173 % 1150} cy={18 + n * 83 % 620} r={n % 13 === 0 ? 1.7 : .7} opacity={.16 + n % 5 * .1} />)}</g>
    <g className="guide-planet"><circle cx="1150" cy="100" r="386" fill="#a3a78a" opacity=".22" /><circle cx="1150" cy="100" r="385" fill={`url(#${id}-planet)`} /><g clipPath={`url(#${id}-planet-clip)`} fill="none" stroke="#c9bc90" opacity=".08"><path d="M780 -50Q920 145 1410 90" strokeWidth="18" /><path d="M760 60Q920 245 1470 170" strokeWidth="34" /><path d="M780 160Q920 340 1450 300" strokeWidth="12" /></g><path d="M-30 501Q650 550 1290 -70" fill="none" stroke="#c8ba8c" strokeWidth="1" opacity=".2" /><circle cx="473" cy="447" r="3" fill="#ddd0a4" opacity=".7" /></g>
    <path d="M-80 585Q-70 -240 1310 -70" fill="none" stroke="#050d13" strokeWidth="65" /><path d="M-80 585Q-70 -240 1310 -70" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="33" />
    <path d="M0 667Q680 630 1200 661V720H0Z" fill="#0a1217" /><path d="M0 668Q680 631 1200 662" fill="none" stroke="#a5a78b" strokeOpacity=".16" />
    {!preview && <g className="guide-unlikely-object" key={scene} transform={scene === 1 ? "translate(1035 465) rotate(-12) scale(.7)" : scene === 2 ? "translate(1035 465) rotate(8) scale(.75)" : "translate(1035 465) rotate(-8) scale(.7)"}>
      {scene === 1 ? <><path d="M-50 0Q-30 -35 20 -18L61 -29L48 -1L67 10L30 15Q-13 43 -50 0Z" fill="#829da2" opacity=".65" /><path d="M-26 9L-36 27L-6 19" fill="#829da2" opacity=".65" /><circle cx="-31" cy="-3" r="2" fill="#d8dfc9" /></> : scene === 2 ? <><path d="M-17 0H18L12 25H-12Z" fill="#a8886c" /><path d="M0 0V-36M0 -15Q-29 -43 -25 -17M0 -24Q29 -51 24 -23" fill="none" stroke="#9aa78a" strokeWidth="3" /><path d="M-30 28Q0 39 30 29" fill="none" stroke="#d3c2a0" opacity=".3" /></> : <><rect x="-23" y="-20" width="46" height="53" rx="3" fill="#9eaa94" opacity=".22" /><path d="M-16 -12V26M-8 -12V26M0 -12V26M8 -12V26M16 -12V26" stroke="#bdc5a9" opacity=".15" /></>}
    </g>}
    {preview && <g transform="translate(350 105) rotate(-9 200 260)"><path d="M-22 14L0 0V510L-22 523Z" fill="#344242" /><rect width="400" height="510" rx="12" fill="#18262d" stroke="#7f8976" strokeWidth="3" /><rect x="25" y="24" width="350" height="462" rx="4" fill="none" stroke="#798574" strokeOpacity=".3" /><text x="45" y="80" fontSize="13" letterSpacing="4" fill="#abb79c">THE GUIDE</text><text x="43" y="220" fontSize="73" fontWeight="900" fill="#e4dd9c">DON’T</text><text x="43" y="294" fontSize="73" fontWeight="900" fill="#e4dd9c">PANIC.</text><path d="M45 335H352" stroke="#929b7c" strokeOpacity=".6" /><text x="45" y="388" fontSize="14" letterSpacing="3" fill="#b4b69a">PERSONAL FIELD COPY</text><rect x="276" y="414" width="73" height="46" fill="#b4ad82" /><text x="289" y="445" fontSize="25" fill="#24342e">0042</text></g>}
  </svg>;
}
