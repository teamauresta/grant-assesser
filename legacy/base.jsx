import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Check, X, AlertTriangle, Target, Calendar, DollarSign, Building2, Sparkles, FileCheck, ArrowRight, ExternalLink, Clock, Users, Lightbulb, TrendingUp, Award, MapPin } from 'lucide-react';

// Program Data
const PROGRAMS = {
  rdti: {
    name: "R&D Tax Incentive",
    shortName: "RDTI",
    funding: "43.5% refundable offset",
    range: "$50K - $500K+ annually",
    effort: "20-40 hours setup",
    timeline: "10 months after FY end",
    score: 23,
    color: "#059669",
    icon: "💰",
    requirements: ['australian_company', 'rd_spend_20k', 'experimental_activities', 'documented_hypothesis'],
    description: "Cash back on qualifying R&D expenditure. Essential for any AI startup doing genuine research."
  },
  igp: {
    name: "Industry Growth Program",
    shortName: "IGP",
    funding: "50% matched funding",
    range: "$50K - $5M",
    effort: "40-80 hours",
    timeline: "Rolling applications",
    score: 21,
    color: "#0891b2",
    icon: "🚀",
    requirements: ['australian_company', 'turnover_under_20m', 'innovative_product', 'nrf_alignment'],
    description: "Two-stage program: Free Advisory Services, then grant funding for commercialization."
  },
  csiro: {
    name: "CSIRO Kick-Start",
    shortName: "CSIRO",
    funding: "1:1 matched",
    range: "$10K - $50K",
    effort: "15-30 hours",
    timeline: "Year-round, non-competitive",
    score: 20,
    color: "#7c3aed",
    icon: "🔬",
    requirements: ['australian_company', 'turnover_under_10m_or_under_3yrs', 'can_match_funding', 'technical_challenge'],
    description: "Access CSIRO researchers and 'CSIRO-backed' credibility. High success rate."
  },
  crcp: {
    name: "CRC-P Grants",
    shortName: "CRC-P",
    funding: "1:1 matched",
    range: "$100K - $3M",
    effort: "100-200+ hours",
    timeline: "Round 18 late 2025",
    score: 19,
    color: "#dc2626",
    icon: "🤝",
    requirements: ['australian_company', 'research_partner', 'industry_partners', 'significant_project'],
    description: "Collaborative research grants requiring university + industry partners."
  },
  emdg: {
    name: "Export Market Development",
    shortName: "EMDG",
    funding: "50% reimbursement",
    range: "$20K - $80K/year",
    effort: "20-40 hours",
    timeline: "Round 5 TBD",
    score: 18,
    color: "#ea580c",
    icon: "🌏",
    requirements: ['australian_company', 'turnover_under_20m', 'export_ready', 'marketing_spend_20k'],
    description: "Reimbursement for export marketing activities. Up to 8 years eligibility."
  },
  accelerator: {
    name: "Startup Accelerators",
    shortName: "Accelerators",
    funding: "Equity investment",
    range: "$75K - $120K",
    effort: "Application + 12 weeks",
    timeline: "Cohort-based",
    score: 17,
    color: "#be185d",
    icon: "⚡",
    requirements: ['australian_company', 'early_stage', 'coachable_team', 'scalable_model'],
    description: "Startmate, Google AI First, MAP - mentorship, network, and investment."
  }
};

