import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import BindingVisualizer from './BindingVisualizer';

const Protein3DViewer = ({ uniprotId }) => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [structuresList, setStructuresList] = useState([]);
  const [selectedStructureId, setSelectedStructureId] = useState('AlphaFold');
  const [structureDetails, setStructureDetails] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch conformers list (AlphaFold + PDB cross references)
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      setLoadingList(true);
      setError('');
    });

    const fetchList = async () => {
      try {
        const list = [];

        // Try to fetch AlphaFold structure metadata
        try {
          const afRes = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`);
          if (afRes.ok) {
            const afData = await afRes.json();
            if (afData && afData.length > 0 && afData[0].pdbUrl) {
              const afInfo = afData[0];
              list.push({
                type: 'AlphaFold',
                id: 'AlphaFold',
                entryId: afInfo.entryId,
                pdbUrl: afInfo.pdbUrl,
                uniprotStart: afInfo.uniprotStart,
                uniprotEnd: afInfo.uniprotEnd,
                seqLength: afInfo.uniprotSequence?.length || 0,
                method: 'Predicted (AlphaFold)',
                resolution: 'N/A',
                chains: 'N/A'
              });
            }
          }
        } catch (afErr) {
          console.warn('[Protein3DViewer] AlphaFold prediction metadata fetch failed:', afErr);
        }

        // Fetch UniProt entry for PDB database cross-references
        try {
          const upRes = await fetch(`https://rest.uniprot.org/uniprotkb/${uniprotId}.json`);
          if (upRes.ok) {
            const upData = await upRes.json();
            const crossRefs = upData.uniProtKBCrossReferences || [];
            const pdbs = crossRefs.filter(r => r.database === 'PDB');

            pdbs.forEach(item => {
              const method = item.properties?.find(p => p.key === 'Method')?.value || 'N/A';
              const resolution = item.properties?.find(p => p.key === 'Resolution')?.value || 'N/A';
              const chains = item.properties?.find(p => p.key === 'Chains')?.value || 'N/A';

              list.push({
                type: 'PDB',
                id: item.id,
                entryId: item.id,
                pdbUrl: `https://files.rcsb.org/download/${item.id}.pdb`,
                uniprotStart: '',
                uniprotEnd: '',
                seqLength: 0,
                method,
                resolution,
                chains
              });
            });
          }
        } catch (upErr) {
          console.warn('[Protein3DViewer] UniProt cross-references fetch failed:', upErr);
        }

        if (!active) return;

        if (list.length === 0) {
          throw new Error(`No 3D structures (AlphaFold or PDB) found for ${uniprotId}`);
        }

        setStructuresList(list);
        const defaultStruct = list.find(s => s.type === 'AlphaFold') || list[0];
        setSelectedStructureId(defaultStruct.id);
        setStructureDetails(defaultStruct);
        setLoadingList(false);
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to retrieve structural conformers list.');
          setLoadingList(false);
          setLoading(false);
        }
      }
    };

    fetchList();

    return () => {
      active = false;
    };
  }, [uniprotId]);

  // 2. Load and render selected structure
  useEffect(() => {
    if (!structureDetails) return;

    let active = true;
    Promise.resolve().then(() => {
      setLoading(true);
      setError('');
    });

    const loadStructure = async () => {
      try {
        const pdbRes = await fetch(structureDetails.pdbUrl);
        if (!pdbRes.ok) {
          throw new Error(`Failed to download coordinate file from ${structureDetails.id}`);
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

        // Apply style rules
        if (structureDetails.type === 'AlphaFold') {
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
        } else {
          viewer.setStyle({}, {
            cartoon: { color: 'spectrum' }
          });
        }

        viewer.zoomTo();
        viewer.render();
        setLoading(false);
      } catch (err) {
        if (active) {
          console.error('[Protein3DViewer] Error rendering structure:', err);
          setError(err.message || 'Error occurred while loading 3D protein structure.');
          setLoading(false);
        }
      }
    };

    loadStructure();

    return () => {
      active = false;
      if (viewerRef.current) {
        viewerRef.current = null;
      }
    };
  }, [structureDetails]);

  const handleStructureChange = (id) => {
    const matched = structuresList.find(s => s.id === id);
    if (matched) {
      setSelectedStructureId(id);
      setStructureDetails(matched);
    }
  };

  return (
    <div className="protein-3d-wrapper" style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div 
        className="protein-3d-header glass-card" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '8px 16px',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-color)' }}>Conformer Selection</span>
        {structuresList.length > 0 ? (
          <select 
            value={selectedStructureId} 
            onChange={(e) => handleStructureChange(e.target.value)}
            className="glass-select"
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '6px', 
              color: 'var(--text-color)', 
              padding: '4px 8px', 
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {structuresList.map(s => (
              <option key={s.id} value={s.id} style={{ background: '#1a1a1e', color: '#fff' }}>
                {s.type === 'AlphaFold' ? 'AlphaFold (Predicted)' : `${s.id} (${s.method}${s.resolution !== '-' ? ` - ${s.resolution}` : ''})`}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {loadingList ? 'Scanning database conformers...' : 'No structures available'}
          </span>
        )}
      </div>

      <div 
        className="protein-3d-viewport glass-card" 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '380px', 
          overflow: 'hidden',
          boxShadow: 'inset 0 0 20px var(--border-color)'
        }}
      >
        {(loadingList || loading) && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-panel-opaque)', zIndex: 10 }}>
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)', marginBottom: '12px' }} />
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {loadingList ? 'Scanning cross-references...' : `Downloading structure ${structureDetails?.id}...`}
            </span>
          </div>
        )}
        
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-panel-opaque)', zIndex: 10, textAlign: 'center' }}>
            <span style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</span>
            <span style={{ fontSize: '13px', color: '#ff5c5c', fontWeight: '500', marginBottom: '4px' }}>{error}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '280px', marginBottom: '16px' }}>Showing default 2D molecular binding diagram fallback.</span>
            <div style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BindingVisualizer />
            </div>
          </div>
        )}

        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {!loadingList && !loading && !error && (
          <div 
            className="viewport-overlay-controls" 
            style={{ 
              position: 'absolute', 
              top: '12px', 
              right: '12px', 
              background: 'var(--bg-overlay-controls)', 
              backdropFilter: 'blur(8px)',
              padding: '6px 12px', 
              borderRadius: '20px', 
              fontSize: '11px', 
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              pointerEvents: 'none'
            }}
          >
            🖱️ Drag to Rotate | Scroll to Zoom
          </div>
        )}
      </div>

      {!loadingList && !loading && !error && structureDetails && (
        <div 
          className="protein-3d-legend glass-card animate-fade-in" 
          style={{ 
            padding: '12px 16px', 
            display: 'flex', 
            flexWrap: 'wrap',
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {structureDetails.type === 'AlphaFold' ? (
            <>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Model: <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>AlphaFold {structureDetails.entryId}</span>
                <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
                Coverage: <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>{structureDetails.uniprotStart}-{structureDetails.uniprotEnd} ({structureDetails.seqLength} aa)</span>
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
            </>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', width: '100%' }}>
              Model: <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>PDB {structureDetails.id}</span>
              <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
              Method: <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>{structureDetails.method}</span>
              <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
              Resolution: <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>{structureDetails.resolution}</span>
              <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
              Chains: <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>{structureDetails.chains}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Protein3DViewer;
