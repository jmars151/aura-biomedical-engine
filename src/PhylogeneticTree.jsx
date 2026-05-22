import { useMemo, useState } from 'react';

// Newick String Parser
const parseNewick = (newick) => {
  if (!newick) return null;
  const cleanStr = newick.trim();
  if (cleanStr.length === 0) return null;
  
  let str = cleanStr;
  if (str.endsWith(';')) {
    str = str.slice(0, -1);
  }

  let index = 0;

  const parseNode = () => {
    let node = { children: [] };
    if (str[index] === '(') {
      index++; // consume '('
      while (index < str.length) {
        node.children.push(parseNode());
        if (str[index] === ',') {
          index++; // consume ','
        } else if (str[index] === ')') {
          index++; // consume ')'
          break;
        } else {
          break;
        }
      }
    }

    // Parse label (everything except special characters)
    let label = '';
    while (
      index < str.length &&
      str[index] !== ':' &&
      str[index] !== ',' &&
      str[index] !== ')' &&
      str[index] !== '(' &&
      str[index] !== ';'
    ) {
      label += str[index];
      index++;
    }
    node.name = label.trim();

    // Parse branch length
    if (str[index] === ':') {
      index++; // consume ':'
      let lengthStr = '';
      while (
        index < str.length &&
        str[index] !== ',' &&
        str[index] !== ')' &&
        str[index] !== '(' &&
        str[index] !== ';'
      ) {
        lengthStr += str[index];
        index++;
      }
      node.branchLength = parseFloat(lengthStr) || 0;
    } else {
      node.branchLength = 0;
    }

    return node;
  };

  try {
    return parseNode();
  } catch (err) {
    console.error('Error parsing Newick string:', err);
    return null;
  }
};

const PhylogeneticTree = ({ newickString }) => {
  const [hoveredNode, setHoveredNode] = useState(null);

  // Compute Layout
  const layout = useMemo(() => {
    const root = parseNewick(newickString);
    if (!root) return null;

    const width = 680;
    const height = 320;
    const paddingX = 40;
    const paddingRight = 160; // Extra room for UniProt Accession labels
    const paddingY = 30;

    const innerWidth = width - paddingX - paddingRight;
    const innerHeight = height - paddingY * 2;

    const leaves = [];
    
    // Compute cumulative depths
    const computeDepths = (node, depth = 0) => {
      node.depth = depth + (node.branchLength || 0);
      if (!node.children || node.children.length === 0) {
        leaves.push(node);
      } else {
        node.children.forEach(child => computeDepths(child, node.depth));
      }
    };
    computeDepths(root, 0);

    // Get max depth
    let maxDepth = Math.max(...leaves.map(l => l.depth), 0.0001);

    // Layout leaf coordinates
    leaves.forEach((leaf, index) => {
      leaf.y = paddingY + (leaves.length > 1 ? (index * innerHeight) / (leaves.length - 1) : innerHeight / 2);
      leaf.x = paddingX + (leaf.depth / maxDepth) * innerWidth;
    });

    // Layout internal node coordinates
    const layoutNode = (node) => {
      if (!node.children || node.children.length === 0) {
        return;
      }
      node.children.forEach(layoutNode);
      node.x = paddingX + (node.depth / maxDepth) * innerWidth;
      const sumY = node.children.reduce((acc, child) => acc + child.y, 0);
      node.y = sumY / node.children.length;
    };
    layoutNode(root);

    // Build connections list (paths to draw)
    const connections = [];
    const collectConnections = (node) => {
      if (!node.children || node.children.length === 0) return;
      
      const childYs = node.children.map(c => c.y);
      const minY = Math.min(...childYs);
      const maxY = Math.max(...childYs);

      // Vertical bar connecting all children's horizontal branches
      connections.push({
        type: 'vertical',
        x: node.x,
        y1: minY,
        y2: maxY,
        parent: node
      });

      // Horizontal branches for each child
      node.children.forEach(child => {
        connections.push({
          type: 'horizontal',
          x1: node.x,
          x2: child.x,
          y: child.y,
          parent: node,
          child
        });
        collectConnections(child);
      });
    };
    collectConnections(root);

    return { root, leaves, connections, width, height };
  }, [newickString]);

  if (!layout) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>No valid phylogenetic tree data available.</p>
      </div>
    );
  }

  const { leaves, connections, width, height } = layout;

  return (
    <div className="phylo-tree-container" style={{ position: 'relative', width: '100%', padding: '10px' }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="phylo-svg" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Draw Branch Connections */}
        {connections.map((conn, idx) => {
          if (conn.type === 'vertical') {
            return (
              <line
                key={`v-${idx}`}
                x1={conn.x}
                y1={conn.y1}
                x2={conn.x}
                y2={conn.y2}
                stroke="rgba(0, 240, 255, 0.2)"
                strokeWidth="2"
              />
            );
          } else {
            return (
              <line
                key={`h-${idx}`}
                x1={conn.x1}
                y1={conn.y}
                x2={conn.x2}
                y2={conn.y}
                stroke={hoveredNode?.id === conn.child.name ? '#00f0ff' : 'rgba(0, 240, 255, 0.4)'}
                strokeWidth="2"
                style={{ transition: 'stroke 0.2s ease' }}
                filter={hoveredNode?.id === conn.child.name ? 'url(#glow-cyan)' : undefined}
              />
            );
          }
        })}

        {/* Draw Leaf Nodes */}
        {leaves.map((leaf, idx) => {
          const isHovered = hoveredNode?.id === leaf.name;
          return (
            <g
              key={`leaf-${idx}`}
              onMouseEnter={() => setHoveredNode({ id: leaf.name, val: leaf.branchLength })}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Invisible touch target */}
              <circle cx={leaf.x} cy={leaf.y} r="12" fill="transparent" />
              
              {/* Visual node dot */}
              <circle
                cx={leaf.x}
                cy={leaf.y}
                r={isHovered ? '6' : '4'}
                fill={isHovered ? '#00f0ff' : 'var(--accent-primary)'}
                stroke="#0f0f15"
                strokeWidth="1.5"
                style={{ transition: 'all 0.2s ease' }}
                filter={isHovered ? 'url(#glow-cyan)' : undefined}
              />

              {/* Labeled text */}
              <text
                x={leaf.x + 12}
                y={leaf.y + 4}
                fill={isHovered ? '#00f0ff' : 'var(--text-color)'}
                fontSize="11"
                fontWeight={isHovered ? '600' : '400'}
                fontFamily="monospace"
                style={{ transition: 'fill 0.2s ease' }}
              >
                {leaf.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover Info Overlay */}
      <div 
        className="tree-tooltip glass-card"
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(15, 15, 20, 0.9)',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '11px',
          border: '1px solid rgba(255,255,255,0.08)',
          minWidth: '200px',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          transition: 'opacity 0.2s ease',
          opacity: hoveredNode ? 1 : 0.8
        }}
      >
        {hoveredNode ? (
          <>
            <span style={{ color: 'var(--text-muted)' }}>Hovering Leaf Target:</span>
            <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{hoveredNode.id}</span>
            <span style={{ color: 'var(--text-muted)' }}>
              Branch Distance: <span style={{ fontFamily: 'monospace', color: 'var(--text-color)' }}>{hoveredNode.val.toFixed(5)}</span>
            </span>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--text-muted)' }}>Phylogenetic Distance Map</span>
            <span>Hover over node terminals to explore calculated evolutionary distances.</span>
          </>
        )}
      </div>
    </div>
  );
};

export default PhylogeneticTree;
