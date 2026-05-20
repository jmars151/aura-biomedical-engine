import { useState, useEffect } from 'react';
import { Search, LayoutDashboard, Database, Activity, Settings, User, Bell, ChevronRight, FlaskConical, Loader2, ExternalLink, Menu, X } from 'lucide-react';
import { searchBiomedicalData, fetchRecentTrials } from './api';
import InteractionMap from './InteractionMap';
import BindingVisualizer from './BindingVisualizer';
import './App.css';
import './DetailView.css';
import './InteractionMap.css';
import './BindingVisualizer.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [comparisonList, setComparisonList] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div className="logo-wrapper">
            <FlaskConical className="logo-icon" />
            <span className="logo-text">AURA</span>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
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
        </nav>

        <div className="profile-wrapper">
          {showProfile && (
            <div className="profile-popover glass-card animate-fade-in">
              <div className="popover-header">
                <h3>Admin Settings</h3>
              </div>
              <div className="popover-content">
                <div className="popover-item"><Settings size={14} /> Account Settings</div>
                <div className="popover-item"><FlaskConical size={14} /> My Experiments</div>
                <div className="divider"></div>
                <div className="popover-item logout">Log Out</div>
              </div>
            </div>
          )}
          <div className="profile-section" onClick={() => setShowProfile(!showProfile)}>
            <div className="profile-badge">
              <User size={18} />
            </div>
            <div className="profile-info">
              <p className="profile-name">Dr. Researcher</p>
              <p className="profile-role">Admin Access</p>
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
          <div className="mobile-logo">
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
              <User size={18} />
            </div>
            {showProfile && (
              <div className="profile-popover glass-card mobile-popover animate-fade-in">
                <div className="popover-header">
                  <h3>Admin Settings</h3>
                </div>
                <div className="popover-content">
                  <div className="popover-item"><Settings size={14} /> Account Settings</div>
                  <div className="popover-item"><FlaskConical size={14} /> My Experiments</div>
                  <div className="divider"></div>
                  <div className="popover-item logout">Log Out</div>
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
          {activeView === 'library' && <LibraryView />}
          {activeView === 'trials' && <TrialsView />}
          {activeView === 'settings' && <SettingsView />}
          
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
            <div className="date-display">May 19, 2026</div>
          </header>

          <div className="stats-row">
            <StatCard label="Active Trials" value="1,284" change="+12%" />
            <StatCard label="Molecules Indexed" value="84.2k" />
            <StatCard label="Pending Analysis" value="12" alert />
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
                  <div className="card-header">
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
                <InsightItem 
                  title="Phase III Completion" 
                  desc="Imatinib derivative shows 15% better affinity."
                  time="2h ago"
                />
                <InsightItem 
                  title="Genomic Update" 
                  desc="BRCA1 variant classification updated to Pathogenic."
                  time="5h ago"
                />
                <InsightItem 
                  title="New Molecule" 
                  desc="AURA-928 added to screening library."
                  time="1d ago"
                />
              </div>
            </div>
          </div>
        </>
          )
        )}
        </section>
      </main>
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

function StatCard({ label, value, change, alert = false }) {
  return (
    <div className="glass-card stat-card">
      <p className="stat-label">{label}</p>
      <div className="stat-value-container">
        <span className="stat-value">{value}</span>
        {change && <span className="stat-change">{change}</span>}
        {alert && <span className="stat-alert-dot"></span>}
      </div>
    </div>
  );
}

function InsightItem({ title, desc, time }) {
  return (
    <div className="insight-item">
      <div className="insight-content">
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>
      <span className="insight-time">{time}</span>
    </div>
  );
}

export default App;
function LibraryView() {
  const suggestions = [
    { name: 'Imatinib', id: 'CHEMBL941', type: 'Drug', status: 'Approved' },
    { name: 'Aspirin', id: 'CHEMBL25', type: 'Drug', status: 'Approved' },
    { name: 'BRCA1', id: 'P38398', type: 'Protein', status: 'Active' }
  ];

  return (
    <div className="secondary-view animate-fade-in">
      <header className="section-header">
        <div>
          <h1>Molecular Library</h1>
          <p className="subtitle">Manage your saved targets and compounds</p>
        </div>
      </header>
      <div className="library-grid">
        {suggestions.map((item) => (
          <div key={item.id} className="glass-card library-card">
            <span className="badge">{item.type}</span>
            <h3>{item.name}</h3>
            <p className="id-tag">{item.id}</p>
            <div className="card-footer">
              <span className="status-online">{item.status}</span>
              <ChevronRight size={14} />
            </div>
          </div>
        ))}
        <div className="glass-card add-more-card">
          <div className="plus-icon">+</div>
          <p>Add Target</p>
        </div>
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

function SettingsView() {
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
            <span>Dark Mode (Always On)</span>
            <div className="toggle active"></div>
          </div>
          <div className="setting-row">
            <span>Glassmorphism Intensity</span>
            <input type="range" readOnly value="80" />
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
