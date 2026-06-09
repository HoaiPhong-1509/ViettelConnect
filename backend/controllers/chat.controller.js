import db from '../db.js';
import { uploadToMinio, getPresignedUrl } from '../services/minio.service.js';
import { createConversationAddedNotification } from '../src/services/notification.service.js';

const POST_SHARE_PREFIX = '__POST_SHARE__';

export const getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
            SELECT 
                c.id, 
                c.ten as name, 
                c.la_nhom as is_group, 
                c.ngay_tao as created_at,
                (SELECT noi_dung FROM tin_nhan m WHERE m.id_cuoc_tro_chuyen = c.id ORDER BY ngay_tao DESC LIMIT 1) as last_message,
                (SELECT loai FROM tin_nhan m WHERE m.id_cuoc_tro_chuyen = c.id ORDER BY ngay_tao DESC LIMIT 1) as last_message_type,
                (SELECT ngay_tao FROM tin_nhan m WHERE m.id_cuoc_tro_chuyen = c.id ORDER BY ngay_tao DESC LIMIT 1) as last_message_time,
                (
                    SELECT nd.TenDangNhap 
                    FROM nguoi_tham_gia p2 
                    JOIN nguoidung nd ON nd.Id = p2.id_nguoi_dung 
                    WHERE p2.id_cuoc_tro_chuyen = c.id AND p2.id_nguoi_dung != ? 
                    LIMIT 1
                ) as other_user_name,
                (
                    SELECT nd.AnhDaiDienKey 
                    FROM nguoi_tham_gia p2 
                    JOIN nguoidung nd ON nd.Id = p2.id_nguoi_dung 
                    WHERE p2.id_cuoc_tro_chuyen = c.id AND p2.id_nguoi_dung != ? 
                    LIMIT 1
                ) as other_user_avatar_key
            FROM cuoc_tro_chuyen c
            JOIN nguoi_tham_gia p ON c.id = p.id_cuoc_tro_chuyen
            WHERE p.id_nguoi_dung = ? AND p.ngay_xoa IS NULL
            ORDER BY last_message_time DESC
        `;
        const [conversations] = await db.execute(query, [userId, userId, userId]);
        
        for (let conv of conversations) {
            if (typeof conv.last_message === 'string' && conv.last_message.startsWith(POST_SHARE_PREFIX)) {
                conv.last_message = 'Đã chia sẻ một bài viết';
            }

            if (conv.other_user_avatar_key) {
                conv.other_user_avatar = await getPresignedUrl(conv.other_user_avatar_key);
            } else if (!conv.is_group) {
                conv.other_user_avatar = await getPresignedUrl('avatars/Default_Avatar.jpg');
            }
            if (conv.last_message_type !== 'van_ban' && conv.last_message_type !== null) {
                conv.last_message = 'Đã gửi file phương tiện đính kèm';
            }
        }
        res.status(200).json({ success: true, data: conversations });
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

export const createConversation = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const userId = req.user.id;
        const { isGroup, name, memberIds } = req.body;
        
        // Nếu là chat 1-1, kiểm tra xem đã tồn tại chưa
        if (!isGroup && memberIds && memberIds.length === 1) {
            const targetUserId = memberIds[0];
            const checkQuery = `
                SELECT c.id 
                FROM cuoc_tro_chuyen c
                JOIN nguoi_tham_gia p1 ON c.id = p1.id_cuoc_tro_chuyen
                JOIN nguoi_tham_gia p2 ON c.id = p2.id_cuoc_tro_chuyen
                WHERE c.la_nhom = 0 
                AND p1.id_nguoi_dung = ? 
                AND p2.id_nguoi_dung = ?
                LIMIT 1
            `;
            const [existing] = await connection.execute(checkQuery, [userId, targetUserId]);
            if (existing.length > 0) {
                await connection.commit();
                const conversationId = existing[0].id;
                const [existingRows] = await connection.execute(`
                    SELECT 
                        c.id, 
                        c.ten as name, 
                        c.la_nhom as is_group, 
                        (
                            SELECT nd.TenDangNhap 
                            FROM nguoi_tham_gia p2 
                            JOIN nguoidung nd ON nd.Id = p2.id_nguoi_dung 
                            WHERE p2.id_cuoc_tro_chuyen = c.id AND p2.id_nguoi_dung != ? 
                            LIMIT 1
                        ) as other_user_name,
                        (
                            SELECT nd.AnhDaiDienKey 
                            FROM nguoi_tham_gia p2 
                            JOIN nguoidung nd ON nd.Id = p2.id_nguoi_dung 
                            WHERE p2.id_cuoc_tro_chuyen = c.id AND p2.id_nguoi_dung != ? 
                            LIMIT 1
                        ) as other_user_avatar_key
                    FROM cuoc_tro_chuyen c WHERE c.id = ?
                `, [userId, userId, conversationId]);
                
                const responseData = existingRows[0];
                if (responseData.other_user_avatar_key) {
                    responseData.other_user_avatar = await getPresignedUrl(responseData.other_user_avatar_key);
                } else {
                    responseData.other_user_avatar = await getPresignedUrl('avatars/Default_Avatar.jpg');
                }

                return res.status(200).json({ success: true, data: responseData });
            }
        }

        const [result] = await connection.execute(
            `INSERT INTO cuoc_tro_chuyen (ten, la_nhom) VALUES (?, ?)`, 
            [isGroup ? name : null, isGroup ? 1 : 0]
        );
        const conversationId = result.insertId;

        await connection.execute(
            `INSERT INTO nguoi_tham_gia (id_cuoc_tro_chuyen, id_nguoi_dung, vai_tro) VALUES (?, ?, ?)`,
            [conversationId, userId, isGroup ? 'chu_nhom' : 'thanh_vien']
        );

        if (memberIds && memberIds.length > 0) {
            for (let mId of memberIds) {
                await connection.execute(
                    `INSERT INTO nguoi_tham_gia (id_cuoc_tro_chuyen, id_nguoi_dung, vai_tro) VALUES (?, ?, ?)`,
                    [conversationId, mId, 'thanh_vien']
                );
            }
        }
        await connection.commit();

        const notificationTargets = Array.isArray(memberIds) ? memberIds : [];
        await Promise.all(notificationTargets.map((targetUserId) => createConversationAddedNotification({
            actorId: userId,
            recipientId: targetUserId,
            conversationId,
            conversationName: isGroup ? name : 'Cuộc trò chuyện mới',
        })));
        
        // Fetch to get exact data for consistency
        const [insertedRows] = await connection.execute(`
            SELECT 
                c.id, 
                c.ten as name, 
                c.la_nhom as is_group, 
                (
                    SELECT nd.TenDangNhap 
                    FROM nguoi_tham_gia p2 
                    JOIN nguoidung nd ON nd.Id = p2.id_nguoi_dung 
                    WHERE p2.id_cuoc_tro_chuyen = c.id AND p2.id_nguoi_dung != ? 
                    LIMIT 1
                ) as other_user_name,
                (
                    SELECT nd.AnhDaiDienKey 
                    FROM nguoi_tham_gia p2 
                    JOIN nguoidung nd ON nd.Id = p2.id_nguoi_dung 
                    WHERE p2.id_cuoc_tro_chuyen = c.id AND p2.id_nguoi_dung != ? 
                    LIMIT 1
                ) as other_user_avatar_key
            FROM cuoc_tro_chuyen c WHERE c.id = ?
        `, [userId, userId, conversationId]);

        const finalData = insertedRows[0];
        if (finalData.other_user_avatar_key) {
            finalData.other_user_avatar = await getPresignedUrl(finalData.other_user_avatar_key);
        } else if (!finalData.is_group) {
            finalData.other_user_avatar = await getPresignedUrl('avatars/Default_Avatar.jpg');
        }

        res.status(201).json({ success: true, data: finalData });
    } catch (error) {
        await connection.rollback();
        console.error("Error creating conversation:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    } finally {
        connection.release();
    }
};

export const getMessages = async (req, res) => {
    try {
        const conversationId = req.params.id;
        const { cursor, limit = 20 } = req.query;
        let query = `
            SELECT 
                t.id, 
                t.id_nguoi_gui as sender_id, 
                t.noi_dung as content, 
                t.loai as type, 
                t.ngay_tao as created_at,
                n.AnhDaiDienKey,
                n.AnhDaiDienUrl
            FROM tin_nhan t
            JOIN nguoidung n ON t.id_nguoi_gui = n.Id
            WHERE t.id_cuoc_tro_chuyen = ?
        `;
        const params = [conversationId];

        if (cursor) {
            query += ` AND t.id < ?`;
            params.push(cursor);
        }
        query += ` ORDER BY t.ngay_tao DESC LIMIT ?`;
        params.push(Number(limit));

        const [messages] = await db.execute(query, params);
        
        const formatMessages = messages.reverse();
        for (let msg of formatMessages) {
            if (msg.type !== 'van_ban' && msg.content && !msg.content.startsWith('http')) {
                msg.content = await getPresignedUrl(msg.content);
            }
            if (msg.AnhDaiDienKey) {
                msg.sender_avatar = await getPresignedUrl(msg.AnhDaiDienKey);
            } else if (msg.AnhDaiDienUrl) {
                msg.sender_avatar = msg.AnhDaiDienUrl;
            } else {
                msg.sender_avatar = await getPresignedUrl('avatars/Default_Avatar.jpg');
            }
            delete msg.AnhDaiDienKey;
            delete msg.AnhDaiDienUrl;
        }
        res.status(200).json({ success: true, data: formatMessages });
    } catch (error) {
        console.error("Error getting messages:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

export const sendMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const conversationId = req.params.id;
        let { content, type } = req.body;
        
        let dbType = type === 'image' ? 'hinh_anh' : (type === 'video' ? 'video' : 'van_ban');
        let socketContent = content;

        if (req.files && req.files.length > 0) {
            const file = req.files[0];
            const fileKey = `chat_media/${Date.now()}_${file.originalname}`;
            await uploadToMinio(fileKey, file.buffer, file.mimetype);
            content = fileKey; // Lưu key tĩnh vào database
            socketContent = await getPresignedUrl(fileKey); // Gửi presigned URL cho socket
            dbType = file.mimetype.startsWith('video') ? 'video' : 'hinh_anh';
        }

        const [result] = await db.execute(
            `INSERT INTO tin_nhan (id_cuoc_tro_chuyen, id_nguoi_gui, noi_dung, loai) VALUES (?, ?, ?, ?)`,
            [conversationId, userId, content, dbType]
        );

        // Fetch sender avatar for the socket message
        const [senderInfo] = await db.execute(`SELECT AnhDaiDienKey, AnhDaiDienUrl FROM nguoidung WHERE Id = ?`, [userId]);
        let senderAvatar = await getPresignedUrl('avatars/Default_Avatar.jpg');
        if (senderInfo.length > 0) {
            if (senderInfo[0].AnhDaiDienKey) {
                senderAvatar = await getPresignedUrl(senderInfo[0].AnhDaiDienKey);
            } else if (senderInfo[0].AnhDaiDienUrl) {
                senderAvatar = senderInfo[0].AnhDaiDienUrl;
            }
        }

        const newMessage = {
            id: result.insertId,
            conversation_id: conversationId,
            sender_id: userId,
            sender_avatar: senderAvatar,
            content: socketContent,
            type: dbType,
            created_at: new Date()
        };

        if (req.io) {
            req.io.to(`conv_${conversationId}`).emit('new_message', newMessage);
        }
        res.status(201).json({ success: true, data: newMessage });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

export const deleteConversation = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const userId = req.user.id;
        const conversationId = req.params.id;

        const [participants] = await connection.execute(
            `SELECT p.vai_tro, c.la_nhom 
             FROM nguoi_tham_gia p 
             JOIN cuoc_tro_chuyen c ON p.id_cuoc_tro_chuyen = c.id 
             WHERE p.id_cuoc_tro_chuyen = ? AND p.id_nguoi_dung = ?`,
            [conversationId, userId]
        );

        if (participants.length === 0) return res.status(403).json({ success: false, message: "Không có quyền" });
        if (participants[0].la_nhom && participants[0].vai_tro !== 'chu_nhom') {
            return res.status(403).json({ success: false, message: "Chỉ trưởng nhóm mới xóa được" });
        }

        await connection.execute(`DELETE FROM tin_nhan WHERE id_cuoc_tro_chuyen = ?`, [conversationId]);
        await connection.execute(`DELETE FROM nguoi_tham_gia WHERE id_cuoc_tro_chuyen = ?`, [conversationId]);
        await connection.execute(`DELETE FROM cuoc_tro_chuyen WHERE id = ?`, [conversationId]);

        await connection.commit();
        if (req.io) {
            req.io.to(`conv_${conversationId}`).emit('conversation_deleted', { conversationId });
        }
        res.status(200).json({ success: true, message: "Đã xóa đoạn chat" });
    } catch (error) {
        await connection.rollback();
        console.error("Error deleting conversation:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    } finally {
        connection.release();
    }
};

export const getMembers = async (req, res) => {
    try {
        const conversationId = req.params.id;
        const query = `
            SELECT 
                p.vai_tro as role,
                nd.Id as id,
                nd.TenDangNhap as username,
                nd.AnhDaiDienKey,
                nd.AnhDaiDienUrl
            FROM nguoi_tham_gia p
            JOIN nguoidung nd ON p.id_nguoi_dung = nd.Id
            WHERE p.id_cuoc_tro_chuyen = ?
        `;
        const [members] = await db.execute(query, [conversationId]);
        
        for (let member of members) {
             if (member.AnhDaiDienKey) {
                 member.avatar = await getPresignedUrl(member.AnhDaiDienKey);
             } else if (member.AnhDaiDienUrl) {
                 member.avatar = member.AnhDaiDienUrl;
             } else {
                 member.avatar = await getPresignedUrl('avatars/Default_Avatar.jpg');
             }
        }
        
        res.status(200).json({ success: true, data: members });
    } catch (error) {
        console.error("Error getting members:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

export const addMember = async (req, res) => {
    try {
        const adminId = req.user.id;
        const conversationId = req.params.id;
        const { targetUserId } = req.body;

        const [adminInfo] = await db.execute(
            `SELECT vai_tro FROM nguoi_tham_gia WHERE id_cuoc_tro_chuyen = ? AND id_nguoi_dung = ?`,
            [conversationId, adminId]
        );

        if (adminInfo.length === 0 || adminInfo[0].vai_tro !== 'chu_nhom') {
            return res.status(403).json({ success: false, message: "Chỉ trưởng nhóm mới được thêm người" });
        }

        await db.execute(`INSERT INTO nguoi_tham_gia (id_cuoc_tro_chuyen, id_nguoi_dung, vai_tro) VALUES (?, ?, 'thanh_vien')`, [conversationId, targetUserId]);
        void createConversationAddedNotification({
            actorId: adminId,
            recipientId: targetUserId,
            conversationId,
            conversationName: 'Cuộc trò chuyện',
        }).catch((error) => {
            console.error('Không thể tạo thông báo thêm vào cuộc trò chuyện:', error);
        });
        
        if (req.io) {
            req.io.to(`conv_${conversationId}`).emit('member_added', { conversationId, targetUserId });
        }
        res.status(200).json({ success: true, message: "Đã thêm thành viên" });
    } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

export const removeMember = async (req, res) => {
    try {
        const adminId = req.user.id;
        const conversationId = req.params.id;
        const targetUserId = req.params.userId;

        const [adminInfo] = await db.execute(
            `SELECT p.vai_tro, c.la_nhom 
             FROM nguoi_tham_gia p 
             JOIN cuoc_tro_chuyen c ON p.id_cuoc_tro_chuyen = c.id
             WHERE p.id_cuoc_tro_chuyen = ? AND p.id_nguoi_dung = ?`,
            [conversationId, adminId]
        );

        if (adminInfo.length === 0 || (adminInfo[0].la_nhom && adminInfo[0].vai_tro !== 'chu_nhom' && adminId != targetUserId)) {
            return res.status(403).json({ success: false, message: "Bạn không có quyền quản lý" });
        }

        await db.execute(`DELETE FROM nguoi_tham_gia WHERE id_cuoc_tro_chuyen = ? AND id_nguoi_dung = ?`, [conversationId, targetUserId]);
        if (req.io) {
            req.io.to(`conv_${conversationId}`).emit('member_removed', { conversationId, targetUserId });
        }
        res.status(200).json({ success: true, message: "Đã xóa thành viên" });
    } catch (error) {
        console.error("Error removing user:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

export const search = async (req, res) => {
    try {
        const { query } = req.query;
        const keyword = typeof query === 'string' ? query.trim() : '';

        if (!keyword) {
            return res.status(200).json({ success: true, data: { users: [], groups: [] } });
        }

        // Search both people and group chats the current user belongs to.
        const [users] = await db.execute(
            `SELECT Id as id, TenDangNhap as username, AnhDaiDienKey, AnhDaiDienUrl
             FROM nguoidung
             WHERE DaXoa = 0
                             AND TrangThai = 'HoatDong'
               AND Id != ?
               AND (TenDangNhap LIKE ? OR Email LIKE ?)
             ORDER BY TenDangNhap ASC
             LIMIT 10`,
            [req.user.id, `%${keyword}%`, `%${keyword}%`]
        );

        const [groups] = await db.execute(
            `SELECT DISTINCT
                c.id,
                c.ten as name,
                c.la_nhom as is_group,
                (
                    SELECT tn.noi_dung
                    FROM tin_nhan tn
                    WHERE tn.id_cuoc_tro_chuyen = c.id
                    ORDER BY tn.ngay_tao DESC
                    LIMIT 1
                ) as last_message,
                (
                    SELECT tn.ngay_tao
                    FROM tin_nhan tn
                    WHERE tn.id_cuoc_tro_chuyen = c.id
                    ORDER BY tn.ngay_tao DESC
                    LIMIT 1
                ) as last_message_time
             FROM cuoc_tro_chuyen c
             JOIN nguoi_tham_gia p ON p.id_cuoc_tro_chuyen = c.id
             WHERE c.la_nhom = 1
               AND p.id_nguoi_dung = ?
               AND p.ngay_xoa IS NULL
               AND c.ten LIKE ?
             ORDER BY last_message_time DESC, c.ngay_tao DESC
             LIMIT 10`,
            [req.user.id, `%${keyword}%`]
        );
        
        for (let user of users) {
             if (user.AnhDaiDienKey) {
                 user.avatar = await getPresignedUrl(user.AnhDaiDienKey);
             } else if (user.AnhDaiDienUrl) {
                 user.avatar = user.AnhDaiDienUrl;
             } else {
                 user.avatar = await getPresignedUrl('avatars/Default_Avatar.jpg');
             }
        }
        for (let group of groups) {
            group.is_group = true;
            if (typeof group.last_message === 'string' && group.last_message.startsWith(POST_SHARE_PREFIX)) {
                group.last_message = 'Đã chia sẻ một bài viết';
            }
        }

        res.status(200).json({ success: true, data: { users, groups } });
    } catch(err) {
        console.error("Error searching:", err);
        res.status(500).json({ success: false });
    }
};
