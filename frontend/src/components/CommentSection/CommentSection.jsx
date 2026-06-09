import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './CommentSection.css';

const CommentSection = ({ 
    comments, 
    loadingComments, 
    hasMoreComments, 
    onLoadMoreComments, 
    onAddComment, 
    onLoadReplies, 
    onAddReply 
}) => {
    const { user } = useAuth();
    const [mainComment, setMainComment] = useState('');
    const [replyContents, setReplyContents] = useState({});
    const [showReplyInput, setShowReplyInput] = useState({});

    const handleMainSubmit = (e) => {
        e.preventDefault();
        if (!mainComment.trim()) return;
        onAddComment(mainComment);
        setMainComment('');
    };

    const handleReplySubmit = (e, parentId) => {
        e.preventDefault();
        const content = replyContents[parentId];
        if (!content || !content.trim()) return;
        onAddReply(parentId, content);
        setReplyContents({ ...replyContents, [parentId]: '' });
        setShowReplyInput({ ...showReplyInput, [parentId]: false });
    };

    const toggleReplyInput = (commentId) => {
        setShowReplyInput(prev => ({ ...prev, [commentId]: !prev[commentId] }));
    };

    const handleReplyChange = (commentId, value) => {
        setReplyContents(prev => ({ ...prev, [commentId]: value }));
    };

    return (
        <div className="comment-section">
            <div className="comment-list">
                {comments.map(c => (
                    <div key={c.Id} className="comment-thread">
                        <div className="comment-item">
                            <img
                                src={c.AnhDaiDienUrl || '/viettel-telecom-seeklogo.svg'}
                                alt="avatar"
                                className="comment-avatar"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                                }}
                            />
                            <div className="comment-content">
                                <div className="comment-bubble">
                                    <span className="comment-author">{c.TenDangNhap}</span>
                                    <span className="comment-text">{c.NoiDung}</span>
                                </div>
                                <div className="comment-actions">
                                    <span className="comment-time">{new Date(c.NgayTao).toLocaleDateString()}</span>
                                    <span className="comment-action-btn" onClick={() => toggleReplyInput(c.Id)}>Phản hồi</span>
                                </div>
                            </div>
                        </div>

                        {/* Vùng Reply */}
                        <div className="replies-container">
                            {c.replies && c.replies.map(r => (
                                <div key={r.Id} className="comment-item reply">
                                    <img
                                        src={r.AnhDaiDienUrl || '/viettel-telecom-seeklogo.svg'}
                                        alt="avatar"
                                        className="comment-avatar small"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                                        }}
                                    />
                                    <div className="comment-content">
                                        <div className="comment-bubble">
                                            <span className="comment-author">{r.TenDangNhap}</span>
                                            <span className="comment-text">{r.NoiDung}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {c.SoReply > (c.replies ? c.replies.length : 0) && (
                                <div 
                                    className="load-more-replies" 
                                    onClick={() => onLoadReplies(c.Id, 2, c.replies ? c.replies.length : 0)}
                                >
                                    ↳ Xem thêm phản hồi ({c.SoReply - (c.replies ? c.replies.length : 0)})
                                </div>
                            )}

                            {showReplyInput[c.Id] && (
                                <form className="reply-form" onSubmit={(e) => handleReplySubmit(e, c.Id)}>
                                    <img 
                                        src={user?.avatar || '/viettel-telecom-seeklogo.svg'} 
                                        alt="me" 
                                        className="comment-avatar small" 
                                        onError={(e) => { e.currentTarget.src = '/viettel-telecom-seeklogo.svg'; }} 
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Viết phản hồi..." 
                                        value={replyContents[c.Id] || ''}
                                        onChange={(e) => handleReplyChange(c.Id, e.target.value)}
                                        autoFocus
                                    />
                                    <button type="submit" disabled={!replyContents[c.Id]?.trim()}>Gửi</button>
                                </form>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {hasMoreComments && !loadingComments && (
                <div className="load-more-comments" onClick={onLoadMoreComments}>
                    Xem thêm bình luận
                </div>
            )}
            
            {loadingComments && <div className="loading-text">Đang tải...</div>}

            <form className="main-comment-form" onSubmit={handleMainSubmit}>
                <img 
                    src={user?.avatar || '/viettel-telecom-seeklogo.svg'} 
                    alt="me" 
                    className="comment-avatar" 
                    onError={(e) => { e.currentTarget.src = '/viettel-telecom-seeklogo.svg'; }} 
                />
                <input 
                    type="text" 
                    placeholder="Viết bình luận..." 
                    value={mainComment}
                    onChange={(e) => setMainComment(e.target.value)}
                />
                <button type="submit" disabled={!mainComment.trim()}>Gửi</button>
            </form>
        </div>
    );
};

export default CommentSection;