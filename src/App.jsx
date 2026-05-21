import { useState, useEffect } from 'react';
import { Search, LayoutDashboard, Database, Activity, Settings, Bell, ChevronRight, FlaskConical, Loader2, ExternalLink, Menu, X, Mail } from 'lucide-react';
import { searchBiomedicalData, fetchRecentTrials } from './api';
import InteractionMap from './InteractionMap';
import BindingVisualizer from './BindingVisualizer';
import './App.css';
import './DetailView.css';
import './InteractionMap.css';
import './BindingVisualizer.css';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
    <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
    <path d="M9 18C11.43 18 13.4673 17.1941 14.9577 15.8195L12.0491 13.5614C11.2418 14.1027 10.2109 14.4273 9 14.4273C6.65591 14.4273 4.67182 12.8455 3.96409 10.7182H0.957275V13.0491C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
    <path d="M3.96409 10.7182C3.78409 10.1823 3.68182 9.60545 3.68182 9C3.68182 8.39455 3.78409 7.81773 3.96409 7.28182V4.95091H0.957275C0.347727 6.16773 0 7.54773 0 9C0 10.4523 0.347727 11.8323 0.957275 13.0491L3.96409 10.7182Z" fill="#FBBC05"/>
    <path d="M9 3.57273C10.3214 3.57273 11.5077 4.02545 12.4405 4.91727L15.0218 2.33591C13.4632 0.887727 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95091L3.96409 7.28182C4.67182 5.15455 6.65591 3.57273 9 3.57273Z" fill="#EA4335"/>
  </svg>
);

// Deterministic daily values based on current date
const getDailyStats = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const year = today.getFullYear();
  
  // Seed based on day and year
  const seed = dayOfYear + year * 365;
  
  // Deterministic pseudo-random number generator (LCG)
  const lcg = (s) => {
    return (s * 1664525 + 1013904223) % 4294967296;
  };
  
  const seed1 = lcg(seed);
  const seed2 = lcg(seed1);
  const seed3 = lcg(seed2);
  
  // Active Trials: around 1,200 to 1,350. Change: between +8% and +15%
  const trialsCount = 1200 + (seed1 % 150);
  const trialsChange = 8 + (seed2 % 8);
  
  // Molecules Indexed: around 84,000 to 86,000. E.g., "85.3k"
  const moleculesBase = 840 + (seed3 % 20); // 840 to 860 tenths of a k
  const moleculesVal = `${(moleculesBase / 10).toFixed(1)}k`;
  
  // Pending Analysis: 5 to 15
  const pendingCount = 5 + (seed2 % 11);
  
  return {
    trials: trialsCount.toLocaleString(),
    trialsChange: `+${trialsChange}%`,
    molecules: moleculesVal,
    pending: pendingCount.toString()
  };
};

