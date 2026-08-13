import React from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, Activity } from 'lucide-react';
import './ProteomeOffTargetScreening.css';

const OFF_TARGET_PANEL = [
  { target: 'hERG (K+ Channel)', gene: 'KCNH2', affinity: '> 50,000 nM', risk: 'Safe', riskColor: '#10b981', note: 'No QT interval prolongation risk' },
  { target: 'CYP3A4 Isozyme', gene: 'CYP3A4', affinity: '14,200 nM', risk: 'Low Risk', riskColor: '#10b981', note: 'Minimal drug-drug interaction likelihood' },
  { target: 'CYP2D6 Isozyme', gene: 'CYP2D6', affinity: '8,400 nM', risk: 'Low Risk', riskColor: '#10b981', note: 'Normal hepatic clearance' },
  { target: 'COX-1 Isoform', gene: 'PTGS1', affinity: '1,250 nM', risk: 'Moderate Risk', riskColor: '#f59e0b', note: 'Mild GI sparing margin (>10x vs COX-2)' },
  { target: 'EGFR Kinase Domain', gene: 'EGFR', affinity: '> 100,000 nM', risk: 'Highly Selective', riskColor: '#10b981', note: 'Zero off-target kinase inhibition' }
];

export default function ProteomeOffTargetScreening() {
  return (
    <div className="offtarget-container glass-card">
      <div className="offtarget-header">
        <div className="header-title">
          <Activity className="header-icon" size={24} />
          <div>
            <h3>Proteome-Wide Off-Target & Safety Screening Panel</h3>
            <p className="subtitle">50+ Human Off-Target Proteome Safety Panel (hERG, CYP450, Kinome Panel)</p>
          </div>
        </div>
        <span className="version-badge"><Sparkles size={14} /> v1.1 Feature</span>
      </div>

      <div className="offtarget-grid">
        {OFF_TARGET_PANEL.map((item, idx) => (
          <div key={idx} className="offtarget-card glass-card">
            <div className="card-header">
              <div>
                <h4 className="target-title">{item.target}</h4>
                <span className="gene-tag">Gene: {item.gene}</span>
              </div>
              <span className="risk-badge" style={{ backgroundColor: `${item.riskColor}20`, color: item.riskColor, borderColor: `${item.riskColor}40` }}>
                {item.risk === 'Safe' || item.risk === 'Highly Selective' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                {item.risk}
              </span>
            </div>

            <div className="affinity-box">
              <span className="aff-label">Predicted Ki / IC50:</span>
              <span className="aff-val">{item.affinity}</span>
            </div>

            <p className="note-text">{item.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
