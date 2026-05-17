import { useState, useCallback, useRef, useEffect } from 'react';
import { getFeedApi } from '../services/baidang.api';

export const useFeed = (limit = 10) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);

    const loadMorePosts = useCallback(async () => {

        // Không gọi API trên server-side (SSR) hoặc khi chưa đăng nhập
        if (typeof window === 'undefined' || !localStorage.getItem('userInfo')) {
            setLoading(false);
            setHasMore(false);
            return;
        }
        
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const res = await getFeedApi(limit, offset);
            const newPosts = res?.data || [];
            if (newPosts.length < limit) {
                setHasMore(false);
            }
            setPosts(prev => [...prev, ...newPosts]);
            setOffset(prev => prev + limit);
        } catch (error) {
            console.error('Lỗi khi tải feed:', error);
            // Ngăn chặn infinite loop nếu API lỗi liên tục
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [limit, offset, loading, hasMore]);

    // Initial load
    useEffect(() => {
        if (offset === 0 && posts.length === 0) {
            loadMorePosts();
        }
    }, []);

    const observer = useRef();
    const lastPostElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMorePosts();
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, loadMorePosts]);

    const addNewPostToFeed = (newPost) => {
        setPosts(prev => [newPost, ...prev]);
    };

    return { posts, setPosts, loading, hasMore, lastPostElementRef, addNewPostToFeed };
};