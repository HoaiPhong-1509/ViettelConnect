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
    const [statusMessage, setStatusMessage] = useState('');
    const fileInputRef = useRef(null);

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length + files.length > 10) {
            alert('Tối đa 10 ảnh hoặc video');
            return;
        }

        const validFiles = selectedFiles.filter(f => f.size <= 50 * 1024 * 1024);
        if (validFiles.length < selectedFiles.length) {
            alert('Một số file vượt quá 50MB và đã bị loại bỏ.');
        }

        setFiles(prev => [...prev, ...validFiles]);

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviews(prev => [...prev, { url: e.target.result, type: file.type }]);
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
            setStatusMessage(postRes?.message || 'Bài viết đã được gửi và đang chờ duyệt.');
            setTimeout(() => setStatusMessage(''), 4000);

            const newPost = postRes.data?.post || {
                Id: postRes.data?.postId,
                NoiDung: content,
                TenDangNhap: user?.tenDangNhap || 'Tôi',
                NgayTao: new Date().toISOString(),
                SoLuotThich: 0,
                SoBinhLuan: 0,
                DiemFeed: 0,
                IsLiked: false,
                Media: previews.map((preview, i) => ({
                    Id: `temp-${i}`,
                    Url: preview.url,
                    ThumbnailUrl: preview.type.startsWith('video/') ? null : preview.url,
                    LoaiMedia: preview.type.startsWith('video/') ? 'VideoBaiDang' : 'AnhBaiDang'
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
            setStatusMessage('');
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
                    src={user?.avatar || '/viettel-telecom-seeklogo.svg'} 
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
                    {previews.map((preview, index) => (
                        <div key={index} className="preview-item">
                            {preview.type.startsWith('video/') ? (
                                <video src={preview.url} alt="preview" controls />
                            ) : (
                                <img src={preview.url} alt="preview" />
                            )}
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

            {statusMessage && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                    {statusMessage}
                </div>
            )}

            <div className="post-form-actions">
                <label className="file-upload-btn">
                    <i className="fa-solid fa-image"></i> Ảnh/Video
                    <input 
                        type="file" 
                        multiple 
                        accept="image/jpeg, image/png, image/webp, image/heic, video/mp4, video/quicktime, video/webm, video/x-msvideo"
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