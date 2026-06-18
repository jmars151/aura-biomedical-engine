import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, LayoutDashboard, Database, Activity, Settings, Bell, ChevronRight, FlaskConical, Loader2, ExternalLink, Menu, X, Mail, Copy, Download, Clock, TrendingUp, Trash2 } from 'lucide-react';
import { searchBiomedicalData, fetchRecentTrials, fetchLiveMetrics, fetchLiveDatabaseStats, fetchFDASafetyData, fetchPubChemData, fetchReactomePathways, fetchEuropePMCPublications, fetchEnsemblGenomics, fetchGTExExpression, fetchGWASAssociations } from './api';
import InteractionMap from './InteractionMap';
import BindingVisualizer from './BindingVisualizer';
import Protein3DViewer from './Protein3DViewer';
import PhylogeneticTree from './PhylogeneticTree';
import './App.css';
import './DetailView.css';
import './InteractionMap.css';
import './BindingVisualizer.css';

const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Failed to decode JWT token", e);
    return null;
  }
};

const mapCountryToRegion = (country) => {
  if (!country || country === 'Unknown') return 'Rest of World';
  const c = country.trim().toLowerCase();
  
  if (c.includes('united states') || c.includes('canada') || c.includes('mexico') || c === 'usa') {
    return 'North America';
  }
  
  const europeans = [
    'united kingdom', 'uk', 'germany', 'france', 'italy', 'spain', 'netherlands', 'belgium',
    'switzerland', 'sweden', 'norway', 'denmark', 'finland', 'ireland', 'austria', 'poland',
    'portugal', 'greece', 'hungary', 'czechia', 'romania', 'bulgaria', 'croatia', 'slovakia',
    'slovenia', 'estonia', 'latvia', 'lithuania', 'malta', 'cyprus', 'iceland', 'liechtenstein',
    'turkey', 'ukraine', 'belarus', 'russia'
  ];
  if (europeans.some(eu => c.includes(eu))) {
    return 'Europe';
  }
  
  const eastAsians = ['japan', 'china', 'south korea', 'taiwan', 'hong kong', 'macao', 'korea'];
  if (eastAsians.some(ea => c.includes(ea))) {
    return 'East Asia';
  }
  
  const southAmericans = ['brazil', 'argentina', 'colombia', 'chile', 'peru', 'venezuela', 'ecuador', 'bolivia', 'paraguay', 'uruguay'];
  if (southAmericans.some(sa => c.includes(sa))) {
    return 'South America';
  }
  
  return 'Rest of World';
};

const normalizePhase = (phaseStr) => {
  if (!phaseStr || phaseStr === 'N/A') return 'Other';
  const p = phaseStr.toUpperCase();
  if (p.includes('PHASE4') || p.includes('PHASE_4')) return 'Phase IV';
  if (p.includes('PHASE3') || p.includes('PHASE_3')) return 'Phase III';
  if (p.includes('PHASE2') || p.includes('PHASE_2')) return 'Phase II';
  if (p.includes('PHASE1') || p.includes('PHASE_1') || p.includes('EARLY_PHASE1')) return 'Phase I';
  return 'Other';
};



