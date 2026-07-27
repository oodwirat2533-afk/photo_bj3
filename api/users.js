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
      const { userEmail, action, targetEmail, targetRole, prefix, firstName, lastName, department } = req.body;
      const ctx = await db.getUserContext(userEmail);
      const target = (targetEmail || '').toLowerCase().trim();
      const userDb = await db.getUserDatabase();
      
      if (action === 'addAdmin') {
        if (!ctx.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });
        if (target === primarySuperAdmin || target === scriptOwnerEmail) {
          return res.status(400).json({ error: 'Cannot modify fixed admin' });
        }
        if (targetRole !== 'ADMIN' && targetRole !== 'ASSISTANT_ADMIN') {
          return res.status(400).json({ error: 'Invalid role for addAdmin' });
        }
        
        if (userDb[target]) {
          userDb[target].role = targetRole;
        } else {
          userDb[target] = { role: targetRole, profileComplete: false };
        }
        await db.saveUserDatabase(userDb);
        return res.status(200).json({ success: true });
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
          return res.status(200).json({ success: true, message: 'Fixed user profile updated (ignored)' });
        }
        
        if (userDb[u]) {
          userDb[u].prefix = pfx;
          userDb[u].firstName = finalFirstName;
          userDb[u].lastName = (lastName || '').trim();
          userDb[u].department = (department || '').trim();
          userDb[u].displayName = displayName;
          userDb[u].profileComplete = true;
        } else {
          userDb[u] = {
            role: 'PENDING',
            prefix: pfx,
            firstName: finalFirstName,
            lastName: (lastName || '').trim(),
            department: (department || '').trim(),
            displayName,
            profileComplete: true
          };
        }
        await db.saveUserDatabase(userDb);
        return res.status(200).json({ success: true });
      }
      
      if (action === 'deleteUser') {
        if (!ctx.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });
        if (target === primarySuperAdmin || target === scriptOwnerEmail) {
          return res.status(400).json({ error: 'Cannot delete fixed admin' });
        }
        delete userDb[target];
        await db.saveUserDatabase(userDb);
        return res.status(200).json({ success: true });
      }
      
      if (action === 'requestAccess') {
        const u = (userEmail || '').toLowerCase().trim();
        if (!userDb[u]) {
          userDb[u] = { role: 'PENDING', profileComplete: false };
        } else if (userDb[u].role !== 'REJECTED') {
          // keep existing role
        }
        await db.saveUserDatabase(userDb);
        return res.status(200).json({ success: true });
      }
      
      // Default / updateUserRole
      if (!action || action === 'updateUserRole') {
        if (!ctx.isSuperAdmin) return res.status(403).json({ error: 'Forbidden' });
        if (target === primarySuperAdmin || target === scriptOwnerEmail) {
          return res.status(400).json({ error: 'Cannot modify fixed admin' });
        }
        if (targetRole === 'SUPER_ADMIN' && !ctx.isFixed) {
          return res.status(403).json({ error: 'Only fixed admins can grant SUPER_ADMIN' });
        }
        if (!userDb[target]) userDb[target] = { profileComplete: false };
        userDb[target].role = targetRole;
        await db.saveUserDatabase(userDb);
        return res.status(200).json({ success: true });
      }
      
      return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
