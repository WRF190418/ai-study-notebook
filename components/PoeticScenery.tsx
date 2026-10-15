"use client";

import { useId } from "react";
import { poeticDetails, poeticScenery, poeticSky, type PoemId, type PoeticDetail } from "@/lib/poetic-scenery";

// A shared ink landscape: light, terrain and concrete imagery follow the poem.
// Keep the centre quiet for the verse; details belong at the edges, never over reading controls.
export default function PoeticScenery({ poem }: { poem: PoemId }) {
  const id = useId().replace(/:/g, "");
  const scenery = poeticScenery[poem];
  const details: readonly PoeticDetail[] = scenery.details;
  const sky = poeticSky[scenery.light];
  const ref = (name: string) => `url(#${id}-${name})`;
  const layer = (present: boolean) => `world-poem-layer${present ? " present" : ""}`;
  // Avoid sub-pixel Math.sin differences between Node SSR and Chromium hydration.
  const ink = (value: number) => Math.round(value * 100) / 100;
  return (
    <svg className="poetic-landscape-svg" data-scenery-poem={poem} data-light={scenery.light} data-terrain={scenery.terrain} viewBox="0 0 1600 1050" preserveAspectRatio="xMidYMid slice" focusable="false" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient>
        <linearGradient id={`${id}-water`} x2="0" y2="1"><stop stopColor={sky[0]} stopOpacity=".2" /><stop offset="1" stopColor="#e7e6d6" /></linearGradient>
        <radialGradient id={`${id}-halo`}><stop stopColor="#fff4d5" stopOpacity=".7" /><stop offset="1" stopColor="#fff4d5" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-mist`} x2="0" y2="1"><stop stopColor="#e9e8d9" stopOpacity="0" /><stop offset=".5" stopColor="#e9e8d9" stopOpacity=".7" /><stop offset="1" stopColor="#e9e8d9" stopOpacity="0" /></linearGradient>
        <filter id={`${id}-soft`}><feGaussianBlur stdDeviation="12" /></filter>
      </defs>
      <rect width="1600" height="1050" fill={ref("sky")} />
      <g className={layer(scenery.light === "moon")} data-poetic-light="moon">
        <circle cx="1110" cy="194" r="135" fill={ref("halo")} /><circle cx="1110" cy="194" r="43" fill="#fff9e4" opacity=".9" />
        <path d="M1071 690q39 -3 78 0M1086 701q26 -2 51 0M1090 711q25 -3 50 0M1074 724q38 -3 76 0" stroke="#f8f1d5" strokeWidth="1.8" opacity=".5" />
      </g>
      <g className={layer(scenery.light === "sun" || scenery.light === "dawn" || scenery.light === "sunset")} data-poetic-light="sun">
        <circle cx="1260" cy="287" r="136" fill={ref("halo")} opacity=".6" /><circle cx="1260" cy="287" r="36" fill={scenery.light === "sunset" ? "#cd936d" : "#efe0a9"} opacity=".65" />
      </g>
      <g className={layer(scenery.light === "stars")} data-poetic-light="stars" fill="#f9f4d7">
        {Array.from({ length: 36 }, (_, n) => <circle key={n} cx={280 + n * 137 % 1220} cy={50 + n * 71 % 350} r={n % 7 === 0 ? 2.4 : 1.2} opacity={.35 + n % 3 * .15} />)}
      </g>
      <g className={layer(scenery.terrain !== "sea")} data-poetic-terrain="mountains">
        <g fill="#879f94" opacity=".35">
          <path d="M310 640Q510 536 639 431Q706 420 770 313Q811 246 858 383Q889 423 937 353Q967 310 1012 420Q1054 427 1097 345Q1154 266 1216 389Q1281 350 1334 436Q1412 371 1512 489L1600 470V760H310Z" />
          <path d="M-80 586Q32 413 110 485Q157 358 201 403Q239 455 290 409Q335 364 391 501Q445 447 532 558V770H0Z" opacity=".65" />
        </g>
        <path d="M0 694Q141 629 236 644Q372 502 445 552Q498 489 542 580Q631 547 671 630Q772 601 853 562Q914 492 989 589Q1046 536 1091 573Q1171 491 1240 554Q1292 506 1361 615Q1486 535 1600 623V920H0Z" fill="#718c7c" opacity=".36" />
      </g>
      <g className={layer(scenery.terrain === "sea")} data-poetic-terrain="sea">
        <path d="M0 548Q460 535 1600 549V1050H0Z" fill="#779c98" opacity=".3" />
        <path d="M0 547Q570 540 1600 549M13 619Q380 593 702 617M900 652Q1250 622 1600 647M218 699Q720 657 1300 699" stroke="#f4eedb" fill="none" strokeWidth="3" opacity=".6" />
        <path d="M0 544Q110 480 222 526L302 550Z" fill="#748b7e" opacity=".3" />
        <g className={layer(scenery.light === "moon")}><path d="M1094 553q16 -2 32 0M1078 565q30 -3 60 0M1066 581q42 -4 85 0M1082 600q30 -2 60 0M1054 622q55 -4 110 0M1066 645q45 -3 90 0" stroke="#f7f0d1" strokeWidth="2" opacity=".6" fill="none" /></g>
      </g>
      <g className={layer(scenery.terrain === "pond")} data-poetic-terrain="pond">
        <path d="M0 537Q297 482 629 535Q1030 491 1600 550V1050H0Z" fill={ref("water")} />
        <path d="M17 551Q312 514 620 553M900 568Q1230 538 1595 573M167 633Q380 610 590 630" stroke="#f1eed7" fill="none" strokeWidth="2" opacity=".45" />
      </g>
      <path d="M0 757Q232 685 409 736Q561 682 714 758Q948 700 1100 746Q1334 655 1600 734V1050H0Z" fill={ref("water")} />
      <g fill="none" stroke="#718c7e" opacity=".2"><path d="M20 815Q263 778 465 814M977 782Q1217 748 1595 795M430 875Q675 830 949 864M1104 925Q1360 891 1600 917M0 974Q305 929 599 973M931 816Q1093 798 1235 817" /></g>
      <g className={layer(scenery.terrain === "river")} data-poetic-terrain="river"><path d="M711 590Q932 632 747 705T847 1050" stroke="#e5e2cb" strokeWidth="46" fill="none" opacity=".4" /><path d="M711 590Q932 632 747 705T847 1050" stroke="#849f92" strokeWidth="1" fill="none" opacity=".35" /></g>
      <g className="poem-drifting-mist" filter={ref("soft")}><path d="M0 545Q417 681 851 580T1600 588V700Q1193 635 801 687T0 680Z" fill={ref("mist")} /></g>
      <path d="M-70 892Q71 795 212 849Q282 818 358 848Q419 882 486 872L361 915L230 950H-70Z" fill="#546d60" opacity=".7" />
      <path d="M-40 884Q125 824 257 871Q359 858 415 881" fill="none" stroke="#b8bda3" strokeWidth="5" opacity=".65" />
      <g className={layer(!details.includes("pine-stream") && !details.includes("osmanthus"))}>
        <g stroke="#465d4d" fill="none"><path d="M74 868Q116 701 91 599Q75 551 36 523M93 665Q129 602 154 577M94 739Q47 681 14 674" strokeWidth="7" /><path d="M37 523Q48 682 3 724M57 542Q92 668 49 785M154 577Q178 680 139 753M139 605Q153 729 109 797" strokeWidth="1.4" opacity=".6" /></g>
        <g fill="#668268" opacity=".55">{Array.from({length:24},(_,n)=><ellipse key={n} cx={2+n*29%165} cy={560+n*47%228} rx="3" ry="10" transform={`rotate(${n%2?25:-25} ${2+n*29%165} ${560+n*47%228})`} />)}</g>
      </g>
      {poeticDetails.map(detail => <g key={detail} data-poetic-detail={detail} className={layer(details.includes(detail))}>
        {detail === "redbean" && <>
          <path d="M1370 -20Q1401 47 1518 85Q1560 111 1600 194M1495 75Q1428 89 1398 132M1469 64Q1522 35 1577 38" stroke="#5c6350" fill="none" strokeWidth="4" />
          {[[1447,93],[1410,121],[1515,90],[1568,41],[1540,60]].map(([x,y])=><g key={x}><path d={`M${x} ${y-9}V${y+9}`} stroke="#77715b" /><ellipse cx={x} cy={y+12} rx="5" ry="7" fill="#a34d3e" /></g>)}
        </>}
        {detail === "letter" && <g transform="translate(245 580) rotate(-7)"><path d="M0 0H96V56H0Z" fill="#f3ead2" stroke="#ac9b79" /><path d="M0 0L48 28L96 0" fill="none" stroke="#ac9b79" /><circle cx="48" cy="28" r="5" fill="#a34d3e" /></g>}
        {detail === "lamp" && <g transform="translate(1370 485)"><path d="M-46 88V12H41V88M-61 14L-2 -26L57 14Z" fill="#657362" opacity=".7" /><rect x="-16" y="29" width="24" height="36" fill="#e8c184" /><circle cx="-4" cy="44" r="70" fill={ref("halo")} /></g>}
        {detail === "village" && <g fill="#6a8070" opacity=".6">{[0,1,2,3].map(n=><g key={n} transform={`translate(${1210+n*69} ${565+(n%2)*23})`}><path d="M-21 0L0 -18L25 0V26H-19Z" /><rect x="-3" y="7" width="7" height="11" fill="#e4cc9c" /><path d="M-28 0L0 -22L31 0" stroke="#567063" fill="none" strokeWidth="2" /></g>)}</g>}
        {detail === "sail" && <g className="scene-sail" transform="translate(1340 565)"><path d="M-48 64Q5 87 63 63L40 87H-22Z" fill="#435f5d" /><path d="M8 66V-78L-49 49H4M14 -58L61 47H14" fill="#f3edde" stroke="#789186" strokeWidth="1.5" /><path d="M-88 95Q-3 80 102 96M-70 106Q0 95 68 105" stroke="#f3ecce" fill="none" /></g>}
        {detail === "traveler" && <g transform="translate(320 580)"><path d="M0 0L-6 -32L9 -40L19 -9M1 -31L-16 -18M12 -30L24 -20M17 -6L28 4M0 0L-10 8" fill="#55634e" stroke="#45533e" strokeWidth="2" /><path d="M-8 -37L4 -52L22 -36Z" fill="#8a8a65" /><path d="M31 7L37 -33" stroke="#6f7252" strokeWidth="2" /></g>}
        {detail === "clouds" && <g className="scene-mist" fill="#f0eddf" opacity=".5" filter={ref("soft")}><ellipse cx="670" cy="409" rx="225" ry="22" /><ellipse cx="1240" cy="481" rx="255" ry="26" /><ellipse cx="390" cy="486" rx="170" ry="17" /></g>}
        {detail === "star-river" && <g fill="#fbf4d8"><path d="M540 -40Q690 110 940 146T1580 320" stroke="#edf0dc" strokeWidth="43" fill="none" opacity=".12" />{Array.from({length:38},(_,n)=><circle key={n} cx={600+n*23} cy={ink(30+n*7+Math.sin(n)*24)} r={n%5?1.4:2.5} opacity=".6" />)}<circle cx="779" cy="117" r="4" /><circle cx="920" cy="184" r="4" /><path d="M792 130Q851 116 906 174" stroke="#f6efd1" strokeDasharray="2 7" fill="none" opacity=".5" /></g>}
        {detail === "swallows" && <g stroke="#536e60" strokeWidth="2" fill="none" opacity=".7"><path d="M551 251Q562 240 573 251Q584 238 599 240M1285 327Q1294 316 1305 326Q1314 314 1325 317" /></g>}
        {detail === "blossoms" && <g>
          <path d="M-30 337Q108 341 203 401M85 354Q110 310 168 295M143 375Q226 350 270 360" fill="none" stroke="#6c7761" strokeWidth="4" />
          {Array.from({length:17},(_,n)=><g key={n} transform={`translate(${30+n*14} ${ink(342+Math.sin(n*2)*46)})`} fill="#d5b7a5" opacity=".85"><circle r="6" /><circle cx="6" cy="3" r="5" /><circle cx="1" cy="8" r="5" /></g>)}
          {[0,1,2,3,4,5].map(n=><ellipse key={n} cx={123+n*24} cy={464+n%3*34} rx="3" ry="6" fill="#ceb09e" transform={`rotate(${n*27} ${123+n*24} ${464+n%3*34})`} />)}
        </g>}
        {detail === "lanterns" && <g>
          <path d="M1100 402Q1330 483 1600 398" stroke="#7c7860" fill="none" opacity=".45" />
          {[0,1,2,3,4,5].map(n=><g key={n} transform={`translate(${1135+n*84} ${ink(416+Math.sin(n/1.6)*25)})`}><circle cy="19" r="48" fill={ref("halo")} /><path d="M0 -8V8M0 35V49" stroke="#9c7955" /><ellipse cy="21" rx="10" ry="16" fill="#bc7a50" opacity=".75" /><path d="M-4 9V33M4 9V33" stroke="#efcf8c" opacity=".65" /></g>)}
          {Array.from({length:16},(_,n)=><circle key={n} cx={1180+n*27} cy={257+n*47%143} r="1.7" fill="#fff0b3" opacity=".8" />)}
        </g>}
        {detail === "wine" && <g transform="translate(255 575)" fill="#6f7961" opacity=".7"><path d="M5 -29Q-9 -12 -5 13Q15 25 35 13Q41 -9 26 -29V-44H5Z" /><path d="M49 -6H73L68 12H54Z" fill="#b19a73" /><path d="M61 12V23M53 24H69" stroke="#8c8665" strokeWidth="2" /></g>}
        {detail === "tower" && <g transform="translate(1380 484)" fill="#657869" stroke="#5c715e" strokeWidth="3" opacity=".75"><path d="M-44 94V-47H44V94M-59 -47L0 -83L59 -47ZM-57 -3L0 -34L57 -3ZM-54 41L0 10L54 41Z" /><path d="M-19 -36V-10M19 -36V-10M-19 12V33M19 12V33M-21 55V87M21 55V87" stroke="#cbd0b3" /></g>}
        {detail === "summit" && <g><path d="M1600 721Q1568 601 1538 530L1493 454Q1474 414 1447 356Q1422 407 1400 423L1373 481Q1350 493 1328 541L1280 566Q1251 636 1189 714Z" fill="#58786a" opacity=".5" /><path d="M1447 356Q1432 404 1438 444L1402 488L1415 530M1493 454L1472 497L1507 552" fill="none" stroke="#c0c9b0" opacity=".45" strokeWidth="1.4" /><path d="M1447 356L1436 384L1450 375L1466 390Z" fill="#d6d7c1" opacity=".5" /></g>}
        {detail === "rapids" && <g fill="none" stroke="#f6eed8" opacity=".55" strokeWidth="3"><path d="M920 623Q1040 557 1160 623T1440 632M1000 644Q1120 590 1240 649T1530 656M960 675Q1100 620 1280 682" /><path d="M1430 688L1495 629L1556 650L1600 725" fill="#6a8373" stroke="none" /></g>}
        {detail === "chrysanthemums" && <g transform="translate(196 578)">
          <path d="M-34 -8H177M-34 22H177M-19 -44V48M26 -44V48M74 -44V48M125 -44V48M167 -44V48" stroke="#9a9877" strokeWidth="4" opacity=".65" />
          {[0,1,2,3,4].map(n=><g key={n} transform={`translate(${n*27} ${-28-n%2*26})`}><path d="M0 0L5 62M5 24L-9 15M4 36L20 21" stroke="#5f7b55" fill="none" strokeWidth="2" />{[0,1,2,3,4,5,6,7].map(p=><ellipse key={p} cy="-6" rx="2.5" ry="9" fill="#c2a868" transform={`rotate(${p*45})`} />)}<circle r="4" fill="#9b8852" /></g>)}
        </g>}
        {detail === "pine-stream" && <g>
          <path d="M12 750Q82 665 169 690Q211 707 244 675Q273 643 312 653Q358 667 397 592" fill="none" stroke="#eef0db" strokeWidth="8" opacity=".7" />
          <g fill="#7a9181" opacity=".65"><ellipse cx="108" cy="697" rx="33" ry="9" transform="rotate(-11 108 697)" /><ellipse cx="241" cy="682" rx="28" ry="8" /><ellipse cx="304" cy="646" rx="22" ry="8" /></g>
          <path d="M74 831Q94 651 103 511Q106 447 121 371M109 487Q71 455 34 432M113 470Q166 431 197 394M95 610Q141 576 205 546" stroke="#4f6855" fill="none" strokeWidth="7" />
          {[[48,427],[83,440],[139,403],[174,381],[208,396],[133,562],[176,539],[213,551]].map(([x,y])=><g key={`${x}-${y}`} transform={`translate(${x} ${y})`} stroke="#5b7a60" strokeWidth="1.4" opacity=".8">
            {Array.from({length:9},(_,n)=><path key={n} d={`M0 9L${(n-4)*7} ${-16-Math.abs(n-4)*2}`} />)}
            <path d="M-31 -2Q-11 -12 15 -5Q29 -8 34 4" strokeWidth="6" opacity=".35" fill="none" />
          </g>)}
        </g>}
        {detail === "lotus" && <g transform="translate(245 580)">
          <ellipse cx="5" cy="52" rx="94" ry="9" fill="none" stroke="#8da790" opacity=".4" /><ellipse cx="61" cy="16" rx="43" ry="12" fill="#91aa81" opacity=".65" /><path d="M59 15L82 12" stroke="#b9c8a1" />
          <path d="M-10 50Q-25 -10 -7 -43" stroke="#728f67" strokeWidth="2" fill="none" /><path d="M-7 -43Q-28 -19 -13 7Q3 -8 -7 -43Z" fill="#6f956a" /><path d="M-7 -44L-12 -5" stroke="#c2cca4" />
          <g transform="translate(-6 -49) rotate(-12)"><path d="M-12 0H16" stroke="#697d65" strokeWidth="2" /><ellipse cx="-7" cy="-5" rx="12" ry="3" fill="#e8ecd2" transform="rotate(20)" /><ellipse cx="-7" cy="5" rx="12" ry="3" fill="#e8ecd2" transform="rotate(-20)" /></g>
        </g>}
        {detail === "rain" && <g stroke="#708e83" strokeWidth="1" opacity=".28">{Array.from({length:30},(_,n)=><path key={n} d={`M${70+n*163%1500} ${150+n*67%530}l-13 35`} />)}<path d="M1250 698q12 -7 25 0m-1060 -99q12 -7 25 0m935 40q12 -7 25 0" fill="none" /></g>}
        {detail === "osmanthus" && <g>
          <path d="M-25 271Q97 272 171 345M72 288Q130 250 203 252" stroke="#63785e" strokeWidth="4" fill="none" />
          {[0,1,2,3,4,5,6].map(n=><g key={n} transform={`translate(${34+n*24} ${280+n%3*24})`}><ellipse rx="16" ry="5" fill="#7e9475" transform="rotate(-25)" /><circle cx="8" cy="10" r="2.3" fill="#e0c88f" /><circle cx="13" cy="14" r="2" fill="#e0c88f" /></g>)}
          {[0,1,2,3,4].map(n=><circle key={n} cx={100+n*21} cy={398+n*23} r="2" fill="#d5c28c" />)}
        </g>}
        {detail === "road" && <path d="M285 657Q410 619 357 580T492 531Q551 518 587 537" stroke="#d8d3b8" strokeWidth="11" fill="none" opacity=".65" />}
        {detail === "seated" && <g transform="translate(363 583)" fill="#63775e"><path d="M-22 12Q1 -3 24 12L31 23H-32Z" fill="#8c9c83" /><circle cy="-17" r="5" /><path d="M-5 -12L7 -11L13 2L22 7H-2L-10 -1Z" /><path d="M2 -7L-9 2" stroke="#63775e" strokeWidth="3" /></g>}
      </g>)}
      <path d="M0 900Q388 863 681 927T1600 890V1050H0Z" fill={ref("mist")} opacity=".5" />
    </svg>
  );
}
