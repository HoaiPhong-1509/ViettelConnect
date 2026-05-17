import React, { useState, useRef } from 'react';
import { uploadMediaApi, createPostApi } from '../../services/baidang.api';
import { useAuth } from '../../contexts/AuthContext';
import './PostForm.css';

const PostForm = ({ onPostCreated }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [files, setFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length + files.length > 10) {
            alert('Tối đa 10 ảnh');
            return;
        }

        const validFiles = selectedFiles.filter(f => f.size <= 10 * 1024 * 1024);
        if (validFiles.length < selectedFiles.length) {
            alert('Một số file vượt quá 10MB và đã bị loại bỏ.');
        }

        setFiles(prev => [...prev, ...validFiles]);

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviews(prev => [...prev, e.target.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && files.length === 0) return;

        setUploading(true);
        setProgress(0);

        try {
            let mediaIds = [];
            if (files.length > 0) {
                const uploadRes = await uploadMediaApi(files, (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                });
                mediaIds = uploadRes.data.mediaIds;
            }

            const postRes = await createPostApi(content, mediaIds);
            
            // Giả lập post mới để append vào top feed ngay mà không cần reload
            const newPost = {
                Id: postRes.data.postId,
                NoiDung: content,
                TenDangNhap: 'Tôi', // Hoặc lấy từ AuthContext
                NgayTao: new Date().toISOString(),
                SoLuotThich: 0,
                SoBinhLuan: 0,
                IsLiked: false,
                Media: previews.map((url, i) => ({
                    Id: `temp-${i}`,
                    Url: url,
                    ThumbnailUrl: url
                }))
            };

            onPostCreated(newPost);
            
            // Reset
            setContent('');
            setFiles([]);
            setPreviews([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error('Lỗi khi tạo bài viết:', error);
            alert('Không thể tạo bài viết!');
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    return (
        <div className="post-form-container">
            <div className="post-form-header">
                <img 
                    src={user?.avatar || 'http://localhost:5000/uploads/avatar/Default_Avatar.jpg'} 
                    alt="avatar" 
                    className="post-avatar"
                    onError={(e) => {
                        e.currentTarget.onerror = null; 
                        e.currentTarget.src = '/viettel-telecom-seeklogo.svg';
                    }}
                />
                <textarea 
                    placeholder="Bạn đang nghĩ gì?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={uploading}
                />
            </div>

            {previews.length > 0 && (
                <div className="preview-container">
                    {previews.map((src, index) => (
                        <div key={index} className="preview-item">
                            <img src={src} alt="preview" />
                            <span className="remove-btn" onClick={() => removeFile(index)}>&times;</span>
                        </div>
                    ))}
                </div>
            )}

            {uploading && files.length > 0 && (
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
            )}

            <div className="post-form-actions">
                <label className="file-upload-btn">
                    <i className="fa-solid fa-image"></i> Ảnh/Video
                    <input 
                        type="file" 
                        multiple 
                        accept="image/jpeg, image/png, image/webp, image/heic"
                        onChange={handleFileSelect}
                        ref={fileInputRef}
                        disabled={uploading}
                        style={{ display: 'none' }}
                    />
                </label>
                <button 
                    className="submit-btn" 
                    onClick={handleSubmit}
                    disabled={uploading || (!content.trim() && files.length === 0)}
                >
                    {uploading ? 'Đang đăng...' : 'Đăng'}
                </button>
            </div>
        </div>
    );
};

export default PostForm;