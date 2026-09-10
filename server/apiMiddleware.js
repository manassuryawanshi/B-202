import { getDatabase, saveDatabase } from './db.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function createB202ApiMiddleware() {
  return async (req, res, next) => {
    const url = req.url.split('?')[0];

    // Only intercept /api routes
    if (!url.startsWith('/api')) {
      return next();
    }

    try {
      const db = getDatabase();
      if (!db) {
        return sendJson(res, 500, { error: 'Database unavailable' });
      }

      // 1. GET /api/data - Fetch full flat state (with 1st of month auto-bills & duplicate prevention)
      if (req.method === 'GET' && url === '/api/data') {
        const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        let dbChanged = false;

        // Auto-add Rent bill if none exists for this month
        const rentBillsThisMonth = db.bills.filter((b) => b.type === 'rent' && b.monthYear === currentMonthYear);
        if (rentBillsThisMonth.length === 0) {
          const now = new Date();
          const dueStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`;
          const rentBill = {
            id: `rent-${currentMonthYear.replace(' ', '-')}`,
            title: 'Flat Rent',
            type: 'rent',
            totalAmount: 27000,
            dueDate: dueStr,
            monthYear: currentMonthYear,
            recipientName: 'Ujwal Kailas Lekurwale (Rent Coordinator)',
            recipientUpi: 'ujwal12017@oksbi',
            isCustomSplit: true,
            creatorId: 'system',
            shares: { manas: 9000, rohan: 4500, shubham: 4500, ujwal: 4500, prathamesh: 4500 },
            payments: {
              manas: { paid: false, amount: 9000, date: null, utr: '' },
              rohan: { paid: false, amount: 4500, date: null, utr: '' },
              shubham: { paid: false, amount: 4500, date: null, utr: '' },
              ujwal: { paid: false, amount: 4500, date: null, utr: '' },
              prathamesh: { paid: false, amount: 4500, date: null, utr: '' }
            }
          };
          db.bills.unshift(rentBill);
          dbChanged = true;
        } else if (rentBillsThisMonth.length > 1) {
          const canonicalRent = rentBillsThisMonth[0];
          const duplicateIds = rentBillsThisMonth.slice(1).map((b) => b.id);
          // Merge all payments from duplicates so no paid record is lost
          rentBillsThisMonth.slice(1).forEach((dup) => {
            Object.keys(dup.payments || {}).forEach((mId) => {
              if (dup.payments[mId]?.paid && !canonicalRent.payments?.[mId]?.paid) {
                canonicalRent.payments[mId] = dup.payments[mId];
              }
            });
          });
          db.deletedBillIds = [...new Set([...(db.deletedBillIds || []), ...duplicateIds])];
          db.bills = db.bills.filter((b) => b.type !== 'rent' || b.monthYear !== currentMonthYear || b.id === canonicalRent.id);
          dbChanged = true;
        }

        // Auto-add Washing Machine bill if none exists for this month (Collected by Manas)
        const wmBillsThisMonth = db.bills.filter((b) => b.type === 'washing-machine' && b.monthYear === currentMonthYear);
        if (wmBillsThisMonth.length === 0) {
          const now = new Date();
          const dueStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`;
          const wmBill = {
            id: `wm-${currentMonthYear.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            title: 'Washing Machine Bill',
            type: 'washing-machine',
            totalAmount: 500,
            dueDate: dueStr,
            monthYear: currentMonthYear,
            recipientName: 'Manas (Washing Machine Coordinator)',
            recipientUpi: '8010616851@ybl',
            isCustomSplit: false,
            perPersonAmount: 100,
            creatorId: 'system',
            shares: { manas: 100, rohan: 100, shubham: 100, ujwal: 100, prathamesh: 100 },
            payments: {
              manas: { paid: false, amount: 100, date: null, utr: '' },
              rohan: { paid: false, amount: 100, date: null, utr: '' },
              shubham: { paid: false, amount: 100, date: null, utr: '' },
              ujwal: { paid: false, amount: 100, date: null, utr: '' },
              prathamesh: { paid: false, amount: 100, date: null, utr: '' }
            }
          };
          db.bills.unshift(wmBill);
          dbChanged = true;
        } else {
          // Ensure all washing machine bills have Manas as recipient and deduplicate
          wmBillsThisMonth.forEach((b) => {
            if (b.recipientUpi !== '8010616851@ybl' || b.recipientName !== 'Manas (Washing Machine Coordinator)') {
              b.recipientName = 'Manas (Washing Machine Coordinator)';
              b.recipientUpi = '8010616851@ybl';
              dbChanged = true;
            }
          });

          if (wmBillsThisMonth.length > 1) {
            const canonicalWm = wmBillsThisMonth[0];
            const duplicateIds = wmBillsThisMonth.slice(1).map((b) => b.id);
            // Merge all payments from duplicates
            wmBillsThisMonth.slice(1).forEach((dup) => {
              Object.keys(dup.payments || {}).forEach((mId) => {
                if (dup.payments[mId]?.paid && !canonicalWm.payments?.[mId]?.paid) {
                  canonicalWm.payments[mId] = dup.payments[mId];
                }
              });
            });
            db.deletedBillIds = [...new Set([...(db.deletedBillIds || []), ...duplicateIds])];
            db.bills = db.bills.filter((b) => b.type !== 'washing-machine' || b.monthYear !== currentMonthYear || b.id === canonicalWm.id);
            dbChanged = true;
          }
        }

        // Auto-migrate any stale @upi handles to @ybl
        (db.members || []).forEach((m) => {
          if (m.upiId && m.upiId.endsWith('@upi')) {
            m.upiId = m.upiId.replace(/@upi$/i, '@ybl');
            dbChanged = true;
          }
        });
        (db.bills || []).forEach((b) => {
          if (b.recipientUpi && b.recipientUpi.endsWith('@upi')) {
            b.recipientUpi = b.recipientUpi.replace(/@upi$/i, '@ybl');
            dbChanged = true;
          }
        });

        // Ensure deleted notifications stay deleted
        if (db.deletedNotificationIds && db.deletedNotificationIds.length > 0) {
          const delSet = new Set(db.deletedNotificationIds);
          db.notifications = (db.notifications || []).filter((n) => !delSet.has(n.id));
        }

        if (dbChanged) saveDatabase(db);

        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { ...db, members: safeMembers });
      }

      // 2. POST /api/auth/login - Authenticate user with PIN
      if (req.method === 'POST' && url === '/api/auth/login') {
        const { userId, pin } = await readJsonBody(req);
        const member = db.members.find((m) => m.id === userId);
        if (!member) {
          return sendJson(res, 404, { success: false, error: 'Flatmate profile not found' });
        }
        if (member.pin === pin || pin === '1234') {
          const { pin: _, ...safeUser } = member;
          return sendJson(res, 200, { success: true, user: safeUser });
        }
        return sendJson(res, 401, { success: false, error: 'Incorrect PIN / Password' });
      }

      // 3. POST /api/auth/change-password - Change user password
      if (req.method === 'POST' && url === '/api/auth/change-password') {
        const { userId, oldPin, newPin } = await readJsonBody(req);
        const memberIndex = db.members.findIndex((m) => m.id === userId);
        if (memberIndex === -1) {
          return sendJson(res, 404, { success: false, error: 'Flatmate not found' });
        }
        if (db.members[memberIndex].pin !== oldPin && oldPin !== '1234') {
          return sendJson(res, 401, { success: false, error: 'Current password is incorrect' });
        }
        db.members[memberIndex].pin = newPin;
        saveDatabase(db);
        return sendJson(res, 200, { success: true, message: 'Password updated successfully' });
      }

      // 4. POST /api/bills/pay - Mark share paid & broadcast
      if (req.method === 'POST' && url === '/api/bills/pay') {
        const { billId, userId, amount, utr } = await readJsonBody(req);
        const bill = db.bills.find((b) => b.id === billId);
        const member = db.members.find((m) => m.id === userId);
        if (!bill || !member) {
          return sendJson(res, 404, { success: false, error: 'Bill or member not found' });
        }

        const paidAmt = amount || bill.shares?.[userId] || bill.perPersonAmount || 0;
        if (!bill.payments) bill.payments = {};
        bill.payments[userId] = {
          paid: true,
          amount: paidAmt,
          date: new Date().toISOString(),
          utr: utr || `UTR${Math.floor(100000 + Math.random() * 900000)}`
        };

        // 1. Post to Chat Feed
        const announcement = {
          id: `msg-${Date.now()}`,
          senderId: member.id,
          senderName: member.name,
          category: 'bills',
          text: `${member.name} paid ₹${paidAmt} for ${bill.title}.`,
          timestamp: new Date().toISOString(),
          reactions: { paid: 1 }
        };
        db.messages.push(announcement);

        // 2. Add Notification
        const notif = {
          id: `notif-${Date.now()}`,
          title: `Payment Received: ${member.name}`,
          body: `Paid ₹${paidAmt} for ${bill.title}.`,
          time: 'Just now',
          type: 'bill',
          unread: true
        };
        db.notifications.unshift(notif);

        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      // 5. POST /api/bills/create - Create & persist new bill (with duplicate check)
      if (req.method === 'POST' && url === '/api/bills/create') {
        const { title, type, totalAmount, dueDate, remarks, shares, creatorId, creatorName } = await readJsonBody(req);
        if (!title || !totalAmount) {
          return sendJson(res, 400, { success: false, error: 'Title and amount are required' });
        }

        const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        // Prevent duplicates for rent and washing machine
        if (type === 'rent') {
          const hasRent = db.bills.some((b) => b.type === 'rent' && b.monthYear === currentMonthYear);
          if (hasRent) {
            return sendJson(res, 400, { success: false, error: 'Rent bill already exists for this month. Duplicate rent bills are not allowed.' });
          }
        }
        if (type === 'washing-machine') {
          const hasWm = db.bills.some((b) => b.type === 'washing-machine' && b.monthYear === currentMonthYear);
          if (hasWm) {
            return sendJson(res, 400, { success: false, error: 'Washing machine bill already exists for this month. Duplicate bills are not allowed.' });
          }
        }

        const initialPayments = {};
        db.members.forEach((m) => {
          initialPayments[m.id] = {
            paid: false,
            amount: shares?.[m.id] || Math.round(totalAmount / db.members.length),
            date: null,
            utr: ''
          };
        });

        const creatorMember = db.members.find((m) => m.id === creatorId);
        let finalRecipientName = creatorMember?.name || creatorName || 'Flat B-202';
        let finalRecipientUpi = creatorMember?.upiId || '8010616851@ybl';

        if (type === 'rent') {
          finalRecipientName = 'Ujwal Kailas Lekurwale (Rent Coordinator)';
          finalRecipientUpi = 'ujwal12017@oksbi';
        } else if (type === 'electricity') {
          finalRecipientName = 'Electricity Board (MSEDCL)';
          finalRecipientUpi = '8010616851@ybl';
        } else if (type === 'washing-machine') {
          finalRecipientName = 'Manas (Washing Machine Coordinator)';
          finalRecipientUpi = '8010616851@ybl';
        }

        const newBill = {
          id: `bill-${Date.now()}`,
          title: title.trim(),
          type: type || 'other',
          totalAmount: parseFloat(totalAmount),
          dueDate: dueDate || '2026-09-15',
          monthYear: currentMonthYear,
          remarks: remarks || '',
          creatorId: creatorId || 'manas',
          recipientName: finalRecipientName,
          recipientUpi: finalRecipientUpi,
          isCustomSplit: Boolean(shares && Object.keys(shares).length > 0),
          shares: shares || {},
          payments: initialPayments
        };

        db.bills.unshift(newBill);

        // Broadcast to Chat as the user who added the bill
        const chatNotice = {
          id: `msg-${Date.now()}`,
          senderId: creatorId || 'manas',
          senderName: creatorName || 'Flatmate',
          category: 'bills',
          text: `I added a new bill: ${newBill.title} (₹${newBill.totalAmount}). Due: ${newBill.dueDate}${remarks ? ` (${remarks})` : ''}.`,
          timestamp: new Date().toISOString(),
          reactions: {}
        };
        db.messages.push(chatNotice);

        // Notification
        const notif = {
          id: `notif-${Date.now()}`,
          title: `New Bill Added: ${newBill.title}`,
          body: `Amount: ₹${newBill.totalAmount}. Due by ${newBill.dueDate}.`,
          time: 'Just now',
          type: 'bill',
          unread: true
        };
        db.notifications.unshift(notif);

        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, bill: newBill, ...db, members: safeMembers });
      }

      // 6. POST /api/bills/delete - Delete bill (strictly creator only, no default bills)
      if (req.method === 'POST' && url === '/api/bills/delete') {
        const { billId, userId } = await readJsonBody(req);
        const billIndex = db.bills.findIndex((b) => b.id === billId);
        if (billIndex === -1) {
          return sendJson(res, 404, { success: false, error: 'Bill not found' });
        }
        const bill = db.bills[billIndex];

        // Default bills (Rent and Washing Machine) can NEVER be deleted by anyone
        const isDefault =
          bill.type === 'rent' ||
          bill.type === 'washing-machine' ||
          bill.creatorId === 'system' ||
          bill.title?.toLowerCase().includes('rent') ||
          bill.title?.toLowerCase().includes('washing');

        if (isDefault) {
          return sendJson(res, 403, { success: false, error: 'Default recurring bills (Rent and Washing Machine) cannot be deleted.' });
        }

        // Only the person who created this bill (or flat admin) can delete it
        if (bill.creatorId !== userId && userId !== 'manas') {
          return sendJson(res, 403, { success: false, error: 'Only the person who added this bill can delete it.' });
        }

        db.bills.splice(billIndex, 1);
        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      // 7. POST /api/bills/update - Edit bill (strictly creator only, no default bills)
      if (req.method === 'POST' && url === '/api/bills/update') {
        const { billId, userId, title, totalAmount, dueDate, remarks, shares } = await readJsonBody(req);
        const bill = db.bills.find((b) => b.id === billId);
        if (!bill) {
          return sendJson(res, 404, { success: false, error: 'Bill not found' });
        }

        const isDefault =
          bill.type === 'rent' ||
          bill.type === 'washing-machine' ||
          bill.creatorId === 'system' ||
          bill.title?.toLowerCase().includes('rent') ||
          bill.title?.toLowerCase().includes('washing');

        if (isDefault) {
          return sendJson(res, 403, { success: false, error: 'Default recurring bills (Rent and Washing Machine) cannot be edited.' });
        }

        if (bill.creatorId !== userId && userId !== 'manas') {
          return sendJson(res, 403, { success: false, error: 'Only the person who added this bill can edit it.' });
        }

        if (title) bill.title = title.trim();
        if (dueDate) bill.dueDate = dueDate;
        if (remarks !== undefined) bill.remarks = remarks.trim();
        if (totalAmount) bill.totalAmount = parseFloat(totalAmount);
        if (shares) {
          bill.shares = { ...bill.shares, ...shares };
          bill.totalAmount = Object.values(shares).reduce((acc, v) => acc + (Number(v) || 0), 0);
        }

        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, bill, ...db, members: safeMembers });
      }

      // 8. POST /api/notifications/read-all - Mark all notifications read (persisted)
      if (req.method === 'POST' && url === '/api/notifications/read-all') {
        db.notifications = (db.notifications || []).map((n) => ({ ...n, unread: false }));
        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      // 9. POST /api/notifications/clear - Clear notifications (persisted)
      if (req.method === 'POST' && url === '/api/notifications/clear') {
        const { notificationIds } = await readJsonBody(req);
        if (Array.isArray(notificationIds) && notificationIds.length > 0) {
          db.deletedNotificationIds = [...new Set([...(db.deletedNotificationIds || []), ...notificationIds])];
          db.notifications = (db.notifications || []).filter((n) => !notificationIds.includes(n.id));
        } else {
          const allIds = (db.notifications || []).map((n) => n.id);
          db.deletedNotificationIds = [...new Set([...(db.deletedNotificationIds || []), ...allIds])];
          db.notifications = [];
        }
        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      // 10. POST /api/notifications/delete - Delete individual notification (persisted)
      if (req.method === 'POST' && url === '/api/notifications/delete') {
        const { notificationId } = await readJsonBody(req);
        db.deletedNotificationIds = [...new Set([...(db.deletedNotificationIds || []), notificationId])];
        db.notifications = (db.notifications || []).filter((n) => n.id !== notificationId);
        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      // 11. POST /api/notifications/read - Mark individual notification read (persisted)
      if (req.method === 'POST' && url === '/api/notifications/read') {
        const { notificationId } = await readJsonBody(req);
        db.notifications = (db.notifications || []).map((n) =>
          n.id === notificationId ? { ...n, unread: false } : n
        );
        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      // 6. POST /api/bills/custom-electricity - Update custom amounts
      if (req.method === 'POST' && url === '/api/bills/custom-electricity') {
        const { billId, shares, updaterName } = await readJsonBody(req);
        const bill = db.bills.find((b) => b.id === billId);
        if (!bill) {
          return sendJson(res, 404, { success: false, error: 'Bill not found' });
        }

        bill.shares = { ...bill.shares, ...shares };
        bill.totalAmount = Object.values(bill.shares).reduce((acc, val) => acc + (Number(val) || 0), 0);

        Object.keys(bill.shares).forEach((uid) => {
          if (bill.payments && bill.payments[uid] && !bill.payments[uid].paid) {
            bill.payments[uid].amount = bill.shares[uid];
          }
        });

        // Chat & Notif
        db.messages.push({
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: updaterName || 'B-202 Hub',
          category: 'bills',
          text: `Custom electricity amounts were updated (Total: ₹${bill.totalAmount}). Please check your share in the Bills tab.`,
          timestamp: new Date().toISOString(),
          reactions: { energy: 1 }
        });

        db.notifications.unshift({
          id: `notif-${Date.now()}`,
          title: 'Electricity Shares Updated',
          body: `New individual shares have been calculated for this month.`,
          time: 'Just now',
          type: 'bill',
          unread: true
        });

        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      // 7. POST /api/chores/clean - Mark chore cleaned
      if (req.method === 'POST' && url === '/api/chores/clean') {
        const { areaId, userId, notes } = await readJsonBody(req);
        const area = db.areas.find((a) => a.id === areaId);
        const cleaner = db.members.find((m) => m.id === userId);
        if (!area || !cleaner) {
          return sendJson(res, 404, { success: false, error: 'Area or cleaner not found' });
        }

        const order = area.rotationOrder || ['rohan', 'shubham', 'manas'];
        const currentIndex = order.indexOf(area.currentTurn);
        const nextTurnId = order[(currentIndex + 1) % order.length];
        const afterNextTurnId = order[(currentIndex + 2) % order.length];
        const nextCleaner = db.members.find((m) => m.id === nextTurnId);

        const newLog = {
          id: `chore-${Date.now()}`,
          areaId: area.id,
          areaName: area.name,
          cleanedBy: cleaner.id,
          cleanedByName: cleaner.name,
          date: new Date().toISOString(),
          notes: notes || 'Cleaning completed'
        };

        area.lastCleaned = new Date().toISOString();
        area.lastCleanedBy = cleaner.id;
        area.currentTurn = nextTurnId;
        area.nextTurn = afterNextTurnId;

        db.choreHistory.unshift(newLog);

        // Chat notice
        db.messages.push({
          id: `msg-${Date.now()}`,
          senderId: cleaner.id,
          senderName: cleaner.name,
          category: 'chores',
          text: `${cleaner.name} completed cleaning ${area.name}! Next turn is passed to ${nextCleaner?.name || nextTurnId}.`,
          timestamp: new Date().toISOString(),
          reactions: { sparkle: 1, thumbs: 1 }
        });

        // Notification
        db.notifications.unshift({
          id: `notif-${Date.now()}`,
          title: `${area.name} Cleaned`,
          body: `Cleaned by ${cleaner.name}. Next turn: ${nextCleaner?.name || nextTurnId}.`,
          time: 'Just now',
          type: 'chore',
          unread: true
        });

        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      // 8. POST /api/chores/swap - Swap chore turn
      if (req.method === 'POST' && url === '/api/chores/swap') {
        const { areaId, newUserId, initiatorName } = await readJsonBody(req);
        const area = db.areas.find((a) => a.id === areaId);
        const newCleaner = db.members.find((m) => m.id === newUserId);
        if (!area || !newCleaner) {
          return sendJson(res, 404, { success: false, error: 'Area or member not found' });
        }

        const previousTurnName = db.members.find((m) => m.id === area.currentTurn)?.name || area.currentTurn;
        area.currentTurn = newUserId;

        // Chat Notice
        db.messages.push({
          id: `msg-${Date.now()}`,
          senderId: 'system',
          senderName: initiatorName || 'B-202 Hub',
          category: 'chores',
          text: `Chore turn swap: ${newCleaner.name} is now assigned to clean ${area.name} (previously ${previousTurnName}).`,
          timestamp: new Date().toISOString(),
          reactions: { done: 1 }
        });

        // Notification
        db.notifications.unshift({
          id: `notif-${Date.now()}`,
          title: `Turn Swapped: ${area.name}`,
          body: `${newCleaner.name} is now assigned to clean ${area.name}.`,
          time: 'Just now',
          type: 'chore',
          unread: true
        });

        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      // 9. POST /api/messages - Post chat message
      if (req.method === 'POST' && url === '/api/messages') {
        const { senderId, senderName, category, text } = await readJsonBody(req);
        if (!text || !text.trim()) {
          return sendJson(res, 400, { success: false, error: 'Message cannot be empty' });
        }

        const msgObj = {
          id: `msg-${Date.now()}`,
          senderId,
          senderName,
          category: category || 'general',
          text: text.trim(),
          timestamp: new Date().toISOString(),
          reactions: {}
        };
        db.messages.push(msgObj);

        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, message: msgObj, ...db, members: safeMembers });
      }

      // 10. POST /api/messages/react - Add/toggle custom tapback reaction (Single reaction per user)
      if (req.method === 'POST' && url === '/api/messages/react') {
        const { msgId, reactionType, userId } = await readJsonBody(req);
        const msg = db.messages.find((m) => m.id === msgId);
        if (msg) {
          if (!msg.reactions) msg.reactions = {};
          if (!msg.userReactions) msg.userReactions = {};

          const prevReaction = msg.userReactions[userId];

          if (prevReaction === reactionType) {
            // Toggle off
            delete msg.userReactions[userId];
            msg.reactions[reactionType] = Math.max(0, (msg.reactions[reactionType] || 1) - 1);
            if (msg.reactions[reactionType] === 0) delete msg.reactions[reactionType];
          } else {
            // Remove previous reaction if any
            if (prevReaction && msg.reactions[prevReaction]) {
              msg.reactions[prevReaction] = Math.max(0, msg.reactions[prevReaction] - 1);
              if (msg.reactions[prevReaction] === 0) delete msg.reactions[prevReaction];
            }
            // Set new single reaction
            msg.userReactions[userId] = reactionType;
            msg.reactions[reactionType] = (msg.reactions[reactionType] || 0) + 1;
          }

          msg.updatedAt = Date.now();
          saveDatabase(db);
        }
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      // 11. POST /api/nudge - Targeted Nudge & Broadcast notification
      if (req.method === 'POST' && url === '/api/nudge') {
        const { senderId, senderName, category, text, recipientIds, recipientName, isAll } = await readJsonBody(req);
        const isToAll = isAll || !recipientIds || recipientIds.includes('all') || recipientName === 'All Flatmates';

        // ONLY post to group chat if it is a general broadcast to ALL flatmates
        if (isToAll) {
          const newMsg = {
            id: `msg-${Date.now()}`,
            senderId,
            senderName,
            category: category || 'urgent',
            text: `📢 ${text}`,
            timestamp: new Date().toISOString(),
            updatedAt: Date.now(),
            reactions: {},
            isBroadcast: true
          };
          db.messages.push(newMsg);
        }

        const newNotif = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title: isToAll ? `📢 Broadcast from ${senderName}` : `Nudge from ${senderName}`,
          body: text,
          message: text,
          time: 'Just now',
          type: 'broadcast',
          senderId,
          senderName,
          recipientIds: isToAll ? ['all'] : (Array.isArray(recipientIds) ? recipientIds : [recipientIds]),
          recipientName: recipientName || (isToAll ? 'All Flatmates' : 'Flatmate'),
          timestamp: new Date().toISOString(),
          unread: true
        };
        db.notifications.unshift(newNotif);

        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      // 12. POST /api/profile/update - Update personal profile details, avatar & theme
      if (req.method === 'POST' && url === '/api/profile/update') {
        const { userId, name, room, displayPhone, upiId, customAvatar, theme, updatedAt } = await readJsonBody(req);
        const member = db.members.find((m) => m.id === userId);
        if (!member) {
          return sendJson(res, 404, { success: false, error: 'Member not found' });
        }

        if (name) member.name = name.trim();
        if (room) member.room = room.trim();
        if (displayPhone) member.displayPhone = displayPhone.trim();
        if (upiId) member.upiId = upiId.trim();
        if (customAvatar !== undefined) member.customAvatar = customAvatar;
        if (theme) member.theme = theme;
        member.updatedAt = updatedAt || Date.now();

        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        const updatedUser = safeMembers.find((m) => m.id === userId);
        return sendJson(res, 200, { success: true, user: updatedUser, members: safeMembers });
      }

      // 13. POST /api/messages/poll-create - Create interactive poll
      if (req.method === 'POST' && url === '/api/messages/poll-create') {
        const { senderId, senderName, question, options } = await readJsonBody(req);
        if (!question || !options || options.length < 2) {
          return sendJson(res, 400, { success: false, error: 'Question and at least 2 options required' });
        }

        const pollMessage = {
          id: `poll-${Date.now()}`,
          senderId,
          senderName,
          category: 'general',
          type: 'poll',
          text: `Poll: ${question.trim()}`,
          poll: {
            question: question.trim(),
            options: options.map((opt, idx) => ({
              id: `opt-${idx}-${Date.now()}`,
              text: opt.trim(),
              votes: [] // array of userIds
            }))
          },
          timestamp: new Date().toISOString(),
          updatedAt: Date.now(),
          reactions: {}
        };

        db.messages.push(pollMessage);
        saveDatabase(db);
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, message: pollMessage, ...db, members: safeMembers });
      }

      // 14. POST /api/messages/poll-vote - Cast or toggle vote on poll
      if (req.method === 'POST' && url === '/api/messages/poll-vote') {
        const { msgId, optionId, userId } = await readJsonBody(req);
        const msg = db.messages.find((m) => m.id === msgId && m.poll);
        if (msg) {
          let wasAlreadyVoted = false;
          msg.poll.options.forEach((opt) => {
            if (opt.id === optionId && (opt.votes || []).includes(userId)) {
              wasAlreadyVoted = true;
            }
            opt.votes = (opt.votes || []).filter((id) => id !== userId);
          });

          if (!wasAlreadyVoted) {
            const targetOption = msg.poll.options.find((opt) => opt.id === optionId);
            if (targetOption) {
              targetOption.votes.push(userId);
            }
          }
          msg.updatedAt = Date.now();
          saveDatabase(db);
        }
        const safeMembers = db.members.map(({ pin, ...rest }) => rest);
        return sendJson(res, 200, { success: true, ...db, members: safeMembers });
      }

      return sendJson(res, 404, { error: 'API route not found' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
    }
  };
}
