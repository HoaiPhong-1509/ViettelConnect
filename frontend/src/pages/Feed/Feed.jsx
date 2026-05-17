import React from 'react';
import PostForm from '../../components/PostForm/PostForm';
import PostCard from '../../components/PostCard/PostCard';
import { useFeed } from '../../hooks/useFeed';
import './Feed.css';

const Feed = () => {
    const { posts, loading, hasMore, lastPostElementRef, addNewPostToFeed } = useFeed(10);

    return (
        <div className="feed-container">
            <PostForm onPostCreated={addNewPostToFeed} />
            
            <div className="posts-list">
                {posts.map((post, index) => {
                    const isLast = (index === posts.length - 1);
                    return (
                        <div key={post.Id} ref={isLast ? lastPostElementRef : null}>
                            <PostCard initialPost={post} />
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
        </div>
    );
};

export default Feed;