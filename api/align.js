export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET: Check job status OR get alignment results
  if (req.method === 'GET') {
    const { jobId, result } = req.query;

    if (!jobId) {
      return res.status(400).json({ status: 'error', message: 'Missing jobId parameter' });
    }

    try {
      if (result === 'true') {
        // Fetch alignment result
        const resultUrl = `https://www.ebi.ac.uk/Tools/services/rest/clustalo/result/${jobId}/aln-clustal_num`;
        const resultRes = await fetch(resultUrl);

        if (!resultRes.ok) {
          const errText = await resultRes.text();
          throw new Error(`Failed to retrieve results: ${resultRes.status} ${errText}`);
        }

        const alignment = await resultRes.text();
        return res.status(200).json({ status: 'success', alignment });
      } else {
        // Fetch job status
        const statusUrl = `https://www.ebi.ac.uk/Tools/services/rest/clustalo/status/${jobId}`;
        const statusRes = await fetch(statusUrl);

        if (!statusRes.ok) {
          throw new Error(`Failed to check status: ${statusRes.status}`);
        }

        const rawStatus = (await statusRes.text()).trim().toUpperCase();
        
        // Map raw EBI statuses to clean frontend statuses: 'queued' | 'running' | 'completed' | 'failed'
        let jobStatus = 'running';
        if (rawStatus === 'FINISHED') {
          jobStatus = 'completed';
        } else if (rawStatus === 'QUEUED') {
          jobStatus = 'queued';
        } else if (rawStatus === 'RUNNING') {
          jobStatus = 'running';
        } else if (rawStatus === 'ERROR' || rawStatus === 'FAILURE' || rawStatus === 'NOT_FOUND') {
          jobStatus = 'failed';
        } else {
          jobStatus = rawStatus.toLowerCase();
        }

        return res.status(200).json({ status: 'success', jobStatus });
      }
    } catch (error) {
      console.error('Error fetching alignment details:', error);
      return res.status(500).json({ status: 'error', message: error.message || 'Internal Server Error' });
    }
  }

  // POST: Submit a new alignment job
  if (req.method === 'POST') {
    try {
      const { accessions } = req.body;

      if (!accessions || !Array.isArray(accessions) || accessions.length < 2) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide at least 2 protein accession numbers to align.'
        });
      }

      console.log(`[Align] Fetching sequences from UniProt for: ${accessions.join(', ')}`);
      
      // Fetch FASTA sequences from UniProt
      const sequences = await Promise.all(
        accessions.map(async (acc) => {
          const cleanAcc = acc.trim();
          const uniProtUrl = `https://rest.uniprot.org/uniprotkb/${cleanAcc}.fasta`;
          const response = await fetch(uniProtUrl);
          
          if (!response.ok) {
            throw new Error(`Protein accession '${cleanAcc}' not found or invalid in UniProt.`);
          }
          
          const text = await response.text();
          if (!text.trim()) {
            throw new Error(`Empty sequence returned for protein ${cleanAcc}.`);
          }
          
          return text.trim();
        })
      );

      const combinedFasta = sequences.join('\n\n');

      console.log('[Align] Submitting combined FASTA sequence to EMBL-EBI...');

      const params = new URLSearchParams();
      params.append('email', 'lab@redplanetapps.com');
      params.append('stype', 'protein');
      params.append('sequence', combinedFasta);

      const runRes = await fetch('https://www.ebi.ac.uk/Tools/services/rest/clustalo/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!runRes.ok) {
        const errText = await runRes.text();
        throw new Error(`EMBL-EBI submission failed: ${runRes.status} ${errText}`);
      }

      const jobId = (await runRes.text()).trim();
      console.log(`[Align] EMBL-EBI Job submitted successfully. Job ID: ${jobId}`);

      return res.status(200).json({
        status: 'success',
        jobId,
        message: 'Multiple Sequence Alignment job submitted successfully to EMBL-EBI.'
      });

    } catch (error) {
      console.error('Error submitting alignment job:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Internal Server Error'
      });
    }
  }

  return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
}