// Assessment Questions
const ASSESSMENT_QUESTIONS = [
  {
    id: 'company_stage',
    category: 'Company Profile',
    question: 'What stage is your company at?',
    type: 'single',
    options: [
      { value: 'idea', label: 'Idea Stage', description: 'Concept only, no product yet' },
      { value: 'mvp', label: 'MVP/Prototype', description: 'Working prototype or early product' },
      { value: 'early_revenue', label: 'Early Revenue', description: 'Some customers, <$500K revenue' },
      { value: 'growth', label: 'Growth Stage', description: '$500K+ revenue, scaling' }
    ]
  },
  {
    id: 'australian_company',
    category: 'Company Profile',
    question: 'Is your company registered in Australia with an ACN?',
    type: 'boolean',
    required: true
  },
  {
    id: 'turnover',
    category: 'Company Profile',
    question: 'What is your annual turnover?',
    type: 'single',
    options: [
      { value: 'under_1m', label: 'Under $1M' },
      { value: '1m_to_10m', label: '$1M - $10M' },
      { value: '10m_to_20m', label: '$10M - $20M' },
      { value: 'over_20m', label: 'Over $20M' }
    ]
  },
  {
    id: 'years_operating',
    category: 'Company Profile',
    question: 'How long has your company been operating?',
    type: 'single',
    options: [
      { value: 'under_1', label: 'Less than 1 year' },
      { value: '1_to_3', label: '1-3 years' },
      { value: 'over_3', label: 'More than 3 years' }
    ]
  },
  {
    id: 'location',
    category: 'Company Profile',
    question: 'Where is your company primarily based?',
    type: 'single',
    options: [
      { value: 'vic', label: 'Victoria' },
      { value: 'nsw', label: 'New South Wales' },
      { value: 'qld', label: 'Queensland' },
      { value: 'other', label: 'Other Australian state/territory' }
    ]
  },
  {
    id: 'rd_activities',
    category: 'R&D Activities',
    question: 'Does your work involve experimental activities with uncertain outcomes?',
    type: 'boolean',
    help: 'Activities where you don\'t know if the outcome will work, involving technical uncertainty'
  },
  {
    id: 'rd_spend',
    category: 'R&D Activities',
    question: 'What is your estimated annual R&D spending?',
    type: 'single',
    options: [
      { value: 'under_20k', label: 'Under $20K' },
      { value: '20k_to_100k', label: '$20K - $100K' },
      { value: '100k_to_500k', label: '$100K - $500K' },
      { value: 'over_500k', label: 'Over $500K' }
    ]
  },
  {
    id: 'hypothesis_documentation',
    category: 'R&D Activities',
    question: 'Do you document hypotheses BEFORE conducting experiments?',
    type: 'boolean',
    help: 'Critical for R&D Tax claims - must have dated records showing hypothesis before work'
  },
  {
    id: 'ai_focus',
    category: 'Technology',
    question: 'What AI/ML activities are you engaged in?',
    type: 'multi',
    options: [
      { value: 'model_development', label: 'Novel model/algorithm development' },
      { value: 'fine_tuning', label: 'Fine-tuning models for new applications' },
      { value: 'integration', label: 'AI system integration' },
      { value: 'api_usage', label: 'Using AI APIs (OpenAI, Claude, etc.)' },
      { value: 'none', label: 'No AI/ML focus' }
    ]
  },
  {
    id: 'nrf_sector',
    category: 'Technology',
    question: 'Which National Reconstruction Fund priority areas align with your work?',
    type: 'multi',
    options: [
      { value: 'medical', label: 'Medical science & health tech' },
      { value: 'renewables', label: 'Renewables & low emission tech' },
      { value: 'manufacturing', label: 'Advanced manufacturing' },
      { value: 'agriculture', label: 'Agriculture value-add' },
      { value: 'defence', label: 'Defence capability' },
      { value: 'enabling', label: 'Enabling capabilities (software/AI)' },
      { value: 'none', label: 'None of the above' }
    ]
  },
  {
    id: 'research_partnerships',
    category: 'Partnerships',
    question: 'Do you have existing relationships with research institutions?',
    type: 'single',
    options: [
      { value: 'none', label: 'No existing relationships' },
      { value: 'informal', label: 'Informal connections only' },
      { value: 'active', label: 'Active collaboration discussions' },
      { value: 'formal', label: 'Formal research partnership in place' }
    ]
  },
  {
    id: 'industry_partners',
    category: 'Partnerships',
    question: 'Do you have industry partners (other companies) for collaborative projects?',
    type: 'boolean'
  },
  {
    id: 'export_plans',
    category: 'Market',
    question: 'Are you planning to export or expand internationally?',
    type: 'single',
    options: [
      { value: 'no', label: 'No international plans' },
      { value: 'considering', label: 'Considering but not active' },
      { value: 'planning', label: 'Actively planning export strategy' },
      { value: 'exporting', label: 'Already exporting' }
    ]
  },
  {
    id: 'market_validation',
    category: 'Market',
    question: 'What level of market validation do you have?',
    type: 'single',
    options: [
      { value: 'none', label: 'No validation yet' },
      { value: 'interviews', label: 'Customer interviews only' },
      { value: 'pilots', label: 'Pilot customers or trials' },
      { value: 'revenue', label: 'Paying customers' }
    ]
  },
  {
    id: 'cofunding_capacity',
    category: 'Financial',
    question: 'Can you provide matched co-funding for grants?',
    type: 'single',
    options: [
      { value: 'none', label: 'No co-funding capacity' },
      { value: 'up_to_50k', label: 'Up to $50K' },
      { value: '50k_to_250k', label: '$50K - $250K' },
      { value: 'over_250k', label: 'Over $250K' }
    ]
  },
  {
    id: 'financial_records',
    category: 'Financial',
    question: 'Do you have audited/reviewed financial statements?',
    type: 'boolean'
  },
  {
    id: 'team_capacity',
    category: 'Team',
    question: 'What is your team\'s capacity for grant applications?',
    type: 'single',
    options: [
      { value: 'minimal', label: 'Minimal - founders stretched thin' },
      { value: 'moderate', label: 'Moderate - some bandwidth available' },
      { value: 'dedicated', label: 'Can dedicate significant time' },
      { value: 'resourced', label: 'Have dedicated grants/finance person' }
    ]
  },
  {
    id: 'timeline_urgency',
    category: 'Team',
    question: 'How urgent is your funding need?',
    type: 'single',
    options: [
      { value: 'immediate', label: 'Immediate (0-3 months)' },
      { value: 'soon', label: 'Soon (3-6 months)' },
      { value: 'planned', label: 'Planned (6-12 months)' },
      { value: 'opportunistic', label: 'Opportunistic - no urgency' }
    ]
  }
];

