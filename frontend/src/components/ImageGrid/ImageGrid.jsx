import React, { useState, useEffect, useRef } from 'react';
import './ImageGrid.css';

const GridVideo = ({ src }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    // Tự phát khi hơn 50% video nằm trong màn hình
                    if (entry.isIntersecting) {
                        videoRef.current?.play().catch(e => console.log('Autoplay prevented:', e));
                    } else {
                        videoRef.current?.pause();
                    }
                });
            },
            { threshold: 0.5 }
        );

        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        return () => {
            if (videoRef.current) {
                observer.unobserve(videoRef.current);
            }
        };
    }, []);

    return (
        <video 
            ref={videoRef}
            src={src} 
            muted 
            loop
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#8a8a8a' }} 
        />
    );
};

const ImageGrid = ({ images }) => {
    const [lightboxIndex, setLightboxIndex] = useState(null);

    if (!images || images.length === 0) return null;

    const count = images.length;
    let gridClass = 'image-grid';

    if (count === 1) gridClass += ' grid-1';
    else if (count === 2) gridClass += ' grid-2';
    else if (count === 3) gridClass += ' grid-3';
    else if (count === 4) gridClass += ' grid-4';
    else gridClass += ' grid-5-plus';

    const renderImages = images.slice(0, 4);
    const remaining = count - 4;

    const handleNext = (e) => {
        e.stopPropagation();
        setLightboxIndex((prev) => (prev === count - 1 ? 0 : prev + 1));
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        setLightboxIndex((prev) => (prev === 0 ? count - 1 : prev - 1));
    };

    return (
        <>
            <div className={gridClass}>
                {renderImages.map((img, index) => {
                    const isVideo = img.LoaiMedia === 'VideoBaiDang' || 
                        (typeof img.Url === 'string' && (img.Url.match(/\.(mp4|webm|mov|avi)(\?.*)?$/i) || img.Url.startsWith('data:video/')));
                    return (
                        <div 
                            key={img.Id || index} 
                            className={`image-item item-${index}`}
                            onClick={() => setLightboxIndex(index)}
                        >
                            {isVideo ? (
                                <GridVideo src={img.Url} />
                            ) : (
                                <img src={img.ThumbnailUrl || img.Url} alt={`media-${index}`} loading="lazy" />
                            )}
                            {count > 4 && index === 3 && (
                                <div className="overlay">
                                    <span>+{remaining}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {lightboxIndex !== null && (
                <div className="lightbox" onClick={() => setLightboxIndex(null)}>
                    <div className="lightbox-content">
                        <span className="close-btn" onClick={() => setLightboxIndex(null)}>&times;</span>
                        {count > 1 && (
                            <button className="nav-btn prev-btn" onClick={handlePrev}>&#10094;</button>
                        )}
                        {(() => {
                            const activeImg = images[lightboxIndex];
                            const isActiveVideo = activeImg.LoaiMedia === 'VideoBaiDang' || 
                                (typeof activeImg.Url === 'string' && (activeImg.Url.match(/\.(mp4|webm|mov|avi)(\?.*)?$/i) || activeImg.Url.startsWith('data:video/')));
                            return isActiveVideo ? (
                                <video src={activeImg.Url} controls autoPlay onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh' }} />
                            ) : (
                                <img src={activeImg.Url} alt="Fullscreen" onClick={(e) => e.stopPropagation()} />
                            );
                        })()}
                        {count > 1 && (
                            <button className="nav-btn next-btn" onClick={handleNext}>&#10095;</button>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ImageGrid;