const INITIAL_PENDING_ANALYSES = [
  { id: 'PA-001', title: 'Affinity Simulation: Imatinib derivative vs BCR-ABL', category: 'Drug Validation', status: 'simulating' },
  { id: 'PA-002', title: 'Pathogenicity Re-classification for BRCA1 Variant #821', category: 'Genomics', status: 'queued' },
  { id: 'PA-003', title: 'Ki Inhibition Constant estimation for ChEMBL25', category: 'Drug-Target Assay', status: 'running' },
  { id: 'PA-004', title: 'Target Engagement Model for AURA-928', category: 'Compound Profile', status: 'simulating' },
  { id: 'PA-005', title: 'Phase II Protocol Alignment check for NCT00868335', category: 'Clinical Compliance', status: 'queued' },
  { id: 'PA-006', title: 'Somatic mutation impact scoring on EGFR', category: 'Genomics', status: 'running' },
  { id: 'PA-007', title: 'Auto-curation of PubMed abstract ID 3829102', category: 'Literature Bridge', status: 'queued' },
  { id: 'PA-008', title: 'Structure-Activity Relationship mapping for Imatinib', category: 'Molecular Chemistry', status: 'simulating' },
  { id: 'PA-009', title: 'Evolutionary Conservation check for BRCA1 promoter region', category: 'TF Binding Study', status: 'queued' },
  { id: 'PA-010', title: 'Pharmacokinetics model verification for Molecule AURA-928', category: 'ADME Prediction', status: 'running' },
  { id: 'PA-011', title: 'Safety profile evaluation against openFDA data', category: 'Toxicology Review', status: 'simulating' },
  { id: 'PA-012', title: 'Multiple Sequence Alignment for BRCA1 homologous proteins', category: 'Phylogeny', status: 'queued' },
  { id: 'PA-013', title: 'IC50 comparison chart generation', category: 'Visual Report', status: 'running' },
  { id: 'PA-014', title: 'ChEMBL bioactivity dataset synchronization', category: 'Data Sync', status: 'queued' },
  { id: 'PA-015', title: 'User interface telemetry and server logs audit', category: 'Telemetry', status: 'running' }
];
const TRENDING_TARGETS = ['EGFR', 'BRCA1', 'Imatinib', 'NCT00868335', 'HER2', 'BRAF'];
const PRESET_COMPOUNDS = [
  { name: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O', formula: 'C9H8O4' },
  { name: 'Imatinib', smiles: 'Cc1ccc(cc1)C(=O)Nc2ccc(cc2)CN3CCN(CC3)C', formula: 'C29H31N7O' },
  { name: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', formula: 'C8H10N4O2' },
  { name: 'Acetaminophen', smiles: 'CC(=O)Nc1ccc(O)cc1', formula: 'C8H9NO2' },
  { name: 'Ibuprofen', smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O', formula: 'C13H18O2' },
  { name: 'Penicillin G', smiles: 'CC1(C(N2C(S1)C(C2=O)NC(=O)Cc3ccccc3)C(=O)O)C', formula: 'C16H18N2O4S' },
  { name: 'Nicotine', smiles: 'CN1CCCC1c2cccnc2', formula: 'C10H14N2' },
  { name: 'Atorvastatin', smiles: 'CC(C)c1c(C(=O)Nc2ccccc2)c(c(-c3ccc(F)cc3)n1CC[C@@H](O)C[C@@H](O)CC(=O)O)-c4ccccc4', formula: 'C33H35FN2O5' }
];

const downloadCSV = (filename, headers, rows) => {
  const content = [
    headers.join(','),
    ...rows.map(row => row.map(val => {
      const str = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
    }).join(','))
  ].join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const exportTranscriptsToCSV = (targetName, transcripts) => {
  if (!transcripts || transcripts.length === 0) return;
  const headers = ['Transcript ID', 'Name', 'Length (bp)', 'Biotype'];
  const rows = transcripts.map(t => [t.id, t.name, t.length, t.biotype]);
  downloadCSV(`${targetName}_transcripts.csv`, headers, rows);
};

const exportFDAReactionsToCSV = (drugName, reactions) => {
  if (!reactions || reactions.length === 0) return;
  const headers = ['Reaction Term', 'Reported Cases'];
  const rows = reactions.map(r => [r.term, r.count]);
  downloadCSV(`${drugName}_fda_reactions.csv`, headers, rows);
};

const exportTrialsToCSV = (trials) => {
  if (!trials || trials.length === 0) return;
  const headers = ['NCT ID', 'Brief Title', 'Status', 'Phase', 'Sponsor', 'Country'];
  const rows = trials.map(t => [t.id, t.title, t.status, t.phase, t.sponsor, t.country]);
  downloadCSV(`active_global_studies.csv`, headers, rows);
};

const parseFormula = (formula) => {
  if (!formula) return [];
  const elementRegex = /([A-Z][a-z]*)(\d*)/g;
  const elements = {};
  let match;
  while ((match = elementRegex.exec(formula)) !== null) {
    const element = match[1];
    const count = parseInt(match[2] || '1', 10);
    elements[element] = (elements[element] || 0) + count;
  }
  
  const ATOMIC_MASSES = {
    'H': 1.008, 'C': 12.011, 'N': 14.007, 'O': 15.999, 'F': 18.998,
    'Na': 22.990, 'P': 30.974, 'S': 32.06, 'Cl': 35.45, 'K': 39.098,
    'Br': 79.904, 'I': 126.904
  };

  const totalWeight = Object.entries(elements).reduce((sum, [el, count]) => {
    return sum + (ATOMIC_MASSES[el] || 12.0) * count;
  }, 0);

  return Object.entries(elements).map(([el, count]) => {
    const elMass = (ATOMIC_MASSES[el] || 12.0) * count;
    const pct = totalWeight > 0 ? (elMass / totalWeight) * 100 : 0;
    return { element: el, count, mass: elMass, percentage: pct };
  }).sort((a, b) => b.mass - a.mass);
};

const renderCompositionChart = (formula) => {
  const composition = parseFormula(formula);
  if (composition.length === 0) return null;
  
  const ELEMENT_COLORS = {
    'C': '#a855f7', 'H': '#3b82f6', 'N': '#06b6d4', 'O': '#ef4444',
    'F': '#eab308', 'P': '#f97316', 'S': '#10b981', 'Cl': '#ec4899',
    'Br': '#8b5cf6', 'I': '#6366f1', 'Na': '#14b8a6'
  };
  const getElementColor = (el) => ELEMENT_COLORS[el] || '#6b7280';
  
  return (
    <div className="element-composition-chart" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>Elemental Mass Breakdown ({formula})</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sorted by mass %</span>
      </div>
      <div style={{
        display: 'flex',
        height: '16px',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid var(--border-color)',
        width: '100%'
      }}>
        {composition.map((item, idx) => (
          <div
            key={idx}
            style={{
              width: `${item.percentage}%`,
              background: getElementColor(item.element),
              height: '100%',
              transition: 'all 0.3s ease'
            }}
            title={`${item.element}: ${item.count} atoms, ${item.percentage.toFixed(1)}% by mass`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
        {composition.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getElementColor(item.element) }} />
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.element}</span>
            <span style={{ color: 'var(--text-muted)' }}>x{item.count} ({item.percentage.toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function App() {
  const [pendingAnalyses, setPendingAnalyses] = useState(INITIAL_PENDING_ANALYSES);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const prevAnalysesRef = useRef(pendingAnalyses);

  const addNotification = useCallback((title, message, type = 'info') => {
    const newNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString()
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  const deleteNotification = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setNotifications(prev => 
      prev.filter(n => n.id !== id)
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const [liveStats, setLiveStats] = useState({
    trials: '65,239',
    trialsChange: '+3.4%',
    molecules: '2,878,135',
    loading: true
  });

  const [trialDistribution, setTrialDistribution] = useState({
    regions: [
      { label: 'North America', value: '42% (511 trials)', fill: '42%' },
      { label: 'Europe', value: '31% (377 trials)', fill: '31%' },
      { label: 'East Asia', value: '18% (219 trials)', fill: '18%' },
      { label: 'South America', value: '5% (61 trials)', fill: '5%' },
      { label: 'Rest of World', value: '4% (49 trials)', fill: '4%' }
    ],
    phases: [
      { count: 184, label: 'Phase I' },
      { count: 425, label: 'Phase II' },
      { count: 486, label: 'Phase III' },
      { count: 122, label: 'Phase IV' }
    ],
    countries: [
      { name: 'United States', count: 482 },
      { name: 'United Kingdom', count: 120 },
      { name: 'Germany', count: 94 },
      { name: 'Japan', count: 85 },
      { name: 'France', count: 72 }
    ]
  });

  useEffect(() => {
    // Log system upgrades to browser console
    console.log(
      `%c AURA Biomedical Engine - Live Upgrades Installed %c\n` +
      `🧬 Ensembl: Genomic coordinates & transcripts\n` +
      `📊 GTEx Portal: Tissue expression profiles\n` +
      `📚 Europe PMC: Literature research queries\n` +
      `🏥 GWAS Catalog: Clinical risk trait mappings\n` +
      `💎 RCSB PDB: Resolved crystallographic structural models`,
      `background: #7c3aed; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-bottom: 6px;`,
      `color: #bbf7d0; font-size: 11px; line-height: 1.6;`
    );

    const loadStats = async () => {
      try {
        const stats = await fetchLiveDatabaseStats();
        setLiveStats({
          trials: stats.trials.toLocaleString(),
          trialsChange: '+3.4%',
          molecules: stats.molecules.toLocaleString(),
          loading: false
        });
      } catch (err) {
        console.error("Failed to load live database stats:", err);
      }
    };
    loadStats();
  }, []);

  const dailyStats = { 
    trials: liveStats.trials, 
    trialsChange: liveStats.trialsChange, 
    molecules: liveStats.molecules, 
    pending: pendingAnalyses.length.toString() 
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [highlightSearch, setHighlightSearch] = useState(false);
  const searchInputRef = useRef(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeMetrics, setActiveMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const [activeDetailTab, setActiveDetailTab] = useState('affinity');
  const [fdaSafetyData, setFdaSafetyData] = useState(null);
  const [fdaLoading, setFdaLoading] = useState(false);
  const [pubChemData, setPubChemData] = useState(null);
  const [pubChemLoading, setPubChemLoading] = useState(false);
  const [reactomePathways, setReactomePathways] = useState([]);
  const [reactomeLoading, setReactomeLoading] = useState(false);
  const [sandboxSmiles, setSandboxSmiles] = useState('');
  const [sandboxData, setSandboxData] = useState(null);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  // Additional 5-source live integration states
  const [publicationsData, setPublicationsData] = useState([]);
  const [publicationsLoading, setPublicationsLoading] = useState(false);
  const [ensemblData, setEnsemblData] = useState(null);
  const [ensemblLoading, setEnsemblLoading] = useState(false);
  const [gtexData, setGtexData] = useState([]);
  const [gtexLoading, setGtexLoading] = useState(false);
  const [gwasData, setGwasData] = useState([]);
  const [gwasLoading, setGwasLoading] = useState(false);

  // Search Autocomplete, CSV Exports, Map Highlighting, SMILES Sandbox Upgrades
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeMapRegion, setActiveMapRegion] = useState(null);
  const [sandboxSearchQuery, setSandboxSearchQuery] = useState('');
  const [sandboxShowDropdown, setSandboxShowDropdown] = useState(false);

  const addRecentSearch = (query) => {
    if (!query || query.trim().length < 2) return;
    const q = query.trim();
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== q.toLowerCase());
      const next = [q, ...filtered].slice(0, 5);
      localStorage.setItem('aura_recent_searches', JSON.stringify(next));
      return next;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('aura_recent_searches');
  };



  // Reset tab selection when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      const isProtein = selectedItem.type === 'Protein' || /^[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(selectedItem.id);
      Promise.resolve().then(() => {
        setActiveDetailTab(isProtein ? 'structure' : 'affinity');
        setFdaSafetyData(null);
        setPubChemData(null);
        setReactomePathways([]);
        setSandboxSmiles('');
        setSandboxData(null);
        setPublicationsData([]);
        setEnsemblData(null);
        setGtexData([]);
        setGwasData([]);
      });
    }
  }, [selectedItem]);

  // Fetch live metrics when selectedItem changes
  useEffect(() => {
    if (!selectedItem) {
      Promise.resolve().then(() => {
        setActiveMetrics(null);
      });
      return;
    }

    let active = true;
    Promise.resolve().then(() => {
      setMetricsLoading(true);
    });

    fetchLiveMetrics(selectedItem)
      .then((res) => {
        if (active) {
          Promise.resolve().then(() => {
            setActiveMetrics(res);
            setMetricsLoading(false);
          });
        }
      })
      .catch((err) => {
        console.error('Error fetching live metrics:', err);
        if (active) {
          Promise.resolve().then(() => {
            setMetricsLoading(false);
          });
        }
      });

    return () => {
      active = false;
    };
  }, [selectedItem]);

  // Fetch detailed tab metrics dynamically on selection / tab toggle
  useEffect(() => {
    if (!selectedItem) return;

    const isProtein = selectedItem.type === 'Protein' || /^[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(selectedItem.id);
    const drugName = selectedItem.name;

    if (activeDetailTab === 'safety' && !isProtein && !fdaSafetyData) {
      Promise.resolve().then(() => {
        setFdaLoading(true);
      });
      fetchFDASafetyData(drugName).then(data => {
        Promise.resolve().then(() => {
          setFdaSafetyData(data);
          setFdaLoading(false);
        });
      });
    }

    if (activeDetailTab === 'cheminformatics' && !isProtein && !pubChemData) {
      Promise.resolve().then(() => {
        setPubChemLoading(true);
      });
      fetchPubChemData(drugName).then(data => {
        Promise.resolve().then(() => {
          setPubChemData(data);
          setSandboxSmiles(data.smiles);
          setPubChemLoading(false);
        });
      });
    }

    if (activeDetailTab === 'pathways' && isProtein && reactomePathways.length === 0) {
      Promise.resolve().then(() => {
        setReactomeLoading(true);
      });
      fetchReactomePathways(selectedItem.id).then(data => {
        Promise.resolve().then(() => {
          setReactomePathways(data);
          setReactomeLoading(false);
        });
      });
    }

    if (activeDetailTab === 'publications' && publicationsData.length === 0) {
      Promise.resolve().then(() => {
        setPublicationsLoading(true);
      });
      fetchEuropePMCPublications(selectedItem.name).then(data => {
        Promise.resolve().then(() => {
          setPublicationsData(data);
          setPublicationsLoading(false);
        });
      });
    }

    if (activeDetailTab === 'genomics' && isProtein && !ensemblData) {
      Promise.resolve().then(() => {
        setEnsemblLoading(true);
      });
      fetchEnsemblGenomics(selectedItem.name).then(data => {
        Promise.resolve().then(() => {
          setEnsemblData(data);
          setEnsemblLoading(false);
        });
      });
    }

    if (activeDetailTab === 'expression' && isProtein && gtexData.length === 0) {
      Promise.resolve().then(() => {
        setGtexLoading(true);
      });
      fetchGTExExpression(selectedItem.name).then(data => {
        Promise.resolve().then(() => {
          setGtexData(data);
          setGtexLoading(false);
        });
      });
    }

    if (activeDetailTab === 'variants' && isProtein && gwasData.length === 0) {
      Promise.resolve().then(() => {
        setGwasLoading(true);
      });
      fetchGWASAssociations(selectedItem.name).then(data => {
        Promise.resolve().then(() => {
          setGwasData(data);
          setGwasLoading(false);
        });
      });
    }
  }, [selectedItem, activeDetailTab, fdaSafetyData, pubChemData, reactomePathways.length, publicationsData.length, ensemblData, gtexData.length, gwasData.length]);

  // SMILES sandbox debounce property loader
  useEffect(() => {
    if (!sandboxSmiles) {
      Promise.resolve().then(() => {
        setSandboxData(null);
      });
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      Promise.resolve().then(() => {
        setSandboxLoading(true);
      });
      try {
        const data = await fetchPubChemData(sandboxSmiles);
        Promise.resolve().then(() => {
          setSandboxData(data);
          setSandboxLoading(false);
        });
      } catch (err) {
        console.error("SMILES sandbox error:", err);
        Promise.resolve().then(() => {
          setSandboxLoading(false);
        });
      }
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [sandboxSmiles]);

  const [comparisonList, setComparisonList] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showGlobalMapModal, setShowGlobalMapModal] = useState(false);

  // EBI Alignment Integration state
  const [selectedAlignmentJob, setSelectedAlignmentJob] = useState(null);
  const [alignmentResult, setAlignmentResult] = useState('');
  const [treeResult, setTreeResult] = useState('');
  const [activeAlignTab, setActiveAlignTab] = useState('alignment');
  const [alignmentLoading, setAlignmentLoading] = useState(false);
  const [alignmentError, setAlignmentError] = useState('');
  const [isSubmittingAlignment, setIsSubmittingAlignment] = useState(false);

  // Generate random pending analysis items
  const generateRandomAnalysis = () => {
    const molecules = ['Imatinib', 'AURA-928', 'Lapatinib', 'Gefitinib', 'Vemurafenib', 'Sorafenib', 'Dasatinib', 'Nilotinib'];
    const targets = ['BCR-ABL', 'EGFR', 'BRAF', 'HER2', 'VEGFR2', 'PDGFR', 'KIT', 'ALK'];
    const genes = ['BRCA1', 'BRCA2', 'TP53', 'EGFR', 'KRAS', 'ALK', 'MYC', 'APC'];
    const categories = ['Drug Validation', 'Genomics', 'Drug-Target Assay', 'Compound Profile', 'Clinical Compliance', 'Molecular Chemistry', 'Toxicology Review', 'Phylogeny'];
    
    const category = categories[Math.floor(Math.random() * categories.length)];
    let title;
    
    switch (category) {
      case 'Drug Validation':
        title = `Affinity Simulation: ${molecules[Math.floor(Math.random() * molecules.length)]} vs ${targets[Math.floor(Math.random() * targets.length)]}`;
        break;
      case 'Genomics':
        title = `Pathogenicity Re-classification for ${genes[Math.floor(Math.random() * genes.length)]} Variant #${Math.floor(Math.random() * 900) + 100}`;
        break;
      case 'Drug-Target Assay':
        title = `Ki Inhibition Constant estimation for ChEMBL${Math.floor(Math.random() * 90000) + 10000}`;
        break;
      case 'Compound Profile':
        title = `Target Engagement Model for ${molecules[Math.floor(Math.random() * molecules.length)]}`;
        break;
      case 'Clinical Compliance':
        title = `Phase II Protocol Alignment check for NCT0${Math.floor(Math.random() * 90000000) + 10000000}`;
        break;
      default:
        title = `Structure-Activity Relationship mapping for ${molecules[Math.floor(Math.random() * molecules.length)]}`;
    }
    
    const statuses = ['queued', 'running', 'simulating'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const id = `PA-${Math.floor(Math.random() * 900) + 100}`;
    return { id, title, category, status };
  };

  // Simulate analysis pipeline progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingAnalyses((prev) => {
        const rand = Math.random();
        
        // Complete an active task (remove it) - 40% chance if there are items
        if (rand < 0.4 && prev.length > 3) {
          const activeIndices = prev.map((item, idx) => ((item.status === 'running' || item.status === 'simulating') && !item.isRealJob) ? idx : -1).filter(idx => idx !== -1);
          if (activeIndices.length > 0) {
            const indexToRemove = activeIndices[Math.floor(Math.random() * activeIndices.length)];
            return prev.filter((_, idx) => idx !== indexToRemove);
          }
        }
        
        // Start a queued task (queued -> running/simulating) - 30% chance
        if (rand < 0.7) {
          const queuedIndices = prev.map((item, idx) => (item.status === 'queued' && !item.isRealJob) ? idx : -1).filter(idx => idx !== -1);
          if (queuedIndices.length > 0) {
            const indexToStart = queuedIndices[Math.floor(Math.random() * queuedIndices.length)];
            const nextStatus = Math.random() > 0.5 ? 'running' : 'simulating';
            return prev.map((item, idx) => idx === indexToStart ? { ...item, status: nextStatus } : item);
          }
        }
        
        // Add a new queued task - 30% chance or if count gets low
        const simulatedCount = prev.filter(item => !item.isRealJob).length;
        if (simulatedCount < 15) {
          const newTask = generateRandomAnalysis();
          if (!prev.some(item => item.id === newTask.id)) {
            return [...prev, newTask];
          }
        }
        
        return prev;
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Poll real EMBL-EBI jobs in real time
  useEffect(() => {
    const activeRealJobs = pendingAnalyses.filter(item => item.isRealJob && item.status !== 'completed' && item.status !== 'failed');
    if (activeRealJobs.length === 0) return;

    const interval = setInterval(() => {
      activeRealJobs.forEach(async (job) => {
        try {
          const res = await fetch(`/api/align?jobId=${job.jobId}`);
          if (res.ok) {
            let data;
            try {
              data = await res.json();
            } catch (jsonErr) {
              console.error(`Failed to parse job status response as JSON for ${job.jobId}:`, jsonErr);
              return;
            }
            if (data.status === 'success') {
              const newStatus = data.jobStatus; // 'queued' | 'running' | 'completed' | 'failed'
              if (newStatus !== job.status) {
                setPendingAnalyses(prev => 
                  prev.map(item => item.id === job.id ? { ...item, status: newStatus } : item)
                );
              }
            }
          }
        } catch (error) {
          console.error(`Failed to poll status for job ${job.jobId}:`, error);
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [pendingAnalyses]);

  // Observe changes in pendingAnalyses to trigger notifications for real EBI task additions, completions, and transitions
  useEffect(() => {
    const prevAnalyses = prevAnalysesRef.current;
    
    // Detect added tasks
    pendingAnalyses.forEach(item => {
      const prevItem = prevAnalyses.find(p => p.id === item.id);
      if (!prevItem) {
        if (item.isRealJob) {
          addNotification(
            'Alignment Job Submitted',
            `Live EMBL-EBI sequence alignment job initiated: ${item.title}.`,
            'info'
          );
        }
      } else {
        // Detect state transitions of existing tasks
        if (item.status !== prevItem.status) {
          if (item.status === 'completed') {
            addNotification(
              'Alignment Complete',
              `Multiple Sequence Alignment is ready for review: ${item.title}.`,
              'success'
            );
          } else if (item.status === 'failed') {
            addNotification(
              'Alignment Failed',
              `Alignment job failed: ${item.title}. Please check accession codes or email settings.`,
              'error'
            );
          }
        }
      }
    });

    prevAnalysesRef.current = pendingAnalyses;
  }, [pendingAnalyses, addNotification]);

  // Submit multiple sequence alignment job to EBI Clustal Omega API
  const handleRunSequenceAlignment = async () => {
    const comparedProteins = comparisonList.filter(item => item.type === 'Protein');
    if (comparedProteins.length < 2) return;

    setIsSubmittingAlignment(true);
    try {
      const accessions = comparedProteins.map(p => p.id);
      const res = await fetch('/api/align', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessions, email: currentUser?.email }),
      });

      if (!res.ok) {
        let errMsg = `Submission failed: ${res.status}`;
        try {
          const errData = await res.json();
          errMsg = errData.message || errMsg;
        } catch {
          try {
            const rawText = await res.text();
            if (rawText && rawText.length < 200) errMsg = rawText;
          } catch {
            // ignore fallback
          }
        }
        throw new Error(errMsg);
      }

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Failed to parse alignment response as JSON: ${jsonErr.message}`, { cause: jsonErr });
      }

      if (data.status === 'success') {
        const newJob = {
          id: `PA-EBI-${data.jobId.substring(0, 8)}`,
          title: `Clustal Omega Alignment: ${comparedProteins.map(p => p.name).join(' vs ')}`,
          category: 'Phylogeny',
          status: 'queued',
          isRealJob: true,
          jobId: data.jobId,
          proteins: comparedProteins.map(p => `${p.name} (${p.id})`).join(', '),
          submittedAt: new Date().toLocaleTimeString()
        };

        setPendingAnalyses(prev => [newJob, ...prev]);
        setShowPendingModal(true);
      } else {
        throw new Error(data.message || 'Failed to submit alignment');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to run sequence alignment.');
    } finally {
      setIsSubmittingAlignment(false);
    }
  };

  const [copyFeedback, setCopyFeedback] = useState({});

  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handleDownloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const convertAlnToFasta = (alnText) => {
    if (!alnText) return '';
    const lines = alnText.split('\n');
    const seqs = {};
    const order = [];
    
    for (let line of lines) {
      const trimmedRight = line.trimRight();
      if (!trimmedRight) continue;
      if (trimmedRight.includes('CLUSTAL') || trimmedRight.includes('MUSCLE')) continue;
      
      const trimmed = trimmedRight.trim();
      if (trimmedRight.startsWith(' ') || !trimmed) {
        continue;
      }
      
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const id = parts[0];
        const seqChunk = parts[1].replace(/[^A-Za-z-]/g, '');
        if (seqChunk) {
          if (!seqs[id]) {
            seqs[id] = '';
            order.push(id);
          }
          seqs[id] += seqChunk;
        }
      }
    }
    
    return order.map(id => `>${id}\n${seqs[id]}`).join('\n');
  };

  const handleExportComparisonCSV = () => {
    if (comparisonList.length === 0) return;
    
    const headers = ['Name', 'ID', 'Category', 'Status', 'Details', 'IC50 (nM)', 'Ki (nM)', 'Efficiency'];
    
    const rows = comparisonList.map(item => [
      item.name || '',
      item.id || '',
      item.type || '',
      item.status || 'Verified Integration',
      `"${(item.details || '').replace(/"/g, '""')}"`,
      '1.2',
      '0.85',
      '0.68'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    handleDownloadFile(csvContent, `AURA_Comparison_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  };

  // Fetch alignment text results from EBI backend handler
  const handleViewAlignmentResult = async (job) => {
    setSelectedAlignmentJob(job);
    setAlignmentLoading(true);
    setAlignmentError('');
    setAlignmentResult('');
    setTreeResult('');
    setActiveAlignTab('alignment');
    
    try {
      const [resAln, resTree] = await Promise.all([
        fetch(`/api/align?jobId=${job.jobId}&result=true`),
        fetch(`/api/align?jobId=${job.jobId}&tree=true`)
      ]);
      
      if (!resAln.ok) {
        let errMsg = `Failed to fetch alignment: ${resAln.statusText || resAln.status}`;
        try {
          const rawText = await resAln.text();
          if (rawText && rawText.length < 200) errMsg = rawText;
        } catch {
          // Ignore body read error
          void 0;
        }
        throw new Error(errMsg);
      }
      
      const alnData = await resAln.json();
      if (alnData.status !== 'success') {
        throw new Error(alnData.message || 'Failed to fetch alignment result');
      }
      setAlignmentResult(alnData.alignment);
      
      if (resTree.ok) {
        try {
          const treeData = await resTree.json();
          if (treeData.status === 'success') {
            setTreeResult(treeData.tree);
          }
        } catch (treeErr) {
          console.error("Failed to parse tree result as JSON:", treeErr);
        }
      }
    } catch (err) {
      console.error(err);
      setAlignmentError(err.message || 'An error occurred while fetching alignment results.');
    } finally {
      setAlignmentLoading(false);
    }
  };

  // Insights live feed state
  const [recentInsights, setRecentInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(true);

  // Fetch recent trials on mount to generate live insights
  useEffect(() => {
    const formatTrialDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };

    const getLiveInsights = async () => {
      try {
        setInsightsLoading(true);
        const trials = await fetchRecentTrials();
        if (trials && trials.length > 0) {
          const mapped = trials.slice(0, 10).map((trial) => {
            const phaseLabel = (trial.phase && trial.phase !== 'N/A' && trial.phase !== 'NA') 
              ? `${trial.phase} Trial` 
              : 'New Study';
            return {
              id: trial.id,
              name: trial.title,
              type: 'Clinical Trial',
              title: `${phaseLabel}: ${trial.status}`,
              desc: `${trial.sponsor} listed trial ${trial.id} - ${trial.title}.`,
              details: `Sponsor: ${trial.sponsor}. Status: ${trial.status}. Phase: ${trial.phase}.`,
              time: formatTrialDate(trial.lastUpdate)
            };
          });
          setRecentInsights(mapped);

          // Calculate trial distribution statistics
          const regionCounts = {
            'North America': 0,
            'Europe': 0,
            'East Asia': 0,
            'South America': 0,
            'Rest of World': 0
          };
          
          const phaseCounts = {
            'Phase I': 0,
            'Phase II': 0,
            'Phase III': 0,
            'Phase IV': 0
          };
          
          const countryCounts = {};
          
          trials.forEach(trial => {
            // Country & Region mapping
            const country = trial.country || 'Unknown';
            if (country !== 'Unknown') {
              countryCounts[country] = (countryCounts[country] || 0) + 1;
            }
            
            const region = mapCountryToRegion(country);
            regionCounts[region]++;
            
            // Phase mapping
            const normalizedPhase = normalizePhase(trial.phase);
            if (phaseCounts[normalizedPhase] !== undefined) {
              phaseCounts[normalizedPhase]++;
            }
          });
          
          const totalTrials = trials.length;
          const mappedRegions = Object.entries(regionCounts).map(([label, count]) => {
            const pct = totalTrials > 0 ? Math.round((count / totalTrials) * 100) : 0;
            return {
              label,
              value: `${pct}% (${count} trials)`,
              fill: `${pct}%`
            };
          }).sort((a, b) => parseInt(b.fill) - parseInt(a.fill));
          
          const mappedPhases = Object.entries(phaseCounts).map(([label, count]) => ({
            count,
            label
          }));
          
          const sortedCountries = Object.entries(countryCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
          
          const topCountries = sortedCountries.slice(0, 5);
          
          const finalCountries = topCountries.length > 0 ? topCountries : [
            { name: 'United States', count: 24 },
            { name: 'United Kingdom', count: 8 },
            { name: 'Germany', count: 6 },
            { name: 'Japan', count: 5 },
            { name: 'France', count: 3 }
          ];

          setTrialDistribution({
            regions: mappedRegions,
            phases: mappedPhases,
            countries: finalCountries
          });
        }
      } catch (err) {
        console.error("Failed to load live insights:", err);
      } finally {
        setInsightsLoading(false);
      }
    };
    getLiveInsights();
  }, []);

  // Authentication & Session state
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('aura_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // User-specific settings & database
  const [libraryItems, setLibraryItems] = useState([]);
  const [glassmorphismIntensity, setGlassmorphismIntensity] = useState(80);
  const [darkMode, setDarkMode] = useState(true);

  // Sync state on user change
  useEffect(() => {
    if (!currentUser) return;
    const userKey = `aura_user_data_${currentUser.email}`;
    const savedData = localStorage.getItem(userKey);
    
    // Defer state updates to avoid synchronous setState inside useEffect warning
    Promise.resolve().then(() => {
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setLibraryItems(parsed.libraryItems || []);
        setGlassmorphismIntensity(parsed.glassmorphismIntensity ?? 80);
        setDarkMode(parsed.darkMode ?? true);
        if (parsed.pendingAnalyses) {
          setPendingAnalyses(parsed.pendingAnalyses);
          prevAnalysesRef.current = parsed.pendingAnalyses;
        }
        let loadedNotifications = parsed.notifications || [];
        if (loadedNotifications.length === 0) {
          loadedNotifications.push({
            id: `welcome-${Date.now()}`,
            title: 'Welcome to AURA!',
            message: `Hello ${currentUser.name}, welcome to the AURA Biomedical Intelligence Engine. We're excited to help you streamline your research. Check here for live system notifications and analysis updates.`,
            type: 'welcome',
            read: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString()
          });
        }

        const hasUpgradeNotif = loadedNotifications.some(n => n.id === 'system-upgrade-v2');
        if (!hasUpgradeNotif) {
          const upgradeNotif = {
            id: 'system-upgrade-v2',
            title: 'System Upgrade: 5 New Data Feeds',
            message: 'AURA has successfully integrated live data feeds from Europe PMC (publications), Ensembl (genomics), GTEx Portal (expression), GWAS Catalog (clinvar variants), and RCSB PDB (crystal structures selector). Explore target profiles to view them!',
            type: 'info',
            read: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString()
          };
          loadedNotifications = [upgradeNotif, ...loadedNotifications];
          localStorage.setItem(userKey, JSON.stringify({
            ...parsed,
            notifications: loadedNotifications
          }));
        }
        setNotifications(loadedNotifications);
      } else {
        const defaultLibrary = [
          { name: 'Imatinib', id: 'CHEMBL941', type: 'Drug', status: 'Approved' },
          { name: 'Aspirin', id: 'CHEMBL25', type: 'Drug', status: 'Approved' },
          { name: 'BRCA1', id: 'P38398', type: 'Protein', status: 'Active' }
        ];
        const welcomeMsg = {
          id: `welcome-${Date.now()}`,
          title: 'Welcome to AURA!',
          message: `Hello ${currentUser.name}, welcome to the AURA Biomedical Intelligence Engine. We're excited to help you streamline your research. Check here for live system notifications and analysis updates.`,
          type: 'welcome',
          read: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString()
        };
        const upgradeNotif = {
          id: 'system-upgrade-v2',
          title: 'System Upgrade: 5 New Data Feeds',
          message: 'AURA has successfully integrated live data feeds from Europe PMC (publications), Ensembl (genomics), GTEx Portal (expression), GWAS Catalog (clinvar variants), and RCSB PDB (crystal structures selector). Explore target profiles to view them!',
          type: 'info',
          read: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString()
        };
        const initialNotifications = [upgradeNotif, welcomeMsg];
        setLibraryItems(defaultLibrary);
        setGlassmorphismIntensity(80);
        setDarkMode(true);
        setNotifications(initialNotifications);
        prevAnalysesRef.current = INITIAL_PENDING_ANALYSES;
        
        localStorage.setItem(userKey, JSON.stringify({
          libraryItems: defaultLibrary,
          glassmorphismIntensity: 80,
          darkMode: true,
          pendingAnalyses: INITIAL_PENDING_ANALYSES,
          notifications: initialNotifications
        }));
      }
    });
  }, [currentUser]);

  // Sync state back to localStorage
  useEffect(() => {
    if (!currentUser) return;
    const userKey = `aura_user_data_${currentUser.email}`;
    const currentData = {
      libraryItems,
      glassmorphismIntensity,
      darkMode,
      pendingAnalyses,
      notifications
    };
    localStorage.setItem(userKey, JSON.stringify(currentData));
  }, [libraryItems, glassmorphismIntensity, darkMode, pendingAnalyses, notifications, currentUser]);

  // Apply glassmorphism intensity CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--glass-blur', `${glassmorphismIntensity / 5}px`);
  }, [glassmorphismIntensity]);

  // Apply dark mode theme
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-theme');
      document.body.style.background = 'radial-gradient(circle at 50% -20%, #1e1b4b 0%, #0a0a0c 100%)';
    } else {
      document.body.classList.remove('dark-theme');
      document.body.style.background = 'radial-gradient(circle at 50% -20%, #e0e7ff 0%, #f8fafc 100%)';
    }
  }, [darkMode]);

  // Close the notifications popover if clicking outside
  useEffect(() => {
    if (!showNotifications) return;
    const handleOutsideClick = (e) => {
      const container = document.querySelector('.notifications-container-wrapper');
      if (container && !container.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showNotifications]);

  const handleCredentialResponse = useCallback((response) => {
    setIsLoggingIn(true);
    try {
      const idToken = response.credential;
      const payload = decodeJwt(idToken);
      
      if (payload && payload.email) {
        const userData = {
          email: payload.email,
          name: payload.name || payload.given_name || 'Google Researcher',
          role: payload.email.endsWith('@aura.org') ? 'Admin Access' : 'Standard Access',
          avatarSeed: payload.picture || payload.given_name || 'google',
          isGoogle: true
        };
        
        setTimeout(() => {
          setCurrentUser(userData);
          localStorage.setItem('aura_current_user', JSON.stringify(userData));
          setIsLoggingIn(false);
          
          // Seed welcome message for this specific Google user profile
          const welcomeMsg = {
            id: 'welcome_' + Date.now(),
            title: 'Welcome to AURA!',
            message: `Hello ${userData.name}, welcome to the AURA Biomedical Intelligence Engine. We're excited to help you streamline your research. Check here for live system notifications and analysis updates.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false,
            type: 'welcome'
          };
          
          const userKey = `aura_user_data_${userData.email}`;
          const savedData = localStorage.getItem(userKey);
          let loadedNotifications = [welcomeMsg];
          let parsed = null;
          if (savedData) {
            try {
              parsed = JSON.parse(savedData);
              if (parsed.notifications && parsed.notifications.length > 0) {
                loadedNotifications = parsed.notifications;
              }
            } catch {
              // ignore parse errors
            }
          }

          const hasUpgradeNotif = loadedNotifications.some(n => n.id === 'system-upgrade-v2');
          if (!hasUpgradeNotif) {
            const upgradeNotif = {
              id: 'system-upgrade-v2',
              title: 'System Upgrade: 5 New Data Feeds',
              message: 'AURA has successfully integrated live data feeds from Europe PMC (publications), Ensembl (genomics), GTEx Portal (expression), GWAS Catalog (clinvar variants), and RCSB PDB (crystal structures selector). Explore target profiles to view them!',
              type: 'info',
              read: false,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString()
            };
            loadedNotifications = [upgradeNotif, ...loadedNotifications];
            
            try {
              if (parsed) {
                localStorage.setItem(userKey, JSON.stringify({
                  ...parsed,
                  notifications: loadedNotifications
                }));
              } else {
                localStorage.setItem(userKey, JSON.stringify({
                  libraryItems: [],
                  glassmorphismIntensity: 80,
                  darkMode: true,
                  pendingAnalyses: [],
                  notifications: loadedNotifications
                }));
              }
            } catch {
              // ignore localStorage write errors
            }
          }
          setNotifications(loadedNotifications);
        }, 1000);
      } else {
        setIsLoggingIn(false);
        alert("Google authentication failed: Invalid token payload");
      }
    } catch (error) {
      console.error("Google login callback error:", error);
      setIsLoggingIn(false);
      alert("Google authentication encountered an error.");
    }
  }, [setCurrentUser, setIsLoggingIn, setNotifications]);

  const handleMockLogin = (userData) => {
    setIsLoggingIn(true);
    setTimeout(() => {
      setCurrentUser(userData);
      localStorage.setItem('aura_current_user', JSON.stringify(userData));
      setIsLoggingIn(false);
    }, 1200);
  };

  const handleCustomLogin = (e) => {
    e.preventDefault();
    const emailInput = e.target.querySelector('.custom-login-input');
    if (!emailInput) return;
    const email = emailInput.value;
    const name = email.split('@')[0];
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    const userData = {
      email,
      name: formattedName,
      role: 'Standard Access',
      avatarSeed: name,
      isGoogle: false
    };
    handleMockLogin(userData);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('aura_current_user');
    setShowProfile(false);
    setNotifications([]);
    setShowNotifications(false);
  };

  // Initialize Google Sign-In button
  useEffect(() => {
    if (currentUser) return;

    const initGoogleSignIn = () => {
      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });
          
          const btnParent = document.getElementById("google-signin-btn-container");
          if (btnParent) {
            window.google.accounts.id.renderButton(
              btnParent,
              { 
                theme: "filled_blue", 
                size: "large", 
                text: "signin_with", 
                shape: "rectangular",
                width: 320
              }
            );
          }
        } catch (err) {
          console.error("Error rendering Google Sign-In button:", err);
        }
      }
    };

    if (window.google) {
      initGoogleSignIn();
    } else {
      const timer = setInterval(() => {
        if (window.google) {
          initGoogleSignIn();
          clearInterval(timer);
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, [currentUser, handleCredentialResponse]);

  const handleLogoClick = () => {
    setActiveView('dashboard');
    setSelectedItem(null);
    setShowComparison(false);
    setResults(null);
    setSearchQuery('');
    setSidebarOpen(false);
  };

  const handleNewAnalysis = () => {
    setActiveView('dashboard');
    setSelectedItem(null);
    setShowComparison(false);
    setComparisonList([]);
    setResults(null);
    setSearchQuery('');
    setSidebarOpen(false);
    
    // Focus search input
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    
    // Trigger highlight glow
    setHighlightSearch(true);
    setTimeout(() => {
      setHighlightSearch(false);
    }, 1500);
  };

  const addToComparison = (item) => {
    if (comparisonList.length >= 4) return;
    if (!comparisonList.find(i => i.id === item.id)) {
      setComparisonList([...comparisonList, item]);
    }
  };

  const removeFromComparison = (id) => {
    setComparisonList(comparisonList.filter(i => i.id !== id));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 3) {
        setLoading(true);
        const data = await searchBiomedicalData(searchQuery);
        setResults(data);
        setLoading(false);
      } else {
        setResults(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (!currentUser) {
    return (
      <div className="login-container">
        <div className="login-card glass-card animate-fade-in">
          <div className="login-header">
            <div className="logo-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <FlaskConical className="logo-icon" size={32} />
              <span className="logo-text">AURA</span>
            </div>
            <h2>Biomedical Intelligence Engine</h2>
            <p className="subtitle">Secure Google Account Authentication</p>
          </div>

          {isLoggingIn ? (
            <div className="login-loading">
              <Loader2 className="animate-spin accent-spinner" size={40} />
              <p>Authenticating credentials...</p>
            </div>
          ) : (
            <div className="login-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="google-signin-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p className="login-instruction" style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Sign in with your Google Account:
                </p>
                <div id="google-signin-btn-container" style={{ display: 'flex', justifyContent: 'center', minHeight: '44px', width: '100%', maxWidth: '320px', marginBottom: '8px' }}></div>
                
                {(!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com") && (
                  <div className="client-id-notice glass-card" style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--text-muted)', border: '1px dashed rgba(139, 92, 246, 0.4)', borderRadius: '10px', marginTop: '12px', textAlign: 'left', lineHeight: '1.4', width: '100%', maxWidth: '340px' }}>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>Setup Guide:</span> A custom Google Client ID is not configured. To authorize real Google logins, add a <code>.env</code> file in the project root:
                    <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', margin: '8px 0', fontFamily: 'monospace', fontSize: '10px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)' }}>
                      VITE_GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
                    </pre>
                    Authorize <code>http://localhost:5173</code> in the Google Cloud Console origins.
                  </div>
                )}
              </div>

              <div className="divider-or" style={{ margin: '8px 0' }}>
                <span>or use Developer Presets (Offline)</span>
              </div>

              <div className="preset-users">
                <button 
                  className="preset-user-btn glass-card"
                  onClick={() => handleMockLogin({
                    email: 'dr.researcher@aura.org',
                    name: 'Dr. Researcher',
                    role: 'Admin Access',
                    avatarSeed: 'researcher',
                    isGoogle: false
                  })}
                >
                  <div className="user-avatar-mini researcher">DR</div>
                  <div className="preset-user-info">
                    <p className="preset-user-name">Dr. Researcher</p>
                    <p className="preset-user-email">dr.researcher@aura.org (Admin)</p>
                  </div>
                </button>

                <button 
                  className="preset-user-btn glass-card"
                  onClick={() => handleMockLogin({
                    email: 'alex.carter@biotech.io',
                    name: 'Dr. Alex Carter',
                    role: 'Senior Scientist',
                    avatarSeed: 'carter',
                    isGoogle: false
                  })}
                >
                  <div className="user-avatar-mini scientist">AC</div>
                  <div className="preset-user-info">
                    <p className="preset-user-name">Dr. Alex Carter</p>
                    <p className="preset-user-email">alex.carter@biotech.io</p>
                  </div>
                </button>

                <button 
                  className="preset-user-btn glass-card"
                  onClick={() => handleMockLogin({
                    email: 'guest.user@gmail.com',
                    name: 'Guest Researcher',
                    role: 'Standard Access',
                    avatarSeed: 'guest',
                    isGoogle: false
                  })}
                >
                  <div className="user-avatar-mini guest">GR</div>
                  <div className="preset-user-info">
                    <p className="preset-user-name">Guest Researcher</p>
                    <p className="preset-user-email">guest.user@gmail.com</p>
                  </div>
                </button>
              </div>

              <div className="divider-or" style={{ margin: '8px 0' }}>
                <span>or enter a custom email</span>
              </div>

              <form onSubmit={handleCustomLogin} className="custom-login-form">
                <input 
                  type="email" 
                  placeholder="name@gmail.com" 
                  required
                  className="custom-login-input glass-card"
                />
                <button type="submit" className="google-sign-in-btn dev-bypass-btn">
                  <span>Developer Bypass Sign-In</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  const metrics = activeMetrics || {
    label1: 'IC50', value1: 'N/A',
    label2: 'Ki', value2: 'N/A',
    label3: 'Efficiency', value3: 'N/A'
  };

  return (
    <div className="app-container">
      {/* Sidebar Overlay backdrop for mobile */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar glass-card ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="logo-section">
          <div className="logo-wrapper" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
            <FlaskConical className="logo-icon" />
            <span className="logo-text">AURA</span>
          </div>
          <button type="button" className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        
        <nav className="nav-menu">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeView === 'dashboard'} 
            onClick={() => { setActiveView('dashboard'); setShowComparison(false); setSelectedItem(null); setSidebarOpen(false); }}
          />
          <NavItem 
            icon={<Database size={20} />} 
            label="Library" 
            active={activeView === 'library'}
            onClick={() => { setActiveView('library'); setSidebarOpen(false); }}
          />
          <NavItem 
            icon={<Activity size={20} />} 
            label="Trials" 
            active={activeView === 'trials'}
            onClick={() => { setActiveView('trials'); setSidebarOpen(false); }}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeView === 'settings'}
            onClick={() => { setActiveView('settings'); setSidebarOpen(false); }}
          />
          <NavItem 
            icon={<Mail size={20} />} 
            label="Support" 
            active={activeView === 'contact'}
            onClick={() => { setActiveView('contact'); setSidebarOpen(false); }}
          />
        </nav>

        <div className="profile-wrapper">
          {showProfile && (
            <div className="profile-popover glass-card animate-fade-in">
              <div className="popover-header" style={{ marginBottom: '8px' }}>
                <h3 style={{ margin: 0 }}>{currentUser.role}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px', wordBreak: 'break-all' }}>{currentUser.email}</span>
              </div>
              <div className="popover-content">
                <div 
                  className="popover-item"
                  onClick={() => { setActiveView('settings'); setShowProfile(false); }}
                >
                  <Settings size={14} /> Account Settings
                </div>
                <div 
                  className="popover-item"
                  onClick={() => { setActiveView('library'); setShowProfile(false); }}
                >
                  <FlaskConical size={14} /> My Experiments
                </div>
                <div className="divider"></div>
                <div 
                  className="popover-item logout"
                  onClick={handleLogout}
                >
                  Log Out
                </div>
              </div>
            </div>
          )}
          <div className="profile-section" onClick={() => setShowProfile(!showProfile)}>
            <div className="profile-badge" style={{ overflow: 'hidden', padding: 0 }}>
              {currentUser.avatarSeed && (currentUser.avatarSeed.startsWith('http') || currentUser.avatarSeed.includes('/')) ? (
                <img 
                  src={currentUser.avatarSeed} 
                  alt={currentUser.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallbackSpan = e.target.nextSibling;
                    if (fallbackSpan) fallbackSpan.style.display = 'block';
                  }}
                />
              ) : null}
              <span 
                className="profile-initials"
                style={{ 
                  display: currentUser.avatarSeed && (currentUser.avatarSeed.startsWith('http') || currentUser.avatarSeed.includes('/')) ? 'none' : 'block' 
                }}
              >
                {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
              </span>
            </div>
            <div className="profile-info">
              <p className="profile-name">{currentUser.name}</p>
              <p className="profile-role">{currentUser.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Mobile Header */}
        <div className="mobile-header glass-header">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="mobile-logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
            <FlaskConical className="logo-icon" size={20} />
            <span className="logo-text">AURA</span>
          </div>
          <div className="mobile-actions">
            {comparisonList.length > 0 && (
              <button 
                className={`comparison-toggle-mini glass-card ${showComparison && activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => {
                  const nextShow = !(showComparison && activeView === 'dashboard');
                  setShowComparison(nextShow);
                  if (nextShow) {
                    setActiveView('dashboard');
                    setSelectedItem(null);
                  }
                  setResults(null);
                  setSearchQuery('');
                }}
              >
                <Activity size={16} />
                <span className="compare-count">{comparisonList.length}</span>
              </button>
            )}
            <div className="mobile-profile-trigger" onClick={() => setShowProfile(!showProfile)}>
              <span className="profile-initials" style={{ fontSize: '12px' }}>
                {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
              </span>
            </div>
            {showProfile && (
              <div className="profile-popover glass-card mobile-popover animate-fade-in">
                <div className="popover-header" style={{ marginBottom: '8px' }}>
                  <h3 style={{ margin: 0 }}>{currentUser.role}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px', wordBreak: 'break-all' }}>{currentUser.email}</span>
                </div>
                <div className="popover-content">
                  <div 
                    className="popover-item"
                    onClick={() => { setActiveView('settings'); setShowProfile(false); }}
                  >
                    <Settings size={14} /> Account Settings
                  </div>
                  <div 
                    className="popover-item"
                    onClick={() => { setActiveView('library'); setShowProfile(false); }}
                  >
                    <FlaskConical size={14} /> My Experiments
                  </div>
                  <div className="divider"></div>
                  <div 
                    className="popover-item logout"
                    onClick={handleLogout}
                  >
                    Log Out
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <header className="glass-header top-bar">
          <div className="search-wrapper">
            <div className={`search-container glass-card glow-border ${highlightSearch ? 'search-highlight-glow' : ''}`}>
              {loading ? <Loader2 className="search-icon animate-spin" size={18} /> : <Search className="search-icon" size={18} />}
              <input 
                type="text" 
                placeholder="Search molecular targets, drugs, or clinical trials..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                ref={searchInputRef}
                className="search-input"
              />
              <div className="search-shortcut">⌘ K</div>
            </div>

            {/* Filter chips */}
            <div className="search-filter-chips" style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingLeft: '4px' }}>
              {['all', 'proteins', 'drugs', 'trials'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSearchFilter(filter)}
                  className={`filter-chip ${searchFilter === filter ? 'active' : ''}`}
                  style={{
                    background: searchFilter === filter ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid',
                    borderColor: searchFilter === filter ? 'var(--accent-primary)' : 'var(--border-color)',
                    color: searchFilter === filter ? 'var(--accent-primary)' : 'var(--text-muted)',
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {results && (
              <div className="search-results glass-card animate-fade-in">
                {Object.entries(results)
                  .filter(([type]) => searchFilter === 'all' || type === searchFilter)
                  .map(([type, items]) => (
                    items.length > 0 && (
                    <div key={type} className="result-group">
                      <h5 className="result-group-title">{type.toUpperCase()}</h5>
                      {items.map((item) => (
                        <div 
                          key={item.id} 
                          className="result-item"
                          onClick={() => {
                            setSelectedItem(item);
                            setResults(null);
                            addRecentSearch(searchQuery || item.name);
                            setSearchQuery('');
                          }}
                        >
                          <div className="result-item-info">
                            <span className="result-item-name">{item.name}</span>
                            <span className="result-item-details">{item.details}</span>
                          </div>
                          <div className="result-item-actions">
                            <span className="result-item-id">{item.id}</span>
                            {type !== 'trials' && item.type !== 'Clinical Trial' && item.type !== 'Study' && !(item.id && item.id.startsWith('NCT')) && (
                              <button 
                                className="add-compare-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToComparison(item);
                                }}
                              >
                                + Compare
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}

            {isSearchFocused && searchQuery.length < 3 && (
              <div className="search-suggestions glass-card animate-fade-in" style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '8px',
                zIndex: 1000,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                {recentSearches.length > 0 && (
                  <div className="suggestion-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={12} style={{ color: 'var(--accent-primary)' }} /> Recent Searches
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); clearRecentSearches(); }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px', borderRadius: '4px' }}
                        title="Clear all recent searches"
                      >
                        <Trash2 size={10} /> Clear
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {recentSearches.map((term, idx) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            setSearchQuery(term);
                            searchInputRef.current?.focus();
                          }}
                          className="suggestion-tag"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--overlay-light)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <span>{term}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="suggestion-section">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <TrendingUp size={12} style={{ color: 'var(--accent-primary)' }} /> Trending Targets
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {TRENDING_TARGETS.map((term, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          setSearchQuery(term);
                          searchInputRef.current?.focus();
                        }}
                        className="suggestion-tag"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'var(--overlay-light)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span>{term}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="top-bar-actions">
            {comparisonList.length > 0 && (
              <button 
                className={`comparison-toggle glass-card ${showComparison && activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => {
                  const nextShow = !(showComparison && activeView === 'dashboard');
                  setShowComparison(nextShow);
                  if (nextShow) {
                    setActiveView('dashboard');
                    setSelectedItem(null);
                  }
                  setResults(null);
                  setSearchQuery('');
                }}
              >
                <Activity size={18} />
                <span>Compare ({comparisonList.length})</span>
              </button>
            )}
            <div className="notifications-container-wrapper">
              <button 
                className={`icon-button bell-button ${showNotifications ? 'active' : ''}`}
                onClick={() => setShowNotifications(!showNotifications)}
                id="bell-notification-btn"
                aria-label="Toggle notifications popover"
              >
                <Bell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="notification-badge">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="notifications-popover glass-card animate-fade-in" id="notifications-popover-panel">
                  <div className="notifications-popover-header">
                    <h4>Notifications</h4>
                    <div className="notifications-header-actions">
                      {notifications.length > 0 && (
                        <>
                          <button onClick={markAllAsRead} className="text-action-btn">Mark all read</button>
                          <span className="dot-separator"></span>
                          <button onClick={clearAllNotifications} className="text-action-btn">Clear all</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="notifications-popover-body">
                    {notifications.length === 0 ? (
                      <div className="notifications-empty-state animate-fade-in">
                        <Bell size={32} className="empty-bell-icon" />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      <div className="notifications-list">
                        {notifications.map(n => (
                          <div 
                            key={n.id} 
                            className={`notification-item ${n.read ? 'read' : 'unread'} type-${n.type}`}
                            onClick={() => markAsRead(n.id)}
                          >
                            <div className="notification-icon-wrapper">
                              <span className="notification-status-dot"></span>
                            </div>
                            <div className="notification-item-content">
                              <div className="notification-item-header">
                                <span className="notification-title">{n.title}</span>
                                <span className="notification-time">{n.timestamp}</span>
                              </div>
                              <p className="notification-message">{n.message}</p>
                            </div>
                            <button 
                              className="notification-delete-btn"
                              onClick={(e) => deleteNotification(n.id, e)}
                              aria-label="Delete notification"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="divider"></div>
            <button className="primary-button" onClick={handleNewAnalysis}>New Analysis</button>
          </div>
        </header>

        <section className="dashboard-grid animate-fade-in">
          {activeView === 'library' && (
            <LibraryView 
              libraryItems={libraryItems} 
              setLibraryItems={setLibraryItems} 
              addNotification={addNotification}
            />
          )}
          {activeView === 'trials' && <TrialsView />}
          {activeView === 'settings' && (
            <SettingsView 
              glassmorphismIntensity={glassmorphismIntensity} 
              setGlassmorphismIntensity={setGlassmorphismIntensity}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              addNotification={addNotification}
            />
          )}
          {activeView === 'contact' && (
            <ContactView addNotification={addNotification} />
          )}
          
          {activeView === 'dashboard' && (
            showComparison ? (
              <div className="comparison-view animate-fade-in">
                {/* ... existing comparison view code ... */}
              <header className="section-header">
                <div>
                  <h1>Comparative Analysis</h1>
                  <p className="subtitle">Side-by-side target evaluation</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {comparisonList.filter(item => item.type === 'Protein').length >= 2 && (
                    <button 
                      className="primary-button" 
                      onClick={handleRunSequenceAlignment}
                      disabled={isSubmittingAlignment}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {isSubmittingAlignment ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Activity size={16} />
                          <span>Run Sequence Alignment</span>
                        </>
                      )}
                    </button>
                  )}
                  <button 
                    className="primary-button" 
                    onClick={handleExportComparisonCSV}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', boxShadow: 'none' }}
                  >
                    <ExternalLink size={16} />
                    <span>Export Comparison</span>
                  </button>
                  <button className="back-button" onClick={() => setShowComparison(false)}>
                    Close Comparison
                  </button>
                </div>
              </header>

              <div className="comparison-grid">
                {comparisonList.map((item) => (
                  <div key={item.id} className="glass-card comparison-card">
                    <button 
                      className="remove-btn"
                      onClick={() => removeFromComparison(item.id)}
                    >
                      ×
                    </button>
                    <span className="badge">{item.type}</span>
                    <h3>{item.name}</h3>
                    <p className="id-tag">{item.id}</p>
                    
                    <div className="compare-details">
                      <div className="compare-row">
                        <label>Category</label>
                        <span>{item.type}</span>
                      </div>
                      <div className="compare-row">
                        <label>Primary Info</label>
                        <p>{item.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {comparisonList.length < 4 && (
                  <div className="glass-card add-more-placeholder">
                    <Search size={32} />
                    <p>Search & Add more to compare</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <header className="section-header">
            <div>
              <h1>{selectedItem ? selectedItem.name : 'Intelligence Overview'}</h1>
              <p className="subtitle">{selectedItem ? `Advanced Analysis for ${selectedItem.id}` : 'Real-time biomedical data synthesis'}</p>
            </div>
            <div className="date-display">
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          </header>

          <div className="stats-row">
            <StatCard 
              label="Active Trials" 
              value={dailyStats.trials} 
              change={dailyStats.trialsChange} 
              onClick={() => setActiveView('trials')}
            />
            <StatCard 
              label="Molecules Indexed" 
              value={dailyStats.molecules} 
            />
            <StatCard 
              label="Pending Analysis" 
              value={dailyStats.pending} 
              alert 
              onClick={() => setShowPendingModal(true)}
            />
          </div>

          <div className="grid-layout">
            <div className="glass-card main-viz">
              {selectedItem ? (
                <div className="detail-view animate-fade-in">
                  <header className="detail-header">
                    <button className="back-button" onClick={() => setSelectedItem(null)}>
                      <ChevronRight className="rotate-180" size={16} /> Back to Dashboard
                    </button>
                    <div className="detail-title-row">
                      <div>
                        <span className="badge">{selectedItem.type}</span>
                        <h2>{selectedItem.name}</h2>
                        <p className="id-tag">{selectedItem.id}</p>
                      </div>
                      <div className="detail-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => window.print()}
                          className="external-link"
                          style={{ 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(124, 58, 237, 0.08)',
                            border: '1px solid rgba(124, 58, 237, 0.15)',
                            color: 'var(--text-main)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '13px'
                          }}
                          title="Print or Save PDF report for this target profile"
                        >
                          <Download size={14} />
                          <span>Export PDF Report</span>
                        </button>
                        <a 
                          href={selectedItem.type === 'Clinical Trial' || selectedItem.type === 'Study' || (selectedItem.id && selectedItem.id.startsWith('NCT'))
                            ? `https://clinicaltrials.gov/study/${selectedItem.id}`
                            : `https://google.com/search?q=${selectedItem.id}+${selectedItem.name}`
                          } 
                          target="_blank" 
                          rel="noreferrer"
                          className="external-link"
                        >
                          {selectedItem.type === 'Clinical Trial' || selectedItem.type === 'Study' || (selectedItem.id && selectedItem.id.startsWith('NCT'))
                            ? 'View Clinical Trial'
                            : 'Source Data'
                          } <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>

                    {/* Premium Detail Tabs Selector */}
                    <div className="detail-tabs-selector">
                      {selectedItem.type === 'Protein' ? (
                        <>
                          <button 
                            className={`detail-tab-btn ${activeDetailTab === 'structure' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('structure')}
                          >
                            3D Structure View
                          </button>
                          <button 
                            className={`detail-tab-btn ${activeDetailTab === 'pathways' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('pathways')}
                          >
                            Pathways & Live Interactions
                          </button>
                          <button 
                            className={`detail-tab-btn ${activeDetailTab === 'genomics' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('genomics')}
                          >
                            Genomic Structure
                          </button>
                          <button 
                            className={`detail-tab-btn ${activeDetailTab === 'expression' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('expression')}
                          >
                            Tissue Expression
                          </button>
                          <button 
                            className={`detail-tab-btn ${activeDetailTab === 'variants' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('variants')}
                          >
                            Clinical Variants
                          </button>
                          <button 
                            className={`detail-tab-btn ${activeDetailTab === 'publications' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('publications')}
                          >
                            Publications
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className={`detail-tab-btn ${activeDetailTab === 'affinity' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('affinity')}
                          >
                            Molecular Binding Simulation
                          </button>
                          <button 
                            className={`detail-tab-btn ${activeDetailTab === 'safety' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('safety')}
                          >
                            FDA Safety & Side Effects
                          </button>
                          <button 
                            className={`detail-tab-btn ${activeDetailTab === 'cheminformatics' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('cheminformatics')}
                          >
                            Cheminformatics & SMILES
                          </button>
                          <button 
                            className={`detail-tab-btn ${activeDetailTab === 'publications' ? 'active' : ''}`}
                            onClick={() => setActiveDetailTab('publications')}
                          >
                            Publications
                          </button>
                        </>
                      )}
                    </div>
                  </header>
                  
                  <div className="detail-content">
                    {/* Tab 1 (Protein): 3D Structure View */}
                    {selectedItem.type === 'Protein' && activeDetailTab === 'structure' && (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="detail-info-grid">
                          <div className="info-block">
                            <label>Primary Description</label>
                            <p>{selectedItem.details}</p>
                          </div>
                          <div className="info-block">
                            <label>Status</label>
                            <p className="status-active">{selectedItem.status || 'Verified Integration'}</p>
                          </div>
                        </div>

                        <div className="bioactivity-grid">
                          {metricsLoading ? (
                            <>
                              <div className="bio-stat animate-pulse" style={{ opacity: 0.6 }}><span className="loading-shimmer-span" style={{ display: 'inline-block', width: '60px', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></span></div>
                              <div className="bio-stat animate-pulse" style={{ opacity: 0.6 }}><span className="loading-shimmer-span" style={{ display: 'inline-block', width: '60px', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></span></div>
                              <div className="bio-stat animate-pulse" style={{ opacity: 0.6 }}><span className="loading-shimmer-span" style={{ display: 'inline-block', width: '60px', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></span></div>
                            </>
                          ) : (
                            <>
                              <div className="bio-stat"><span className="bio-label">{metrics.label1}</span><span className="bio-value">{metrics.value1}</span></div>
                              <div className="bio-stat"><span className="bio-label">{metrics.label2}</span><span className="bio-value">{metrics.value2}</span></div>
                              <div className="bio-stat"><span className="bio-label">{metrics.label3}</span><span className="bio-value">{metrics.value3}</span></div>
                            </>
                          )}
                        </div>

                        <div className="detail-visualizer glass-card">
                          <Protein3DViewer key={selectedItem.id} uniprotId={selectedItem.id} />
                        </div>
                      </div>
                    )}

                    {/* Tab 2 (Protein): Pathways & Interactions */}
                    {selectedItem.type === 'Protein' && activeDetailTab === 'pathways' && (
                      <div className="protein-pathways-layout animate-fade-in">
                        <div className="pathways-map-card glass-card">
                          <InteractionMap uniprotId={selectedItem.id} />
                        </div>
                        <div className="pathways-list-card glass-card">
                          <h3>Biological Pathways</h3>
                          <p className="subtitle" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>Live Reactome Content Integration</p>
                          {reactomeLoading ? (
                            <div className="pathways-loader">
                              <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
                              <p>Retrieving biological pathways...</p>
                            </div>
                          ) : (
                            <div className="pathways-list">
                              {reactomePathways && reactomePathways.length > 0 ? (
                                reactomePathways.map((path) => (
                                  <a 
                                    key={path.id} 
                                    href={path.url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="pathway-item-link"
                                  >
                                    <div className="pathway-info">
                                      <span className="pathway-name">{path.name}</span>
                                      <span className="pathway-id">{path.id}</span>
                                    </div>
                                    <ExternalLink size={14} />
                                  </a>
                                ))
                              ) : (
                                <div className="pathways-empty">No biological pathways found.</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 1 (Drug): Binding Affinity */}
                    {selectedItem.type !== 'Protein' && activeDetailTab === 'affinity' && (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="detail-info-grid">
                          <div className="info-block">
                            <label>Primary Description</label>
                            <p>{selectedItem.details}</p>
                          </div>
                          <div className="info-block">
                            <label>Status</label>
                            <p className="status-active">{selectedItem.status || 'Verified Integration'}</p>
                          </div>
                        </div>

                        <div className="bioactivity-grid">
                          {metricsLoading ? (
                            <>
                              <div className="bio-stat animate-pulse" style={{ opacity: 0.6 }}><span className="loading-shimmer-span" style={{ display: 'inline-block', width: '60px', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></span></div>
                              <div className="bio-stat animate-pulse" style={{ opacity: 0.6 }}><span className="loading-shimmer-span" style={{ display: 'inline-block', width: '60px', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></span></div>
                              <div className="bio-stat animate-pulse" style={{ opacity: 0.6 }}><span className="loading-shimmer-span" style={{ display: 'inline-block', width: '60px', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}></span></div>
                            </>
                          ) : (
                            <>
                              <div className="bio-stat"><span className="bio-label">{metrics.label1}</span><span className="bio-value">{metrics.value1}</span></div>
                              <div className="bio-stat"><span className="bio-label">{metrics.label2}</span><span className="bio-value">{metrics.value2}</span></div>
                              <div className="bio-stat"><span className="bio-label">{metrics.label3}</span><span className="bio-value">{metrics.value3}</span></div>
                            </>
                          )}
                        </div>

                        <div className="detail-visualizer glass-card">
                          <BindingVisualizer />
                        </div>
                      </div>
                    )}

                    {/* Tab 2 (Drug): FDA Safety & Side Effects */}
                    {selectedItem.type !== 'Protein' && activeDetailTab === 'safety' && (
                      <div className="fda-safety-layout animate-fade-in">
                        {fdaLoading ? (
                          <div className="fda-loader">
                            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
                            <p>Loading FDA Adverse Event database logs...</p>
                          </div>
                        ) : (
                          fdaSafetyData && (
                            <>
                              <div className="fda-stats-row">
                                <div className="fda-stat-card glass-card">
                                  <span className="fda-label">Total Adverse Reports</span>
                                  <span className="fda-value">{fdaSafetyData.total.toLocaleString()}</span>
                                </div>
                                <div className="fda-stat-card glass-card">
                                  <span className="fda-label">Hospitalizations</span>
                                  <span className="fda-value severity-hosp">{fdaSafetyData.hospitalization.toLocaleString()}</span>
                                </div>
                                <div className="fda-stat-card glass-card">
                                  <span className="fda-label">Fatal Outcomes</span>
                                  <span className="fda-value severity-death">{fdaSafetyData.death.toLocaleString()}</span>
                                </div>
                              </div>

                              <div className="fda-charts-grid">
                                <div className="fda-chart-card glass-card">
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h3 style={{ margin: 0 }}>Top Patient Reactions</h3>
                                    {fdaSafetyData?.reactions?.length > 0 && (
                                      <button
                                        onClick={() => exportFDAReactionsToCSV(selectedItem.name, fdaSafetyData.reactions)}
                                        className="export-csv-btn text-button"
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: '6px 12px',
                                          borderRadius: '6px',
                                          border: '1px solid var(--border-color)',
                                          background: 'var(--overlay-light)',
                                          color: 'var(--text-main)',
                                          fontSize: '11px',
                                          cursor: 'pointer',
                                          fontWeight: 500,
                                          transition: 'all 0.2s ease'
                                        }}
                                      >
                                        <Download size={12} /> Export CSV
                                      </button>
                                    )}
                                  </div>
                                  <div className="reactions-list">
                                    {fdaSafetyData.reactions.map((react, i) => {
                                      const maxVal = fdaSafetyData.reactions[0]?.count || 1;
                                      const pctWidth = Math.round((react.count / maxVal) * 100);
                                      return (
                                        <div key={i} className="reaction-row">
                                          <div className="reaction-meta">
                                            <span className="reaction-term">{react.term}</span>
                                            <span className="reaction-count">{react.count.toLocaleString()} cases</span>
                                          </div>
                                          <div className="reaction-track">
                                            <div className="reaction-bar" style={{ width: `${pctWidth}%` }}></div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="fda-chart-card glass-card demographics-card">
                                  <h3>Patient Gender Distribution</h3>
                                  <div className="demographics-split">
                                    <div className="gender-metric male">
                                      <span className="gender-label">Male</span>
                                      <span className="gender-value">{fdaSafetyData.gender.male}%</span>
                                    </div>
                                    <div className="gender-metric female">
                                      <span className="gender-label">Female</span>
                                      <span className="gender-value">{fdaSafetyData.gender.female}%</span>
                                    </div>
                                  </div>
                                  <div className="gender-track">
                                    <div className="gender-bar male-bar" style={{ width: `${fdaSafetyData.gender.male}%` }}></div>
                                    <div className="gender-bar female-bar" style={{ width: `${fdaSafetyData.gender.female}%` }}></div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )
                        )}
                      </div>
                    )}

                    {/* Tab 3 (Drug): Cheminformatics & SMILES Sandbox */}
                    {selectedItem.type !== 'Protein' && activeDetailTab === 'cheminformatics' && (
                      <div className="cheminformatics-layout animate-fade-in">
                        {pubChemLoading ? (
                          <div className="pubchem-loader">
                            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
                            <p>Connecting to PubChem Compound Catalog...</p>
                          </div>
                        ) : (
                          pubChemData && (
                            <>
                              <div className="chem-data-row">
                                <div className="lipinski-card glass-card">
                                  <h3>Lipinski's Rule of Five</h3>
                                  <p className="subtitle" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Drug-likeness compliance profiling</p>
                                  
                                  <div className="lipinski-grid">
                                    <div className="lipinski-item">
                                      <span className="lipinski-label">Molecular Weight</span>
                                      <span className="lipinski-value">{pubChemData.weight.toFixed(1)} Da</span>
                                      <span className={`lipinski-badge ${pubChemData.weight <= 500 ? 'pass' : 'fail'}`}>
                                        {pubChemData.weight <= 500 ? 'Pass (<= 500)' : 'Fail'}
                                      </span>
                                    </div>
                                    <div className="lipinski-item">
                                      <span className="lipinski-label">LogP (Octanol/Water)</span>
                                      <span className="lipinski-value">{pubChemData.logP !== null ? pubChemData.logP.toFixed(2) : 'N/A'}</span>
                                      <span className={`lipinski-badge ${pubChemData.logP === null || pubChemData.logP <= 5 ? 'pass' : 'fail'}`}>
                                        {pubChemData.logP === null || pubChemData.logP <= 5 ? 'Pass (<= 5.0)' : 'Fail'}
                                      </span>
                                    </div>
                                    <div className="lipinski-item">
                                      <span className="lipinski-label">H-Bond Donors</span>
                                      <span className="lipinski-value">{pubChemData.donors}</span>
                                      <span className={`lipinski-badge ${pubChemData.donors <= 5 ? 'pass' : 'fail'}`}>
                                        {pubChemData.donors <= 5 ? 'Pass (<= 5)' : 'Fail'}
                                      </span>
                                    </div>
                                    <div className="lipinski-item">
                                      <span className="lipinski-label">H-Bond Acceptors</span>
                                      <span className="lipinski-value">{pubChemData.acceptors}</span>
                                      <span className={`lipinski-badge ${pubChemData.acceptors <= 10 ? 'pass' : 'fail'}`}>
                                        {pubChemData.acceptors <= 10 ? 'Pass (<= 10)' : 'Fail'}
                                      </span>
                                    </div>
                                  </div>
                                  {pubChemData.formula && renderCompositionChart(pubChemData.formula)}
                                </div>

                                <div className="structure-card glass-card">
                                  <h3>2D Chemical Structure</h3>
                                  <div className="chem-svg-container">
                                    <img 
                                      src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(pubChemData.smiles)}/record/SVG`} 
                                      alt="Molecular representation"
                                      className="chem-svg-image"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                    <div className="svg-fallback-text" style={{ display: 'none' }}>
                                      <span>Structure unavailable</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="smiles-sandbox-card glass-card">
                                <h3>SMILES Depiction Sandbox</h3>
                                <p className="subtitle" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>Input a molecular SMILES descriptor to dynamically generate structures and properties</p>
                                
                                <div className="sandbox-workspace">
                                  <div className="sandbox-input-panel">
                                    {/* Preset Search box */}
                                    <div className="sandbox-preset-lookup" style={{ position: 'relative', width: '100%', marginBottom: '12px' }}>
                                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                                        Search Compound Presets
                                      </label>
                                      <input 
                                        type="text"
                                        value={sandboxSearchQuery}
                                        onChange={(e) => {
                                          setSandboxSearchQuery(e.target.value);
                                          setSandboxShowDropdown(true);
                                        }}
                                        onFocus={() => setSandboxShowDropdown(true)}
                                        onBlur={() => setTimeout(() => setSandboxShowDropdown(false), 200)}
                                        placeholder="Search preset structures (e.g. Ibuprofen)..."
                                        style={{
                                          width: '100%',
                                          padding: '8px 12px',
                                          borderRadius: '8px',
                                          border: '1px solid var(--border-color)',
                                          background: 'var(--overlay-light)',
                                          color: 'var(--text-main)',
                                          fontSize: '12px',
                                          outline: 'none',
                                          transition: 'border-color 0.2s ease'
                                        }}
                                      />
                                      {sandboxShowDropdown && (
                                        <div className="sandbox-lookup-dropdown glass-card animate-fade-in" style={{
                                          position: 'absolute',
                                          top: '100%',
                                          left: 0,
                                          right: 0,
                                          maxHeight: '180px',
                                          overflowY: 'auto',
                                          zIndex: 10,
                                          marginTop: '4px',
                                          borderRadius: '8px',
                                          border: '1px solid var(--border-color)',
                                          background: 'var(--bg-card)',
                                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                        }}>
                                          {PRESET_COMPOUNDS.filter(c => c.name.toLowerCase().includes(sandboxSearchQuery.toLowerCase())).map((c, idx) => (
                                            <div
                                              key={idx}
                                              onClick={() => {
                                                setSandboxSmiles(c.smiles);
                                                setSandboxSearchQuery(c.name);
                                                setSandboxShowDropdown(false);
                                              }}
                                              style={{
                                                padding: '8px 12px',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                                color: 'var(--text-main)',
                                                borderBottom: idx < PRESET_COMPOUNDS.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                transition: 'background 0.2s ease'
                                              }}
                                              className="sandbox-dropdown-item"
                                            >
                                              <span style={{ fontWeight: 500 }}>{c.name}</span>
                                              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{c.formula}</span>
                                            </div>
                                          ))}
                                          {PRESET_COMPOUNDS.filter(c => c.name.toLowerCase().includes(sandboxSearchQuery.toLowerCase())).length === 0 && (
                                            <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                              No preset compounds match.
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <textarea 
                                      className="sandbox-textarea glass-card"
                                      value={sandboxSmiles}
                                      onChange={(e) => {
                                        setSandboxSmiles(e.target.value);
                                        setSandboxSearchQuery('');
                                      }}
                                      placeholder="Paste SMILES (e.g. C1=CC=C(C=C1)C=O)..."
                                    />
                                    <div className="presets-row">
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Examples:</span>
                                      <button type="button" className="preset-btn" onClick={() => { setSandboxSmiles('CC(=O)Oc1ccccc1C(=O)O'); setSandboxSearchQuery('Aspirin'); }}>Aspirin</button>
                                      <button type="button" className="preset-btn" onClick={() => { setSandboxSmiles('Cc1ccc(cc1)C(=O)Nc2ccc(cc2)CN3CCN(CC3)C'); setSandboxSearchQuery('Imatinib'); }}>Imatinib</button>
                                      <button type="button" className="preset-btn" onClick={() => { setSandboxSmiles('CN1C=NC2=C1C(=O)N(C(=O)N2C)C'); setSandboxSearchQuery('Caffeine'); }}>Caffeine</button>
                                    </div>
                                  </div>

                                  <div className="sandbox-preview-panel glass-card">
                                    {sandboxLoading ? (
                                      <div className="sandbox-loader">
                                        <Loader2 className="animate-spin" size={20} />
                                        <span>Resolving SMILES structure...</span>
                                      </div>
                                    ) : sandboxData ? (
                                      <div className="sandbox-result animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                                        <div>
                                          <div className="sandbox-svg-container">
                                            <img 
                                              src={`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(sandboxSmiles)}/record/SVG`} 
                                              alt="SMILES structure representation"
                                              className="sandbox-svg"
                                              onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                              }}
                                            />
                                            <div className="sandbox-error-text" style={{ display: 'none' }}>
                                              <span>Invalid SMILES Structure</span>
                                            </div>
                                          </div>
                                          <div className="sandbox-properties" style={{ marginTop: '8px' }}>
                                            <div className="prop-badge-row">
                                              <span>Weight: <strong>{sandboxData.weight.toFixed(1)} Da</strong></span>
                                              <span>LogP: <strong>{sandboxData.logP !== null ? sandboxData.logP.toFixed(2) : 'N/A'}</strong></span>
                                            </div>
                                            <div className="prop-badge-row" style={{ marginTop: '4px' }}>
                                              <span>Donors: <strong>{sandboxData.donors}</strong></span>
                                              <span>Acceptors: <strong>{sandboxData.acceptors}</strong></span>
                                            </div>
                                          </div>
                                        </div>
                                        {sandboxData.formula && (
                                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '12px' }}>
                                            {renderCompositionChart(sandboxData.formula)}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="sandbox-empty">
                                        <span>Enter a valid molecular formula above</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </>
                          )
                        )}
                      </div>
                    )}

                    {/* Tab 4 (both): Publications */}
                    {activeDetailTab === 'publications' && (
                      <div className="publications-tab-layout animate-fade-in glass-card" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-color)', margin: '0 0 4px 0' }}>Scientific Publications</h3>
                        <p className="subtitle" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                          Live search results from Europe PMC
                        </p>
                        {publicationsLoading ? (
                          <div className="loader-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
                            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Retrieving publications...</p>
                          </div>
                        ) : (
                          <div className="publications-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {publicationsData && publicationsData.length > 0 ? (
                              publicationsData.map((pub, idx) => (
                                <a 
                                  key={idx} 
                                  href={pub.url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="publication-item-link"
                                  style={{
                                    display: 'block',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    textDecoration: 'none',
                                    color: 'inherit'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                      <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-color)', lineHeight: 1.4 }}>
                                        {pub.title}
                                      </h4>
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                        {pub.authors}
                                      </div>
                                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        <span style={{ fontWeight: '500' }}>{pub.journal}</span> • {pub.year}
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                      {pub.citations !== undefined && (
                                        <span style={{ 
                                          fontSize: '10px', 
                                          background: 'rgba(0, 83, 214, 0.15)', 
                                          color: '#65CBFF', 
                                          padding: '2px 6px', 
                                          borderRadius: '4px',
                                          fontWeight: '500',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          Citations: {pub.citations}
                                        </span>
                                      )}
                                      <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                  </div>
                                </a>
                              ))
                            ) : (
                              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                No publications found for this query.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 5 (Protein only): Genomic Structure */}
                    {selectedItem.type === 'Protein' && activeDetailTab === 'genomics' && (
                      <div className="genomics-tab-layout animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="detail-info-grid">
                          <div className="info-block">
                            <label>Chromosome</label>
                            <p>{ensemblData ? `Chr ${ensemblData.chromosome}` : 'N/A'}</p>
                          </div>
                          <div className="info-block">
                            <label>Coordinates</label>
                            <p>{ensemblData ? `${ensemblData.start} - ${ensemblData.end}` : 'N/A'}</p>
                          </div>
                          <div className="info-block">
                            <label>Strand</label>
                            <p>{ensemblData ? ensemblData.strand : 'N/A'}</p>
                          </div>
                        </div>

                        <div className="transcripts-card glass-card" style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                              <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-color)', margin: 0 }}>Splice Transcripts</h3>
                              <p className="subtitle" style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                                Ensembl Transcript Isoforms mapped to genomic locus
                              </p>
                            </div>
                            {ensemblData?.transcripts?.length > 0 && (
                              <button
                                onClick={() => exportTranscriptsToCSV(selectedItem.name, ensemblData.transcripts)}
                                className="export-csv-btn text-button"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--overlay-light)',
                                  color: 'var(--text-main)',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <Download size={12} /> Export CSV
                              </button>
                            )}
                          </div>
                          {ensemblLoading ? (
                            <div className="loader-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
                              <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Retrieving transcript data...</p>
                            </div>
                          ) : (
                            <div className="table-responsive" style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '8px 12px 8px 4px' }}>Transcript ID</th>
                                    <th style={{ padding: '8px 12px' }}>Name</th>
                                    <th style={{ padding: '8px 12px' }}>Length</th>
                                    <th style={{ padding: '8px 4px 8px 12px', textAlign: 'right' }}>Biotype</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ensemblData && ensemblData.transcripts && ensemblData.transcripts.length > 0 ? (
                                    ensemblData.transcripts.map((t, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '8px 12px 8px 4px', fontFamily: 'monospace', color: '#65CBFF' }}>{t.id}</td>
                                        <td style={{ padding: '8px 12px', fontWeight: '500' }}>{t.name}</td>
                                        <td style={{ padding: '8px 12px' }}>{t.length.toLocaleString()} bp</td>
                                        <td style={{ padding: '8px 4px 8px 12px', textAlign: 'right', color: t.biotype === 'protein_coding' ? '#39d353' : 'var(--text-muted)' }}>{t.biotype}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No transcripts found.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 6 (Protein only): Tissue Expression Profile */}
                    {selectedItem.type === 'Protein' && activeDetailTab === 'expression' && (
                      <div className="expression-tab-layout animate-fade-in glass-card" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-color)', margin: '0 0 4px 0' }}>Tissue Expression Profile</h3>
                        <p className="subtitle" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                          Median expression (TPM) across human tissues from GTEx Portal (v8)
                        </p>
                        {gtexLoading ? (
                          <div className="loader-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
                            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Retrieving expression data...</p>
                          </div>
                        ) : (
                          <div className="expression-chart-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {gtexData && gtexData.length > 0 ? (
                              (() => {
                                const maxTpm = Math.max(...gtexData.map(d => d.tpm), 1.0);
                                return gtexData.map((d, idx) => {
                                  const pct = (d.tpm / maxTpm) * 100;
                                  return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                                      <div style={{ width: '110px', fontWeight: '500', color: 'var(--text-color)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {d.tissue}
                                      </div>
                                      <div style={{ flex: 1, height: '14px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '7px', overflow: 'hidden', position: 'relative' }}>
                                        <div 
                                          style={{ 
                                            width: `${pct}%`, 
                                            height: '100%', 
                                            background: 'linear-gradient(90deg, #0053D6, #65CBFF)', 
                                            borderRadius: '7px',
                                            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                                          }} 
                                        />
                                      </div>
                                      <div style={{ width: '70px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                                        {d.tpm.toFixed(1)} TPM
                                      </div>
                                    </div>
                                  );
                                });
                              })()
                            ) : (
                              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                No tissue expression data found.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 7 (Protein only): Clinical Variants & GWAS */}
                    {selectedItem.type === 'Protein' && activeDetailTab === 'variants' && (
                      <div className="variants-tab-layout animate-fade-in glass-card" style={{ padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-color)', margin: '0 0 4px 0' }}>ClinVar & GWAS Risk Associations</h3>
                        <p className="subtitle" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                          Variant pathogenicity and genetic disease traits
                        </p>
                        {gwasLoading ? (
                          <div className="loader-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
                            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Retrieving genetic variants...</p>
                          </div>
                        ) : (
                          <div className="variants-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {gwasData && gwasData.length > 0 ? (
                              gwasData.map((item, idx) => (
                                <div 
                                  key={idx} 
                                  style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '12px'
                                  }}
                                >
                                  <div>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-color)' }}>
                                      {item.trait}
                                    </h4>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                      Locus ID: {item.variantId}
                                    </span>
                                  </div>
                                  <div>
                                    <span style={{
                                      fontSize: '10px',
                                      padding: '3px 8px',
                                      borderRadius: '12px',
                                      fontWeight: '600',
                                      background: item.significance === 'Pathogenic' ? 'rgba(255, 92, 92, 0.15)' : 'rgba(255, 219, 26, 0.15)',
                                      color: item.significance === 'Pathogenic' ? '#ff5c5c' : '#FFDB1A',
                                      border: `1px solid ${item.significance === 'Pathogenic' ? 'rgba(255, 92, 92, 0.3)' : 'rgba(255, 219, 26, 0.3)'}`
                                    }}>
                                      {item.significance}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px' }}>
                                No clinical variant mappings found for this target.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    className="card-header clickable-header" 
                    onClick={() => setShowGlobalMapModal(true)}
                  >
                    <h3>Global Trial Distribution</h3>
                    <ChevronRight size={16} />
                  </div>
                  <div className="placeholder-viz">
                    <InteractionMap />
                  </div>
                </>
              )}
            </div>

            <div className="glass-card side-list">
              <div className="card-header">
                <h3>Recent Insights</h3>
              </div>
              <div className="insight-list">
                {insightsLoading ? (
                  <div className="placeholder-content" style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                    <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
                    <p style={{ fontSize: '13px', margin: 0 }}>Synthesizing live trial data...</p>
                  </div>
                ) : (
                  (recentInsights.length > 0 ? recentInsights : [
                    { id: 'CHEMBL941', name: 'Imatinib derivative', type: 'Drug', title: 'Phase III Completion', desc: 'Imatinib derivative shows 15% better affinity.', details: 'Imatinib derivative shows 15% better affinity against BCR-ABL target in recent simulations.', time: '2h ago' },
                    { id: 'P38398', name: 'BRCA1 variant', type: 'Protein', title: 'Genomic Update', desc: 'BRCA1 variant classification updated to Pathogenic.', details: 'Clinical validation database updated. BRCA1 variant classified as Pathogenic due to functional disruption.', time: '5h ago' },
                    { id: 'AURA-928', name: 'AURA-928', type: 'Compound', title: 'New Molecule', desc: 'AURA-928 added to screening library.', details: 'AURA-928 added to screening library for target engagement trials against protein kinases.', time: '1d ago' }
                  ]).map((item, index) => (
                    <InsightItem 
                      key={item.id || index}
                      title={item.title} 
                      desc={item.desc}
                      time={item.time}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </>
          )
        )}
        </section>
      </main>

      {showPendingModal && (
        <div className="modal-backdrop" onClick={() => setShowPendingModal(false)}>
          <div className="glass-card modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Pending Analysis Pipeline</h2>
              <button className="modal-close-btn" onClick={() => setShowPendingModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="pending-list">
                {pendingAnalyses.map((analysis) => {
                  const isClickable = analysis.isRealJob && analysis.status === 'completed';
                  return (
                    <div 
                      key={analysis.id} 
                      className={`pending-item ${isClickable ? 'clickable' : ''}`}
                      onClick={() => isClickable && handleViewAlignmentResult(analysis)}
                      title={isClickable ? "Click to view alignment results" : undefined}
                    >
                      <div className="pending-info">
                        <span className="pending-category">
                          {analysis.category} {analysis.isRealJob && <span style={{ color: 'var(--accent-primary)', fontSize: '10px', marginLeft: '6px' }}>(EMBL-EBI Live)</span>}
                        </span>
                        <span className="pending-title">{analysis.title}</span>
                        {analysis.isRealJob && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Job ID: <span style={{ fontFamily: 'monospace' }}>{analysis.jobId}</span> | Submitted: {analysis.submittedAt}
                          </span>
                        )}
                      </div>
                      <span className={`pending-status-pill ${analysis.status}`}>
                        {analysis.status === 'simulating' ? 'Simulating...' : analysis.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedAlignmentJob && (
        <div className="modal-backdrop" onClick={() => setSelectedAlignmentJob(null)}>
          <div className="glass-card modal-card" style={{ maxWidth: '800px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Multiple Sequence Alignment Results</h2>
                <p className="subtitle" style={{ fontSize: '12px', margin: '4px 0 0 0' }}>EMBL-EBI Clustal Omega Service</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedAlignmentJob(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="alignment-container">
                <div className="alignment-meta">
                  <div className="alignment-meta-row">
                    <span className="alignment-meta-label">Task ID</span>
                    <span className="alignment-meta-value">{selectedAlignmentJob.id}</span>
                  </div>
                  <div className="alignment-meta-row">
                    <span className="alignment-meta-label">EBI Job ID</span>
                    <span className="alignment-meta-value">{selectedAlignmentJob.jobId}</span>
                  </div>
                  <div className="alignment-meta-row">
                    <span className="alignment-meta-label">Proteins Aligned</span>
                    <span className="alignment-meta-value" style={{ fontFamily: 'inherit', color: 'var(--text-main)' }}>
                      {selectedAlignmentJob.proteins}
                    </span>
                  </div>
                </div>

                {alignmentLoading ? (
                  <div className="placeholder-content" style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Retrieving alignment map and guide tree from EMBL-EBI...</p>
                  </div>
                ) : alignmentError ? (
                  <div className="placeholder-content" style={{ padding: '40px 0', color: '#ef4444', textAlign: 'center' }}>
                    <p style={{ fontWeight: 'bold' }}>Failed to load alignment results</p>
                    <p style={{ fontSize: '13px', opacity: 0.8 }}>{alignmentError}</p>
                  </div>
                ) : (
                  <>
                    <div className="alignment-tabs">
                      <button 
                        className={`alignment-tab-btn ${activeAlignTab === 'alignment' ? 'active' : ''}`}
                        onClick={() => setActiveAlignTab('alignment')}
                      >
                        Sequence Alignment
                      </button>
                      <button 
                        className={`alignment-tab-btn ${activeAlignTab === 'tree' ? 'active' : ''}`}
                        onClick={() => setActiveAlignTab('tree')}
                        disabled={!treeResult}
                      >
                        Phylogenetic Tree {!treeResult && '(Loading...)'}
                      </button>
                    </div>

                    {activeAlignTab === 'alignment' ? (
                      <div className="alignment-wrapper">
                        {alignmentResult}
                      </div>
                    ) : (
                      <div className="tree-wrapper glass-card" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                        <PhylogeneticTree newickString={treeResult} />
                      </div>
                    )}

                    <div className="alignment-export-panel">
                      {activeAlignTab === 'alignment' ? (
                        <>
                          <button 
                            className={`export-btn ${copyFeedback.aln ? 'export-btn-success' : ''}`}
                            onClick={() => handleCopyText(alignmentResult, 'aln')}
                          >
                            <Copy size={14} />
                            <span>{copyFeedback.aln ? 'Copied ALN!' : 'Copy ALN'}</span>
                          </button>
                          <button 
                            className="export-btn"
                            onClick={() => handleDownloadFile(alignmentResult, `${selectedAlignmentJob.jobId}.aln`, 'text/plain')}
                          >
                            <Download size={14} />
                            <span>Download ALN</span>
                          </button>
                          <button 
                            className={`export-btn ${copyFeedback.fasta ? 'export-btn-success' : ''}`}
                            onClick={() => handleCopyText(convertAlnToFasta(alignmentResult), 'fasta')}
                          >
                            <Copy size={14} />
                            <span>{copyFeedback.fasta ? 'Copied FASTA!' : 'Copy FASTA'}</span>
                          </button>
                          <button 
                            className="export-btn"
                            onClick={() => handleDownloadFile(convertAlnToFasta(alignmentResult), `${selectedAlignmentJob.jobId}.fasta`, 'text/plain')}
                          >
                            <Download size={14} />
                            <span>Download FASTA</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className={`export-btn ${copyFeedback.tree ? 'export-btn-success' : ''}`}
                            onClick={() => handleCopyText(treeResult, 'tree')}
                          >
                            <Copy size={14} />
                            <span>{copyFeedback.tree ? 'Copied Tree!' : 'Copy Newick Tree'}</span>
                          </button>
                          <button 
                            className="export-btn"
                            onClick={() => handleDownloadFile(treeResult, `${selectedAlignmentJob.jobId}.ph`, 'text/plain')}
                          >
                            <Download size={14} />
                            <span>Download Newick Tree</span>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showGlobalMapModal && (
        <div className="modal-backdrop" onClick={() => setShowGlobalMapModal(false)}>
          <div className="glass-card modal-card" style={{ maxWidth: '1080px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Global Trial Distribution Explorer</h2>
                <p className="subtitle" style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Geographic density and clinical phase breakdown</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowGlobalMapModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="distribution-layout" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
                {/* Left Column: Interactive Map */}
                <div className="glass-card map-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '16px', color: 'var(--accent-primary)', margin: 0 }}>Geographic Explorer Map</h3>
                  <div style={{ position: 'relative', width: '100%', paddingBottom: '58.33%', height: 0, overflow: 'hidden' }}>
                    <svg viewBox="0 0 600 350" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                      <style>
                        {`
                          .map-region path {
                            fill: var(--overlay-medium);
                            stroke: var(--border-color);
                            stroke-width: 1.5;
                            transition: all 0.3s ease;
                          }
                          .map-region.active path,
                          .map-region:hover path {
                            fill: rgba(124, 58, 237, 0.35) !important;
                            stroke: var(--accent-primary) !important;
                          }
                        `}
                      </style>

                      {/* North America Group */}
                      <g 
                        className={`map-region ${activeMapRegion === 'North America' ? 'active' : ''}`}
                        onMouseEnter={() => setActiveMapRegion('North America')}
                        onMouseLeave={() => setActiveMapRegion(null)}
                      >
                        {/* North America main */}
                        <path d="M 40 40 L 160 30 L 190 70 L 140 135 L 90 140 L 50 110 Z" />
                        {/* Greenland */}
                        <path d="M 175 15 L 210 12 L 220 35 L 195 55 Z" />
                      </g>

                      {/* South America Group */}
                      <g 
                        className={`map-region ${activeMapRegion === 'South America' ? 'active' : ''}`}
                        onMouseEnter={() => setActiveMapRegion('South America')}
                        onMouseLeave={() => setActiveMapRegion(null)}
                      >
                        <path d="M 120 150 L 160 150 L 180 200 L 150 290 L 125 285 L 110 200 Z" />
                      </g>

                      {/* Europe Group */}
                      <g 
                        className={`map-region ${activeMapRegion === 'Europe' ? 'active' : ''}`}
                        onMouseEnter={() => setActiveMapRegion('Europe')}
                        onMouseLeave={() => setActiveMapRegion(null)}
                      >
                        <path d="M 230 50 L 300 45 L 320 100 L 240 120 Z" />
                      </g>

                      {/* East Asia Group */}
                      <g 
                        className={`map-region ${activeMapRegion === 'East Asia' ? 'active' : ''}`}
                        onMouseEnter={() => setActiveMapRegion('East Asia')}
                        onMouseLeave={() => setActiveMapRegion(null)}
                      >
                        <path d="M 330 50 L 460 50 L 480 120 L 450 200 L 360 200 L 330 110 Z" />
                      </g>

                      {/* Rest of World Group (Africa, Australia, Southern/Western Asia, etc) */}
                      <g 
                        className={`map-region ${activeMapRegion === 'Rest of World' ? 'active' : ''}`}
                        onMouseEnter={() => setActiveMapRegion('Rest of World')}
                        onMouseLeave={() => setActiveMapRegion(null)}
                      >
                        {/* Africa */}
                        <path d="M 230 130 L 290 130 L 315 190 L 290 270 L 250 260 L 220 180 Z" />
                        {/* Australia */}
                        <path d="M 430 220 L 500 220 L 510 270 L 450 280 Z" />
                        {/* Southern Asia/Middle East */}
                        <path d="M 300 110 L 350 110 L 360 180 L 310 180 Z" />
                      </g>
                    </svg>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
                    Hover over regions or stats to view density highlight sync
                  </div>
                </div>

                {/* Right Column: Existing Stats Panels (stacked vertically) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="distribution-panel" style={{ width: '100%', margin: 0 }}>
                    <h3>Regional Trial Density</h3>
                    <div className="geo-stat-bar-group">
                      {trialDistribution.regions.map((reg, idx) => (
                        <div 
                          key={idx} 
                          className={`geo-bar-row ${activeMapRegion === reg.label ? 'active-row' : ''}`}
                          onMouseEnter={() => setActiveMapRegion(reg.label)}
                          onMouseLeave={() => setActiveMapRegion(null)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            background: activeMapRegion === reg.label ? 'var(--overlay-medium)' : 'transparent',
                            border: '1px solid',
                            borderColor: activeMapRegion === reg.label ? 'var(--border-color)' : 'transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <div className="geo-bar-info">
                            <span className="geo-bar-label" style={{ fontWeight: activeMapRegion === reg.label ? 'bold' : 'normal' }}>{reg.label}</span>
                            <span className="geo-bar-value">{reg.value}</span>
                          </div>
                          <div className="geo-bar-track">
                            <div 
                              className="geo-bar-fill" 
                              style={{ 
                                width: reg.fill,
                                background: activeMapRegion === reg.label ? 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' : 'var(--accent-primary)'
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="distribution-panel" style={{ width: '100%', margin: 0 }}>
                    <h3>Clinical Phase Distribution</h3>
                    <div className="phase-pill-grid">
                      {trialDistribution.phases.map((phase, idx) => (
                        <div key={idx} className="phase-pill-card">
                          <span className="phase-pill-value">{phase.count}</span>
                          <span className="phase-pill-label">{phase.label}</span>
                        </div>
                      ))}
                    </div>

                    <h3 style={{ marginTop: '16px' }}>Top Contributing Countries</h3>
                    <div className="country-list">
                      {trialDistribution.countries.map((country, idx) => (
                        <div key={idx} className="country-row">
                          <span className="country-name">{country.name}</span>
                          <span className="country-count">{country.count} trials</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function StatCard({ label, value, change, alert = false, onClick }) {
  return (
    <div 
      className={`glass-card stat-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <p className="stat-label">{label}</p>
      <div className="stat-value-container">
        <span className="stat-value">{value}</span>
        {change && <span className="stat-change">{change}</span>}
        {alert && <span className="stat-alert-dot"></span>}
      </div>
    </div>
  );
}

function InsightItem({ title, desc, time, onClick }) {
  return (
    <div className="insight-item" onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className="insight-content">
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>
      <span className="insight-time">{time}</span>
    </div>
  );
}

export default App;
function LibraryView({ libraryItems, setLibraryItems, addNotification }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newId, setNewId] = useState('');
  const [newType, setNewType] = useState('Drug');
  const [newStatus, setNewStatus] = useState('Active');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newName || !newId) return;
    const newItem = {
      name: newName,
      id: newId,
      type: newType,
      status: newStatus
    };
    setLibraryItems([...libraryItems, newItem]);
    if (addNotification) {
      addNotification(
        'Target Added to Library',
        `${newItem.name} (${newItem.id}) has been added to your Molecular Library.`,
        'success'
      );
    }
    setNewName('');
    setNewId('');
    setNewType('Drug');
    setNewStatus('Active');
    setIsAdding(false);
  };

  return (
    <div className="secondary-view animate-fade-in">
      <header className="section-header">
        <div>
          <h1>Molecular Library</h1>
          <p className="subtitle">Manage your saved targets and compounds</p>
        </div>
      </header>
      <div className="library-grid">
        {libraryItems.map((item) => (
          <div key={item.id} className="glass-card library-card">
            <button 
              className="remove-btn"
              onClick={() => {
                setLibraryItems(libraryItems.filter(i => i.id !== item.id));
                if (addNotification) {
                  addNotification(
                    'Target Removed',
                    `${item.name} has been removed from your Molecular Library.`,
                    'info'
                  );
                }
              }}
              style={{ pointerEvents: 'auto' }}
            >
              ×
            </button>
            <span className="badge">{item.type}</span>
            <h3>{item.name}</h3>
            <p className="id-tag">{item.id}</p>
            <div className="card-footer">
              <span className={item.status === 'Approved' || item.status === 'Active' ? 'status-online' : 'status-offline'} style={{ color: item.status === 'Approved' || item.status === 'Active' ? '#10b981' : '#f59e0b' }}>
                {item.status}
              </span>
              <ChevronRight size={14} />
            </div>
          </div>
        ))}

        {isAdding ? (
          <form onSubmit={handleSubmit} className="glass-card library-card add-target-form">
            <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>New Target</h3>
            <input 
              type="text" 
              placeholder="Name (e.g. Imatinib)" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              required
              className="custom-login-input"
              style={{ width: '100%', padding: '6px 10px', fontSize: '12px', marginBottom: '6px', height: '32px' }}
            />
            <input 
              type="text" 
              placeholder="ID (e.g. CHEMBL941)" 
              value={newId} 
              onChange={e => setNewId(e.target.value)} 
              required
              className="custom-login-input"
              style={{ width: '100%', padding: '6px 10px', fontSize: '12px', marginBottom: '6px', height: '32px' }}
            />
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <select 
                value={newType} 
                onChange={e => setNewType(e.target.value)}
                style={{ flex: 1, padding: '4px 6px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
              >
                <option value="Drug" style={{ background: '#0a0a0c' }}>Drug</option>
                <option value="Protein" style={{ background: '#0a0a0c' }}>Protein</option>
                <option value="Compound" style={{ background: '#0a0a0c' }}>Compound</option>
              </select>
              <select 
                value={newStatus} 
                onChange={e => setNewStatus(e.target.value)}
                style={{ flex: 1, padding: '4px 6px', fontSize: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
              >
                <option value="Active" style={{ background: '#0a0a0c' }}>Active</option>
                <option value="Approved" style={{ background: '#0a0a0c' }}>Approved</option>
                <option value="Pending" style={{ background: '#0a0a0c' }}>Pending</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                type="submit" 
                style={{ flex: 1, padding: '6px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold', fontSize: '12px' }}
              >
                Add
              </button>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                style={{ flex: 1, padding: '6px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '12px' }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="glass-card add-more-card" onClick={() => setIsAdding(true)}>
            <div className="plus-icon">+</div>
            <p>Add Target</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TrialsView() {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getTrials = async () => {
      const data = await fetchRecentTrials();
      setTrials(data);
      setLoading(false);
    };
    getTrials();
  }, []);

  return (
    <div className="secondary-view animate-fade-in">
      <header className="section-header">
        <div>
          <h1>Clinical Trials Explorer</h1>
          <p className="subtitle">Deep-dive into ongoing medical research</p>
        </div>
      </header>
      <div className="glass-card full-width-card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h3 style={{ margin: 0 }}>Active Global Studies</h3>
          {!loading && trials.length > 0 && (
            <button
              onClick={() => exportTrialsToCSV(trials)}
              className="export-csv-btn text-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--overlay-light)',
                color: 'var(--text-main)',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              <Download size={12} /> Export CSV
            </button>
          )}
        </div>
        {loading ? (
          <div className="placeholder-content">
            <Activity size={32} className="animate-pulse" />
            <p>Connecting to ClinicalTrials.gov live feed...</p>
          </div>
        ) : (
          <div className="trials-table-container">
            <table className="trials-table">
              <thead>
                <tr>
                  <th>NCT ID</th>
                  <th>Brief Title</th>
                  <th>Status</th>
                  <th>Phase</th>
                  <th>Sponsor</th>
                </tr>
              </thead>
              <tbody>
                {trials.map((trial) => (
                  <tr key={trial.id}>
                    <td className="trial-id">
                      <a 
                        href={`https://clinicaltrials.gov/study/${trial.id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="trial-link"
                      >
                        {trial.id} <ExternalLink size={12} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                      </a>
                    </td>
                    <td className="trial-title" title={trial.title}>
                      <a 
                        href={`https://clinicaltrials.gov/study/${trial.id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="trial-link-title"
                      >
                        {trial.title}
                      </a>
                    </td>
                    <td><span className={`status-badge ${trial.status.toLowerCase()}`}>{trial.status}</span></td>
                    <td>{trial.phase}</td>
                    <td className="trial-sponsor">{trial.sponsor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView({ glassmorphismIntensity, setGlassmorphismIntensity, darkMode, setDarkMode, addNotification }) {
  const [statuses, setStatuses] = useState({
    chembl: 'checking',
    uniprot: 'checking',
    clinicaltrials: 'checking',
    europepmc: 'checking',
    ensembl: 'checking',
    gtex: 'checking',
    gwas: 'checking',
    rcsbpdb: 'checking'
  });

  const notifiedOutagesRef = useRef(new Set());

  useEffect(() => {
    let active = true;

    const checkChEMBL = async () => {
      try {
        const res = await fetch('https://www.ebi.ac.uk/chembl/api/data/status.json');
        if (res.ok) return 'online';
        
        const res2 = await fetch('https://www.ebi.ac.uk/chembl/api/data/molecule.json?limit=1&format=json');
        return res2.ok ? 'online' : 'offline';
      } catch {
        return 'offline';
      }
    };

    const checkUniProt = async () => {
      try {
        const res = await fetch('https://rest.uniprot.org/uniprotkb/search?query=accession:P38398&format=json&size=1');
        return res.ok ? 'online' : 'offline';
      } catch {
        return 'offline';
      }
    };

    const checkClinicalTrials = async () => {
      try {
        const res = await fetch('https://clinicaltrials.gov/api/v2/studies?pageSize=1');
        return res.ok ? 'online' : 'offline';
      } catch {
        return 'offline';
      }
    };

    const checkEuropePMC = async () => {
      try {
        const res = await fetch('https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=BRCA1&format=json&pageSize=1');
        return res.ok ? 'online' : 'offline';
      } catch {
        return 'offline';
      }
    };

    const checkEnsembl = async () => {
      try {
        const res = await fetch('https://rest.ensembl.org/info/ping?content-type=application/json');
        return res.ok ? 'online' : 'offline';
      } catch {
        return 'offline';
      }
    };

    const checkGTEx = async () => {
      try {
        const res = await fetch('https://gtexportal.org/api/v2/expression/medianGeneExpression?gencodeId=ENSG00000139618&datasetId=gtex_v8');
        return res.ok ? 'online' : 'offline';
      } catch {
        return 'offline';
      }
    };

    const checkGWAS = async () => {
      try {
        const res = await fetch('https://www.ebi.ac.uk/gwas/rest/api/studies?size=1');
        return res.ok ? 'online' : 'offline';
      } catch {
        return 'offline';
      }
    };

    const checkRcsbPDB = async () => {
      try {
        const res = await fetch('https://data.rcsb.org/rest/v1/core/entry/1JNX');
        return res.ok ? 'online' : 'offline';
      } catch {
        return 'offline';
      }
    };

    const checkAll = async () => {
      const [chembl, uniprot, clinicaltrials, europepmc, ensembl, gtex, gwas, rcsbpdb] = await Promise.all([
        checkChEMBL(),
        checkUniProt(),
        checkClinicalTrials(),
        checkEuropePMC(),
        checkEnsembl(),
        checkGTEx(),
        checkGWAS(),
        checkRcsbPDB()
      ]);
      if (active) {
        Promise.resolve().then(() => {
          setStatuses({ chembl, uniprot, clinicaltrials, europepmc, ensembl, gtex, gwas, rcsbpdb });

          const checks = [
            { label: 'ChEMBL API', status: chembl, id: 'chembl' },
            { label: 'UniProt REST', status: uniprot, id: 'uniprot' },
            { label: 'ClinicalTrials.gov', status: clinicaltrials, id: 'clinicaltrials' },
            { label: 'Europe PMC (Lit)', status: europepmc, id: 'europepmc' },
            { label: 'Ensembl Genomics', status: ensembl, id: 'ensembl' },
            { label: 'GTEx Portal (Expression)', status: gtex, id: 'gtex' },
            { label: 'GWAS Catalog (ClinVar)', status: gwas, id: 'gwas' },
            { label: 'RCSB PDB (Structures)', status: rcsbpdb, id: 'rcsbpdb' }
          ];

          checks.forEach(check => {
            if (check.status === 'offline') {
              if (!notifiedOutagesRef.current.has(check.id)) {
                notifiedOutagesRef.current.add(check.id);
                if (addNotification) {
                  addNotification(
                    `Data Source Offline: ${check.label}`,
                    `${check.label} is currently unreachable. AURA has seamlessly enabled local seed fallbacks.`,
                    'warning'
                  );
                }
              }
            } else if (check.status === 'online') {
              notifiedOutagesRef.current.delete(check.id);
            }
          });
        });
      }
    };

    checkAll();

    return () => {
      active = false;
    };
  }, [addNotification]);

  const renderStatus = (status) => {
    if (status === 'online') {
      return <span className="status-online">Online</span>;
    } else if (status === 'offline') {
      return <span className="status-offline">Offline</span>;
    } else {
      return <span className="status-checking">Checking...</span>;
    }
  };

  return (
    <div className="secondary-view animate-fade-in">
      <header className="section-header">
        <div>
          <h1>System Settings</h1>
          <p className="subtitle">Configure your AURA environment</p>
        </div>
      </header>
      <div className="settings-grid">
        <div className="glass-card settings-card">
          <h3>Display Preferences</h3>
          <div className="setting-row">
            <span>Dark Mode</span>
            <div 
              className={`toggle ${darkMode ? 'active' : ''}`}
              onClick={() => setDarkMode(!darkMode)}
              style={{ cursor: 'pointer' }}
            ></div>
          </div>
          <div className="setting-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <span>Glassmorphism Intensity</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={glassmorphismIntensity} 
                onChange={(e) => setGlassmorphismIntensity(Number(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', width: '32px', textAlign: 'right' }}>{glassmorphismIntensity}%</span>
            </div>
          </div>
        </div>

        <div className="glass-card settings-card">
          <h3>Data Sources</h3>
          <div className="source-item"><span>ChEMBL API</span> {renderStatus(statuses.chembl)}</div>
          <div className="source-item"><span>UniProt REST</span> {renderStatus(statuses.uniprot)}</div>
          <div className="source-item"><span>ClinicalTrials.gov</span> {renderStatus(statuses.clinicaltrials)}</div>
          <div className="source-item"><span>Europe PMC (Lit)</span> {renderStatus(statuses.europepmc)}</div>
          <div className="source-item"><span>Ensembl Genomics</span> {renderStatus(statuses.ensembl)}</div>
          <div className="source-item"><span>GTEx Portal (Expression)</span> {renderStatus(statuses.gtex)}</div>
          <div className="source-item"><span>GWAS Catalog (ClinVar)</span> {renderStatus(statuses.gwas)}</div>
          <div className="source-item"><span>RCSB PDB (Structures)</span> {renderStatus(statuses.rcsbpdb)}</div>
        </div>

      </div>
    </div>
  );
}

function ContactView({ addNotification }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LdyIQ8tAAAAAMxR5Vgt48zeaI-AAhb8fkB6Dpod';

  useEffect(() => {
    // Check if script is already present
    let script = document.getElementById('recaptcha-script');
    if (!script) {
      script = document.createElement('script');
      script.id = 'recaptcha-script';
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [siteKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !message) {
      setStatus('error');
      setStatusMessage('Please fill in all required fields.');
      return;
    }

    setStatus('sending');

    try {
      if (!window.grecaptcha) {
        throw new Error('reCAPTCHA is loading. Please try again in a moment.');
      }

      const token = await new Promise((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(siteKey, { action: 'submit' })
            .then(resolve)
            .catch(reject);
        });
      });

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          category,
          subject: subject || `${category.toUpperCase()}: Contact Form Submission`,
          message,
          gRecaptchaResponse: token
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonErr) {
        console.error('Failed to parse contact response as JSON:', jsonErr);
        let errMsg = `Server error (${response.status})`;
        try {
          const rawText = await response.text();
          if (rawText && rawText.length < 200) errMsg = rawText;
        } catch {
          // ignore fallback
        }
        setStatus('error');
        setStatusMessage(errMsg);
        return;
      }

      if (response.ok && result.status === 'success') {
        setStatus('success');
        if (addNotification) {
          addNotification(
            'Message Transmitted Successfully',
            `Support ticket for '${subject || category.toUpperCase()}' has been opened. We will respond within 24 hours.`,
            'success'
          );
        }
        setName('');
        setEmail('');
        setSubject('');
        setMessage('');
      } else {
        setStatus('error');
        setStatusMessage(result.message || 'Failed to send your message. Please try again.');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setStatusMessage(error.message || 'An unexpected error occurred. Please verify your connection or backend script.');
    }
  };

  return (
    <div className="secondary-view animate-fade-in">
      <header className="section-header">
        <div>
          <h1>Support & Feedback</h1>
          <p className="subtitle">Submit a bug report, request a feature, or get in touch</p>
        </div>
      </header>

      <div className="contact-container">
        <div className="glass-card contact-card">
          {status === 'success' && (
            <div className="contact-alert success animate-fade-in">
              <h4>Message Sent!</h4>
              <p>Thank you for reaching out. We will get back to you shortly.</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="contact-alert error animate-fade-in">
              <h4>Submission Error</h4>
              <p>{statusMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label>Name <span className="required-star">*</span></label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                required
                disabled={status === 'sending'}
                className="custom-login-input"
              />
            </div>

            <div className="form-group">
              <label>Email Address <span className="required-star">*</span></label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={status === 'sending'}
                className="custom-login-input"
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Category</label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={status === 'sending'}
                  className="contact-select"
                >
                  <option value="general">General Contact</option>
                  <option value="bug">Report a Bug</option>
                  <option value="feature">Feature Request</option>
                </select>
              </div>

              <div className="form-group">
                <label>Subject</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Subject of message (optional)"
                  disabled={status === 'sending'}
                  className="custom-login-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Message <span className="required-star">*</span></label>
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="How can we help you?"
                required
                rows={5}
                disabled={status === 'sending'}
                className="contact-textarea custom-login-input"
              />
            </div>

            <div className="form-group captcha-group">
              <p className="captcha-help-text" style={{ fontSize: '11px', opacity: 0.6, marginTop: '8px' }}>
                This site is protected by reCAPTCHA and the Google <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Terms of Service</a> apply.
              </p>
            </div>

            <button 
              type="submit" 
              className="primary-button submit-btn"
              disabled={status === 'sending'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '200px', height: '42px' }}
            >
              {status === 'sending' ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send Message</span>
              )}
            </button>
          </form>
        </div>

        <div className="glass-card contact-info-card">
          <h3>AURA Support & Feedback</h3>
          <p>Your feedback is vital to our roadmap. Bug reports and feature suggestions are automatically routed to our priority development queue.</p>
          
          <div className="info-meta">
            <div className="info-item">
              <span className="info-label">Queue Response Target</span>
              <span className="info-val"> &lt; 24 Hours</span>
            </div>
            <div className="info-item">
              <span className="info-label">Supported Categories: </span>
              <span className="info-val">Bugs, Feature requests, general contact</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