// Readiness Checklist Items
const READINESS_ITEMS = [
  { id: 'acn', category: 'Corporate', label: 'Australian Company Number (ACN)', critical: true },
  { id: 'abn', category: 'Corporate', label: 'Valid ABN', critical: true },
  { id: 'gst', category: 'Corporate', label: 'GST Registered', critical: true },
  { id: 'tax_compliance', category: 'Corporate', label: '2+ years tax compliance', critical: false },
  { id: 'financials', category: 'Financial', label: '3 years financial statements', critical: false },
  { id: 'accountant_letter', category: 'Financial', label: 'Accountant confirmation letter', critical: false },
  { id: 'bank_statements', category: 'Financial', label: 'Recent bank statements', critical: false },
  { id: 'ip_ownership', category: 'IP/Technical', label: 'Clear IP ownership documentation', critical: true },
  { id: 'rd_logs', category: 'IP/Technical', label: 'R&D experiment logs with dates', critical: true },
  { id: 'code_repos', category: 'IP/Technical', label: 'Version-controlled code repositories', critical: false },
  { id: 'trl_assessment', category: 'IP/Technical', label: 'Technology Readiness Level assessment', critical: false },
  { id: 'plan_to_market', category: 'Commercial', label: 'Plan to market document', critical: true },
  { id: 'loi', category: 'Commercial', label: 'Letters of Intent/Support', critical: false },
  { id: 'pilot_agreements', category: 'Commercial', label: 'Pilot agreements/MoUs', critical: false },
  { id: 'partner_letters', category: 'Partners', label: 'Partner commitment letters', critical: false },
  { id: 'research_mou', category: 'Partners', label: 'Research institution MoU', critical: false }
];

