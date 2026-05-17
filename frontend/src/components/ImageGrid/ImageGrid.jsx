import React, { useState } from 'react';
import './ImageGrid.css';

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
                {renderImages.map((img, index) => (
                    <div 
                        key={img.Id || index} 
                        className={`image-item item-${index}`}
                        onClick={() => setLightboxIndex(index)}
                    >
                        <img src={img.Url} alt={`media-${index}`} loading="lazy" />
                        {count > 4 && index === 3 && (
                            <div className="overlay">
                                <span>+{remaining}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {lightboxIndex !== null && (
                <div className="lightbox" onClick={() => setLightboxIndex(null)}>
                    <div className="lightbox-content">
                        <span className="close-btn" onClick={() => setLightboxIndex(null)}>&times;</span>
                        {count > 1 && (
                            <button className="nav-btn prev-btn" onClick={handlePrev}>&#10094;</button>
                        )}
                        <img src={images[lightboxIndex].Url} alt="Fullscreen" onClick={(e) => e.stopPropagation()} />
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