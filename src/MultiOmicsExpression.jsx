import React from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import './MultiOmicsExpression.css';

const TISSUE_SAMPLES = [
  { tissue: 'Brain (Cortex)', gtexTPM: 14.2, tcgaTPM: 142.8, log2FC: 3.33, status: 'Overexpressed in Glioblastoma' },
  { tissue: 'Lung (Alveolar)', gtexTPM: 8.5, tcgaTPM: 94.1, log2FC: 3.47, status: 'Overexpressed in Lung Adenocarcinoma' },
  { tissue: 'Skin (Sun Exposed)', gtexTPM: 2.1, tcgaTPM: 88.6, log2FC: 5.39, status: 'Highly Overexpressed in Melanoma' },
  { tissue: 'Breast (Mammary)', gtexTPM: 19.4, tcgaTPM: 112.0, log2FC: 2.53, status: 'Overexpressed in HER2+ Carcinoma' },
  { tissue: 'Liver (Hepatocytes)', gtexTPM: 45.1, tcgaTPM: 48.2, log2FC: 0.10, status: 'Normal Expression Baseline' },
  { tissue: 'Kidney (Cortex)', gtexTPM: 32.0, tcgaTPM: 28.4, log2FC: -0.17, status: 'Slightly Underexpressed' }
];

export default function MultiOmicsExpression() {
  return (
    <div className="omics-container glass-card">
      <div className="omics-header">
        <div className="header-title">
          <BarChart3 className="header-icon" size={24} />
          <div>
            <h3>Multi-Omics Differential Expression Heatmap</h3>
            <p className="subtitle">Healthy GTEx non-diseased baseline vs TCGA Cancer Cell Lines (Log2 Fold-Change)</p>
          </div>
        </div>
        <span className="version-badge"><Sparkles size={14} /> v1.1 Feature</span>
      </div>

      <div className="table-responsive">
        <table className="omics-table">
          <thead>
            <tr>
              <th>Tissue / Organ Site</th>
              <th>GTEx Baseline (TPM)</th>
              <th>TCGA Cancer (TPM)</th>
              <th>Log2 Fold-Change</th>
              <th>Differential Diagnosis</th>
            </tr>
          </thead>
          <tbody>
            {TISSUE_SAMPLES.map((row, idx) => (
              <tr key={idx}>
                <td className="tissue-name">{row.tissue}</td>
                <td>{row.gtexTPM}</td>
                <td className="tcga-cell">{row.tcgaTPM}</td>
                <td>
                  <span className={`fc-pill ${row.log2FC > 2 ? 'high-fc' : row.log2FC < 0 ? 'low-fc' : 'normal-fc'}`}>
                    +{row.log2FC}x
                  </span>
                </td>
                <td className="status-text">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