export default function GrantsAssessmentTool() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [readiness, setReadiness] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState('assessment');
  const [animateIn, setAnimateIn] = useState(true);

  const steps = ['profile', 'rd', 'tech', 'partnerships', 'market', 'financial', 'team', 'readiness'];
  const stepLabels = ['Company Profile', 'R&D Activities', 'Technology', 'Partnerships', 'Market', 'Financial', 'Team', 'Readiness'];

  const getQuestionsForStep = (stepIndex) => {
    const categories = ['Company Profile', 'R&D Activities', 'Technology', 'Partnerships', 'Market', 'Financial', 'Team'];
    if (stepIndex < categories.length) {
      return ASSESSMENT_QUESTIONS.filter(q => q.category === categories[stepIndex]);
    }
    return [];
  };

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiAnswer = (questionId, value) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (current.includes(value)) {
        return { ...prev, [questionId]: current.filter(v => v !== value) };
      }
      return { ...prev, [questionId]: [...current, value] };
    });
  };

  const handleReadiness = (itemId, checked) => {
    setReadiness(prev => ({ ...prev, [itemId]: checked }));
  };

  const nextStep = () => {
    setAnimateIn(false);
    setTimeout(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        setShowResults(true);
      }
      setAnimateIn(true);
    }, 200);
  };

  const prevStep = () => {
    setAnimateIn(false);
    setTimeout(() => {
      if (currentStep > 0) {
        setCurrentStep(prev => prev - 1);
      }
      setAnimateIn(true);
    }, 200);
  };

  // Calculate eligibility scores
  const calculateEligibility = () => {
    const results = {};
    
    // R&D Tax Incentive
    results.rdti = {
      eligible: answers.australian_company === true && 
                answers.rd_spend !== 'under_20k' &&
                answers.rd_activities === true,
      score: 0,
      reasons: [],
      warnings: []
    };
    if (!answers.australian_company) results.rdti.reasons.push('Must be Australian company');
    if (answers.rd_spend === 'under_20k') results.rdti.reasons.push('Minimum $20K R&D spend required');
    if (!answers.rd_activities) results.rdti.reasons.push('Must have experimental activities');
    if (!answers.hypothesis_documentation) results.rdti.warnings.push('⚠️ Start documenting hypotheses BEFORE experiments');
    if (results.rdti.eligible) {
      results.rdti.score = answers.rd_spend === 'over_500k' ? 95 : answers.rd_spend === '100k_to_500k' ? 85 : 70;
      if (answers.hypothesis_documentation) results.rdti.score += 5;
    }

    // IGP
    results.igp = {
      eligible: answers.australian_company === true &&
                answers.turnover !== 'over_20m' &&
                (answers.nrf_sector || []).length > 0 &&
                !(answers.nrf_sector || []).includes('none'),
      score: 0,
      reasons: [],
      warnings: []
    };
    if (!answers.australian_company) results.igp.reasons.push('Must be Australian company');
    if (answers.turnover === 'over_20m') results.igp.reasons.push('Turnover must be under $20M');
    if ((answers.nrf_sector || []).length === 0 || (answers.nrf_sector || []).includes('none')) {
      results.igp.reasons.push('Must align with NRF priority areas');
    }
    if (results.igp.eligible) {
      results.igp.score = 60;
      if (answers.market_validation === 'revenue') results.igp.score += 20;
      else if (answers.market_validation === 'pilots') results.igp.score += 10;
      if ((answers.nrf_sector || []).length > 1) results.igp.score += 10;
      if (answers.cofunding_capacity !== 'none') results.igp.score += 10;
    }

    // CSIRO Kick-Start
    results.csiro = {
      eligible: answers.australian_company === true &&
                (answers.turnover === 'under_1m' || answers.turnover === '1m_to_10m' || answers.years_operating !== 'over_3'),
      score: 0,
      reasons: [],
      warnings: []
    };
    if (!answers.australian_company) results.csiro.reasons.push('Must be Australian company');
    if (answers.turnover === 'over_20m' || answers.turnover === '10m_to_20m') {
      if (answers.years_operating === 'over_3') {
        results.csiro.reasons.push('Turnover must be <$10M OR operating <3 years');
      }
    }
    if (results.csiro.eligible) {
      results.csiro.score = 75;
      if (answers.cofunding_capacity !== 'none') results.csiro.score += 15;
      if (answers.rd_activities) results.csiro.score += 10;
    }

    // CRC-P
    results.crcp = {
      eligible: answers.australian_company === true &&
                (answers.research_partnerships === 'active' || answers.research_partnerships === 'formal') &&
                answers.industry_partners === true,
      score: 0,
      reasons: [],
      warnings: []
    };
    if (!answers.australian_company) results.crcp.reasons.push('Must be Australian company');
    if (answers.research_partnerships !== 'active' && answers.research_partnerships !== 'formal') {
      results.crcp.reasons.push('Requires research institution partner');
    }
    if (!answers.industry_partners) results.crcp.reasons.push('Requires 2+ industry partners');
    if (answers.team_capacity === 'minimal') results.crcp.warnings.push('⚠️ CRC-P requires 100-200+ hours - consider team capacity');
    if (results.crcp.eligible) {
      results.crcp.score = 60;
      if (answers.research_partnerships === 'formal') results.crcp.score += 20;
      if (answers.cofunding_capacity === 'over_250k') results.crcp.score += 20;
    }

    // EMDG
    results.emdg = {
      eligible: answers.australian_company === true &&
                answers.turnover !== 'over_20m' &&
                (answers.export_plans === 'planning' || answers.export_plans === 'exporting'),
      score: 0,
      reasons: [],
      warnings: []
    };
    if (!answers.australian_company) results.emdg.reasons.push('Must be Australian company');
    if (answers.turnover === 'over_20m') results.emdg.reasons.push('Turnover must be under $20M');
    if (answers.export_plans !== 'planning' && answers.export_plans !== 'exporting') {
      results.emdg.reasons.push('Must be actively planning/executing export');
    }
    if (results.emdg.eligible) {
      results.emdg.score = answers.export_plans === 'exporting' ? 85 : 65;
      if (answers.cofunding_capacity !== 'none') results.emdg.score += 10;
    }

    // Accelerators
    results.accelerator = {
      eligible: answers.australian_company === true &&
                (answers.company_stage === 'mvp' || answers.company_stage === 'early_revenue'),
      score: 0,
      reasons: [],
      warnings: []
    };
    if (!answers.australian_company) results.accelerator.reasons.push('Must be Australian company');
    if (answers.company_stage === 'idea') results.accelerator.reasons.push('Most accelerators prefer MVP stage');
    if (answers.company_stage === 'growth') results.accelerator.reasons.push('May be too advanced for accelerators');
    if (results.accelerator.eligible) {
      results.accelerator.score = 70;
      if (answers.market_validation === 'pilots' || answers.market_validation === 'revenue') results.accelerator.score += 15;
      if ((answers.ai_focus || []).includes('model_development') || (answers.ai_focus || []).includes('fine_tuning')) results.accelerator.score += 15;
    }

    return results;
  };

  // Generate action plan
  const generateActionPlan = (eligibility) => {
    const actions = {
      immediate: [],
      shortTerm: [],
      mediumTerm: []
    };

    // Immediate (Days 1-30)
    if (eligibility.rdti.eligible) {
      actions.immediate.push({
        program: 'R&D Tax Incentive',
        action: 'Engage R&D tax specialist for initial assessment',
        priority: 'High',
        effort: '2-4 hours',
        outcome: 'Understand potential claim value'
      });
      if (!answers.hypothesis_documentation) {
        actions.immediate.push({
          program: 'R&D Tax Incentive',
          action: 'Set up R&D documentation system (Jira/Notion + Git)',
          priority: 'Critical',
          effort: '4-8 hours',
          outcome: 'Compliant record-keeping for claims'
        });
      }
    }

    if (eligibility.igp.eligible) {
      actions.immediate.push({
        program: 'Industry Growth Program',
        action: 'Apply for FREE IGP Advisory Services via business.gov.au',
        priority: 'High',
        effort: '2-3 hours',
        outcome: 'Independent expert advice + pathway to grants'
      });
    }

    if (eligibility.csiro.eligible && answers.cofunding_capacity !== 'none') {
      actions.immediate.push({
        program: 'CSIRO Kick-Start',
        action: 'Submit Expression of Interest to CSIRO Kick-Start',
        priority: 'High',
        effort: '3-5 hours',
        outcome: 'Access to CSIRO researchers + credibility signal'
      });
    }

    // Short-term (Days 31-60)
    if (eligibility.igp.eligible) {
      actions.shortTerm.push({
        program: 'Industry Growth Program',
        action: 'Complete IGP Advisory engagement',
        priority: 'High',
        effort: '10-15 hours',
        outcome: 'Advisory Report for grant application'
      });
    }

    if (eligibility.csiro.eligible) {
      actions.shortTerm.push({
        program: 'CSIRO Kick-Start',
        action: 'Develop full CSIRO Kick-Start application with facilitator',
        priority: 'Medium',
        effort: '10-15 hours',
        outcome: 'Matched funding + research collaboration'
      });
    }

    if (eligibility.crcp.eligible) {
      actions.shortTerm.push({
        program: 'CRC-P Grants',
        action: 'Formalize research partner relationships',
        priority: 'Medium',
        effort: '15-20 hours',
        outcome: 'Partner commitments for Round 18'
      });
    }

    // Medium-term (Days 61-90)
    if (eligibility.igp.eligible && eligibility.igp.score >= 70) {
      actions.mediumTerm.push({
        program: 'Industry Growth Program',
        action: 'Submit IGP grant application',
        priority: 'High',
        effort: '30-50 hours',
        outcome: 'Up to $5M matched funding'
      });
    }

    if (eligibility.emdg.eligible) {
      actions.mediumTerm.push({
        program: 'EMDG',
        action: 'Prepare EMDG Round 5 application materials',
        priority: 'Medium',
        effort: '15-20 hours',
        outcome: 'Up to $80K/year export reimbursement'
      });
    }

    if (eligibility.accelerator.eligible && answers.timeline_urgency === 'immediate') {
      actions.mediumTerm.push({
        program: 'Accelerators',
        action: 'Apply to Startmate/Google AI First next cohort',
        priority: 'Medium',
        effort: '10-15 hours',
        outcome: '$75-120K investment + network access'
      });
    }

    return actions;
  };

  const eligibility = calculateEligibility();
  const actionPlan = generateActionPlan(eligibility);

  const getReadinessScore = () => {
    const total = READINESS_ITEMS.length;
    const checked = Object.values(readiness).filter(Boolean).length;
    return Math.round((checked / total) * 100);
  };

  const getCriticalReadiness = () => {
    const critical = READINESS_ITEMS.filter(i => i.critical);
    const checkedCritical = critical.filter(i => readiness[i.id]).length;
    return { checked: checkedCritical, total: critical.length };
  };

  const renderQuestion = (question) => {
    if (question.type === 'boolean') {
      return (
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => handleAnswer(question.id, true)}
            className={`flex-1 p-4 rounded-xl border-2 transition-all duration-300 ${
              answers[question.id] === true 
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                : 'border-slate-700 hover:border-slate-500'
            }`}
          >
            <Check className="w-5 h-5 mx-auto mb-2" />
            <span className="font-medium">Yes</span>
          </button>
          <button
            onClick={() => handleAnswer(question.id, false)}
            className={`flex-1 p-4 rounded-xl border-2 transition-all duration-300 ${
              answers[question.id] === false 
                ? 'border-rose-500 bg-rose-500/10 text-rose-400' 
                : 'border-slate-700 hover:border-slate-500'
            }`}
          >
            <X className="w-5 h-5 mx-auto mb-2" />
            <span className="font-medium">No</span>
          </button>
        </div>
      );
    }

    if (question.type === 'single') {
      return (
        <div className="space-y-3 mt-4">
          {question.options.map(option => (
            <button
              key={option.value}
              onClick={() => handleAnswer(question.id, option.value)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                answers[question.id] === option.value
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{option.label}</span>
                  {option.description && (
                    <p className="text-sm text-slate-400 mt-1">{option.description}</p>
                  )}
                </div>
                {answers[question.id] === option.value && (
                  <Check className="w-5 h-5 text-cyan-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      );
    }

    if (question.type === 'multi') {
      const selected = answers[question.id] || [];
      return (
        <div className="space-y-3 mt-4">
          {question.options.map(option => (
            <button
              key={option.value}
              onClick={() => handleMultiAnswer(question.id, option.value)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                selected.includes(option.value)
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option.label}</span>
                {selected.includes(option.value) && (
                  <Check className="w-5 h-5 text-cyan-400" />
                )}
              </div>
            </button>
          ))}
          <p className="text-sm text-slate-400">Select all that apply</p>
        </div>
      );
    }
  };

  const renderReadinessChecklist = () => {
    const categories = [...new Set(READINESS_ITEMS.map(i => i.category))];
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold mb-2">Application Readiness Checklist</h3>
          <p className="text-slate-400">Check off items you have ready for grant applications</p>
        </div>
        
        {categories.map(category => (
          <div key={category} className="bg-slate-800/50 rounded-2xl p-6">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
              {category === 'Corporate' && <Building2 className="w-5 h-5 text-cyan-400" />}
              {category === 'Financial' && <DollarSign className="w-5 h-5 text-emerald-400" />}
              {category === 'IP/Technical' && <Lightbulb className="w-5 h-5 text-amber-400" />}
              {category === 'Commercial' && <TrendingUp className="w-5 h-5 text-violet-400" />}
              {category === 'Partners' && <Users className="w-5 h-5 text-rose-400" />}
              {category}
            </h4>
            <div className="space-y-3">
              {READINESS_ITEMS.filter(i => i.category === category).map(item => (
                <label 
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    readiness[item.id] ? 'bg-emerald-500/10' : 'hover:bg-slate-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={readiness[item.id] || false}
                    onChange={(e) => handleReadiness(item.id, e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                  />
                  <span className={readiness[item.id] ? 'text-slate-200' : 'text-slate-400'}>
                    {item.label}
                  </span>
                  {item.critical && (
                    <span className="ml-auto text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
                      Critical
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderResults = () => {
    const sortedPrograms = Object.entries(eligibility)
      .sort((a, b) => {
        if (a[1].eligible && !b[1].eligible) return -1;
        if (!a[1].eligible && b[1].eligible) return 1;
        return b[1].score - a[1].score;
      });

    const eligiblePrograms = sortedPrograms.filter(([_, e]) => e.eligible);
    const potentialValue = eligiblePrograms.reduce((acc, [key, _]) => {
      const ranges = {
        rdti: 200000,
        igp: 500000,
        csiro: 50000,
        crcp: 500000,
        emdg: 80000,
        accelerator: 100000
      };
      return acc + (ranges[key] || 0);
    }, 0);

    return (
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 rounded-2xl p-6 border border-emerald-700/50">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-6 h-6 text-emerald-400" />
              <span className="text-slate-400">Eligible Programs</span>
            </div>
            <div className="text-4xl font-bold text-emerald-400">
              {eligiblePrograms.length}
              <span className="text-lg text-slate-400">/{Object.keys(PROGRAMS).length}</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 rounded-2xl p-6 border border-cyan-700/50">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-cyan-400" />
              <span className="text-slate-400">Potential Funding</span>
            </div>
            <div className="text-4xl font-bold text-cyan-400">
              ${(potentialValue / 1000).toFixed(0)}K+
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-violet-900/50 to-violet-800/30 rounded-2xl p-6 border border-violet-700/50">
            <div className="flex items-center gap-3 mb-2">
              <FileCheck className="w-6 h-6 text-violet-400" />
              <span className="text-slate-400">Readiness Score</span>
            </div>
            <div className="text-4xl font-bold text-violet-400">
              {getReadinessScore()}%
            </div>
            <div className="text-sm text-slate-400 mt-1">
              {getCriticalReadiness().checked}/{getCriticalReadiness().total} critical items
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700 pb-2">
          {['eligibility', 'action-plan', 'stack-strategy'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
                activeTab === tab
                  ? 'bg-slate-800 text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'eligibility' && 'Program Eligibility'}
              {tab === 'action-plan' && '90-Day Action Plan'}
              {tab === 'stack-strategy' && 'Stacking Strategy'}
            </button>
          ))}
        </div>

        {/* Eligibility Tab */}
        {activeTab === 'eligibility' && (
          <div className="space-y-4">
            {sortedPrograms.map(([key, result]) => {
              const program = PROGRAMS[key];
              return (
                <div 
                  key={key}
                  className={`rounded-2xl border-2 overflow-hidden transition-all ${
                    result.eligible 
                      ? 'border-slate-700 bg-slate-800/50' 
                      : 'border-slate-800 bg-slate-900/50 opacity-60'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                          style={{ backgroundColor: `${program.color}20` }}
                        >
                          {program.icon}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{program.name}</h3>
                          <p className="text-slate-400 text-sm">{program.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {result.eligible ? (
                          <div className="flex items-center gap-2 text-emerald-400">
                            <Check className="w-5 h-5" />
                            <span className="font-semibold">Eligible</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-400">
                            <X className="w-5 h-5" />
                            <span className="font-semibold">Not Eligible</span>
                          </div>
                        )}
                        {result.eligible && (
                          <div className="mt-2">
                            <div className="text-sm text-slate-400">Match Score</div>
                            <div className="text-2xl font-bold" style={{ color: program.color }}>
                              {result.score}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700">
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Funding</div>
                        <div className="font-semibold text-slate-200">{program.range}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Type</div>
                        <div className="font-semibold text-slate-200">{program.funding}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Effort</div>
                        <div className="font-semibold text-slate-200">{program.effort}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Timeline</div>
                        <div className="font-semibold text-slate-200">{program.timeline}</div>
                      </div>
                    </div>

                    {(result.reasons.length > 0 || result.warnings.length > 0) && (
                      <div className="mt-4 space-y-2">
                        {result.reasons.map((reason, i) => (
                          <div key={i} className="flex items-center gap-2 text-rose-400 text-sm">
                            <X className="w-4 h-4 flex-shrink-0" />
                            <span>{reason}</span>
                          </div>
                        ))}
                        {result.warnings.map((warning, i) => (
                          <div key={i} className="flex items-center gap-2 text-amber-400 text-sm">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{warning}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Plan Tab */}
        {activeTab === 'action-plan' && (
          <div className="space-y-8">
            {/* Days 1-30 */}
            <div className="bg-gradient-to-r from-emerald-900/30 to-transparent rounded-2xl p-6 border border-emerald-800/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-xl font-bold text-emerald-400">1-30</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-emerald-400">Immediate Actions</h3>
                  <p className="text-slate-400 text-sm">Foundation & Quick Wins</p>
                </div>
              </div>
              {actionPlan.immediate.length > 0 ? (
                <div className="space-y-4">
                  {actionPlan.immediate.map((action, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-xl p-4 flex items-start gap-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        action.priority === 'Critical' ? 'bg-rose-500/20 text-rose-400' :
                        action.priority === 'High' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-600/50 text-slate-300'
                      }`}>
                        {action.priority}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{action.action}</div>
                        <div className="text-sm text-slate-400 mt-1">{action.program}</div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {action.effort}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" /> {action.outcome}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">Complete the assessment to see personalized actions</p>
              )}
            </div>

            {/* Days 31-60 */}
            <div className="bg-gradient-to-r from-cyan-900/30 to-transparent rounded-2xl p-6 border border-cyan-800/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-xl font-bold text-cyan-400">31-60</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-cyan-400">Short-Term Actions</h3>
                  <p className="text-slate-400 text-sm">Build & Validate</p>
                </div>
              </div>
              {actionPlan.shortTerm.length > 0 ? (
                <div className="space-y-4">
                  {actionPlan.shortTerm.map((action, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-xl p-4 flex items-start gap-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        action.priority === 'High' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-600/50 text-slate-300'
                      }`}>
                        {action.priority}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{action.action}</div>
                        <div className="text-sm text-slate-400 mt-1">{action.program}</div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {action.effort}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" /> {action.outcome}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No short-term actions based on current assessment</p>
              )}
            </div>

            {/* Days 61-90 */}
            <div className="bg-gradient-to-r from-violet-900/30 to-transparent rounded-2xl p-6 border border-violet-800/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <span className="text-xl font-bold text-violet-400">61-90</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-violet-400">Medium-Term Actions</h3>
                  <p className="text-slate-400 text-sm">Execute & Scale</p>
                </div>
              </div>
              {actionPlan.mediumTerm.length > 0 ? (
                <div className="space-y-4">
                  {actionPlan.mediumTerm.map((action, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-xl p-4 flex items-start gap-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        action.priority === 'High' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-600/50 text-slate-300'
                      }`}>
                        {action.priority}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{action.action}</div>
                        <div className="text-sm text-slate-400 mt-1">{action.program}</div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {action.effort}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" /> {action.outcome}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No medium-term actions based on current assessment</p>
              )}
            </div>
          </div>
        )}

        {/* Stacking Strategy Tab */}
        {activeTab === 'stack-strategy' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Recommended Funding Stack
              </h3>
              
              <div className="relative">
                {/* Timeline */}
                <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-emerald-500 via-cyan-500 to-violet-500"></div>
                
                <div className="space-y-6 relative">
                  {/* Stage 1 */}
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center z-10">
                      <span className="text-emerald-400 font-bold">1</span>
                    </div>
                    <div className="flex-1 bg-slate-900/50 rounded-xl p-4">
                      <div className="font-bold text-emerald-400">Foundation Layer</div>
                      <div className="text-sm text-slate-400 mt-1">R&D Tax Incentive (ongoing) + CSIRO Kick-Start</div>
                      <div className="mt-2 text-xs text-slate-500">
                        Start claiming R&D Tax immediately. Use CSIRO for technical validation and "CSIRO-backed" credibility.
                      </div>
                    </div>
                  </div>

                  {/* Stage 2 */}
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center z-10">
                      <span className="text-cyan-400 font-bold">2</span>
                    </div>
                    <div className="flex-1 bg-slate-900/50 rounded-xl p-4">
                      <div className="font-bold text-cyan-400">Growth Layer</div>
                      <div className="text-sm text-slate-400 mt-1">IGP Advisory → IGP Grant ($50K-$5M)</div>
                      <div className="mt-2 text-xs text-slate-500">
                        Free expert advice leads to stronger grant applications. Your co-funding qualifies for R&D Tax claims.
                      </div>
                    </div>
                  </div>

                  {/* Stage 3 */}
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-violet-500/20 border-2 border-violet-500 flex items-center justify-center z-10">
                      <span className="text-violet-400 font-bold">3</span>
                    </div>
                    <div className="flex-1 bg-slate-900/50 rounded-xl p-4">
                      <div className="font-bold text-violet-400">Scale Layer</div>
                      <div className="text-sm text-slate-400 mt-1">CRC-P ($100K-$3M) + EMDG (export)</div>
                      <div className="mt-2 text-xs text-slate-500">
                        Use established research partnerships for CRC-P. Stack EMDG for international expansion.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stacking Rules */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-emerald-900/20 rounded-2xl p-6 border border-emerald-800/50">
                <h4 className="font-bold text-emerald-400 flex items-center gap-2 mb-4">
                  <Check className="w-5 h-5" /> CAN Stack Together
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>R&D Tax + Any grant (co-funding qualifies for RDTI)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>CSIRO Kick-Start + RDTI</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>IGP + EMDG (different purposes)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>CRC-P + RDTI</span>
                  </li>
                </ul>
              </div>

              <div className="bg-rose-900/20 rounded-2xl p-6 border border-rose-800/50">
                <h4 className="font-bold text-rose-400 flex items-center gap-2 mb-4">
                  <X className="w-5 h-5" /> CANNOT Stack
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <X className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <span>Grant funds as co-funding for other grants</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <span>IGP requires CASH co-funding (not in-kind)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <span>Same activities claimed across multiple grants</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Reality Check */}
            <div className="bg-amber-900/20 rounded-2xl p-6 border border-amber-800/50">
              <h4 className="font-bold text-amber-400 flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5" /> Reality Check
              </h4>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div>
                  <div className="font-semibold text-slate-200 mb-2">Worth Pursuing</div>
                  <ul className="space-y-1 text-slate-400">
                    <li>• R&D Tax: Essential if doing genuine R&D</li>
                    <li>• IGP Advisory: FREE expert advice</li>
                    <li>• CSIRO Kick-Start: High success rate, credibility</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-slate-200 mb-2">Potential Distractions</div>
                  <ul className="space-y-1 text-slate-400">
                    <li>• CRC-P without research partners (6-12mo build)</li>
                    <li>• Multiple small grants &lt;$50K (effort exceeds value)</li>
                    <li>• EMDG without clear export strategy</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-4 bg-slate-800/50 rounded-xl">
                <div className="font-semibold text-amber-400">Remember:</div>
                <p className="text-slate-300 text-sm mt-1">
                  $100K customer contract in 4 weeks beats $100K grant in 6 months. 
                  Grants should ACCELERATE, not REPLACE, commercial progress.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Start Over Button */}
        <div className="text-center pt-8">
          <button
            onClick={() => {
              setShowResults(false);
              setCurrentStep(0);
              setAnswers({});
              setReadiness({});
              setActiveTab('assessment');
            }}
            className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            Start New Assessment
          </button>
        </div>
      </div>
    );
  };

  if (showResults) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {/* Gradient Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Your Grants Assessment Results
            </h1>
            <p className="text-slate-400 mt-2">Personalized recommendations based on your responses</p>
          </div>
          {renderResults()}
        </div>
      </div>
    );
  }

  const currentQuestions = currentStep < 7 ? getQuestionsForStep(currentStep) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent"></div>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            AI Startup Grants Intelligence Tool
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent mb-4">
            Australian Grants
            <br />Self-Assessment
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Discover which government grants and programs match your startup's profile, 
            then get a personalized 90-day action plan.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between mb-3">
            {stepLabels.map((label, idx) => (
              <div 
                key={idx}
                className={`text-xs hidden md:block transition-colors ${
                  idx === currentStep ? 'text-cyan-400' : 
                  idx < currentStep ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="text-center mt-3 text-sm text-slate-400">
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>

        {/* Question Card */}
        <div 
          className={`bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-8 md:p-12 shadow-2xl transition-all duration-300 ${
            animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {currentStep < 7 ? (
            <>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  {currentStep === 0 && <Building2 className="w-5 h-5 text-cyan-400" />}
                  {currentStep === 1 && <Lightbulb className="w-5 h-5 text-cyan-400" />}
                  {currentStep === 2 && <Sparkles className="w-5 h-5 text-cyan-400" />}
                  {currentStep === 3 && <Users className="w-5 h-5 text-cyan-400" />}
                  {currentStep === 4 && <TrendingUp className="w-5 h-5 text-cyan-400" />}
                  {currentStep === 5 && <DollarSign className="w-5 h-5 text-cyan-400" />}
                  {currentStep === 6 && <Target className="w-5 h-5 text-cyan-400" />}
                </div>
                <h2 className="text-2xl font-bold">{stepLabels[currentStep]}</h2>
              </div>

              <div className="space-y-10">
                {currentQuestions.map((question) => (
                  <div key={question.id}>
                    <h3 className="text-lg font-medium">{question.question}</h3>
                    {question.help && (
                      <p className="text-sm text-slate-400 mt-1">{question.help}</p>
                    )}
                    {renderQuestion(question)}
                  </div>
                ))}
              </div>
            </>
          ) : (
            renderReadinessChecklist()
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-12 pt-8 border-t border-slate-800">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
                currentStep === 0 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-slate-800'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
            
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 font-semibold transition-all shadow-lg shadow-cyan-500/25"
            >
              {currentStep === steps.length - 1 ? 'View Results' : 'Continue'}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <div className="text-2xl font-bold text-emerald-400">6</div>
            <div className="text-xs text-slate-400">Programs Analyzed</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <div className="text-2xl font-bold text-cyan-400">$5M+</div>
            <div className="text-xs text-slate-400">Potential Funding</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <div className="text-2xl font-bold text-violet-400">90</div>
            <div className="text-xs text-slate-400">Day Action Plan</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-slate-500">
          <p>Based on Australian Government programs as of December 2025</p>
          <p className="mt-1">R&D Tax Incentive • Industry Growth Program • CSIRO Kick-Start • CRC-P • EMDG • Accelerators</p>
        </div>
      </div>
    </div>
  );
}