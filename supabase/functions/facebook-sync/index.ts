// ดึงโพสต์ (ข้อความ + รูป) จากเพจ Facebook กองช่าง ลงตาราง news_posts
// ต้องตั้ง secret: FB_PAGE_TOKEN (Page access token แบบไม่หมดอายุ) และ FB_PAGE_ID (ไม่ใส่ = TechnicianSeekaew)
// เรียกได้เฉพาะเจ้าหน้าที่ที่อยู่ในตาราง staff (ส่ง JWT ของผู้ใช้มากับคำขอ)
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // ตรวจว่าเป็นเจ้าหน้าที่
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: userData } = await admin.auth.getUser(token);
  const email = (userData?.user?.email || '').toLowerCase();
  if (!email) return json({ ok: false, message: 'ต้องเข้าสู่ระบบก่อน' }, 401);
  const { data: staff } = await admin.from('staff').select('email').eq('email', email).maybeSingle();
  if (!staff) return json({ ok: false, message: 'บัญชีนี้ไม่มีสิทธิ์' }, 403);

  const pageToken = Deno.env.get('FB_PAGE_TOKEN');
  const pageId = Deno.env.get('FB_PAGE_ID') || 'TechnicianSeekaew';
  if (!pageToken) {
    await admin.from('news_sync').upsert({ id: 'facebook', synced_at: new Date().toISOString(), ok: false, message: 'needs-token' });
    return json({ ok: false, needsToken: true, message: 'ยังไม่ได้ตั้งค่า FB_PAGE_TOKEN ใน Supabase' });
  }

  const fields = 'id,message,created_time,permalink_url,full_picture,attachments{media,type,subattachments.limit(30){media}}';
  let next: string | null = `https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/posts?fields=${encodeURIComponent(fields)}&limit=50&access_token=${encodeURIComponent(pageToken)}`;
  const rows: Record<string, unknown>[] = [];
  for (let page = 0; next && page < 4; page++) {
    const res = await fetch(next);
    const body = await res.json();
    if (!res.ok || body.error) {
      const message = body?.error?.message || `Facebook ตอบกลับ ${res.status}`;
      await admin.from('news_sync').upsert({ id: 'facebook', synced_at: new Date().toISOString(), ok: false, message });
      return json({ ok: false, message }, 502);
    }
    for (const p of body.data || []) {
      const images: { src: string; w?: number; h?: number }[] = [];
      const add = (m: any) => { const im = m?.image; if (im?.src && !images.some((x) => x.src === im.src)) images.push({ src: im.src, w: im.width, h: im.height }); };
      for (const a of p.attachments?.data || []) {
        add(a.media);
        for (const s of a.subattachments?.data || []) add(s.media);
      }
      if (!images.length && p.full_picture) images.push({ src: p.full_picture });
      rows.push({ id: p.id, message: p.message || '', created_time: p.created_time, permalink: p.permalink_url || '', images, fetched_at: new Date().toISOString() });
    }
    next = body.paging?.next || null;
  }
  // รูปของ Facebook เป็นลิงก์ชั่วคราว: คัดลอกเก็บใน Storage bucket "news" (สาธารณะ) ครั้งเดียวต่อโพสต์
  const { data: existing } = await admin.from('news_posts').select('id,images').in('id', rows.map((r) => r.id as string));
  const stored = new Map((existing || []).map((e: any) => [e.id, e.images]));
  let budget = 80; // จำกัดจำนวนรูปที่คัดลอกต่อครั้ง (ที่เหลือคัดลอกในการดึงครั้งถัดไป)
  for (const r of rows) {
    const old = stored.get(r.id as string) as any[] | undefined;
    if (old && old.length && old.every((x) => x.stored)) { r.images = old; continue; }
    const out: any[] = [];
    let n = 0;
    for (const im of r.images as any[]) {
      if (budget <= 0) { out.push(im); continue; }
      budget--;
      try {
        const res = await fetch(im.src);
        if (!res.ok) throw new Error(String(res.status));
        const type = res.headers.get('content-type') || 'image/jpeg';
        const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
        const path = `${String(r.id).replace(/[^\w-]/g, '_')}/${n++}.${ext}`;
        const up = await admin.storage.from('news').upload(path, new Uint8Array(await res.arrayBuffer()), { contentType: type, upsert: true });
        if (up.error) throw up.error;
        out.push({ src: admin.storage.from('news').getPublicUrl(path).data.publicUrl, w: im.w, h: im.h, stored: true });
      } catch (_e) {
        out.push(im);
      }
    }
    r.images = out;
  }
  if (rows.length) {
    const { error } = await admin.from('news_posts').upsert(rows, { onConflict: 'id' });
    if (error) return json({ ok: false, message: error.message }, 500);
  }
  await admin.from('news_sync').upsert({ id: 'facebook', synced_at: new Date().toISOString(), ok: true, message: `${rows.length} โพสต์` });
  return json({ ok: true, count: rows.length });
});
