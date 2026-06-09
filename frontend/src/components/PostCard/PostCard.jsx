import React, { useEffect, useState } from 'react';
import ImageGrid from '../ImageGrid/ImageGrid';
import LikeButton from '../LikeButton/LikeButton';
import CommentSection from '../CommentSection/CommentSection';
import { usePost } from '../../hooks/usePost';
import { deletePostApi, getLikesApi, reportPostApi } from '../../services/baidang.api';
import { getPostRoleMeta, shouldShowRoleBadge } from '../../utils/roleBadge';
import { useAuth } from '../../contexts/AuthContext';
import { createConversation, getConversations, searchUsers, sendMessage } from '../../services/chat.api';
import './PostCard.css';

const POST_SHARE_PREFIX = '__POST_SHARE__';

const isShareableMediaUrl = (mediaUrl) => {
    if (typeof mediaUrl !== 'string') return false;
    return /\.(mp4|webm|mov|avi)(\?.*)?$/i.test(mediaUrl) || mediaUrl.startsWith('data:video/');
};

const PostCard = ({ initialPost, onPostDeleted }) => {
    const { user } = useAuth();
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
    const [showLikesModal, setShowLikesModal] = useState(false);
    const [likedUsers, setLikedUsers] = useState([]);
    const [loadingLikes, setLoadingLikes] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareConversations, setShareConversations] = useState([]);
    const [shareSearch, setShareSearch] = useState('');
    const [shareSearchResults, setShareSearchResults] = useState([]);
    const [loadingShareData, setLoadingShareData] = useState(false);
    const [sharingTargetId, setSharingTargetId] = useState(null);
    const [shareMessage, setShareMessage] = useState('');
    const [shareError, setShareError] = useState('');
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportMessage, setReportMessage] = useState('');
    const [reportError, setReportError] = useState('');
    const roleMeta = getPostRoleMeta(post);
    const isOwner = Number(user?.id || 0) === Number(post.NguoiDungId || 0);

    // Xử lý text dài
    const textLimit = 150;
    const isLongText = post.NoiDung && post.NoiDung.length > textLimit;
    const displayText = (isExpanded || !isLongText) 
        ? post.NoiDung 
        : `${post.NoiDung?.substring(0, textLimit)}...`;

    const handleShowLikes = async () => {
        if (post.SoLuotThich === 0) return;
        setShowLikesModal(true);
        setLoadingLikes(true);
        try {
            const res = await getLikesApi(post.Id);
            if (res.success) {
                setLikedUsers(res.data);
            }
        } catch (error) {
            console.error("Lỗi khi lấy danh sách người thích:", error);
        } finally {
            setLoadingLikes(false);
        }
    };

    const buildPostSharePayload = () => {
        const postUrl = `${window.location.origin}/?postId=${post.Id}`;
        const media = Array.isArray(post.Media)
            ? post.Media.map((item) => ({
                url: item?.Url || item?.url || '',
                thumbnailUrl: item?.ThumbnailUrl || item?.thumbnailUrl || '',
                type: item?.LoaiMedia || item?.type || '',
            })).filter((item) => item.url)
            : [];

        return {
            postId: post.Id,
            postUrl,
            authorName: post.TenDangNhap || '',
            text: post.NoiDung || '',
            media,
            sharedAt: new Date().toISOString(),
        };
    };

    const loadShareConversations = async () => {
        setLoadingShareData(true);
        setShareError('');
        try {
            const res = await getConversations();
            setShareConversations(res.data?.data || []);
        } catch (error) {
            console.error('Lỗi tải cuộc trò chuyện gần đây:', error);
            setShareError('Không tải được danh sách cuộc trò chuyện gần đây.');
        } finally {
            setLoadingShareData(false);
        }
    };

    useEffect(() => {
        if (!showShareModal) return;
        void loadShareConversations();
    }, [showShareModal]);

    useEffect(() => {
        if (!showShareModal) return;

        const trimmedQuery = shareSearch.trim();
        if (trimmedQuery.length < 2) {
            setShareSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await searchUsers(trimmedQuery);
                setShareSearchResults(res.data?.data?.users || []);
            } catch (error) {
                console.error('Lỗi tìm user để chia sẻ:', error);
                setShareSearchResults([]);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [shareSearch, showShareModal]);

    const shareToConversation = async (conversationId) => {
        if (!conversationId) return;

        setSharingTargetId(conversationId);
        setShareError('');
        setShareMessage('');

        try {
            const payload = buildPostSharePayload();
            await sendMessage(conversationId, {
                content: `${POST_SHARE_PREFIX}${JSON.stringify(payload)}`,
                type: 'text',
            });

            setShareMessage('Đã chia sẻ bài viết vào chat.');
            setTimeout(() => {
                setShowShareModal(false);
                setShareMessage('');
            }, 1200);
        } catch (error) {
            console.error('Lỗi chia sẻ bài viết:', error);
            setShareError('Không thể chia sẻ bài viết vào cuộc trò chuyện này.');
        } finally {
            setSharingTargetId(null);
        }
    };

    const handleShareConversationClick = async (conversation) => {
        await shareToConversation(conversation.id);
    };

    const handleShareUserClick = async (targetUser) => {
        if (!user?.id) {
            setShareError('Bạn cần đăng nhập để chia sẻ bài viết.');
            return;
        }

        setSharingTargetId(targetUser.id);
        setShareError('');
        setShareMessage('');

        try {
            const res = await createConversation({ isGroup: false, name: '', memberIds: [targetUser.id] });
            const conversationId = res.data?.data?.id;
            if (!conversationId) {
                throw new Error('Không tạo được cuộc trò chuyện.');
            }

            await shareToConversation(conversationId);
            await loadShareConversations();
        } catch (error) {
            console.error('Lỗi tạo cuộc trò chuyện khi chia sẻ:', error);
            setShareError('Không thể mở cuộc trò chuyện để chia sẻ bài viết.');
        } finally {
            setSharingTargetId(null);
        }
    };

    const renderConversationLabel = (conversation) => {
        if (conversation.is_group) {
            return conversation.name || 'Nhóm trò chuyện';
        }

        return conversation.other_user_name || 'Cuộc trò chuyện';
    };

    const renderConversationSubtitle = (conversation) => {
        if (conversation.last_message) {
            return conversation.last_message;
        }

        return conversation.is_group ? 'Nhóm gần đây' : 'Cuộc trò chuyện gần đây';
    };

    const handleDeletePost = async () => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này?')) {
            return;
        }

        try {
            await deletePostApi(post.Id);
            if (typeof onPostDeleted === 'function') {
                onPostDeleted(post.Id);
            }
        } catch (error) {
            console.error('Lỗi khi xóa bài viết:', error);
            alert('Không thể xóa bài viết này.');
        }
    };

    const handleSubmitReport = async () => {
        const trimmedReason = reportReason.trim();
        if (!trimmedReason) {
            setReportError('Vui lòng nhập lý do báo cáo.');
            return;
        }

        setReportSubmitting(true);
        setReportError('');
        setReportMessage('');

        try {
            await reportPostApi(post.Id, trimmedReason);
            setReportMessage('Đã gửi báo cáo bài viết.');
            setTimeout(() => {
                setShowReportModal(false);
                setReportReason('');
                setReportMessage('');
            }, 1000);
        } catch (error) {
            console.error('Lỗi khi báo cáo bài viết:', error);
            setReportError(error?.response?.data?.message || 'Không thể gửi báo cáo.');
        } finally {
            setReportSubmitting(false);
        }
    };

    return (
        <div className="post-card">
            {/* Header */}
            <div className="post-header">
                <img 
                    src={post.AnhDaiDienUrl || '/viettel-telecom-seeklogo.svg'} 
                    alt="avatar" 
                    className="post-avatar"
                    onError={(e) => {
                        e.currentTarget.onerror = null; 
                        e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                    }}
                />
                <div className="post-info">
                    <div className="post-author-row">
                        <h4 className="post-author">{post.TenDangNhap}</h4>
                        {shouldShowRoleBadge(post) && roleMeta?.label && (
                            <span className={`role-badge ${roleMeta.toneClass}`}>
                                <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
                                <span>{roleMeta.label}</span>
                            </span>
                        )}
                    </div>
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
                <span className="stat-item" onClick={handleShowLikes} style={{ cursor: post.SoLuotThich > 0 ? 'pointer' : 'default' }}>
                    {post.SoLuotThich > 0 ? `${post.SoLuotThich} lượt thích` : ''}
                </span>
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
                    <i className="fa-regular fa-comment"></i>
                    <span className="action-label">Bình luận</span>
                </button>
                <button className="action-btn share-btn" onClick={() => {
                    if (!user?.id) {
                        setShareError('Bạn cần đăng nhập để chia sẻ bài viết.');
                        setShowShareModal(true);
                        return;
                    }
                    setShareSearch('');
                    setShareSearchResults([]);
                    setShareError('');
                    setShowShareModal(true);
                }}>
                    <i className="fa-solid fa-share"></i>
                    <span className="action-label">Chia sẻ</span>
                </button>
                {isOwner ? (
                    <button className="action-btn delete-btn" onClick={handleDeletePost}>
                        <i className="fa-solid fa-trash"></i>
                        <span className="action-label">Xóa</span>
                    </button>
                ) : (
                    <button className="action-btn report-btn" onClick={() => {
                        if (!user?.id) {
                            setReportError('Bạn cần đăng nhập để báo cáo bài viết.');
                            setShowReportModal(true);
                            return;
                        }
                        setReportError('');
                        setReportMessage('');
                        setReportReason('');
                        setShowReportModal(true);
                    }}>
                        <i className="fa-regular fa-flag"></i>
                        <span className="action-label">Báo cáo</span>
                    </button>
                )}
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

            {/* Modal danh sách người thích */}
            {showLikesModal && (
                <div className="likes-modal-overlay" onClick={() => setShowLikesModal(false)}>
                    <div className="likes-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="likes-modal-header">
                            <h3>Lượt thích</h3>
                            <button onClick={() => setShowLikesModal(false)}>&times;</button>
                        </div>
                        <div className="likes-modal-body">
                            {loadingLikes ? (
                                <div style={{ textAlign: 'center', padding: '20px' }}>Đang tải...</div>
                            ) : (
                                <div className="likes-list">
                                    {likedUsers.map(u => (
                                        <div key={u.Id} className="like-user-item">
                                            <img src={u.AnhDaiDienUrl || '/default-avatar.png'} alt={u.TenDangNhap} onError={(e) => { e.currentTarget.src = '/viettel-telecom-seeklogo.svg'; }} />
                                            <span>{u.TenDangNhap}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal chia sẻ bài viết */}
            {showShareModal && (
                <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
                    <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="share-modal-header">
                            <div>
                                <h3>Chia sẻ bài viết</h3>
                                <p>{post.TenDangNhap ? `Từ bài viết của ${post.TenDangNhap}` : `Bài viết #${post.Id}`}</p>
                            </div>
                            <button onClick={() => setShowShareModal(false)}>&times;</button>
                        </div>

                        <div className="share-modal-search">
                            <label>Tìm user khác</label>
                            <div className="share-search-input-wrap">
                                <i className="fa-solid fa-magnifying-glass"></i>
                                <input
                                    type="text"
                                    value={shareSearch}
                                    onChange={(e) => setShareSearch(e.target.value)}
                                    placeholder="Nhập tên tài khoản hoặc email"
                                />
                            </div>
                        </div>

                        <div className="share-modal-body">
                            {shareError && <div className="share-modal-alert share-modal-alert--error">{shareError}</div>}
                            {shareMessage && <div className="share-modal-alert share-modal-alert--success">{shareMessage}</div>}

                            {shareSearch.trim().length >= 2 ? (
                                <div className="share-section">
                                    <h4>Kết quả tìm kiếm</h4>
                                    <div className="share-list">
                                        {shareSearchResults.length === 0 ? (
                                            <div className="share-empty">Không tìm thấy user phù hợp.</div>
                                        ) : (
                                            shareSearchResults.map((targetUser) => (
                                                <button
                                                    key={targetUser.id}
                                                    className="share-item"
                                                    onClick={() => handleShareUserClick(targetUser)}
                                                    disabled={sharingTargetId === targetUser.id}
                                                >
                                                    <div className="share-item-avatar">
                                                        <img
                                                            src={targetUser.avatar || '/viettel-telecom-seeklogo.svg'}
                                                            alt={targetUser.username}
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="share-item-meta">
                                                        <div className="share-item-title">{targetUser.username}</div>
                                                        <div className="share-item-subtitle">Nhấn để mở chat và chia sẻ</div>
                                                    </div>
                                                    {sharingTargetId === targetUser.id && <span className="share-item-status">Đang gửi...</span>}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="share-section">
                                    <h4>Cuộc trò chuyện gần nhất</h4>
                                    {loadingShareData ? (
                                        <div className="share-empty">Đang tải...</div>
                                    ) : (
                                        <div className="share-list">
                                            {shareConversations.length === 0 ? (
                                                <div className="share-empty">Chưa có cuộc trò chuyện gần đây.</div>
                                            ) : (
                                                shareConversations.map((conversation) => (
                                                    <button
                                                        key={conversation.id}
                                                        className="share-item"
                                                        onClick={() => handleShareConversationClick(conversation)}
                                                        disabled={sharingTargetId === conversation.id}
                                                    >
                                                        <div className="share-item-avatar">
                                                            {conversation.is_group ? (
                                                                <i className="fa-solid fa-users"></i>
                                                            ) : conversation.other_user_avatar ? (
                                                                <img
                                                                    src={conversation.other_user_avatar}
                                                                    alt={renderConversationLabel(conversation)}
                                                                    onError={(e) => {
                                                                        e.currentTarget.onerror = null;
                                                                        e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <i className="fa-solid fa-user"></i>
                                                            )}
                                                        </div>
                                                        <div className="share-item-meta">
                                                            <div className="share-item-title">{renderConversationLabel(conversation)}</div>
                                                            <div className="share-item-subtitle">{renderConversationSubtitle(conversation)}</div>
                                                        </div>
                                                        {sharingTargetId === conversation.id && <span className="share-item-status">Đang gửi...</span>}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="share-modal-footer">
                            <button onClick={() => setShowShareModal(false)} className="share-modal-close-btn">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReportModal && (
                <div className="share-modal-overlay" onClick={() => setShowReportModal(false)}>
                    <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="share-modal-header">
                            <div>
                                <h3>Báo cáo bài viết</h3>
                                <p>{post.TenDangNhap ? `Bài viết của ${post.TenDangNhap}` : `Bài viết #${post.Id}`}</p>
                            </div>
                            <button onClick={() => setShowReportModal(false)}>&times;</button>
                        </div>

                        <div className="share-modal-body">
                            {reportError && <div className="share-modal-alert share-modal-alert--error">{reportError}</div>}
                            {reportMessage && <div className="share-modal-alert share-modal-alert--success">{reportMessage}</div>}

                            <div className="share-section">
                                <label className="share-report-label">Lý do báo cáo</label>
                                <textarea
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    placeholder="Mô tả nội dung vi phạm, spam, hoặc lý do khác..."
                                    className="share-report-textarea"
                                    rows={5}
                                />
                            </div>
                        </div>

                        <div className="share-modal-footer">
                            <button
                                onClick={handleSubmitReport}
                                className="share-modal-close-btn"
                                disabled={reportSubmitting}
                            >
                                {reportSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostCard;