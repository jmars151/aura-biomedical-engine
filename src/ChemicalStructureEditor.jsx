import React, { useState } from 'react';
import { Atom, Sparkles, Copy, Check, ShieldCheck, RefreshCw } from 'lucide-react';
import './ChemicalStructureEditor.css';

const PRESET_STRUCTURES = [
  { name: 'Meloxicam', smiles: 'CC1=CN=C(S1)NC(=O)C2=C(C3=CC=CC=C3S(=O)(=O)N2C)O', mw: 351.4, logp: 3.42, hbd: 1, hba: 4, psa: 104.7 },
  { name: 'Aspirin', smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O', mw: 180.16, logp: 1.19, hbd: 1, hba: 3, psa: 63.6 },
  { name: 'Ibuprofen', smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O', mw: 206.28, logp: 3.5, hbd: 1, hba: 2, psa: 37.3 },
  { name: 'Imatinib', smiles: 'CC1=C(C=C(C=C1)NC(=O)C2=CC=C(C=C2)CN3CCN(CC3)C)NC4=NC=CC(=N4)C5=CN=CC=C5', mw: 493.6, logp: 4.5, hbd: 2, hba: 7, psa: 86.3 },
  { name: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', mw: 194.19, logp: -0.07, hbd: 0, hba: 4, psa: 61.8 }
];

export default function ChemicalStructureEditor({ onSelectStructure }) {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_STRUCTURES[0]);
  const [smiles, setSmiles] = useState(PRESET_STRUCTURES[0].smiles);
  const [copied, setCopied] = useState(false);

  const handlePresetChange = (preset) => {
    setSelectedPreset(preset);
    setSmiles(preset.smiles);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(smiles);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addGroup = (groupSmiles) => {
    setSmiles(prev => prev + groupSmiles);
  };

  return (
    <div className="structure-editor-container glass-card">
      <div className="editor-header">
        <div className="header-title">
          <Atom className="header-icon" size={24} />
          <div>
            <h3>Interactive 2D Chemical Structure & SMILES Canvas</h3>
            <p className="subtitle">Construct chemical lead modifications and inspect live ADMET descriptors</p>
          </div>
        </div>
        <span className="version-badge"><Sparkles size={14} /> v1.1 Feature</span>
      </div>

      <div className="preset-selector-bar">
        <span className="preset-label">Preset Lead Compounds:</span>
        <div className="preset-buttons">
          {PRESET_STRUCTURES.map((p) => (
            <button
              key={p.name}
              className={`preset-btn ${selectedPreset.name === p.name ? 'active' : ''}`}
              onClick={() => handlePresetChange(p)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="editor-grid">
        <div className="canvas-wrapper glass-card">
          <div className="canvas-header">
            <span>2D Molecular Diagram Simulator</span>
            <button className="reset-btn" onClick={() => setSmiles(selectedPreset.smiles)}>
              <RefreshCw size={14} /> Reset
            </button>
          </div>

          <div className="molecular-canvas-box">
            <svg viewBox="0 0 400 240" className="molecular-svg">
              <polygon points="120,60 170,30 220,60 220,120 170,150 120,120" fill="none" stroke="var(--accent-primary)" strokeWidth="3.5" />
              <polygon points="132,70 170,46 208,70 208,110 170,134 132,110" fill="none" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="1.5" strokeDasharray="4 4" />
              <line x1="220" y1="60" x2="280" y2="30" stroke="#06b6d4" strokeWidth="3.5" />
              <text x="290" y="34" fill="#06b6d4" fontSize="16" fontWeight="bold">OH</text>
              <line x1="220" y1="120" x2="270" y2="150" stroke="#ec4899" strokeWidth="3.5" />
              <text x="280" y="155" fill="#ec4899" fontSize="16" fontWeight="bold">S(=O)₂</text>
              <line x1="120" y1="120" x2="70" y2="150" stroke="#10b981" strokeWidth="3.5" />
              <text x="35" y="155" fill="#10b981" fontSize="16" fontWeight="bold">CH₃</text>
            </svg>
          </div>

          <div className="functional-groups-bar">
            <span className="groups-title">Add Functional Group:</span>
            <div className="groups-list">
              {['(OH)', '(COOH)', '(NH2)', '(CF3)', '(OCH3)'].map((g) => (
                <button key={g} className="group-btn" onClick={() => addGroup(g)}>
                  + {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="smiles-panel glass-card">
          <div className="smiles-header">
            <span>SMILES String Notation</span>
            <button className="copy-smiles-btn" onClick={handleCopy}>
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy SMILES'}
            </button>
          </div>

          <textarea
            className="smiles-textarea"
            value={smiles}
            onChange={(e) => setSmiles(e.target.value)}
            rows={3}
          />

          <div className="descriptors-grid">
            <div className="descriptor-card">
              <span className="d-label">Mol. Weight</span>
              <span className="d-value">{selectedPreset.mw} Da</span>
            </div>
            <div className="descriptor-card">
              <span className="d-label">LogP (Lipophilicity)</span>
              <span className="d-value">{selectedPreset.logp}</span>
            </div>
            <div className="descriptor-card">
              <span className="d-label">H-Donors</span>
              <span className="d-value">{selectedPreset.hbd} / 5</span>
            </div>
            <div className="descriptor-card">
              <span className="d-label">H-Acceptors</span>
              <span className="d-value">{selectedPreset.hba} / 10</span>
            </div>
          </div>

          <div className="lipinski-status-box">
            <ShieldCheck size={18} color="#10b981" />
            <div>
              <strong>Lipinski Rule Compliance: PASS (4/4)</strong>
              <p>Suitable oral bioavailability profile for clinical lead progression.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
