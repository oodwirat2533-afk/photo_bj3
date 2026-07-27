const db = require('./lib/db');

const primarySuperAdmin = (process.env.PRIMARY_SUPER_ADMIN || '').toLowerCase();
const scriptOwnerEmail = (process.env.SCRIPT_OWNER_EMAIL || process.env.PRIMARY_SUPER_ADMIN || '').toLowerCase();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    if (req.method === 'GET') {
      const userEmail = (req.query.userEmail || '').toLowerCase().trim();
      const ctx = await db.getUserContext(userEmail);
      
      const userDb = await db.getUserDatabase();
      const users = [];
      
      if (primarySuperAdmin) {
        users.push({
          email: primarySuperAdmin,
          role: 'SUPER_ADMIN',
          displayName: 'Primary Owner',
          profileComplete: true,
          isFixed: true
        });
      }
      
      if (scriptOwnerEmail && scriptOwnerEmail !== primarySuperAdmin) {
        users.push({
          email: scriptOwnerEmail,
          role: 'SUPER_ADMIN',
          displayName: 'Script Owner',
          profileComplete: true,
          isFixed: true
        });
      }
      
      for (const [email, user] of Object.entries(userDb)) {
        if (email !== primarySuperAdmin && email !== scriptOwnerEmail) {
          users.push({ ...user, email });
        }
      }
      
      return res.status(200).json({ users, callerIsFixed: ctx.isFixed });
    }
    
    if (req.method === 'POST') {
      const { userEmail, action, targetEmail, prefix, firstName, lastName, department } = req.body;
      const targetRole = req.body.newRole || req.body.targetRole;
      const ctx = await db.getUserContext(userEmail);
      const target = (targetEmail || '').toLowerCase().trim();
      const userDb = await db.getUserDatabase();
      
      if (action === 'addAdmin') {
        if (!ctx.isSuperAdmin) return res.status(403).json({ error: 'Unauthorized: เฉพาะ Super Admin เท่านั้น' });
        if (!target) return res.status(400).json({ error: 'กรุณาระบุ Email' });
        if (target === primarySuperAdmin || target === scriptOwnerEmail) {
          return res.status(400).json({ error: 'ไม่สามารถเพิ่มทับ Super Admin ได้' });
        }
        if (targetRole !== 'ADMIN' && targetRole !== 'ASSISTANT_ADMIN' && targetRole !== 'SUPER_ADMIN') {
          return res.status(400).json({ error: 'Role ไม่ถูกต้อง' });
        }
        
        if (userDb[target] && userDb[target].profileComplete) {
          userDb[target].role = targetRole;
          userDb[target].updatedAt = new Date().toISOString();
        } else {
          const existing = userDb[target] || {};
          userDb[target] = {
            ...existing,
            email: target,
            displayName: existing.displayName || target.split('@')[0],
            role: targetRole,
            profileComplete: !!existing.profileComplete,
            prefix: existing.prefix || '',
            firstName: existing.firstName || '',
            lastName: existing.lastName || '',
            department: existing.department || '',
            addedBy: userEmail,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
        await db.saveUserDatabase(userDb);
        return res.status(200).json({ success: true, message: `เพิ่ม Admin "${target}" เรียบร้อยแล้ว` });
      }
      
      if (action === 'updateProfile') {
        const u = (userEmail || '').toLowerCase().trim();
        let finalFirstName = (firstName || '').trim();
        const pfx = (prefix || '').trim();
        if (pfx && finalFirstName.startsWith(pfx)) {
          finalFirstName = finalFirstName.substring(pfx.length).trim();
        }
        const displayName = `${pfx}${finalFirstName} ${(lastName || '').trim()}`.trim();
        
        if (u === primarySuperAdmin || u === scriptOwnerEmail) {
          return res.status(200).json({ success: true, message: 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว' });
        }
        
        if (userDb[u]) {
          userDb[u].prefix = pfx;
          userDb[u].firstName = finalFirstName;
          userDb[u].lastName = (lastName || '').trim();
          userDb[u].department = (department || '').trim();
          userDb[u].displayName = displayName;
          userDb[u].profileComplete = true;
          userDb[u].updatedAt = new Date().toISOString();
        } else {
          userDb[u] = {
            email: u,
            role: 'PENDING',
            prefix: pfx,
            firstName: finalFirstName,
            lastName: (lastName || '').trim(),
            department: (department || '').trim(),
            displayName,
            profileComplete: true,
            updatedAt: new Date().toISOString()
          };
        }
        await db.saveUserDatabase(userDb);
        return res.status(200).json({ success: true, message: 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว' });
      }
      
      if (action === 'deleteUser') {
        if (!ctx.isSuperAdmin) return res.status(403).json({ error: 'Unauthorized: เฉพาะ Super Admin เท่านั้น' });
        if (target === primarySuperAdmin || target === scriptOwnerEmail) {
          return res.status(400).json({ error: 'ไม่สามารถลบ Super Admin หรือ เจ้าของโปรเจกต์ได้' });
        }
        delete userDb[target];
        await db.saveUserDatabase(userDb);
        return res.status(200).json({ success: true, message: 'ลบรายชื่อผู้ใช้เรียบร้อยแล้ว' });
      }
      
      if (action === 'requestAccess') {
        const u = (userEmail || '').toLowerCase().trim();
        if (!userDb[u]) {
          userDb[u] = { email: u, displayName: u.split('@')[0], role: 'PENDING', profileComplete: false, requestedAt: new Date().toISOString() };
        } else if (userDb[u].role === 'REJECTED') {
          userDb[u].role = 'PENDING';
          userDb[u].requestedAt = new Date().toISOString();
        }
        await db.saveUserDatabase(userDb);
        return res.status(200).json({ success: true, message: 'ส่งคำขออนุมัติสิทธิ์เรียบร้อยแล้ว' });
      }
      
      // Default / updateUserRole
      if (!action || action === 'updateUserRole') {
        if (!ctx.isSuperAdmin) return res.status(403).json({ error: 'Unauthorized: เฉพาะ Super Admin เท่านั้น' });
        if (target === primarySuperAdmin || target === scriptOwnerEmail) {
          return res.status(400).json({ error: 'ไม่สามารถแก้ไขสิทธิ์ของ Primary Super Admin หรือ เจ้าของโปรเจกต์ได้' });
        }
        if (targetRole === 'SUPER_ADMIN' && !ctx.isFixed) {
          return res.status(403).json({ error: 'เฉพาะผู้ดูแลหลัก (Fixed) เท่านั้นที่สามารถกำหนดสิทธิ์ Super Admin ได้' });
        }
        if (!userDb[target]) {
          userDb[target] = { email: target, displayName: target.split('@')[0], profileComplete: false };
        }
        userDb[target].role = targetRole;
        userDb[target].updatedAt = new Date().toISOString();
        if (targetRole === 'SUPER_ADMIN') {
          userDb[target].promotedToSuperAdminBy = userEmail;
          userDb[target].promotedToSuperAdminAt = new Date().toISOString();
        }
        await db.saveUserDatabase(userDb);
        return res.status(200).json({ success: true, message: 'อัปเดตสิทธิ์ผู้ใช้เรียบร้อยแล้ว' });
      }
      
      return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
