"use client";

import { useEffect, useState } from "react";
import { ImagePlus, LoaderCircle, Upload } from "lucide-react";
import type { MediaAsset, Note } from "@/lib/types";

export default function CoursewareImages({ note, onUpdate, practice = false }: { note: Note; onUpdate: (workspace: any) => void; practice?: boolean }) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [heading, setHeading] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    setAssets([]); setSelected(""); setMessage(""); setHeading(""); setCaption("");
    if (practice) return;
    void fetch(`/api/notes/${note.id}/images`).then((response) => response.json()).then((data) => {
      if (active) setAssets(data.assets ?? []);
    }).catch(() => { if (active) setMessage("图片列表读取失败，请稍后重试。"); });
    return () => { active = false; };
  }, [note.id, practice]);
  const headings = [...note.contentMarkdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1]);

  async function importFile(file?: File) {
    if (!file || busy || practice) return;
    setBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch(`/api/notes/${note.id}/courseware`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAssets((current) => [...current, ...data.assets]);
      setMessage([data.message, ...(data.warnings ?? [])].join(" "));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "课件导入失败，请重试。");
    } finally { setBusy(false); }
  }

  async function insert() {
    if (!selected || busy || practice) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/notes/${note.id}/images`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        assetId: selected, placement: heading ? "after_heading" : "end", afterHeading: heading, alt: caption
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onUpdate(data.workspace); setMessage(data.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : "图片插入失败。"); }
    finally { setBusy(false); }
  }

  return <div className="courseware-images">
    <button className="ghost-button" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><ImagePlus size={17} />课件图片{assets.length ? `（${assets.length}）` : ""}</button>
    {open ? <div className="courseware-image-library">
      <label className="courseware-import"><Upload size={17} />{busy ? "处理中…" : "导入 PPTX 原图"}<input aria-label="导入 PPTX 原图" type="file" accept=".pptx" disabled={busy || practice} onChange={(event) => { void importFile(event.target.files?.[0]); event.target.value = ""; }} /></label>
      {practice && <p className="tutorial-practice-notice">教学练习不导入文件、不修改笔记。</p>}
      <div className="courseware-gallery" aria-label="课件原图列表">
        {assets.map((asset) => <button type="button" key={asset.id} className={`courseware-thumbnail ${selected === asset.id ? "selected" : ""}`} aria-pressed={selected === asset.id} aria-label={`选择${asset.sourceFile ? `第 ${asset.slideNumber} 页` : ""}图片：${asset.alt || asset.fileName}`} onClick={() => { setSelected(asset.id); setCaption(asset.alt || ""); }}>
          <img src={`/api/media/${asset.id}`} alt={asset.alt || asset.fileName} loading="lazy" />
          <span>{asset.sourceFile ? `第 ${asset.slideNumber} 页 · ${asset.alt || "课件插图"}` : asset.fileName}</span>
        </button>)}
      </div>
      {selected ? <div className="courseware-insert-fields">
        <label className="field"><span>图片说明</span><input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={200} /></label>
        <label className="field"><span>插入位置</span><select value={heading} onChange={(event) => setHeading(event.target.value)}><option value="">笔记结尾</option>{headings.map((value, index) => <option key={index} value={value}>{value}</option>)}</select></label>
        <button className="primary-button" type="button" disabled={busy} onClick={() => void insert()}>{busy ? <LoaderCircle className="spin" size={16} /> : <ImagePlus size={16} />}插入图片</button>
      </div> : null}
      {message ? <p className="courseware-message" role="status">{message}</p> : null}
    </div> : null}
  </div>;
}
