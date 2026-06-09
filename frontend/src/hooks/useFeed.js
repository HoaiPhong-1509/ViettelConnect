import { useState, useCallback, useRef, useEffect } from 'react';
import { getFeedApi } from '../services/baidang.api';
import { sortPostsByFeedScore } from '../utils/roleBadge';

export const useFeed = (limit = 10) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const didInitialLoad = useRef(false);
    const loadingRef = useRef(false);

    const fetchFeedPage = useCallback(async (pageOffset = 0, replace = false) => {

        // Không gọi API trên server-side (SSR)
        if (typeof window === 'undefined') {
            setLoading(false);
            setHasMore(false);
            return;
        }
        
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);
        try {
            const res = await getFeedApi(limit, pageOffset);
            const newPosts = res?.data || [];
            setHasMore(newPosts.length === limit);
            setPosts(prev => {
                const basePosts = replace ? [] : prev;
                const existingIds = new Set(basePosts.map(p => p.Id));
                const filteredNewPosts = newPosts.filter(p => !existingIds.has(p.Id));
                return replace ? filteredNewPosts : [...basePosts, ...filteredNewPosts];
            });
            setOffset(pageOffset + limit);
        } catch (error) {
            console.error('Lỗi khi tải feed:', error);
            // Ngăn chặn infinite loop nếu API lỗi liên tục
            setHasMore(false);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [limit]);

    const loadMorePosts = useCallback(async () => {
        if (loading || !hasMore) return;
        await fetchFeedPage(offset, false);
    }, [fetchFeedPage, loading, hasMore, offset]);

    const reloadFeed = useCallback(async () => {
        didInitialLoad.current = true;
        setPosts([]);
        setOffset(0);
        setHasMore(true);
        await fetchFeedPage(0, true);
    }, [fetchFeedPage]);

    // Initial load
    useEffect(() => {
        if (didInitialLoad.current) {
            return;
        }
        didInitialLoad.current = true;

        const timer = setTimeout(() => {
            void fetchFeedPage(0, true);
        }, 0);

        return () => clearTimeout(timer);
    }, [fetchFeedPage]);

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
        setPosts(prev => sortPostsByFeedScore([newPost, ...prev]));
    };

    return { posts, setPosts, loading, hasMore, lastPostElementRef, addNewPostToFeed, reloadFeed, loadMorePosts };
};