import React, { useState } from 'react';
import { BookOpen, Sparkles, ExternalLink, ShieldCheck, FileText, Award } from 'lucide-react';
import './PatentLiteratureDigest.css';

const SAMPLE_PATENTS = [
  {
    title: "Substituted Thiazine Carboxamides as Targeted Cyclooxygenase-2 Inhibitors",
    patentId: "US 11,485,720 B2",
    assignee: "Boehringer Ingelheim Pharma",
    pubDate: "2024-03-12",
    status: "Granted / Active",
    claims: "Claims novel crystalline polymorphs and oral dosage forms exhibiting reduced gastric mucosal erosion.",
    doi: "https://patents.google.com/patent/US11485720B2/en"
  },
  {
    title: "Allosteric Kinase Inhibitors for Refractory Mutant Oncology Targets",
    patentId: "WO 2025/014982 A1",
    assignee: "Novartis AG",
    pubDate: "2025-01-22",
    status: "Published Application",
    claims: "Compositions targeting DFG-out conformation with picomolar binding IC50 against mutant resistant lines.",
    doi: "https://patentscope.wipo.int/"
  }
];

const SAMPLE_PUBLICATIONS = [
  {
    title: "Structural basis of COX-2 selective inhibition and cardiovascular safety risk mitigation",
    journal: "Nature Structural & Molecular Biology",
    authors: "Smith, A., et al.",
    year: "2025",
    pmid: "PMID: 38291044",
    summary: "High-resolution 1.9Å X-ray crystal structure revealing binding site conformational shifts that prevent off-target TXA2 synthase inhibition.",
    url: "https://pubmed.ncbi.nlm.nih.gov/"
  },
  {
    title: "Proteome-wide off-target profiling of next-generation kinase inhibitor lead series",
    journal: "Journal of Medicinal Chemistry",
    authors: "Chen, L., Roberts, K.",
    year: "2024",
    pmid: "PMID: 37941021",
    summary: "Comprehensive Kinobeads assay across 420 human kinases demonstrating >100-fold selectivity margin over hERG and CYP3A4.",
    url: "https://europepmc.org/"
  }
];

export default function PatentLiteratureDigest() {
  const [activeTab, setActiveTab] = useState('patents');

  return (
    <div className="patent-digest-container glass-card">
      <div className="digest-header">
        <div className="header-title">
          <BookOpen className="header-icon" size={24} />
          <div>
            <h3>AI Patent & Scientific Literature Intelligence Digest</h3>
            <p className="subtitle">Synthesized IP claims, PubMed citations, and structural publication breakthroughs</p>
          </div>
        </div>
        <span className="version-badge"><Sparkles size={14} /> v1.1 Feature</span>
      </div>

      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'patents' ? 'active' : ''}`}
          onClick={() => setActiveTab('patents')}
        >
          <Award size={16} /> Active Patent Filings ({SAMPLE_PATENTS.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'publications' ? 'active' : ''}`}
          onClick={() => setActiveTab('publications')}
        >
          <FileText size={16} /> Key Literature & Publications ({SAMPLE_PUBLICATIONS.length})
        </button>
      </div>

      {activeTab === 'patents' ? (
        <div className="cards-list">
          {SAMPLE_PATENTS.map((p, idx) => (
            <div key={idx} className="digest-card glass-card">
              <div className="card-top">
                <span className="patent-badge">{p.patentId}</span>
                <span className="status-badge">{p.status}</span>
              </div>
              <h4 className="card-title">{p.title}</h4>
              <p className="assignee-line">Assignee: <strong>{p.assignee}</strong> • Published: {p.pubDate}</p>
              <div className="claims-box">
                <span className="box-label">Executive Patent Summary:</span>
                <p>{p.claims}</p>
              </div>
              <a href={p.doi} target="_blank" rel="noreferrer" className="link-btn">
                <span>View Full Patent Document</span>
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="cards-list">
          {SAMPLE_PUBLICATIONS.map((pub, idx) => (
            <div key={idx} className="digest-card glass-card">
              <div className="card-top">
                <span className="pmid-badge">{pub.pmid}</span>
                <span className="journal-badge">{pub.journal} ({pub.year})</span>
              </div>
              <h4 className="card-title">{pub.title}</h4>
              <p className="assignee-line">Authors: {pub.authors}</p>
              <div className="claims-box">
                <span className="box-label">Key Scientific Findings:</span>
                <p>{pub.summary}</p>
              </div>
              <a href={pub.url} target="_blank" rel="noreferrer" className="link-btn">
                <span>View Europe PMC / PubMed Citation</span>
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