function App() {
  const [pendingAnalyses, setPendingAnalyses] = useState([
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
  ]);

  const dailyStats = { ...getDailyStats(), pending: pendingAnalyses.length.toString() };
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [comparisonList, setComparisonList] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showGlobalMapModal, setShowGlobalMapModal] = useState(false);

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
          const activeIndices = prev.map((item, idx) => (item.status === 'running' || item.status === 'simulating') ? idx : -1).filter(idx => idx !== -1);
          if (activeIndices.length > 0) {
            const indexToRemove = activeIndices[Math.floor(Math.random() * activeIndices.length)];
            return prev.filter((_, idx) => idx !== indexToRemove);
          }
        }
        
        // Start a queued task (queued -> running/simulating) - 30% chance
        if (rand < 0.7) {
          const queuedIndices = prev.map((item, idx) => item.status === 'queued' ? idx : -1).filter(idx => idx !== -1);
          if (queuedIndices.length > 0) {
            const indexToStart = queuedIndices[Math.floor(Math.random() * queuedIndices.length)];
            const nextStatus = Math.random() > 0.5 ? 'running' : 'simulating';
            return prev.map((item, idx) => idx === indexToStart ? { ...item, status: nextStatus } : item);
          }
        }
        
        // Add a new queued task - 30% chance or if count gets low
        if (prev.length < 15) {
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
    if (savedData) {
      const parsed = JSON.parse(savedData);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLibraryItems(parsed.libraryItems || []);
      setGlassmorphismIntensity(parsed.glassmorphismIntensity ?? 80);
      setDarkMode(parsed.darkMode ?? true);
    } else {
      const defaultLibrary = [
        { name: 'Imatinib', id: 'CHEMBL941', type: 'Drug', status: 'Approved' },
        { name: 'Aspirin', id: 'CHEMBL25', type: 'Drug', status: 'Approved' },
        { name: 'BRCA1', id: 'P38398', type: 'Protein', status: 'Active' }
      ];
      setLibraryItems(defaultLibrary);
      setGlassmorphismIntensity(80);
      setDarkMode(true);
      
      localStorage.setItem(userKey, JSON.stringify({
        libraryItems: defaultLibrary,
        glassmorphismIntensity: 80,
        darkMode: true
      }));
    }
  }, [currentUser]);

  // Sync state back to localStorage
  useEffect(() => {
    if (!currentUser) return;
    const userKey = `aura_user_data_${currentUser.email}`;
    const currentData = {
      libraryItems,
      glassmorphismIntensity,
      darkMode
    };
    localStorage.setItem(userKey, JSON.stringify(currentData));
  }, [libraryItems, glassmorphismIntensity, darkMode, currentUser]);

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
      avatarSeed: name
    };
    handleMockLogin(userData);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('aura_current_user');
    setShowProfile(false);
  };

  const handleLogoClick = () => {
    setActiveView('dashboard');
    setSelectedItem(null);
    setShowComparison(false);
    setResults(null);
    setSearchQuery('');
    setSidebarOpen(false);
  };

  const addToComparison = (item) => {
    if (comparisonList.length >= 4) return;
    if (!comparisonList.find(i => i.id === item.id)) {
      setComparisonList([...comparisonList, item]);
    }
    setResults(null);
    setSearchQuery('');
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
            <div className="login-content">
              <p className="login-instruction">Select a simulated Google Account to sign in:</p>
              
              <div className="preset-users">
                <button 
                  className="preset-user-btn glass-card"
                  onClick={() => handleMockLogin({
                    email: 'dr.researcher@aura.org',
                    name: 'Dr. Researcher',
                    role: 'Admin Access',
                    avatarSeed: 'researcher'
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
                    avatarSeed: 'carter'
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
                    avatarSeed: 'guest'
                  })}
                >
                  <div className="user-avatar-mini guest">GR</div>
                  <div className="preset-user-info">
                    <p className="preset-user-name">Guest Researcher</p>
                    <p className="preset-user-email">guest.user@gmail.com</p>
                  </div>
                </button>
              </div>

              <div className="divider-or">
                <span>or enter a custom email</span>
              </div>

              <form onSubmit={handleCustomLogin} className="custom-login-form">
                <input 
                  type="email" 
                  placeholder="name@gmail.com" 
                  required
                  className="custom-login-input glass-card"
                />
                <button type="submit" className="google-sign-in-btn">
                  <GoogleIcon />
                  <span>Sign in with Google</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

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
              <div className="popover-header">
                <h3>{currentUser.role}</h3>
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
            <div className="profile-badge">
              <span className="profile-initials">
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
                className={`comparison-toggle-mini glass-card ${showComparison ? 'active' : ''}`}
                onClick={() => {
                  setShowComparison(!showComparison);
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
                <div className="popover-header">
                  <h3>{currentUser.role}</h3>
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
            <div className="search-container glass-card glow-border">
              {loading ? <Loader2 className="search-icon animate-spin" size={18} /> : <Search className="search-icon" size={18} />}
              <input 
                type="text" 
                placeholder="Search molecular targets, drugs, or clinical trials..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <div className="search-shortcut">⌘ K</div>
            </div>

            {results && (
              <div className="search-results glass-card animate-fade-in">
                {Object.entries(results).map(([type, items]) => (
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
                            setSearchQuery('');
                          }}
                        >
                          <div className="result-item-info">
                            <span className="result-item-name">{item.name}</span>
                            <span className="result-item-details">{item.details}</span>
                          </div>
                          <div className="result-item-actions">
                            <span className="result-item-id">{item.id}</span>
                            <button 
                              className="add-compare-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToComparison(item);
                              }}
                            >
                              + Compare
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          <div className="top-bar-actions">
            {comparisonList.length > 0 && (
              <button 
                className={`comparison-toggle glass-card ${showComparison ? 'active' : ''}`}
                onClick={() => {
                  setShowComparison(!showComparison);
                  setResults(null);
                  setSearchQuery('');
                }}
              >
                <Activity size={18} />
                <span>Compare ({comparisonList.length})</span>
              </button>
            )}
            <button className="icon-button"><Bell size={20} /></button>
            <div className="divider"></div>
            <button className="primary-button">New Analysis</button>
          </div>
        </header>

        <section className="dashboard-grid animate-fade-in">
          {activeView === 'library' && (
            <LibraryView 
              libraryItems={libraryItems} 
              setLibraryItems={setLibraryItems} 
            />
          )}
          {activeView === 'trials' && <TrialsView />}
          {activeView === 'settings' && (
            <SettingsView 
              glassmorphismIntensity={glassmorphismIntensity} 
              setGlassmorphismIntensity={setGlassmorphismIntensity}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          )}
          {activeView === 'contact' && (
            <ContactView />
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
                <button className="back-button" onClick={() => setShowComparison(false)}>
                  Close Comparison
                </button>
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
                      <a 
                        href={`https://google.com/search?q=${selectedItem.id}+${selectedItem.name}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="external-link"
                      >
                        Source Data <ExternalLink size={14} />
                      </a>
                    </div>
                  </header>
                  
                  <div className="detail-content">
                    <div className="detail-info-grid">
                      <div className="info-block">
                        <label>Primary Description</label>
                        <p>{selectedItem.details}</p>
                      </div>
                      <div className="info-block">
                        <label>Status</label>
                        <p className="status-active">Verified Integration</p>
                      </div>
                    </div>

                    <div className="bioactivity-grid">
                      <div className="bio-stat">
                        <span className="bio-label">IC50</span>
                        <span className="bio-value">1.2 nM</span>
                      </div>
                      <div className="bio-stat">
                        <span className="bio-label">Ki</span>
                        <span className="bio-value">0.85 nM</span>
                      </div>
                      <div className="bio-stat">
                        <span className="bio-label">Efficiency</span>
                        <span className="bio-value">0.68</span>
                      </div>
                    </div>
                    
                    <div className="detail-visualizer glass-card">
                      <BindingVisualizer />
                    </div>
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
                {pendingAnalyses.map((analysis) => (
                  <div key={analysis.id} className="pending-item">
                    <div className="pending-info">
                      <span className="pending-category">{analysis.category}</span>
                      <span className="pending-title">{analysis.title}</span>
                    </div>
                    <span className={`pending-status-pill ${analysis.status}`}>
                      {analysis.status === 'simulating' ? 'Simulating...' : analysis.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showGlobalMapModal && (
        <div className="modal-backdrop" onClick={() => setShowGlobalMapModal(false)}>
          <div className="glass-card modal-card" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
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
              <div className="distribution-layout">
                <div className="distribution-panel">
                  <h3>Regional Trial Density</h3>
                  <div className="geo-stat-bar-group">
                    <div className="geo-bar-row">
                      <div className="geo-bar-info">
                        <span className="geo-bar-label">North America</span>
                        <span className="geo-bar-value">42% (511 trials)</span>
                      </div>
                      <div className="geo-bar-track">
                        <div className="geo-bar-fill" style={{ width: '42%' }}></div>
                      </div>
                    </div>
                    
                    <div className="geo-bar-row">
                      <div className="geo-bar-info">
                        <span className="geo-bar-label">Europe</span>
                        <span className="geo-bar-value">31% (377 trials)</span>
                      </div>
                      <div className="geo-bar-track">
                        <div className="geo-bar-fill" style={{ width: '31%' }}></div>
                      </div>
                    </div>
                    
                    <div className="geo-bar-row">
                      <div className="geo-bar-info">
                        <span className="geo-bar-label">East Asia</span>
                        <span className="geo-bar-value">18% (219 trials)</span>
                      </div>
                      <div className="geo-bar-track">
                        <div className="geo-bar-fill" style={{ width: '18%' }}></div>
                      </div>
                    </div>
                    
                    <div className="geo-bar-row">
                      <div className="geo-bar-info">
                        <span className="geo-bar-label">South America</span>
                        <span className="geo-bar-value">5% (61 trials)</span>
                      </div>
                      <div className="geo-bar-track">
                        <div className="geo-bar-fill" style={{ width: '5%' }}></div>
                      </div>
                    </div>

                    <div className="geo-bar-row">
                      <div className="geo-bar-info">
                        <span className="geo-bar-label">Rest of World</span>
                        <span className="geo-bar-value">4% (49 trials)</span>
                      </div>
                      <div className="geo-bar-track">
                        <div className="geo-bar-fill" style={{ width: '4%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="distribution-panel">
                  <h3>Clinical Phase Distribution</h3>
                  <div className="phase-pill-grid">
                    <div className="phase-pill-card">
                      <span className="phase-pill-value">184</span>
                      <span className="phase-pill-label">Phase I</span>
                    </div>
                    <div className="phase-pill-card">
                      <span className="phase-pill-value">425</span>
                      <span className="phase-pill-label">Phase II</span>
                    </div>
                    <div className="phase-pill-card">
                      <span className="phase-pill-value">486</span>
                      <span className="phase-pill-label">Phase III</span>
                    </div>
                    <div className="phase-pill-card">
                      <span className="phase-pill-value">122</span>
                      <span className="phase-pill-label">Phase IV</span>
                    </div>
                  </div>

                  <h3 style={{ marginTop: '16px' }}>Top Contributing Countries</h3>
                  <div className="country-list">
                    <div className="country-row">
                      <span className="country-name">United States</span>
                      <span className="country-count">482 trials</span>
                    </div>
                    <div className="country-row">
                      <span className="country-name">United Kingdom</span>
                      <span className="country-count">120 trials</span>
                    </div>
                    <div className="country-row">
                      <span className="country-name">Germany</span>
                      <span className="country-count">94 trials</span>
                    </div>
                    <div className="country-row">
                      <span className="country-name">Japan</span>
                      <span className="country-count">85 trials</span>
                    </div>
                    <div className="country-row">
                      <span className="country-name">France</span>
                      <span className="country-count">72 trials</span>
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
function LibraryView({ libraryItems, setLibraryItems }) {
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
              onClick={() => setLibraryItems(libraryItems.filter(i => i.id !== item.id))}
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
        <div className="card-header">
          <h3>Active Global Studies</h3>
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
                    <td className="trial-id">{trial.id}</td>
                    <td className="trial-title">{trial.title}</td>
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

function SettingsView({ glassmorphismIntensity, setGlassmorphismIntensity, darkMode, setDarkMode }) {
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
          <div className="source-item"><span>ChEMBL API</span> <span className="status-online">Online</span></div>
          <div className="source-item"><span>UniProt REST</span> <span className="status-online">Online</span></div>
        </div>
      </div>
    </div>
  );
}

function ContactView() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const siteKey = '6Le7rfQsAAAAACumE-xOc-Pz_UGji1uWss4dFfBF';

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

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        setStatus('success');
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
