import { useState, useCallback } from 'react';
import { likePostApi, unlikePostApi, getCommentsApi, addCommentApi, getRepliesApi, addReplyApi } from '../services/baidang.api';

export const usePost = (initialPost) => {
    const [post, setPost] = useState(initialPost);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [commentOffset, setCommentOffset] = useState(0);
    const [showComments, setShowComments] = useState(false);

    const toggleLike = async () => {
        const isCurrentlyLiked = post.IsLiked;
        // Optimistic update
        setPost(prev => ({
            ...prev,
            IsLiked: !isCurrentlyLiked,
            SoLuotThich: isCurrentlyLiked ? prev.SoLuotThich - 1 : prev.SoLuotThich + 1
        }));

        try {
            if (isCurrentlyLiked) {
                await unlikePostApi(post.Id);
            } else {
                await likePostApi(post.Id);
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật like:', error);
            // Rollback
            setPost(prev => ({
                ...prev,
                IsLiked: isCurrentlyLiked,
                SoLuotThich: isCurrentlyLiked ? prev.SoLuotThich + 1 : prev.SoLuotThich - 1
            }));
        }
    };

    const loadComments = useCallback(async () => {
        if (loadingComments || !hasMoreComments) return;
        setLoadingComments(true);
        try {
            const res = await getCommentsApi(post.Id, 3, commentOffset);
            const newComments = res?.data?.map(c => ({...c, replies: []})) || [];
            if (newComments.length < 3) {
                setHasMoreComments(false);
            }
            setComments(prev => [...prev, ...newComments]);
            setCommentOffset(prev => prev + 3);
        } catch (error) {
            console.error('Lỗi tải bình luận', error);
            setHasMoreComments(false);
        } finally {
            setLoadingComments(false);
        }
    }, [post.Id, commentOffset, loadingComments, hasMoreComments]);

    const handleToggleCommentSection = () => {
        if (!showComments && comments.length === 0 && post.SoBinhLuan > 0) {
            loadComments();
        }
        setShowComments(!showComments);
    };

    const handleAddComment = async (content) => {
        try {
            const res = await addCommentApi(post.Id, content);
            // Giả lập comment vừa thêm để hiện ngay
            const newComment = {
                Id: res.data.commentId,
                NoiDung: content,
                NguoiDungId: 'me', // TODO: sync với auth context
                TenDangNhap: 'Tôi', 
                NgayTao: new Date().toISOString(),
                ParentId: null,
                SoReply: 0,
                replies: []
            };
            setComments([newComment, ...comments]);
            setPost(prev => ({ ...prev, SoBinhLuan: prev.SoBinhLuan + 1 }));
        } catch (error) {
            console.error('Lỗi khi thêm bình luận', error);
        }
    };

    const handleLoadReplies = async (commentId, limit=2, offset=0) => {
        try {
            const res = await getRepliesApi(commentId, limit, offset);
            setComments(prev => prev.map(c => {
                if (c.Id === commentId) {
                    const existingReplyIds = new Set(c.replies.map(r => r.Id));
                    const filteredNew = res.data.filter(r => !existingReplyIds.has(r.Id));
                    return { ...c, replies: [...c.replies, ...filteredNew] };
                }
                return c;
            }));
        } catch (error) {
            console.error('Lỗi tải phản hồi', error);
        }
    };

    const handleAddReply = async (commentId, content) => {
        try {
            const res = await addReplyApi(commentId, post.Id, content);
            const newReply = {
                Id: res.data.commentId,
                NoiDung: content,
                NguoiDungId: 'me',
                TenDangNhap: 'Tôi',
                NgayTao: new Date().toISOString(),
                ParentId: commentId
            };
            setComments(prev => prev.map(c => {
                if (c.Id === commentId) {
                    return { ...c, replies: [...c.replies, newReply], SoReply: c.SoReply + 1 };
                }
                return c;
            }));
            setPost(prev => ({ ...prev, SoBinhLuan: prev.SoBinhLuan + 1 }));
        } catch (error) {
            console.error('Lỗi khi thêm phản hồi', error);
        }
    };

    return {
        post, toggleLike, comments, showComments, handleToggleCommentSection,
        loadingComments, hasMoreComments, loadComments, handleAddComment,
        handleLoadReplies, handleAddReply
    };
};