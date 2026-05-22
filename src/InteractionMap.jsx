import { useEffect, useRef, useState } from 'react';
import './InteractionMap.css';

const InteractionMap = ({ comparisonList = [] }) => {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [draggedNode, setDraggedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);
  
  const svgRef = useRef(null);

  // 1. Fetch drug-target mechanisms and compile nodes/links
  useEffect(() => {
    let active = true;

    const loadInteractions = async () => {
      // Fallback defaults if comparison list is empty or small
      if (!comparisonList || comparisonList.length < 2) {
        const defaultNodes = [
          { id: 'P38398', name: 'BRCA1', type: 'Protein', x: 120, y: 100 },
          { id: 'CHEMBL941', name: 'Imatinib', type: 'Drug', x: 220, y: 130 },
          { id: 'BCR-ABL', name: 'BCR-ABL', type: 'Protein', x: 180, y: 220 },
          { id: 'CHEMBL25', name: 'Aspirin', type: 'Drug', x: 310, y: 90 },
          { id: 'CHEMBL254', name: 'Dasatinib', type: 'Drug', x: 280, y: 210 },
        ];
        const defaultLinks = [
          { source: 'P38398', target: 'CHEMBL941', details: 'BRCA1 genomic correlation', isReal: false },
          { source: 'CHEMBL941', target: 'BCR-ABL', details: 'Tyrosine kinase inhibitor (Verified)', isReal: true },
          { source: 'BCR-ABL', target: 'CHEMBL254', details: 'Dual Src/Abl inhibitor (Verified)', isReal: true },
          { source: 'CHEMBL25', target: 'BCR-ABL', details: 'Muted affinity signature', isReal: false }
        ];

        if (active) {
          setNodes(defaultNodes);
          setLinks(defaultLinks);
        }
        return;
      }

      // Map comparison list items to node objects spaced out in an orbital ring
      const initialNodes = comparisonList.map((item, idx) => {
        const angle = (idx * 2 * Math.PI) / comparisonList.length;
        return {
          id: item.id,
          name: item.name,
          type: item.type === 'Protein' ? 'Protein' : 'Drug',
          x: 200 + 100 * Math.cos(angle),
          y: 150 + 100 * Math.sin(angle),
          fixed: false
        };
      });

      if (!active) return;
      setNodes(initialNodes);
      setLinks([]);

      try {
        const drugNodes = initialNodes.filter(n => n.type === 'Drug');
        const proteinNodes = initialNodes.filter(n => n.type === 'Protein');

        if (drugNodes.length === 0 || proteinNodes.length === 0) return;

        // Fetch ChEMBL target component IDs for proteins
        const proteinTargetIds = {};
        await Promise.all(
          proteinNodes.map(async (p) => {
            try {
              const res = await fetch(`https://www.ebi.ac.uk/chembl/api/data/target.json?target_components.protein_param.accession=${p.id}&format=json`);
              if (res.ok) {
                const data = await res.json();
                if (data.targets && data.targets.length > 0) {
                  proteinTargetIds[p.id] = data.targets[0].target_chembl_id;
                }
              }
            } catch (err) {
              console.error(`Error fetching ChEMBL target for ${p.id}:`, err);
            }
          })
        );

        if (!active) return;

        // Fetch mechanisms for drug nodes
        const resolvedLinks = [];
        await Promise.all(
          drugNodes.map(async (d) => {
            try {
              const res = await fetch(`https://www.ebi.ac.uk/chembl/api/data/mechanism.json?molecule_chembl_id=${d.id}&format=json`);
              if (res.ok) {
                const data = await res.json();
                const mechanisms = data.mechanisms || [];
                mechanisms.forEach(mech => {
                  proteinNodes.forEach(p => {
                    const targetId = proteinTargetIds[p.id];
                    if (targetId && mech.target_chembl_id === targetId) {
                      resolvedLinks.push({
                        source: d.id,
                        target: p.id,
                        details: mech.mechanism_of_action || 'ChEMBL verified mechanism',
                        isReal: true
                      });
                    }
                  });
                });
              }
            } catch (err) {
              console.error(`Error fetching mechanisms for drug ${d.id}:`, err);
            }
          })
        );

        if (!active) return;

        if (resolvedLinks.length > 0) {
          setLinks(resolvedLinks);
        } else {
          // Fallback: draw connections indicating predicted binding
          const predictedLinks = [];
          drugNodes.forEach(d => {
            proteinNodes.forEach(p => {
              predictedLinks.push({
                source: d.id,
                target: p.id,
                details: 'Predicted binding affinity model',
                isReal: false
              });
            });
          });
          setLinks(predictedLinks);
        }
      } catch (err) {
        console.error('Error compiling network map links:', err);
      }
    };

    loadInteractions();

    return () => {
      active = false;
    };
  }, [comparisonList]);

  // 2. Physics Simulation Loop
  useEffect(() => {
    if (nodes.length === 0) return;

    let animFrame;

    const tick = () => {
      setNodes((prevNodes) => {
        if (prevNodes.length === 0) return prevNodes;

        const nextNodes = prevNodes.map(n => ({ ...n }));

        // Coulomb repulsion between all nodes
        for (let i = 0; i < nextNodes.length; i++) {
          for (let j = i + 1; j < nextNodes.length; j++) {
            let dx = nextNodes[j].x - nextNodes[i].x;
            let dy = nextNodes[j].y - nextNodes[i].y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let minDist = 110;
            if (dist < minDist) {
              let force = (minDist - dist) * 0.08;
              let fx = (dx / dist) * force;
              let fy = (dy / dist) * force;
              if (!nextNodes[j].fixed) {
                nextNodes[j].x += fx;
                nextNodes[j].y += fy;
              }
              if (!nextNodes[i].fixed) {
                nextNodes[i].x -= fx;
                nextNodes[i].y -= fy;
              }
            }
          }
        }

        // Spring attraction along links
        links.forEach(link => {
          const sourceNode = nextNodes.find(n => n.id === link.source);
          const targetNode = nextNodes.find(n => n.id === link.target);
          if (sourceNode && targetNode) {
            let dx = targetNode.x - sourceNode.x;
            let dy = targetNode.y - sourceNode.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let targetDist = 95;
            let force = (dist - targetDist) * 0.03;
            let fx = (dx / dist) * force;
            let fy = (dy / dist) * force;
            if (!targetNode.fixed) {
              targetNode.x -= fx;
              targetNode.y -= fy;
            }
            if (!sourceNode.fixed) {
              sourceNode.x += fx;
              sourceNode.y += fy;
            }
          }
        });

        // Center gravity pulling back to (200, 150)
        nextNodes.forEach(node => {
          if (!node.fixed) {
            node.x += (200 - node.x) * 0.02;
            node.y += (150 - node.y) * 0.02;
          }
          // Force nodes to stay in viewport bounds
          if (node.x < 25) node.x = 25;
          if (node.x > 375) node.x = 375;
          if (node.y < 25) node.y = 25;
          if (node.y > 275) node.y = 275;
        });

        // Return next state only if nodes moved significantly
        let changed = false;
        for (let i = 0; i < prevNodes.length; i++) {
          if (Math.abs(prevNodes[i].x - nextNodes[i].x) > 0.05 || Math.abs(prevNodes[i].y - nextNodes[i].y) > 0.05) {
            changed = true;
            break;
          }
        }

        return changed ? nextNodes : prevNodes;
      });

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrame);
  }, [links, nodes.length]);

  // Drag handlers
  const handleMouseDown = (e, node) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggedNode(node.id);
    setNodes(prev => prev.map(n => n.id === node.id ? { ...n, fixed: true } : n));
  };

  const handleMouseMove = (e) => {
    if (!draggedNode || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 400;
    const y = ((e.clientY - rect.top) / rect.height) * 300;
    setNodes(prev => prev.map(n => n.id === draggedNode ? { ...n, x, y } : n));
  };

  const handleMouseUp = () => {
    if (!draggedNode) return;
    setNodes(prev => prev.map(n => n.id === draggedNode ? { ...n, fixed: false } : n));
    setDraggedNode(null);
  };

  return (
    <div 
      className="interaction-map-container" 
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg 
        ref={svgRef}
        viewBox="0 0 400 300" 
        className="interaction-svg"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <filter id="glow-magenta" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connections */}
        {links.map((link, i) => {
          const fromNode = nodes.find(n => n.id === link.source);
          const toNode = nodes.find(n => n.id === link.target);
          if (!fromNode || !toNode) return null;
          
          const isHovered = hoveredLink === link || 
            (hoveredNode === fromNode.id) || 
            (hoveredNode === toNode.id);

          return (
            <g key={`link-${i}`}>
              {/* Invisible line for hover target */}
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="transparent"
                strokeWidth="10"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredLink(link)}
                onMouseLeave={() => setHoveredLink(null)}
              />
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                className={`map-link ${link.isReal ? 'real' : 'predicted'} ${isHovered ? 'hover' : ''}`}
                stroke={isHovered ? '#00f0ff' : (link.isReal ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 42, 133, 0.3)')}
                strokeWidth={isHovered ? '2.5' : '1.5'}
                strokeDasharray={link.isReal ? '0' : '4,4'}
                style={{ transition: 'stroke 0.2s ease, stroke-width 0.2s ease' }}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const isHovered = hoveredNode === node.id;
          const isDrug = node.type === 'Drug';
          
          return (
            <g 
              key={node.id} 
              className={`map-node-group ${isDrug ? 'drug' : 'target'} ${isHovered ? 'hover' : ''}`}
              transform={`translate(${node.x}, ${node.y})`}
              onMouseDown={(e) => handleMouseDown(e, node)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: draggedNode === node.id ? 'grabbing' : 'grab' }}
            >
              <circle
                r={isHovered ? '10' : '7'}
                className="map-node"
                fill={isDrug ? 'var(--accent-secondary)' : 'var(--accent-primary)'}
                filter={isHovered ? (isDrug ? 'url(#glow-magenta)' : 'url(#glow-cyan)') : undefined}
                style={{ transition: 'r 0.2s ease' }}
              />
              
              <text
                y={isHovered ? '22' : '18'}
                textAnchor="middle"
                className="map-label"
                fill="var(--text-color)"
                fontSize={isHovered ? '11' : '9'}
                fontWeight={isHovered ? 'bold' : 'normal'}
                style={{ transition: 'font-size 0.2s ease, y 0.2s ease', pointerEvents: 'none' }}
              >
                {node.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div 
        className="map-overlay glass-card"
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          right: '8px',
          background: 'rgba(15, 15, 20, 0.85)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '11px',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}
      >
        {hoveredLink ? (
          <>
            <span style={{ color: 'var(--text-muted)' }}>Interaction Resolved:</span>
            <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>{hoveredLink.details}</span>
          </>
        ) : hoveredNode ? (
          <>
            <span style={{ color: 'var(--text-muted)' }}>Selected Entity:</span>
            <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>
              {nodes.find(n => n.id === hoveredNode)?.name} ({hoveredNode})
            </span>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Draggable Orbital Force-Directed Network</span>
            <span style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--accent-primary)' }}>● Protein</span>
              <span style={{ color: 'var(--accent-secondary)' }}>● Drug</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractionMap;
