/**
 * Project AURA - Unified API Bridge
 * Integrates multiple biomedical data sources.
 */

const CHEMBL_BASE = 'https://www.ebi.ac.uk/chembl/api/data';
const UNIPROT_BASE = 'https://rest.uniprot.org/uniprotkb';
const CLINICAL_TRIALS_BASE = 'https://clinicaltrials.gov/api/v2/studies';

export const searchBiomedicalData = async (query) => {
  if (!query || query.length < 3) return { drugs: [], proteins: [], trials: [] };

  try {
    // We run searches in parallel for maximum performance
    const [drugs, proteins, trials] = await Promise.all([
      searchDrugs(query),
      searchProteins(query),
      searchTrials(query)
    ]);

    return { drugs, proteins, trials };
  } catch (error) {
    console.error('Search failed:', error);
    return { drugs: [], proteins: [], trials: [] };
  }
};

async function searchDrugs(query) {
  try {
    const response = await fetch(`${CHEMBL_BASE}/molecule/search?q=${query}&format=json&limit=5`);
    const data = await response.json();
    return data.molecules.map(m => ({
      id: m.molecule_chembl_id,
      name: m.pref_name || m.molecule_synonyms?.[0]?.molecule_synonym || 'Unnamed Molecule',
      type: 'Drug/Compound',
      details: m.molecule_type
    }));
  } catch { return []; }
}

async function searchProteins(query) {
  try {
    const response = await fetch(`${UNIPROT_BASE}/search?query=${query}&format=json&size=5`);
    const data = await response.json();
    return data.results.map(r => ({
      id: r.primaryAccession,
      name: r.genes?.[0]?.geneName?.value || 'Unknown Gene',
      type: 'Protein',
      details: r.proteinDescription?.recommendedName?.fullName?.value || ''
    }));
  } catch { return []; }
}

async function searchTrials(query) {
  try {
    const response = await fetch(`${CLINICAL_TRIALS_BASE}?query.term=${query}&pageSize=5`);
    const data = await response.json();
    return data.studies.map(s => ({
      id: s.protocolSection.identificationModule.nctId,
      name: s.protocolSection.identificationModule.briefTitle,
      type: 'Clinical Trial',
      details: s.protocolSection.statusModule.overallStatus
    }));
  } catch { return []; }
}

export const fetchRecentTrials = async () => {
  try {
    const response = await fetch(`${CLINICAL_TRIALS_BASE}?pageSize=10`);
    const data = await response.json();
    const studies = data.studies || [];
    return studies.map(s => ({
      id: s.protocolSection?.identificationModule?.nctId || 'N/A',
      title: s.protocolSection?.identificationModule?.briefTitle || 'Untitled Study',
      status: s.protocolSection?.statusModule?.overallStatus || 'Unknown',
      phase: s.protocolSection?.designModule?.phases?.[0] || 'N/A',
      sponsor: s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || 'Unknown Sponsor'
    }));
  } catch (error) {
    console.error('Failed to fetch trials:', error);
    return [];
  }
};
