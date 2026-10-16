"use client";

import { useId } from "react";

// Original vector scenery, not a film still or a reproduction of a book jacket.
export default function GalacticScenery({ preview = false, event = 0 }: { preview?: boolean; event?: number }) {
  const id = useId().replace(/:/g, "");
  return <svg className={`guide-scenery${preview ? " guide-scenery-preview" : ""}`} viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-event={event}>
    <defs>
      <radialGradient id={`${id}-space`} cx="77%" cy="26%" r="75%"><stop stopColor={event % 2 ? "#3c454a" : "#2c4349"} /><stop offset=".5" stopColor="#14252e" /><stop offset="1" stopColor="#0b151d" /></radialGradient>
      <radialGradient id={`${id}-planet`} cx="25%" cy="20%"><stop stopColor="#abc2be" /><stop offset=".36" stopColor="#55757b" /><stop offset=".8" stopColor="#22343f" /><stop offset="1" stopColor="#14212b" /></radialGradient>
      <linearGradient id={`${id}-rim`} x2="0" y2="1"><stop stopColor="#6b7773" /><stop offset=".25" stopColor="#252f33" /><stop offset="1" stopColor="#0c171c" /></linearGradient>
    </defs>
    <rect width="1200" height="720" fill={`url(#${id}-space)`} />
    <g className="guide-distant-stars" fill="#e1e2cf">{Array.from({ length: 64 }, (_, n) => <circle key={n} cx={35 + n * 173 % 1150} cy={18 + n * 83 % 620} r={n % 13 === 0 ? 1.7 : .7} opacity={.16 + n % 5 * .1} />)}</g>
    <g className="guide-planet"><circle cx="1050" cy="130" r="208" fill={`url(#${id}-planet)`} /><path d="M865 36Q969 -33 1118 13" fill="none" stroke="#d6dbbb" strokeWidth="2" opacity=".5" /><ellipse cx="1050" cy="130" rx="290" ry="42" transform="rotate(-29 1050 130)" fill="none" stroke="#bac2a5" strokeWidth="8" opacity=".13" /></g>
    <path d="M-80 585Q-70 -240 1310 -70" fill="none" stroke="#050d13" strokeWidth="65" /><path d="M-80 585Q-70 -240 1310 -70" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="33" />
    <path d="M0 667Q680 630 1200 661V720H0Z" fill="#0a1217" /><path d="M0 668Q680 631 1200 662" fill="none" stroke="#a5a78b" strokeOpacity=".16" />
    {!preview && <g className="guide-unlikely-object" key={event} transform={event % 3 === 1 ? "translate(755 155) rotate(-12)" : event % 3 === 2 ? "translate(765 155) rotate(8)" : "translate(765 155) rotate(-8)"}>
      {event % 3 === 1 ? <><path d="M-50 0Q-30 -35 20 -18L61 -29L48 -1L67 10L30 15Q-13 43 -50 0Z" fill="#829da2" opacity=".5" /><path d="M-26 9L-36 27L-6 19" fill="#829da2" opacity=".5" /><circle cx="-31" cy="-3" r="2" fill="#d8dfc9" /></> : event % 3 === 2 ? <><path d="M-17 0H18L12 25H-12Z" fill="#a8886c" /><path d="M0 0V-36M0 -15Q-29 -43 -25 -17M0 -24Q29 -51 24 -23" fill="none" stroke="#9aa78a" strokeWidth="3" /><path d="M-30 28Q0 39 30 29" fill="none" stroke="#d3c2a0" opacity=".3" /></> : <><rect x="-23" y="-20" width="46" height="53" rx="3" fill="#9eaa94" opacity=".22" /><path d="M-16 -12V26M-8 -12V26M0 -12V26M8 -12V26M16 -12V26" stroke="#bdc5a9" opacity=".15" /></>}
    </g>}
    {preview && <g transform="translate(180 225) rotate(-7 420 170)"><rect width="820" height="350" rx="24" fill="#192326" stroke="#788477" strokeWidth="5" /><rect x="28" y="27" width="764" height="287" rx="8" fill="#e9e3cc" /><path d="M404 27V314" stroke="#b2af98" /><text x="65" y="91" fontSize="15" letterSpacing="5" fill="#637164">THE GUIDE</text><text x="65" y="164" fontSize="44" fontWeight="700" fill="#34443a">DON’T</text><text x="65" y="214" fontSize="44" fontWeight="700" fill="#34443a">PANIC.</text><path d="M445 82H738M445 112H688M445 160H738M445 190H705M445 238H738" stroke="#9a9e86" strokeWidth="5" /><circle cx="757" cy="332" r="5" fill="#c0a674" /></g>}
  </svg>;
}
