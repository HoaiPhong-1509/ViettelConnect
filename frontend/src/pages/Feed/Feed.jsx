import React from 'react';
import PostForm from '../../components/PostForm/PostForm';
import PostCard from '../../components/PostCard/PostCard';
import { useFeed } from '../../hooks/useFeed';
import { useAuth } from '../../contexts/AuthContext';
import { getPostDetailApi } from '../../services/baidang.api';
import './Feed.css';

const FeedList = ({ userId }) => {
    const { posts, loading, hasMore, lastPostElementRef, reloadFeed, loadMorePosts } = useFeed(10);

    React.useEffect(() => {
        if (userId) {
            void reloadFeed();
        }
    }, [userId, reloadFeed]);

    return (
        <div className="feed-container">
            <PostForm onPostCreated={() => { void reloadFeed(); }} />
            
            <div className="posts-list">
                {posts.map((post, index) => {
                    const isLast = (index === posts.length - 1);
                    return (
                        <div key={post.Id} ref={isLast ? lastPostElementRef : null} id={`post-${post.Id}`}>
                            <PostCard initialPost={post} onPostDeleted={() => { void reloadFeed(); }} />
                        </div>
                    );
                })}
            </div>

            {loading && (
                <div className="feed-skeleton">
                    <div className="skeleton-card">
                        <div className="skeleton-header">
                            <div className="skeleton-avatar"></div>
                            <div className="skeleton-info">
                                <div className="skeleton-line short"></div>
                                <div className="skeleton-line shorter"></div>
                            </div>
                        </div>
                        <div className="skeleton-content">
                            <div className="skeleton-line full"></div>
                            <div className="skeleton-line full"></div>
                            <div className="skeleton-line medium"></div>
                        </div>
                    </div>
                </div>
            )}
            
            {!hasMore && posts.length > 0 && (
                <p className="end-of-feed">Bạn đã xem hết tin mới!</p>
            )}

            {hasMore && !loading && posts.length > 0 && (
                <button className="feed-load-more-btn" onClick={() => { void loadMorePosts(); }}>
                    Xem thêm bài viết
                </button>
            )}
        </div>
    );
};

const TargetPostView = ({ targetPostId }) => {
    const [post, setPost] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        let isActive = true;

        const loadPost = async () => {
            if (!targetPostId) {
                setPost(null);
                setError('');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const res = await getPostDetailApi(targetPostId);
                const detailPost = res?.data || null;

                if (!isActive) return;

                setPost(detailPost);
                if (!detailPost) {
                    setError('Không tìm thấy bài viết này.');
                }
            } catch (fetchError) {
                console.error('Lỗi khi tải chi tiết bài viết:', fetchError);
                if (isActive) {
                    setPost(null);
                    setError('Không thể tải bài viết này.');
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        void loadPost();

        return () => {
            isActive = false;
        };
    }, [targetPostId]);

    return (
        <div className="feed-container feed-container--single-post">
            {loading && (
                <div className="feed-skeleton">
                    <div className="skeleton-card">
                        <div className="skeleton-header">
                            <div className="skeleton-avatar"></div>
                            <div className="skeleton-info">
                                <div className="skeleton-line short"></div>
                                <div className="skeleton-line shorter"></div>
                            </div>
                        </div>
                        <div className="skeleton-content">
                            <div className="skeleton-line full"></div>
                            <div className="skeleton-line full"></div>
                            <div className="skeleton-line medium"></div>
                        </div>
                    </div>
                </div>
            )}

            {!loading && error && (
                <div className="feed-empty-state">
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && post && (
                <div className="single-post-wrapper">
                    <PostCard initialPost={post} onPostDeleted={() => setPost(null)} />
                </div>
            )}
        </div>
    );
};

const Feed = ({ targetPostId }) => {
    const { user } = useAuth();
    const userId = user?.id;

    if (targetPostId) {
        return <TargetPostView targetPostId={targetPostId} />;
    }

    return <FeedList userId={userId} />;
};

export default Feed;