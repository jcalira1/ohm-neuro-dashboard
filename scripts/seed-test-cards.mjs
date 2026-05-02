import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://pzmppudonakuglgdjzzm.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_Cg1gAH_sDrp0kyqDrflMZg_zkqdn--7'
)

const TEST_CARDS = [
  {
    title: '[TEST] Psilocybin Microdosing RCT Shows Sustained Mood Lift at 12 Weeks',
    brief: 'A randomised controlled trial of 120 adults found that biweekly 0.1 mg/kg psilocybin doses produced significant reductions in PHQ-9 scores at 12 weeks versus placebo. Secondary outcomes included improved sleep quality and reduced rumination. [TEST DATA — DELETE AFTER VERIFICATION]',
    claims: [
      'PHQ-9 scores dropped by 38% versus 12% in the placebo arm',
      'No serious adverse events recorded across 12 weeks of dosing',
      'Effect size was largest in participants with baseline high rumination scores',
    ],
    sources: [{ type: 'peer-reviewed', description: 'Journal of Psychedelic Medicine, Smith et al., 2024' }],
    signal_summary: 'FULL PIECE — strongest RCT evidence yet for microdosing in a treatment-resistant cohort.',
    category: 'Psychedelics & Novel Therapeutics',
    prompt_version: 'v2.0-test',
    source_url: null,
    feed_status: 'in_feed',
  },
  {
    title: '[TEST] GLP-1 Agonists Linked to 22% Reduction in Alzheimer\'s Risk in Diabetic Cohort',
    brief: 'A large retrospective cohort study of 85,000 type-2 diabetics found that GLP-1 receptor agonist users had significantly lower rates of Alzheimer\'s diagnosis over 7 years. Researchers propose neuroinflammation suppression as the likely mechanism. [TEST DATA — DELETE AFTER VERIFICATION]',
    claims: [
      'Hazard ratio for Alzheimer\'s was 0.78 in GLP-1 users versus metformin controls',
      'Effect was consistent across APOE4 carriers and non-carriers',
      'Benefit emerged after 18 months of continuous GLP-1 use',
    ],
    sources: [{ type: 'peer-reviewed', description: 'The Lancet Neurology, Garcia et al., 2024' }],
    signal_summary: 'FULL PIECE — GLP-1 brain effects are a major emerging story worth a dedicated explainer.',
    category: 'Emerging & Frontier',
    prompt_version: 'v2.0-test',
    source_url: null,
    feed_status: 'in_feed',
  },
  {
    title: '[TEST] Six Weeks of Resistance Training Reverses Cortical Thinning in Adults Over 60',
    brief: 'MRI analysis of 64 older adults enrolled in a progressive resistance programme showed significant increases in prefrontal cortical thickness after 6 weeks. The effect correlated with BDNF serum levels, implicating the BDNF-TrkB pathway in exercise-induced neuroplasticity. [TEST DATA — DELETE AFTER VERIFICATION]',
    claims: [
      'Prefrontal cortical thickness increased by 2.1% on average in the training group',
      'BDNF levels rose 31% versus 4% in sedentary controls',
      'Cognitive gains were largest on working memory tasks',
    ],
    sources: [{ type: 'peer-reviewed', description: 'Neurobiology of Aging, Tanaka et al., 2024' }],
    signal_summary: 'SUPPORTING REFERENCE — good supporting data for a broader exercise-and-brain piece.',
    category: 'Lifestyle, Systems & Optimization',
    prompt_version: 'v2.0-test',
    source_url: null,
    feed_status: 'in_feed',
  },
  {
    title: '[TEST] Sleep-Spindle Density Predicts Next-Day Emotional Regulation Capacity',
    brief: 'Overnight polysomnography in 48 healthy adults revealed that NREM sleep-spindle density in the frontal leads was the strongest predictor of next-morning emotional regulation scores — outperforming total sleep time and REM percentage. [TEST DATA — DELETE AFTER VERIFICATION]',
    claims: [
      'Each 1 Hz increase in spindle density correlated with a 0.4 SD improvement on the DERS',
      'Spindle density explained 34% of variance in next-day affect scores',
      'The effect was independent of subjective sleep quality ratings',
    ],
    sources: [{ type: 'peer-reviewed', description: 'Sleep, Okonkwo et al., 2024' }],
    signal_summary: 'FULL PIECE — fresh mechanistic angle on sleep quality beyond the usual "get 8 hours" narrative.',
    category: 'Clinical & Psychiatric',
    prompt_version: 'v2.0-test',
    source_url: null,
    feed_status: 'in_feed',
  },
  {
    title: '[TEST] Vagus Nerve Stimulation Paired with Cognitive Training Accelerates Stroke Recovery',
    brief: 'A phase-II RCT pairing transcutaneous auricular VNS with daily cognitive rehab in 56 post-stroke patients showed 2.4× faster recovery on the NIHSS versus rehab alone at 90 days. The authors propose VNS-driven norepinephrine release gates cortical plasticity windows. [TEST DATA — DELETE AFTER VERIFICATION]',
    claims: [
      'NIHSS improvement was 14.2 points in the VNS group versus 5.9 in controls at 90 days',
      'Working memory and attention subscores drove most of the composite benefit',
      'No serious device-related adverse events were observed',
    ],
    sources: [{ type: 'peer-reviewed', description: 'JAMA Neurology, Patel et al., 2024' }],
    signal_summary: 'FULL PIECE — VNS + rehab is a compelling intervention story with strong clinical implications.',
    category: 'Intervention & Neuromodulation',
    prompt_version: 'v2.0-test',
    source_url: null,
    feed_status: 'in_feed',
  },
]

const { data, error } = await supabase.from('topic_cards').insert(TEST_CARDS).select('id, title')

if (error) {
  console.error('Insert failed:', error.message)
  process.exit(1)
}

console.log('Inserted test cards:')
data.forEach(r => console.log(` ${r.id}  ${r.title.slice(0, 60)}`))
