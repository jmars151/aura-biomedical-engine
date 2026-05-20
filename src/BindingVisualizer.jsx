import React from 'react';
import './BindingVisualizer.css';

const BindingVisualizer = () => {
  return (
    <div className="binding-container">
      <div className="molecule-layers">
        <div className="layer layer-1"></div>
        <div className="layer layer-2"></div>
        <div className="layer layer-3"></div>
      </div>
      <svg viewBox="0 0 200 200" className="binding-svg">
        <defs>
          <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style={{ stopColor: 'var(--accent-secondary)', stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: 'transparent', stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        
        {/* Abstract Molecular Binding Site */}
        <path 
          d="M 100,100 m -60,0 a 60,60 0 1,0 120,0 a 60,60 0 1,0 -120,0" 
          className="binding-ring"
        />
        <circle cx="100" cy="100" r="40" fill="url(#grad1)" className="binding-pulse" />
        
        {/* Orbiting atoms */}
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <circle 
            key={i}
            cx={100 + 50 * Math.cos((angle * Math.PI) / 180)}
            cy={100 + 50 * Math.sin((angle * Math.PI) / 180)}
            r="4"
            className="orbit-atom"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
        
        <text x="100" y="105" textAnchor="middle" className="binding-text">BINDING ACTIVE</text>
      </svg>
    </div>
  );
};

export default BindingVisualizer;
