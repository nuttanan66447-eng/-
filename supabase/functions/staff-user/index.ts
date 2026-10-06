// จัดการบัญชีเจ้าหน้าที่แบบ "ชื่อผู้ใช้ + รหัสผ่าน" (ไม่ต้องใช้อีเมลจริง และไม่ต้องยืนยันอีเมล)
// เรียกได้เฉพาะผู้ดูแลระบบ (staff.role = 'admin') — ส่ง JWT ของผู้ใช้มากับคำขอ
// บัญชีใช้อีเมลภายในรูปแบบ <ชื่อผู้ใช้>@users.sikaew-kongchang.app (ผู้ใช้ไม่ต้องรู้)
import { createClient } from 'npm:@supabase/supabase-js@2';

const DOMAIN = 'users.sikaew-kongchang.app';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // ผู้เรียกต้องเป็นผู้ดูแลระบบ
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: me } = await admin.auth.getUser(token);
  const myEmail = (me?.user?.email || '').toLowerCase();
  if (!myEmail) return json({ ok: false, message: 'ต้องเข้าสู่ระบบก่อน' }, 401);
  const { data: myStaff } = await admin.from('staff').select('role').eq('email', myEmail).maybeSingle();
  if (!myStaff || myStaff.role !== 'admin') return json({ ok: false, message: 'เฉพาะผู้ดูแลระบบ' }, 403);

  let body: Record<string, string> = {};
  try { body = await req.json(); } catch (_e) { return json({ ok: false, message: 'ข้อมูลไม่ถูกต้อง' }, 400); }
  const username = String(body.username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return json({ ok: false, message: 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3-32 ตัว' }, 400);
  const email = `${username}@${DOMAIN}`;

  const findUser = async () => {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const hit = data.users.find((u) => (u.email || '').toLowerCase() === email);
      if (hit) return hit;
      if (data.users.length < 200) return null;
    }
    return null;
  };

  try {
    if (body.action === 'create') {
      const password = String(body.password || '');
      if (password.length < 6) return json({ ok: false, message: 'รหัสผ่านอย่างน้อย 6 ตัวอักษร' }, 400);
      const role = body.role === 'admin' ? 'admin' : 'staff';
      const name = String(body.name || '').trim();
      const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name, username } });
      if (error) return json({ ok: false, message: /already/i.test(error.message) ? 'มีชื่อผู้ใช้นี้แล้ว' : error.message }, 400);
      const { error: e2 } = await admin.from('staff').upsert({ email, name, role });
      if (e2) return json({ ok: false, message: e2.message }, 500);
      return json({ ok: true, username });
    }
    if (body.action === 'password') {
      const password = String(body.password || '');
      if (password.length < 6) return json({ ok: false, message: 'รหัสผ่านอย่างน้อย 6 ตัวอักษร' }, 400);
      const user = await findUser();
      if (!user) return json({ ok: false, message: 'ไม่พบผู้ใช้' }, 404);
      const { error } = await admin.auth.admin.updateUserById(user.id, { password });
      if (error) return json({ ok: false, message: error.message }, 400);
      return json({ ok: true });
    }
    if (body.action === 'delete') {
      if (email === myEmail) return json({ ok: false, message: 'ลบบัญชีของตัวเองไม่ได้' }, 400);
      const user = await findUser();
      if (user) await admin.auth.admin.deleteUser(user.id);
      await admin.from('staff').delete().eq('email', email);
      return json({ ok: true });
    }
    return json({ ok: false, message: 'ไม่รู้จักคำสั่ง' }, 400);
  } catch (e) {
    return json({ ok: false, message: String((e as Error)?.message || e) }, 500);
  }
});
