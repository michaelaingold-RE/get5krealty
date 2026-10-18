// © 2026 Ingold Group Properties, LLC dba 5K Realty. All rights reserved.
// Legal disclaimers and notices. Draft, pending Michael's approval (tag not shown in the app). Exact text mirrored in ../legal-disclaimers.md
const LG={
 disc:['Shingle gives you educational information. It is not legal, tax, or real estate advice.','Shingle is not representation or brokerage services from 5K Realty. Using Shingle does not create an agency relationship with 5K Realty.','You are responsible for following North Carolina, South Carolina, and federal law when you sell your home.'],
 accept:'By typing my name, I confirm I have read this and I understand it.',
 formsNote:'These are forms available to the public from official state and federal sources. They may not be the only documents your sale requires. Consult a real estate attorney.',
 broker:'5K Realty (Ingold Group Properties, LLC) is a licensed real estate brokerage. "Want us to handle it?" is optional. You can use all of Shingle without hiring 5K Realty.',
 atty:'Shingle recommends having a real estate attorney handle all legal matters, including your contract and closing.',
 earnest:'Earnest money: ask your attorney who will hold the earnest money, when it is due, and what happens to it if the deal does not close.',
 fh:'Federal fair housing law applies to home sales. Describe the home, not who should live there, and treat every buyer the same way.',
 lead:'Your home was built before 1978. Federal lead-based paint disclosure rules may apply to your sale. Read the EPA\'s guidance and ask your attorney.',
 HUD:'https://www.hud.gov/fairhousing',EPA_LEAD:'https://www.epa.gov/lead/real-estate-disclosures-about-potential-lead-hazards'};
// Disclaimer version. Bump LG_VERSION and LG_DATE whenever any text in LG.disc, LG.accept or LG.broker changes; users must accept again.
const LG_VERSION='1.1',LG_DATE='2026-10-15';
// Production mode hides demo controls. Add ?demo=1 to show them. ?mode=store always hides them.
const QS=new URLSearchParams(location.search);const DEMO=QS.get('demo')==='1'&&QS.get('mode')!=='store';
const demoBtn=html=>DEMO?html:'';
const legalOk=()=>!!(S.legal&&S.legal.acceptedAt&&S.legal.version===LG_VERSION);
const lgDate=d=>new Date(d+(d.length===10?'T12:00:00':'')).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
function attyPrompt(step){return `<aside class="legal atty" aria-label="Talk to a real estate attorney"><h3>Talk to a real estate attorney</h3><p><b>${step}.</b> ${LG.atty}</p></aside>`}
function earnestNote(){return `<aside class="legal" aria-label="Earnest money"><p>${LG.earnest}</p></aside>`}
function fhNotice(){return `<aside class="legal fh" aria-label="Fair housing"><h3 style="display:flex;align-items:center;gap:10px"><img class="eho" src="/shingle/assets/hud/equal-housing-opportunity-hud.png" alt="Equal Housing Opportunity logo" width="36" height="38">Fair housing</h3><p>${LG.fh} <a href="${LG.HUD}" target="_blank" rel="noopener">Fair housing at HUD</a></p></aside>`}
function leadNotice(){return (S.home.year&&S.home.year<1978)?`<aside class="legal lead" aria-label="Lead paint"><h3>Lead-based paint</h3><p>${LG.lead} <a href="${LG.EPA_LEAD}" target="_blank" rel="noopener">EPA lead disclosure page</a></p></aside>`:''}
function brokerLine(){return `<p class="broker">${LG.broker}</p>`}
function discBlock(){return `<div class="disc">${LG.disc.map(t=>`<p>${t}</p>`).join('')}</div>`}

const agencyBlock=()=>`<div class="card" id="agency"><h3>State agency disclosures</h3><ul><li><a href="https://www.ncrec.gov/Brochures/WWREABrochure.pdf" target="_blank" rel="noopener">North Carolina: Working with Real Estate Agents (NC Real Estate Commission, PDF)</a></li><li><a href="https://llr.sc.gov/re/recpdf/Doc170%20SC_Disclosure_of_Real_Estate_Brokerage_Relationships.pdf" target="_blank" rel="noopener">South Carolina: Disclosure of Real Estate Brokerage Relationships (SC Real Estate Commission, PDF)</a></li></ul><p class="muted">Shingle is not an agency agreement, does not create a brokerage relationship with 5K Realty, and is not legal advice. Consult a real estate attorney.</p></div>`;
