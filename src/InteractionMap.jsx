import React from 'react';
import './InteractionMap.css';

const InteractionMap = () => {
  // Mock nodes for the visualization
  const nodes = [
    { id: 1, x: 50, y: 50, label: 'ABL1', type: 'target' },
    { id: 2, x: 150, y: 80, label: 'Imatinib', type: 'drug' },
    { id: 3, x: 80, y: 150, label: 'BCR-ABL', type: 'target' },
    { id: 4, x: 220, y: 40, label: 'ATP', type: 'molecule' },
    { id: 5, x: 250, y: 160, label: 'Dasatinib', type: 'drug' },
  ];

  const links = [
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 1, to: 4 },
    { from: 3, to: 5 },
    { from: 4, to: 5 },
  ];

  return (
    <div className="interaction-map-container">
      <svg viewBox="0 0 300 200" className="interaction-svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Lines */}
        {links.map((link, i) => {
          const fromNode = nodes.find(n => n.id === link.from);
          const toNode = nodes.find(n => n.id === link.to);
          return (
            <line
              key={i}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              className="map-link"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => (
          <g key={node.id} className={`map-node-group ${node.type}`}>
            <circle
              cx={node.x}
              cy={node.y}
              r="6"
              className="map-node"
              filter="url(#glow)"
            />
            <text
              x={node.x}
              y={node.y + 15}
              textAnchor="middle"
              className="map-label"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="map-overlay">
        <p>Live Interaction Network v2.4</p>
      </div>
    </div>
  );
};

export default InteractionMap;
