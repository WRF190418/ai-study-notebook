// Original editorial fiction. Never mixed into a user's notes or real status messages.
export const guideIncidents = [
  { label: "舷窗记录 / 00", text: "天体观测记录已更新。茶没有受到影响。", scene: 0 },
  { label: "舷窗记录 / 01", text: "一条鲸经过舷窗。它似乎也有很多问题。", scene: 1 },
  { label: "舷窗记录 / 02", text: "一盆植物经过舷窗。植物方面拒绝进一步评论。", scene: 2 },
  { label: "不大可能事件 / 03", text: "本次不大可能事件：没有发生任何事。", scene: null },
  { label: "编者收到一张纸条", text: "宇宙总览：见下一页。下一页正在修订。", scene: null },
  { label: "舷窗记录 / 04", text: "远处的行星仍然很大。本指南决定不再强调此事。", scene: 0 }
] as const;

export const guideMarginalia = [
  "本指南收录了你目前知道的一部分事情。其余部分暂未通知本指南。",
  "本条目曾经更长。后来编者需要赶车。",
  "关于宇宙的条目很长。关于茶的意见更多。",
  "地图背面没有画宇宙的背面。编者认为一面已经够了。",
  "本指南的便携版本省略了重量。携带者对此有不同意见。",
  "此处原拟放置一句重要的话。排版时给茶让了位置。",
  "如果发现宇宙与目录不符，请优先相信宇宙。",
  "本指南的修订工作已经进行了很久。宇宙也一样。"
];

export const guideFiction = [
  { title: "宇宙", number: "U / 001", body: "很大。关于具体有多大，编者曾试图用一个比喻说明，后来发现比喻也放不下。", reference: "交叉参阅：其他" },
  { title: "其他", number: "O / 999", body: "包括此前所有分类未能解释的情况。分类部门认为，这充分证明了分类的完整性。", reference: "交叉参阅：茶" },
  { title: "茶", number: "T / 042", body: "一杯普通的热饮。宇宙没有对此发表意见。它暂时也不需要宇宙发表意见。", reference: "交叉参阅：宇宙" }
];
