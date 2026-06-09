import React from 'react';
import './LikeButton.css';

const LikeButton = ({ isLiked, likeCount, onClick }) => {
    return (
        <button 
            className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
            onClick={onClick}
        >
            <span className="icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {isLiked ? <i className="fa-solid fa-thumbs-up"></i> : <i className="fa-regular fa-thumbs-up"></i>}
            </span>
            <span className="count action-label">
                {likeCount > 0 ? likeCount : 'Thích'}
            </span>
        </button>
    );
};

export default LikeButton;