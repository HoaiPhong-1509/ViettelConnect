import React, { useState } from 'react';
import ImageGrid from '../ImageGrid/ImageGrid';
import LikeButton from '../LikeButton/LikeButton';
import CommentSection from '../CommentSection/CommentSection';
import { usePost } from '../../hooks/usePost';
import './PostCard.css';

const PostCard = ({ initialPost }) => {
    const { 
        post, 
        toggleLike, 
        comments, 
        showComments, 
        handleToggleCommentSection,
        loadingComments,
        hasMoreComments,
        loadComments,
        handleAddComment,
        handleLoadReplies,
        handleAddReply
    } = usePost(initialPost);

    const [isExpanded, setIsExpanded] = useState(false);

    // Xử lý text dài
    const textLimit = 150;
    const isLongText = post.NoiDung && post.NoiDung.length > textLimit;
    const displayText = (isExpanded || !isLongText) 
        ? post.NoiDung 
        : `${post.NoiDung?.substring(0, textLimit)}...`;

    return (
        <div className="post-card">
            {/* Header */}
            <div className="post-header">
                <img 
                    src={post.AnhDaiDienUrl || 'http://localhost:5000/uploads/avatar/Default_Avatar.jpg'} 
                    alt="avatar" 
                    className="post-avatar"
                    onError={(e) => {
                        e.currentTarget.onerror = null; 
                        e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                    }}
                />
                <div className="post-info">
                    <h4 className="post-author">{post.TenDangNhap}</h4>
                    <span className="post-time">{new Date(post.NgayTao).toLocaleString()}</span>
                </div>
            </div>

            {/* Content */}
            <div className="post-content">
                <p>
                    {displayText}
                    {isLongText && !isExpanded && (
                        <span className="read-more-btn" onClick={() => setIsExpanded(true)}>
                            Xem thêm
                        </span>
                    )}
                </p>
            </div>

            {/* Media */}
            {post.Media && post.Media.length > 0 && (
                <div className="post-media">
                    <ImageGrid images={post.Media} />
                </div>
            )}

            {/* Stats */}
            <div className="post-stats">
                <span className="stat-item">{post.SoLuotThich > 0 ? `${post.SoLuotThich} lượt thích` : ''}</span>
                <span className="stat-item right">{post.SoBinhLuan > 0 ? `${post.SoBinhLuan} bình luận` : ''}</span>
            </div>

            {/* Actions */}
            <div className="post-actions">
                <LikeButton 
                    isLiked={post.IsLiked} 
                    likeCount={post.SoLuotThich} 
                    onClick={toggleLike} 
                />
                <button className="action-btn comment-trigger-btn" onClick={handleToggleCommentSection}>
                    <i className="fa-regular fa-comment"></i> Bình luận
                </button>
                <button className="action-btn share-btn">
                    <i className="fa-solid fa-share"></i> Chia sẻ
                </button>
            </div>

            {/* Comments */}
            {showComments && (
                <CommentSection 
                    comments={comments}
                    loadingComments={loadingComments}
                    hasMoreComments={hasMoreComments}
                    onLoadMoreComments={loadComments}
                    onAddComment={handleAddComment}
                    onLoadReplies={handleLoadReplies}
                    onAddReply={handleAddReply}
                />
            )}
        </div>
    );
};

export default PostCard;