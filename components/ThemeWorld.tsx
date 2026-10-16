"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { UserPreferences } from "@/lib/types";
import { poeticScenes, themeOptions } from "@/lib/themes";
import PoeticScenery from "@/components/PoeticScenery";
import GalacticScenery from "@/components/GalacticScenery";

const POEM_DURATION = 96_000;

export function usePoeticFlow(enabled: boolean, userId: string, persist = true) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [transition, setTransition] = useState<"flow" | "manual">("flow");
  const remaining = useRef(POEM_DURATION);
  const revision = useRef(0);
  const personalPoem = useRef<{ index: number; held: boolean } | null>(null);
  const restoringPoem = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`study-poetic-flow:${userId}`) ?? "null");
      if (Number.isInteger(saved?.index) && saved.index >= 0 && saved.index < poeticScenes.length) setIndex(saved.index);
      setHeld(typeof saved?.held === "boolean" ? saved.held : matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch { /* A private browser session can still enjoy the theme. */ }
    setReady(true);
    const visibility = () => setVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, [userId]);

  useEffect(() => {
    if (!persist && !personalPoem.current) personalPoem.current = { index, held };
    if (persist && personalPoem.current) {
      const previous = personalPoem.current; personalPoem.current = null;
      restoringPoem.current = true; setIndex(previous.index); setHeld(previous.held);
    }
  }, [persist]);

  useEffect(() => {
    if (!ready || !persist) return;
    if (restoringPoem.current) { restoringPoem.current = false; return; }
    try { localStorage.setItem(`study-poetic-flow:${userId}`, JSON.stringify({ index, held })); } catch { /* Optional persistence. */ }
  }, [held, index, ready, userId, persist]);

  useEffect(() => {
    if (!ready || !enabled || held || !visible) return;
    const started = performance.now();
    const cycle = revision.current;
    let completed = false;
    const timer = window.setTimeout(() => {
      completed = true;
      remaining.current = POEM_DURATION;
      setTransition("flow");
      setIndex((current) => (current + 1) % poeticScenes.length);
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (!completed && cycle === revision.current) remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [enabled, held, index, ready, visible]);

  function next() {
    revision.current += 1;
    remaining.current = POEM_DURATION;
    setTransition("manual");
    setIndex(current => (current + 1) % poeticScenes.length);
  }
  return { index, held, transition, next, toggleHeld: () => setHeld((current) => !current) };
}

export function PoetryPassage({ index, held, onToggle, onNext }: { index: number; held: boolean; onToggle: () => void; onNext: () => void }) {
  return (
    <div className="poetry-passage">
      <button type="button" className="poetry-verses" aria-label="换一句诗" title="点击诗句，换一境" onClick={onNext}>
        {poeticScenes.map((poem, poemIndex) => (
          <div className={`poetry-verse${index === poemIndex ? " present" : ""}`} aria-hidden={index !== poemIndex} key={poem.id}>
            <p>{poem.verse[0]}<br />{poem.verse[1]}</p>
            <span>{poem.author} ·《{poem.title}》</span>
          </div>
        ))}
      </button>
      <button aria-pressed={held} className="poetry-hold" onClick={onToggle} type="button" title={held ? "继续诗境的缓慢流转" : "让此刻的诗与景暂时停留"}>
        {held ? <Play size={12} /> : <Pause size={12} />}
        {held ? "继续流转" : "留住此境"}
      </button>
    </div>
  );
}

// Original vector scenes stay crisp at any desktop size and require no remote assets.
export default function ThemeLandscape({ theme, poemIndex = 0, preview = false }: {
  theme: UserPreferences["theme"]; poemIndex?: number; preview?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const gradient = `${id}-light`;
  const halo = `${id}-halo`;
  const glow = theme === "warm-study" ? "#edb75d" : theme === "midnight-atlas" ? "#5263ab" : theme === "cognitive-lab" ? "#3acef0" : "#f7c875";
  const scene = poeticScenes[poemIndex];
  const name = themeOptions.find((item) => item.id === theme)?.name;
  if (theme === "galactic-guide") return <span className="theme-landscape landscape-galactic-guide" aria-hidden="true"><GalacticScenery preview /></span>;
  if (theme === "poetic-realm") return (
    <span className={`theme-landscape landscape-poetic-realm${preview ? " landscape-preview" : ""}`} aria-hidden="true">
      <PoeticScenery poem={scene.id} />
      {!preview && <span className="landscape-caption">{scene.image}</span>}
    </span>
  );
  return (
    <span className={`theme-landscape landscape-${theme}${preview ? " landscape-preview" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 600 460" preserveAspectRatio="xMidYMid meet" focusable="false">
        <defs>
          <radialGradient id={halo}><stop stopColor={glow} stopOpacity=".65" /><stop offset="1" stopColor={glow} stopOpacity="0" /></radialGradient>
          <linearGradient id={gradient} x1="0" y1="0" x2=".5" y2="1"><stop stopColor={glow} stopOpacity=".65" /><stop offset="1" stopColor={glow} stopOpacity="0" /></linearGradient>
        </defs>
        {theme === "warm-study" && <>
          <rect width="600" height="460" fill="#30261f" />
          <path d="M75 335V48Q190 -12 305 48V335Z" fill="#1b2931" stroke="#826240" strokeWidth="9" />
          <path d="M190 15V335M75 145H305" stroke="#826240" strokeWidth="7" />
          <circle cx="235" cy="86" r="24" fill="#efdab0" opacity=".8" />
          <path d="M80 285L120 230L155 255L203 212L260 276L300 249V330H80Z" fill="#101f25" />
          {[110, 159, 200, 270].map((x, i) => <circle key={x} cx={x} cy={60 + i * 30} r="1.4" fill="#f3dfb2" />)}
          <rect x="355" y="38" width="192" height="283" rx="5" fill="#221b18" stroke="#654b32" strokeWidth="5" />
          {[100, 177, 253].map((y, row) => <g key={y}><path d={`M360 ${y}H542`} stroke="#81613d" strokeWidth="7" />{[0, 1, 2, 3, 4, 5, 6].map((col) => <g key={col} transform={`translate(${370 + col * 23} ${y - 55}) rotate(${col % 3 === 0 ? -6 : 0})`}><rect width="17" height="52" rx="2" fill={["#75513c", "#374b40", "#795e38", "#5b3434"][(col + row) % 4]} /><path d="M3 8H14M3 43H14" stroke="#c3a069" opacity=".7" /></g>)}</g>)}
          <ellipse cx="380" cy="324" rx="190" ry="145" fill={`url(#${halo})`} color="#edb75d" />
          <path d="M0 358Q290 330 600 358V460H0Z" fill="#6c4930" /><path d="M0 367Q290 340 600 367" fill="none" stroke="#b08b52" />
          <path d="M310 217L392 123L458 217Z" fill="#b88a44" stroke="#edc77a" strokeWidth="2" />
          <path d="M320 214L450 214L505 364H263Z" fill={`url(#${gradient})`} color="#ffd782" opacity=".6" />
          <path d="M390 218V345M362 349H420" stroke="#d3a75d" strokeWidth="7" />
          <ellipse cx="391" cy="353" rx="39" ry="7" fill="#b48a4c" />
          <path d="M128 373Q194 348 255 370Q315 348 376 373L362 416Q309 396 253 414Q191 396 139 416Z" fill="#f4e5c6" stroke="#bea67d" strokeWidth="2" />
          <path d="M255 371L253 411M155 378L224 376M152 387L224 385M282 377L350 381M281 387L347 391" fill="none" stroke="#a28a67" />
          <rect x="453" y="373" width="67" height="15" rx="3" fill="#41513d" /><rect x="442" y="390" width="83" height="13" rx="3" fill="#8c543c" />
          <g className="scene-dust" fill="#ffe1a3">{[0,1,2,3,4,5,6,7].map((n) => <circle key={n} cx={285 + n * 29} cy={145 + (n * 47) % 170} r={n % 2 ? 1.2 : 2} opacity=".45" />)}</g>
        </>}
        {theme === "mist-forest" && <>
          <rect width="600" height="460" fill="#c4dcd0" />
          <circle cx="398" cy="119" r="61" fill="#f9f6d9" opacity=".8" />
          <path d="M0 220L96 97L190 175L280 74L399 196L515 123L600 189V460H0Z" fill="#98b8a7" />
          <path d="M0 294L122 200L232 259L351 168L471 249L600 201V460H0Z" fill="#668f7e" />
          <g className="scene-mist"><ellipse cx="235" cy="240" rx="300" ry="28" fill="#e8f3e9" opacity=".5" /><ellipse cx="414" cy="316" rx="300" ry="25" fill="#f4f7ec" opacity=".4" /></g>
          <path d="M0 373Q200 298 303 357T600 313V460H0Z" fill="#315f51" />
          <path d="M325 293Q204 345 356 380T250 460" fill="none" stroke="#c4dcd0" strokeWidth="17" opacity=".55" />
          <path d="M44 0L87 460M542 0L502 460M18 18L579 26" stroke="#26493c" strokeWidth="19" />
          <path d="M59 129Q153 118 194 48M532 70Q449 90 412 24M63 229Q114 199 137 160" stroke="#355c47" strokeWidth="8" fill="none" />
          <g fill="#456d52">{[[112,106,-25],[148,79,-30],[180,53,-30],[486,78,20],[447,61,40],[113,190,-38]].map(([x,y,r]) => <ellipse key={x} cx={x} cy={y} rx="25" ry="9" transform={`rotate(${r} ${x} ${y})`} />)}</g>
          <path d="M0 437H600" stroke="#b1a77e" strokeWidth="18" />
          <path d="M426 426L413 380H470L457 426Z" fill="#b29a73" /><path d="M440 381Q407 341 400 300M441 380Q460 334 482 319M440 379V294" stroke="#346044" strokeWidth="4" fill="none" />
          <g fill="#497c54"><ellipse cx="409" cy="328" rx="12" ry="29" transform="rotate(-40 409 328)" /><ellipse cx="471" cy="338" rx="11" ry="28" transform="rotate(35 471 338)" /><ellipse cx="440" cy="314" rx="10" ry="29" /></g>
          <path className="scene-sunbeam" d="M380 0L285 410H390L465 0Z" fill="#fff7c9" opacity=".09" />
        </>}
        {theme === "midnight-atlas" && <>
          <rect width="600" height="460" fill="#0b1428" />
          <ellipse cx="350" cy="210" rx="250" ry="200" fill={`url(#${halo})`} color="#5263ab" opacity=".65" />
          <g fill="#d4e0ff">{Array.from({length:42}, (_,n) => <circle key={n} cx={25 + (n * 137) % 560} cy={20 + (n * 83) % 420} r={n % 7 === 0 ? 2 : 1} opacity={.3 + n % 4 * .15} />)}</g>
          <g transform="translate(316 225)" fill="none" stroke="#bfa466"><circle r="148" opacity=".7" /><circle r="136" opacity=".3" /><circle r="99" opacity=".4" strokeDasharray="2 9" /><ellipse rx="192" ry="65" transform="rotate(-30)" opacity=".6" /><path d="M-172 0H172M0 -172V172" opacity=".35" /><g className="scene-orbit"><ellipse rx="45" ry="148" transform="rotate(26)" opacity=".45" /><circle cx="0" cy="-148" r="5" fill="#e9c983" /></g><path d="M-68 -56L15 -87L74 -6L22 69L-68 -56" stroke="#9ab5ef" opacity=".6" />{[[-68,-56],[15,-87],[74,-6],[22,69]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="4" fill="#d3dfff" stroke="none" />)}</g>
          <text x="316" y="49" fill="#bfa466" textAnchor="middle" fontSize="12" letterSpacing="7">N</text>
        </>}
        {theme === "cognitive-lab" && <>
          <rect width="600" height="460" fill="#0c2639" />
          <path d="M0 350H600M0 380H600M0 425H600M300 280L0 460M300 280L130 460M300 280L300 460M300 280L470 460M300 280L600 460" stroke="#3d91ad" opacity=".3" />
          <ellipse cx="315" cy="246" rx="210" ry="180" fill={`url(#${halo})`} color="#3acef0" opacity=".3" />
          <g className="scene-prism"><path d="M310 86L415 268L306 329L202 268Z" fill="#68deed" fillOpacity=".1" stroke="#82eff9" strokeWidth="1.5" /><path d="M310 86L306 329L202 268Z" fill="#a6f7ff" fillOpacity=".13" /><path d="M310 86L306 242L415 268M306 242L202 268M306 242V329" fill="none" stroke="#7adef1" opacity=".6" /><path d="M72 233L275 226L514 137" stroke="#e8faff" strokeWidth="2" fill="none" /><path d="M301 230L527 227M319 237L508 310" stroke="#52cfdf" fill="none" /><path d="M315 231L521 180" stroke="#b999f5" fill="none" /></g>
          <g fill="none" stroke="#5aafc7" opacity=".7"><rect x="55" y="83" width="121" height="77" rx="5" /><path d="M69 103H114M69 115H155M69 128H139M69 143H154" /><rect x="436" y="306" width="114" height="81" rx="5" /><path d="M450 368L467 341L484 351L504 321L535 336M450 374H536" /><circle cx="471" cy="102" r="25" /><path d="M445 102H497M471 76V128" /></g>
          <g className="scene-scan"><path d="M160 350Q308 394 456 350" fill="none" stroke="#84f3fa" opacity=".65" /><ellipse cx="309" cy="352" rx="147" ry="34" fill="none" stroke="#43c8df" opacity=".3" /></g>
          <text x="62" y="410" fill="#67b4cf" fontSize="10" letterSpacing="4">COGNITION / OPTICS / DISCOVERY</text>
        </>}
        {theme === "arcane-library" && <>
          <rect width="600" height="460" fill="#161d25" />
          <path d="M162 362V143Q300 -54 438 143V362Z" fill="#142c3c" stroke="#94723e" strokeWidth="8" />
          <path d="M178 350V146Q300 -28 422 146V350Z" fill="none" stroke="#c1a263" opacity=".5" />
          <path d="M300 3V354M165 190H435M172 280H428M212 77L300 190L388 77" fill="none" stroke="#94723e" strokeWidth="4" />
          <circle cx="348" cy="127" r="30" fill="#ded3b1" /><circle cx="360" cy="117" r="29" fill="#142c3c" />
          <g fill="#e3d2a0">{[0,1,2,3,4,5,6,7,8,9].map((n) => <circle key={n} cx={188 + (n * 73) % 221} cy={102 + (n * 43) % 213} r="1.3" />)}</g>
          {[0,1].map((side) => <g key={side} transform={`translate(${side ? 466 : 16} 70)`}><rect width="117" height="352" fill="#27251f" stroke="#645335" strokeWidth="5" />{[95,190,285].map((y,row) => <g key={y}><path d={`M0 ${y}H117`} stroke="#8f7040" strokeWidth="7" />{[0,1,2,3,4].map((col) => <g key={col} transform={`translate(${9+col*21} ${y-76})`}><rect width="16" height={70-(col%2)*13} fill={["#485341","#613e36","#3e4952","#72603d"][(row+col+side)%4]} rx="2" /><path d="M3 9H13M3 15H13M3 55H13" stroke="#bc9e61" opacity=".65" /></g>)}</g>)}</g>)}
          <ellipse cx="305" cy="359" rx="184" ry="107" fill={`url(#${halo})`} color="#daac5c" opacity=".65" />
          <g className="scene-orbit" transform="translate(300 275)" fill="none" stroke="#cba865"><circle r="70" /><circle r="62" opacity=".4" /><ellipse rx="94" ry="30" transform="rotate(-28)" /><ellipse rx="27" ry="75" transform="rotate(24)" /><path d="M-86 0H86M0 -86V86" opacity=".45" /><circle r="13" fill="#d7b76d" fillOpacity=".3" /><circle cx="0" cy="-70" r="4" fill="#eac984" />{Array.from({ length: 12 }, (_, n) => <path key={n} d="M-3 -96V-104L3 -100L-3 -96M0 -102L4 -106" transform={`rotate(${n * 30})`} opacity=".6" />)}</g>
          <path d="M224 367H376L393 396H207Z" fill="#b29050" /><path d="M0 425Q300 398 600 425V460H0Z" fill="#3b2d23" />
          <path d="M219 422Q260 408 300 421Q340 408 383 422L375 451Q335 438 300 450Q263 438 227 451Z" fill="#d4c298" stroke="#a48a58" /><path d="M300 422V449" stroke="#947b4b" />
          {[{x:156,y:160},{x:447,y:107},{x:202,y:65},{x:401,y:228}].map(({x,y},n) => <g className={`scene-candle candle-${n}`} key={x}><ellipse cx={x} cy={y-13} rx="32" ry="47" fill={`url(#${halo})`} color="#f7c875" /><path d={`M${x-4} ${y}H${x+4}V${y+29}H${x-4}Z`} fill="#e4d5aa" /><path className="scene-flame" d={`M${x} ${y-19}Q${x+8} ${y-8} ${x} ${y-4}Q${x-6} ${y-9} ${x} ${y-19}`} fill="#ffe6aa" /></g>)}
        </>}
      </svg>
      {!preview && <span className="landscape-caption">{name}</span>}
    </span>
  );
}
