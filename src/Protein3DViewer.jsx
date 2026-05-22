import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import BindingVisualizer from './BindingVisualizer';

const Protein3DViewer = ({ uniprotId }) => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdbInfo, setPdbInfo] = useState(null);

  useEffect(() => {
    let active = true;
    viewerRef.current = null;

    const loadStructure = async () => {
      try {
        const res = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`);
        if (!res.ok) {
          throw new Error(`AlphaFold prediction details not found for ${uniprotId}`);
        }
        
        const data = await res.json();
        if (!active) return;

        if (!data || data.length === 0 || !data[0].pdbUrl) {
          throw new Error(`No 3D structure available in AlphaFold DB for ${uniprotId}`);
        }

        const info = data[0];
        setPdbInfo(info);

        // Fetch the PDB coordinates text directly
        const pdbRes = await fetch(info.pdbUrl);
        if (!pdbRes.ok) {
          throw new Error('Failed to download 3D coordinate PDB file');
        }
        const pdbText = await pdbRes.text();
        if (!active) return;

        if (!window.$3Dmol) {
          throw new Error('3Dmol.js library failed to load from CDN. Check your internet connection.');
        }

        // Clear container
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }

        // Create the viewer
        const viewer = window.$3Dmol.createViewer(containerRef.current, {
          defaultcolors: window.$3Dmol.rasmolElementColors,
          backgroundColor: 'transparent'
        });
        viewerRef.current = viewer;

        // Load the PDB model
        viewer.addModel(pdbText, 'pdb');

        // Color cartoon style by B-factor (pLDDT column in AlphaFold structures)
        viewer.setStyle({}, {
          cartoon: {
            colorfunc: (atom) => {
              if (atom.b < 50) return '#FF7D45'; // Very low (Orange)
              if (atom.b < 70) return '#FFDB1A'; // Low (Yellow)
              if (atom.b < 90) return '#65CBFF'; // Confident (Light Blue)
              return '#0053D6'; // Very high (Dark Blue)
            }
          }
        });

        viewer.zoomTo();
        viewer.render();
        setLoading(false);
      } catch (err) {
        if (active) {
          console.error('[Protein3DViewer] Error:', err);
          setError(err.message || 'Error occurred while loading 3D protein structure.');
          setLoading(false);
        }
      }
    };

    loadStructure();

    return () => {
      active = false;
      if (viewerRef.current) {
        // Clean up viewer if needed
        viewerRef.current = null;
      }
    };
  }, [uniprotId]);

  return (
    <div className="protein-3d-wrapper" style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div 
        className="protein-3d-viewport glass-card" 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '380px', 
          background: 'rgba(5, 5, 10, 0.4)', 
          borderRadius: '12px', 
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)'
        }}
      >
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 10, 15, 0.95)', zIndex: 10 }}>
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)', marginBottom: '12px' }} />
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Retrieving AlphaFold 3D coordinates...</span>
          </div>
        )}
        
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(10, 10, 15, 0.95)', zIndex: 10, textAlign: 'center' }}>
            <span style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</span>
            <span style={{ fontSize: '13px', color: '#ff5c5c', fontWeight: '500', marginBottom: '4px' }}>{error}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '280px', marginBottom: '16px' }}>Showing default 2D molecular binding diagram fallback.</span>
            <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BindingVisualizer />
            </div>
          </div>
        )}

        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {!loading && !error && (
          <div 
            className="viewport-overlay-controls" 
            style={{ 
              position: 'absolute', 
              top: '12px', 
              right: '12px', 
              background: 'rgba(15, 15, 20, 0.75)', 
              backdropFilter: 'blur(8px)',
              padding: '6px 12px', 
              borderRadius: '20px', 
              fontSize: '11px', 
              color: 'var(--text-muted)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              pointerEvents: 'none'
            }}
          >
            🖱️ Drag to Rotate | Scroll to Zoom
          </div>
        )}
      </div>

      {!loading && !error && pdbInfo && (
        <div 
          className="protein-3d-legend glass-card animate-fade-in" 
          style={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            padding: '12px 16px', 
            borderRadius: '12px', 
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex', 
            flexWrap: 'wrap',
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Model: <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>AlphaFold {pdbInfo.entryId}</span>
            <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.15)' }}>|</span>
            Coverage: <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>{pdbInfo.uniprotStart}-{pdbInfo.uniprotEnd} ({pdbInfo.uniprotSequence?.length || 0} aa)</span>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontWeight: '500' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#0053D6', boxShadow: '0 0 8px rgba(0, 83, 214, 0.6)' }}></span>
              <span>&gt;90 (Very High)</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#65CBFF', boxShadow: '0 0 8px rgba(101, 203, 255, 0.6)' }}></span>
              <span>70-90 (Confident)</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#FFDB1A', boxShadow: '0 0 8px rgba(255, 219, 26, 0.6)' }}></span>
              <span>50-70 (Low)</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#FF7D45', boxShadow: '0 0 8px rgba(255, 125, 69, 0.6)' }}></span>
              <span>&lt;50 (Very Low)</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Protein3DViewer;
